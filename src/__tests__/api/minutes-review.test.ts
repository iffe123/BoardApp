import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/verify-session', () => ({
  verifySession: jest.fn().mockResolvedValue({ user: { uid: 'user-1', name: 'User One', tenants: { 'tenant-1': 'admin' } }, token: 'token' }),
  verifyTenantAccess: jest.fn().mockResolvedValue(undefined),
  authErrorResponse: jest.fn((error: Error) => Response.json({ error: error.message }, { status: 401 })),
  AuthError: class extends Error {},
}));

const mockAddDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  query: jest.fn((...args: unknown[]) => args),
  orderBy: jest.fn((...args: unknown[]) => args),
  where: jest.fn((...args: unknown[]) => args),
}));

jest.mock('@/lib/firebase', () => ({
  collections: {
    meeting: jest.fn(() => 'meeting-ref'),
    member: jest.fn(() => 'member-ref'),
    minutesReviews: jest.fn(() => 'minutes-reviews'),
    minutesReview: jest.fn(() => 'minutes-review'),
    minutesComments: jest.fn(() => 'minutes-comments'),
    minutesComment: jest.fn(() => 'minutes-comment'),
    users: jest.fn(() => 'users-ref'),
  },
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1, nanoseconds: 1, toDate: () => new Date() })),
  },
}));

jest.mock('@/lib/notification-service', () => ({
  createBulkNotifications: jest.fn().mockResolvedValue(2),
  createNotification: jest.fn().mockResolvedValue('notification-1'),
}));

jest.mock('@/lib/email-service', () => ({ sendEmail: jest.fn().mockResolvedValue({ success: true }) }));

import { POST as requestReview } from '@/app/api/meetings/[meetingId]/minutes/review/request/route';
import { POST as addComment } from '@/app/api/meetings/[meetingId]/minutes/comments/route';
import { POST as resolveComment } from '@/app/api/meetings/[meetingId]/minutes/comments/[commentId]/resolve/route';
import { POST as approveReview } from '@/app/api/meetings/[meetingId]/minutes/review/[reviewId]/approve/route';
import { POST as requestChanges } from '@/app/api/meetings/[meetingId]/minutes/review/[reviewId]/request-changes/route';

describe('minutes review API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocs.mockResolvedValue({ docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'review-1' });
  });

  it('request review creates doc + reviewers pending', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, id: 'meeting-1', data: () => ({ attendees: [{ userId: 'user-1', role: 'chair' }], title: 'Board Meeting' }) })
      .mockResolvedValueOnce({ exists: () => true, id: 'member-1', data: () => ({ userId: 'user-1', role: 'admin' }) });
    const req = new NextRequest('http://localhost/api/meetings/meeting-1/minutes/review/request?tenantId=tenant-1', { method: 'POST', body: JSON.stringify({ reviewers: ['user-2'] }) });
    const res = await requestReview(req, { params: { meetingId: 'meeting-1' } });
    expect(res.status).toBe(200);
    expect(mockAddDoc.mock.calls[0][1].reviewers[0].status).toBe('pending');
  });

  it('add comment creates doc linked to agendaItemId', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, id: 'meeting-1', data: () => ({ attendees: [{ userId: 'user-1', role: 'chair' }] }) })
      .mockResolvedValueOnce({ exists: () => true, id: 'member-1', data: () => ({ userId: 'user-1', role: 'admin' }) });
    const req = new NextRequest('http://localhost/api/meetings/meeting-1/minutes/comments?tenantId=tenant-1', { method: 'POST', body: JSON.stringify({ agendaItemId: 'agenda-1', content: 'Please clarify' }) });
    const res = await addComment(req, { params: { meetingId: 'meeting-1' } });
    expect(res.status).toBe(200);
    expect(mockAddDoc.mock.calls[0][1].agendaItemId).toBe('agenda-1');
  });

  it('resolve requires editor permission', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, id: 'meeting-1', data: () => ({ attendees: [{ userId: 'other', role: 'director' }] }) })
      .mockResolvedValueOnce({ exists: () => true, id: 'member-1', data: () => ({ userId: 'user-1', role: 'director' }) });
    const req = new NextRequest('http://localhost/api/meetings/meeting-1/minutes/comments/comment-1/resolve?tenantId=tenant-1', { method: 'POST', body: '{}' });
    const res = await resolveComment(req, { params: { meetingId: 'meeting-1', commentId: 'comment-1' } });
    expect(res.status).toBe(403);
  });

  it('approve updates reviewer status; all approved => status approved', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ status: 'in_review', reviewers: [{ userId: 'user-1', status: 'pending' }] }) });
    const req = new NextRequest('http://localhost/api/meetings/meeting-1/minutes/review/review-1/approve?tenantId=tenant-1', { method: 'POST', body: '{}' });
    const res = await approveReview(req, { params: { meetingId: 'meeting-1', reviewId: 'review-1' } });
    expect(res.status).toBe(200);
    expect(mockUpdateDoc).toHaveBeenCalledWith('minutes-review', expect.objectContaining({ status: 'approved' }));
  });

  it('request changes => status changes_requested', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ requestedByUserId: 'owner-1', reviewers: [{ userId: 'user-1', status: 'pending' }] }) });
    const req = new NextRequest('http://localhost/api/meetings/meeting-1/minutes/review/review-1/request-changes?tenantId=tenant-1', { method: 'POST', body: '{}' });
    const res = await requestChanges(req, { params: { meetingId: 'meeting-1', reviewId: 'review-1' } });
    expect(res.status).toBe(200);
    expect(mockUpdateDoc).toHaveBeenCalledWith('minutes-review', expect.objectContaining({ status: 'changes_requested' }));
  });
});
