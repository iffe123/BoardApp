import { collections, Timestamp } from '@/lib/firebase';
import { getDoc } from 'firebase/firestore';
import type { Meeting, Member, MinutesReviewStatus } from '@/types/schema';

export const MINUTES_EDITOR_MEETING_ROLES = new Set(['chair', 'secretary']);
export const MINUTES_EDITOR_TENANT_ROLES = new Set(['owner', 'admin', 'chair', 'secretary']);

export async function getMeetingWithMember(tenantId: string, meetingId: string, userId: string) {
  const [meetingSnap, memberSnap] = await Promise.all([
    getDoc(collections.meeting(tenantId, meetingId)),
    getDoc(collections.member(tenantId, userId)),
  ]);

  if (!meetingSnap.exists()) {
    throw new Error('Meeting not found');
  }

  if (!memberSnap.exists()) {
    throw new Error('Membership not found');
  }

  return {
    meeting: { id: meetingSnap.id, ...meetingSnap.data() } as Meeting,
    member: { id: memberSnap.id, ...memberSnap.data() } as Member,
  };
}

export function isMinutesEditor(meeting: Meeting, member: Member): boolean {
  if (MINUTES_EDITOR_TENANT_ROLES.has(member.role)) return true;

  return meeting.attendees.some(
    (attendee) => attendee.userId === member.userId && MINUTES_EDITOR_MEETING_ROLES.has(attendee.role)
  );
}

export function isMeetingMember(meeting: Meeting, userId: string): boolean {
  return meeting.attendees.some((attendee) => attendee.userId === userId);
}

export function updateReviewStatusAfterApproval(
  currentStatus: MinutesReviewStatus,
  reviewerStatuses: Array<'pending' | 'approved' | 'changes_requested'>
): MinutesReviewStatus {
  if (currentStatus === 'closed') return 'closed';
  if (reviewerStatuses.includes('changes_requested')) return 'changes_requested';
  if (reviewerStatuses.length > 0 && reviewerStatuses.every((status) => status === 'approved')) return 'approved';
  return 'in_review';
}

export function withResponseTime<T extends { respondedAt?: unknown }>(reviewer: T): T & { respondedAt: Timestamp } {
  return {
    ...reviewer,
    respondedAt: Timestamp.now(),
  };
}
