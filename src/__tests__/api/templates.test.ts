/**
 * Templates API Tests
 *
 * Tests the template management functionality including:
 * - Listing system and custom templates
 * - Creating custom templates
 * - Generating agendas from templates
 */

import { NextRequest } from 'next/server';

// Mock Firebase before importing the route
jest.mock('@/lib/firebase', () => ({
  collections: {
    templates: jest.fn((tenantId: string) => ({
      path: `tenants/${tenantId}/templates`,
    })),
  },
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date('2024-01-15T10:00:00Z'),
      seconds: 1705312800,
      nanoseconds: 0,
    })),
  },
}));

// Mock Firestore operations
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockQuery = jest.fn();
const mockOrderBy = jest.fn();

jest.mock('firebase/firestore', () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
}));

// Import route handlers after mocking
import { GET, POST } from '@/app/api/templates/route';

describe('Templates API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockImplementation((...args) => args);
    mockOrderBy.mockImplementation((...args) => args);
  });

  describe('GET /api/templates', () => {
    it('should return system templates by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templates.length).toBeGreaterThan(0);
      expect(data.systemCount).toBeGreaterThan(0);
    });

    it('should include all default template types', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates');

      const response = await GET(request);
      const data = await response.json();

      const templateIds = data.templates.map((t: { id: string }) => t.id);
      expect(templateIds).toContain('ordinary-board-meeting');
      expect(templateIds).toContain('extraordinary-board-meeting');
      expect(templateIds).toContain('annual-general-meeting');
      expect(templateIds).toContain('statutory-board-meeting');
      expect(templateIds).toContain('quick-meeting');
      expect(templateIds).toContain('strategy-workshop');
    });

    it('should filter templates by meeting type', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates?meetingType=ordinary'
      );

      const response = await GET(request);
      const data = await response.json();

      const allOrdinary = data.templates.every(
        (t: { meetingType: string }) => t.meetingType === 'ordinary'
      );
      expect(allOrdinary).toBe(true);
    });

    it('should include Swedish translations when locale is sv', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates?locale=sv'
      );

      const response = await GET(request);
      const data = await response.json();

      const ordinaryTemplate = data.templates.find(
        (t: { id: string }) => t.id === 'ordinary-board-meeting'
      );
      expect(ordinaryTemplate.name).toBe('Ordinarie styrelsemöte');
    });

    it('should include English content when locale is en', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates?locale=en'
      );

      const response = await GET(request);
      const data = await response.json();

      const ordinaryTemplate = data.templates.find(
        (t: { id: string }) => t.id === 'ordinary-board-meeting'
      );
      expect(ordinaryTemplate.name).toBe('Ordinary Board Meeting');
    });

    it('should include tenant templates when tenantId provided', async () => {
      const mockTenantTemplates = [
        {
          id: 'custom-template-1',
          data: () => ({
            name: 'Custom Board Meeting',
            meetingType: 'ordinary',
            agendaItems: [],
            defaultDuration: 120,
            defaultQuorum: 3,
            createdAt: { toDate: () => new Date() },
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockTenantTemplates[0]) => void) => {
          mockTenantTemplates.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/templates?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.customCount).toBe(1);
      const customTemplate = data.templates.find(
        (t: { id: string }) => t.id === 'custom-template-1'
      );
      expect(customTemplate).toBeDefined();
      expect(customTemplate.isSystem).toBe(false);
    });

    it('should exclude system templates when includeSystem=false', async () => {
      mockGetDocs.mockResolvedValueOnce({
        forEach: () => {},
      });

      const request = new NextRequest(
        'http://localhost:3000/api/templates?tenantId=tenant-1&includeSystem=false'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.systemCount).toBe(0);
    });

    it('should mark system templates correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates');

      const response = await GET(request);
      const data = await response.json();

      const systemTemplates = data.templates.filter((t: { isSystem: boolean }) => t.isSystem);
      expect(systemTemplates.length).toBeGreaterThan(0);
    });

    it('should return template counts', async () => {
      mockGetDocs.mockResolvedValueOnce({
        forEach: () => {},
      });

      const request = new NextRequest(
        'http://localhost:3000/api/templates?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.total).toBeDefined();
      expect(data.systemCount).toBeDefined();
      expect(data.customCount).toBeDefined();
      expect(data.total).toBe(data.systemCount + data.customCount);
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore error'));

      const request = new NextRequest(
        'http://localhost:3000/api/templates?tenantId=tenant-1'
      );

      // Should still return system templates even if tenant templates fail
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.systemCount).toBeGreaterThan(0);
    });
  });

  describe('POST /api/templates (Generate Agenda)', () => {
    it('should return 400 if templateId missing for generate_agenda action', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate_agenda',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('templateId is required for generate_agenda action');
    });

    it('should generate agenda from system template', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate_agenda',
          templateId: 'ordinary-board-meeting',
          locale: 'en',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templateId).toBe('ordinary-board-meeting');
      expect(data.templateName).toBe('Ordinary Board Meeting');
      expect(data.meetingType).toBe('ordinary');
      expect(data.defaultDuration).toBe(180);
      expect(data.defaultQuorum).toBe(3);
      expect(data.agendaItems).toBeDefined();
      expect(data.agendaItems.length).toBeGreaterThan(0);
    });

    it('should generate agenda in Swedish', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate_agenda',
          templateId: 'ordinary-board-meeting',
          locale: 'sv',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.templateName).toBe('Ordinarie styrelsemöte');
      expect(data.agendaItems[0].title).toBe('Mötets öppnande');
    });

    it('should include all required agenda items for ordinary meeting', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate_agenda',
          templateId: 'ordinary-board-meeting',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const titles = data.agendaItems.map((item: { title: string }) => item.title.toLowerCase());

      expect(titles.some((t: string) => t.includes('opening'))).toBe(true);
      expect(titles.some((t: string) => t.includes('closing'))).toBe(true);
      expect(titles.some((t: string) => t.includes('ceo report'))).toBe(true);
      expect(titles.some((t: string) => t.includes('financial report'))).toBe(true);
    });

    it('should generate unique IDs for agenda items', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate_agenda',
          templateId: 'ordinary-board-meeting',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const ids = data.agendaItems.map((item: { id: string }) => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should set correct order indexes', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate_agenda',
          templateId: 'ordinary-board-meeting',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      data.agendaItems.forEach((item: { orderIndex: number }, index: number) => {
        expect(item.orderIndex).toBe(index);
      });
    });

    it('should return 404 for non-existent template', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate_agenda',
          templateId: 'non-existent-template',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Template not found');
    });
  });

  describe('POST /api/templates (Create Custom Template)', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          tenantId: 'tenant-1',
          // Missing name, meetingType, agendaItems, createdBy
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields for template creation');
    });

    it('should create a custom template successfully', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-template-id' });

      const templateData = {
        action: 'create',
        tenantId: 'tenant-1',
        name: 'Custom Quick Meeting',
        description: 'A custom quick meeting template',
        meetingType: 'ordinary',
        agendaItems: [
          {
            title: 'Opening',
            type: 'formality',
            estimatedDuration: 5,
          },
          {
            title: 'Main Discussion',
            type: 'discussion',
            estimatedDuration: 30,
          },
          {
            title: 'Closing',
            type: 'formality',
            estimatedDuration: 5,
          },
        ],
        defaultDuration: 45,
        defaultQuorum: 2,
        visibility: 'private',
        createdBy: 'user-123',
      };

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify(templateData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('new-template-id');
      expect(data.name).toBe('Custom Quick Meeting');
      expect(data.meetingType).toBe('ordinary');
      expect(data.agendaItems).toHaveLength(3);
      expect(data.visibility).toBe('private');
      expect(data.usageCount).toBe(0);
    });

    it('should use default values for optional fields', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-template-id' });

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          name: 'Minimal Template',
          meetingType: 'ordinary',
          agendaItems: [{ title: 'Item', type: 'discussion', estimatedDuration: 30 }],
          createdBy: 'user-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.defaultDuration).toBe(120);
      expect(data.defaultQuorum).toBe(3);
      expect(data.visibility).toBe('private');
      expect(data.description).toBe('');
    });

    it('should handle Firestore errors during template creation', async () => {
      mockAddDoc.mockRejectedValueOnce(new Error('Firestore write error'));

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          name: 'Test Template',
          meetingType: 'ordinary',
          agendaItems: [{ title: 'Item', type: 'discussion', estimatedDuration: 30 }],
          createdBy: 'user-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create template');
    });
  });
});
