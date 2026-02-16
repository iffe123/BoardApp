/**
 * In-App Notification Service
 *
 * Handles creating, fetching, and managing in-app notifications.
 * Notifications are stored in Firestore and can be delivered via
 * in-app, email, or push channels.
 */

import { collections, Timestamp, db } from '@/lib/firebase';
import {
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  writeBatch,
  doc,
} from 'firebase/firestore';
import type { Notification } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateNotificationInput {
  userId: string;
  tenantId: string;
  type: Notification['type'];
  title: string;
  body: string;
  resourceType: string;
  resourceId: string;
  resourceUrl: string;
  deliveredVia?: Notification['deliveredVia'];
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: Notification['type'];
  limit?: number;
}

// ============================================================================
// CREATE NOTIFICATIONS
// ============================================================================

/**
 * Create a single in-app notification
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<string> {
  if (!db) throw new Error('Database not initialized');

  const notificationData: Omit<Notification, 'id'> = {
    userId: input.userId,
    tenantId: input.tenantId,
    type: input.type,
    title: input.title,
    body: input.body,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    resourceUrl: input.resourceUrl,
    read: false,
    deliveredVia: input.deliveredVia || ['in_app'],
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(
    collections.notifications(input.tenantId),
    notificationData
  );

  return docRef.id;
}

/**
 * Send notification to multiple users
 */
export async function createBulkNotifications(
  userIds: string[],
  input: Omit<CreateNotificationInput, 'userId'>
): Promise<number> {
  if (!db) throw new Error('Database not initialized');

  const batch = writeBatch(db);
  let count = 0;

  for (const userId of userIds) {
    const notificationsRef = collections.notifications(input.tenantId);
    const docRef = doc(notificationsRef);

    const notificationData: Omit<Notification, 'id'> = {
      userId,
      tenantId: input.tenantId,
      type: input.type,
      title: input.title,
      body: input.body,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceUrl: input.resourceUrl,
      read: false,
      deliveredVia: input.deliveredVia || ['in_app'],
      createdAt: Timestamp.now(),
    };

    batch.set(docRef, notificationData);
    count++;

    // Firestore batch limit is 500 operations
    if (count % 500 === 0) {
      await batch.commit();
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }

  return count;
}

// ============================================================================
// FETCH NOTIFICATIONS
// ============================================================================

/**
 * Get notifications for a user within a tenant
 */
export async function getUserNotifications(
  tenantId: string,
  userId: string,
  filters: NotificationFilters = {}
): Promise<Array<Notification & { id: string }>> {
  if (!db) throw new Error('Database not initialized');

  const notificationsRef = collections.notifications(tenantId);

  // Build query based on filters
  let q;
  if (filters.unreadOnly && filters.type) {
    q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false),
      where('type', '==', filters.type),
      orderBy('createdAt', 'desc'),
      limit(filters.limit || 50)
    );
  } else if (filters.unreadOnly) {
    q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(filters.limit || 50)
    );
  } else if (filters.type) {
    q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('type', '==', filters.type),
      orderBy('createdAt', 'desc'),
      limit(filters.limit || 50)
    );
  } else {
    q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(filters.limit || 50)
    );
  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as Notification),
    id: docSnap.id,
  }));
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(
  tenantId: string,
  userId: string
): Promise<number> {
  if (!db) throw new Error('Database not initialized');

  const notificationsRef = collections.notifications(tenantId);
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('read', '==', false)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

// ============================================================================
// UPDATE NOTIFICATIONS
// ============================================================================

/**
 * Mark a single notification as read
 */
export async function markAsRead(
  tenantId: string,
  notificationId: string
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const notificationRef = doc(collections.notifications(tenantId), notificationId);
  await updateDoc(notificationRef, {
    read: true,
    readAt: Timestamp.now(),
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
  tenantId: string,
  userId: string
): Promise<number> {
  if (!db) throw new Error('Database not initialized');

  const notificationsRef = collections.notifications(tenantId);
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('read', '==', false)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return 0;

  const batch = writeBatch(db);
  let count = 0;

  for (const docSnap of snapshot.docs) {
    batch.update(docSnap.ref, {
      read: true,
      readAt: Timestamp.now(),
    });
    count++;
  }

  await batch.commit();
  return count;
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Create a meeting reminder notification
 */
export async function notifyMeetingReminder(
  tenantId: string,
  userId: string,
  meetingId: string,
  meetingTitle: string,
  hoursUntil: number
): Promise<string> {
  return createNotification({
    userId,
    tenantId,
    type: 'meeting_reminder',
    title: 'Meeting Reminder',
    body: `"${meetingTitle}" starts in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}.`,
    resourceType: 'meeting',
    resourceId: meetingId,
    resourceUrl: `/dashboard/${tenantId}/meetings/${meetingId}`,
  });
}

/**
 * Create a document shared notification
 */
export async function notifyDocumentShared(
  tenantId: string,
  userId: string,
  documentId: string,
  documentName: string,
  sharedByName: string
): Promise<string> {
  return createNotification({
    userId,
    tenantId,
    type: 'document_shared',
    title: 'Document Shared',
    body: `${sharedByName} shared "${documentName}" with you.`,
    resourceType: 'document',
    resourceId: documentId,
    resourceUrl: `/dashboard/${tenantId}/documents?doc=${documentId}`,
  });
}

/**
 * Create a signature required notification
 */
export async function notifySignatureRequired(
  tenantId: string,
  userId: string,
  documentId: string,
  documentTitle: string,
  requestedByName: string
): Promise<string> {
  return createNotification({
    userId,
    tenantId,
    type: 'signature_required',
    title: 'Signature Required',
    body: `${requestedByName} requested your signature on "${documentTitle}".`,
    resourceType: 'document',
    resourceId: documentId,
    resourceUrl: `/dashboard/${tenantId}/documents?doc=${documentId}&sign=true`,
  });
}

/**
 * Create a task assigned notification
 */
export async function notifyTaskAssigned(
  tenantId: string,
  userId: string,
  meetingId: string,
  taskTitle: string,
  assignedByName: string
): Promise<string> {
  return createNotification({
    userId,
    tenantId,
    type: 'task_assigned',
    title: 'Task Assigned',
    body: `${assignedByName} assigned you: "${taskTitle}".`,
    resourceType: 'meeting',
    resourceId: meetingId,
    resourceUrl: `/dashboard/${tenantId}/meetings/${meetingId}`,
  });
}

/**
 * Create a meeting updated notification
 */
export async function notifyMeetingUpdated(
  tenantId: string,
  userId: string,
  meetingId: string,
  meetingTitle: string,
  updatedByName: string,
  changeDescription: string
): Promise<string> {
  return createNotification({
    userId,
    tenantId,
    type: 'meeting_updated',
    title: 'Meeting Updated',
    body: `${updatedByName} updated "${meetingTitle}": ${changeDescription}`,
    resourceType: 'meeting',
    resourceId: meetingId,
    resourceUrl: `/dashboard/${tenantId}/meetings/${meetingId}`,
  });
}
