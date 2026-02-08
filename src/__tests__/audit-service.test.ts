/**
 * Audit Service Unit Tests
 *
 * Tests the audit logging service functionality including:
 * - Creating audit log entries
 * - Audit action constants
 * - Request metadata extraction
 */

jest.mock('@/lib/firebase', () => ({
  collections: {
    auditLogs: jest.fn((tenantId) => ({ path: `tenants/${tenantId}/audit_logs` })),
  },
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1705312800, nanoseconds: 0 })),
  },
}));

jest.mock('firebase/firestore', () => ({
  setDoc: jest.fn().mockResolvedValue(undefined),
  doc: jest.fn((collection, id) => ({ path: `${collection.path}/${id}`, id })),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

import { createAuditLog, AuditActions, getRequestMetadata } from '@/lib/audit-service';
import { setDoc, doc } from 'firebase/firestore';
import { collections, Timestamp } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

describe('Audit Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuditLog', () => {
    const baseInput = {
      tenantId: 'tenant-1',
      action: AuditActions.MEETING_CREATED,
      resourceType: 'meeting' as const,
      resourceId: 'meeting-123',
      actorId: 'user-1',
      actorName: 'Anna Svensson',
    };

    it('should generate a UUID for the audit log entry', async () => {
      await createAuditLog(baseInput);

      expect(uuidv4).toHaveBeenCalledTimes(1);
    });

    it('should return the generated UUID', async () => {
      const id = await createAuditLog(baseInput);

      expect(id).toBe('mock-uuid-123');
    });

    it('should call collections.auditLogs with the correct tenantId', async () => {
      await createAuditLog(baseInput);

      expect(collections.auditLogs).toHaveBeenCalledWith('tenant-1');
    });

    it('should call doc with the correct collection ref and id', async () => {
      await createAuditLog(baseInput);

      expect(doc).toHaveBeenCalledWith(
        { path: 'tenants/tenant-1/audit_logs' },
        'mock-uuid-123'
      );
    });

    it('should call setDoc with the correct audit log data', async () => {
      await createAuditLog(baseInput);

      expect(setDoc).toHaveBeenCalledWith(
        { path: 'tenants/tenant-1/audit_logs/mock-uuid-123', id: 'mock-uuid-123' },
        expect.objectContaining({
          id: 'mock-uuid-123',
          tenantId: 'tenant-1',
          action: 'meeting.created',
          resourceType: 'meeting',
          resourceId: 'meeting-123',
          actorId: 'user-1',
          actorName: 'Anna Svensson',
          timestamp: { seconds: 1705312800, nanoseconds: 0 },
        })
      );
    });

    it('should include Timestamp.now() as the timestamp', async () => {
      await createAuditLog(baseInput);

      expect(Timestamp.now).toHaveBeenCalled();
      const setDocCall = (setDoc as jest.Mock).mock.calls[0][1];
      expect(setDocCall.timestamp).toEqual({ seconds: 1705312800, nanoseconds: 0 });
    });

    it('should include optional actorIp when provided', async () => {
      const input = {
        ...baseInput,
        actorIp: '192.168.1.1',
      };

      await createAuditLog(input);

      const setDocCall = (setDoc as jest.Mock).mock.calls[0][1];
      expect(setDocCall.actorIp).toBe('192.168.1.1');
    });

    it('should include optional actorUserAgent when provided', async () => {
      const input = {
        ...baseInput,
        actorUserAgent: 'Mozilla/5.0',
      };

      await createAuditLog(input);

      const setDocCall = (setDoc as jest.Mock).mock.calls[0][1];
      expect(setDocCall.actorUserAgent).toBe('Mozilla/5.0');
    });

    it('should include changes array when provided', async () => {
      const input = {
        ...baseInput,
        changes: [
          { field: 'title', oldValue: 'Old Title', newValue: 'New Title' },
          { field: 'status', oldValue: 'draft', newValue: 'scheduled' },
        ],
      };

      await createAuditLog(input);

      const setDocCall = (setDoc as jest.Mock).mock.calls[0][1];
      expect(setDocCall.changes).toEqual([
        { field: 'title', oldValue: 'Old Title', newValue: 'New Title' },
        { field: 'status', oldValue: 'draft', newValue: 'scheduled' },
      ]);
    });

    it('should include metadata when provided', async () => {
      const input = {
        ...baseInput,
        metadata: { source: 'web', browser: 'Chrome' },
      };

      await createAuditLog(input);

      const setDocCall = (setDoc as jest.Mock).mock.calls[0][1];
      expect(setDocCall.metadata).toEqual({ source: 'web', browser: 'Chrome' });
    });

    it('should set undefined for optional fields when not provided', async () => {
      await createAuditLog(baseInput);

      const setDocCall = (setDoc as jest.Mock).mock.calls[0][1];
      expect(setDocCall.actorIp).toBeUndefined();
      expect(setDocCall.actorUserAgent).toBeUndefined();
      expect(setDocCall.changes).toBeUndefined();
      expect(setDocCall.metadata).toBeUndefined();
    });
  });

  describe('AuditActions', () => {
    it('should have all meeting action constants', () => {
      expect(AuditActions.MEETING_CREATED).toBe('meeting.created');
      expect(AuditActions.MEETING_UPDATED).toBe('meeting.updated');
      expect(AuditActions.MEETING_DELETED).toBe('meeting.deleted');
      expect(AuditActions.MEETING_STARTED).toBe('meeting.started');
      expect(AuditActions.MEETING_ENDED).toBe('meeting.ended');
      expect(AuditActions.MEETING_CANCELLED).toBe('meeting.cancelled');
      expect(AuditActions.AGENDA_UPDATED).toBe('meeting.agenda_updated');
      expect(AuditActions.MINUTES_GENERATED).toBe('meeting.minutes_generated');
      expect(AuditActions.MINUTES_SIGNED).toBe('meeting.minutes_signed');
    });

    it('should have all document action constants', () => {
      expect(AuditActions.DOCUMENT_UPLOADED).toBe('document.uploaded');
      expect(AuditActions.DOCUMENT_DOWNLOADED).toBe('document.downloaded');
      expect(AuditActions.DOCUMENT_DELETED).toBe('document.deleted');
      expect(AuditActions.DOCUMENT_SHARED).toBe('document.shared');
      expect(AuditActions.DOCUMENT_SIGNED).toBe('document.signed');
    });

    it('should have all member action constants', () => {
      expect(AuditActions.MEMBER_INVITED).toBe('member.invited');
      expect(AuditActions.MEMBER_JOINED).toBe('member.joined');
      expect(AuditActions.MEMBER_REMOVED).toBe('member.removed');
      expect(AuditActions.MEMBER_ROLE_CHANGED).toBe('member.role_changed');
    });

    it('should have all financial action constants', () => {
      expect(AuditActions.FINANCIAL_DATA_IMPORTED).toBe('financial.data_imported');
      expect(AuditActions.FINANCIAL_REPORT_GENERATED).toBe('financial.report_generated');
      expect(AuditActions.ERP_CONNECTED).toBe('financial.erp_connected');
      expect(AuditActions.ERP_SYNCED).toBe('financial.erp_synced');
    });

    it('should have all decision action constants', () => {
      expect(AuditActions.DECISION_RECORDED).toBe('decision.recorded');
      expect(AuditActions.DECISION_UPDATED).toBe('decision.updated');
    });

    it('should have all settings action constants', () => {
      expect(AuditActions.SETTINGS_UPDATED).toBe('settings.updated');
      expect(AuditActions.ORGANIZATION_UPDATED).toBe('settings.organization_updated');
      expect(AuditActions.NOTIFICATION_SETTINGS_UPDATED).toBe('settings.notifications_updated');
      expect(AuditActions.COMPLIANCE_SETTINGS_UPDATED).toBe('settings.compliance_updated');
    });
  });

  describe('getRequestMetadata', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '203.0.113.50',
          'user-agent': 'TestAgent/1.0',
        },
      });

      const metadata = getRequestMetadata(request);

      expect(metadata.actorIp).toBe('203.0.113.50');
    });

    it('should extract user-agent from headers', () => {
      const request = new Request('http://localhost', {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });

      const metadata = getRequestMetadata(request);

      expect(metadata.actorUserAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    it('should return undefined actorIp when no IP headers are present', () => {
      const request = new Request('http://localhost', {
        headers: {
          'user-agent': 'TestAgent/1.0',
        },
      });

      const metadata = getRequestMetadata(request);

      expect(metadata.actorIp).toBeUndefined();
    });

    it('should return undefined actorUserAgent when no user-agent header is present', () => {
      const request = new Request('http://localhost', {
        headers: {},
      });

      const metadata = getRequestMetadata(request);

      expect(metadata.actorUserAgent).toBeUndefined();
    });

    it('should handle missing headers gracefully', () => {
      const request = new Request('http://localhost');

      const metadata = getRequestMetadata(request);

      expect(metadata.actorIp).toBeUndefined();
      expect(metadata.actorUserAgent).toBeUndefined();
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '203.0.113.50',
          'x-real-ip': '10.0.0.1',
        },
      });

      const metadata = getRequestMetadata(request);

      expect(metadata.actorIp).toBe('203.0.113.50');
    });

    it('should fall back to x-real-ip when x-forwarded-for is absent', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '10.0.0.1',
        },
      });

      const metadata = getRequestMetadata(request);

      expect(metadata.actorIp).toBe('10.0.0.1');
    });
  });
});
