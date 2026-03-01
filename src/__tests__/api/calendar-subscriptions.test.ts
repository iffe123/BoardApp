import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/verify-session', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server');
  return {
    verifySession: jest.fn().mockResolvedValue({ user: { uid: 'user-1', tenants: { 'tenant-1': 'admin' } } }),
    verifyTenantAccess: jest.fn().mockResolvedValue(undefined),
    authErrorResponse: jest.fn().mockImplementation((error: { message?: string; statusCode?: number }) =>
      NextResponse.json({ error: error.message || 'Auth error' }, { status: error.statusCode || 401 })
    ),
    AuthError: class extends Error { statusCode: number; constructor(m: string, s: number) { super(m); this.statusCode = s; } },
  };
});

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/calendar-subscription-service', () => ({
  hashCalendarToken: jest.fn((token: string) => `hash-${token}`),
  generateCalendarToken: jest.fn(() => 'new-token'),
  buildCalendarFeedUrls: jest.fn((token: string) => ({
    webcalUrl: `webcal://example.com/api/calendar/subscribe/${token}`,
    httpsUrl: `https://example.com/api/calendar/subscribe/${token}`,
  })),
}));

jest.mock('@/lib/calendar-service', () => ({
  generateICalFeed: jest.fn(() => 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nEND:VEVENT\r\nEND:VCALENDAR'),
}));

const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockCollectionGroup = jest.fn(() => ({ path: 'calendar_subscriptions_group' }));
const mockQuery = jest.fn((...args: unknown[]) => ({ args }));
const mockWhere = jest.fn((...args: unknown[]) => ({ where: args }));
const mockLimit = jest.fn((value: number) => ({ limit: value }));

jest.mock('firebase/firestore', () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  collectionGroup: (...args: unknown[]) => mockCollectionGroup(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
}));

jest.mock('@/lib/firebase', () => ({
  db: {},
  collections: {
    calendarSubscriptions: jest.fn((tenantId: string) => ({ path: `tenants/${tenantId}/calendar_subscriptions` })),
    meetings: jest.fn((tenantId: string) => ({ path: `tenants/${tenantId}/meetings` })),
  },
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date('2024-01-01T10:00:00Z') })),
  },
}));

import { POST as rotatePOST } from '@/app/api/calendar/subscriptions/rotate/route';
import { POST as revokePOST } from '@/app/api/calendar/subscriptions/revoke/route';
import { GET as subscribeGET } from '@/app/api/calendar/subscribe/[token]/route';

describe('Calendar subscription API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: 'sub-new' });
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it('rotates token and creates a new hashed subscription', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          ref: { id: 'sub-old' },
          data: () => ({ userId: 'user-1', scope: 'tenant', revokedAt: null }),
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/calendar/subscriptions/rotate', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 'tenant-1', scope: 'tenant' }),
    });

    const response = await rotatePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBe('new-token');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc).toHaveBeenCalledWith(
      { path: 'tenants/tenant-1/calendar_subscriptions' },
      expect.objectContaining({ tokenHash: 'hash-new-token', tenantId: 'tenant-1', userId: 'user-1' })
    );
  });

  it('revokes active tokens for user scope', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { ref: { id: 'sub-1' }, data: () => ({ boardroomId: null }) },
        { ref: { id: 'sub-2' }, data: () => ({ boardroomId: null }) },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/calendar/subscriptions/revoke', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 'tenant-1', scope: 'tenant' }),
    });

    const response = await revokePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.revoked).toBe(2);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
  });

  it('looks up subscription by token hash and returns ICS', async () => {
    mockGetDocs
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({ tenantId: 'tenant-1', userId: 'user-1', scope: 'tenant', revokedAt: null }),
          },
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'meeting-1',
            data: () => ({
              title: 'Board Meeting',
              description: 'Discuss goals',
              timezone: 'Europe/Stockholm',
              status: 'scheduled',
              createdBy: 'user-1',
              attendees: [],
              location: { type: 'physical', room: 'Main Room' },
              scheduledStart: { toDate: () => new Date('2024-02-10T10:00:00Z') },
              scheduledEnd: { toDate: () => new Date('2024-02-10T11:00:00Z') },
            }),
          },
        ],
      });

    const request = new NextRequest('http://localhost:3000/api/calendar/subscribe/raw-token');
    const response = await subscribeGET(request, { params: Promise.resolve({ token: 'raw-token' }) });
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=60');
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(mockCollectionGroup).toHaveBeenCalled();
  });
});
