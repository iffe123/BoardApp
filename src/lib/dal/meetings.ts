/**
 * Data Access Layer - Meetings
 *
 * Centralized Firestore operations for meetings.
 * Enforces multi-tenant scoping and provides type-safe access.
 */

import {
  collections,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from '@/lib/firebase';
import { addDoc } from 'firebase/firestore';
import { meetingConverter } from '@/lib/firebase/converters';
import { logger } from '@/lib/logger';
import type { Meeting, MeetingStatus } from '@/types/schema';

interface ListMeetingsOptions {
  status?: MeetingStatus | 'all';
  limit?: number;
}

export const meetingsDAL = {
  /**
   * List meetings for a tenant, optionally filtered by status.
   */
  async list(tenantId: string, options: ListMeetingsOptions = {}): Promise<Meeting[]> {
    const { status, limit: maxResults = 50 } = options;

    const ref = collections.meetings(tenantId).withConverter(meetingConverter);
    let q;

    if (status && status !== 'all') {
      q = query(
        ref,
        where('status', '==', status),
        orderBy('scheduledStart', 'desc'),
        firestoreLimit(maxResults)
      );
    } else {
      q = query(
        ref,
        orderBy('scheduledStart', 'desc'),
        firestoreLimit(maxResults)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  /**
   * Get a single meeting by ID.
   */
  async get(tenantId: string, meetingId: string): Promise<Meeting | null> {
    const ref = collections.meeting(tenantId, meetingId).withConverter(meetingConverter);
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? snapshot.data() : null;
  },

  /**
   * Create a new meeting.
   */
  async create(tenantId: string, data: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = collections.meetings(tenantId);
    const docRef = await addDoc(ref, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    logger.info('Meeting created', {
      orgId: tenantId,
      action: 'meeting.created',
      metadata: { meetingId: docRef.id, title: data.title },
    });

    return docRef.id;
  },

  /**
   * Update an existing meeting.
   */
  async update(tenantId: string, meetingId: string, data: Partial<Meeting>): Promise<void> {
    const ref = collections.meeting(tenantId, meetingId);
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    logger.info('Meeting updated', {
      orgId: tenantId,
      action: 'meeting.updated',
      metadata: { meetingId },
    });
  },

  /**
   * Delete a meeting.
   */
  async delete(tenantId: string, meetingId: string): Promise<void> {
    const ref = collections.meeting(tenantId, meetingId);
    await deleteDoc(ref);

    logger.info('Meeting deleted', {
      orgId: tenantId,
      action: 'meeting.deleted',
      metadata: { meetingId },
    });
  },
};
