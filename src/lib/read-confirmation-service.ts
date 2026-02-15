/**
 * Document Read Confirmation Service
 *
 * Tracks which users have opened and read specific documents.
 * Provides engagement analytics for admins and supports
 * automated reminders for unread board packs.
 */

import { db, Timestamp } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

export interface ReadConfirmation {
  id: string;
  documentId: string;
  tenantId: string;
  userId: string;
  userName: string;
  firstReadAt: Timestamp;
  lastReadAt: Timestamp;
  readCount: number;
  timeSpentSeconds: number; // Approximate reading time
  confirmed: boolean; // Explicit "I have read this" confirmation
  confirmedAt?: Timestamp;
}

export interface DocumentReadStats {
  documentId: string;
  totalMembers: number;
  readCount: number;
  confirmedCount: number;
  readPercentage: number;
  readers: Array<{
    userId: string;
    userName: string;
    firstReadAt: Timestamp;
    lastReadAt: Timestamp;
    confirmed: boolean;
  }>;
  nonReaders: Array<{
    userId: string;
    userName: string;
  }>;
}

// ============================================================================
// COLLECTION REFERENCE
// ============================================================================

function readConfirmationsCollection(tenantId: string) {
  return collection(db, 'tenants', tenantId, 'read_confirmations');
}

function readConfirmationDoc(tenantId: string, documentId: string, userId: string) {
  return doc(db, 'tenants', tenantId, 'read_confirmations', `${documentId}_${userId}`);
}

// ============================================================================
// TRACK READS
// ============================================================================

/**
 * Record that a user has opened/read a document
 */
export async function trackDocumentRead(
  tenantId: string,
  documentId: string,
  userId: string,
  userName: string,
  timeSpentSeconds: number = 0
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const confirmationRef = readConfirmationDoc(tenantId, documentId, userId);
  const existing = await getDoc(confirmationRef);

  if (existing.exists()) {
    const data = existing.data() as ReadConfirmation;
    await setDoc(
      confirmationRef,
      {
        ...data,
        lastReadAt: Timestamp.now(),
        readCount: (data.readCount || 0) + 1,
        timeSpentSeconds: (data.timeSpentSeconds || 0) + timeSpentSeconds,
      },
      { merge: true }
    );
  } else {
    const confirmation: ReadConfirmation = {
      id: `${documentId}_${userId}`,
      documentId,
      tenantId,
      userId,
      userName,
      firstReadAt: Timestamp.now(),
      lastReadAt: Timestamp.now(),
      readCount: 1,
      timeSpentSeconds,
      confirmed: false,
    };

    await setDoc(confirmationRef, confirmation);
  }
}

/**
 * Explicitly confirm that a user has read a document
 */
export async function confirmDocumentRead(
  tenantId: string,
  documentId: string,
  userId: string,
  userName: string
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const confirmationRef = readConfirmationDoc(tenantId, documentId, userId);
  const existing = await getDoc(confirmationRef);

  if (existing.exists()) {
    await setDoc(
      confirmationRef,
      {
        confirmed: true,
        confirmedAt: Timestamp.now(),
        lastReadAt: Timestamp.now(),
      },
      { merge: true }
    );
  } else {
    const confirmation: ReadConfirmation = {
      id: `${documentId}_${userId}`,
      documentId,
      tenantId,
      userId,
      userName,
      firstReadAt: Timestamp.now(),
      lastReadAt: Timestamp.now(),
      readCount: 1,
      timeSpentSeconds: 0,
      confirmed: true,
      confirmedAt: Timestamp.now(),
    };

    await setDoc(confirmationRef, confirmation);
  }
}

// ============================================================================
// FETCH READ STATS
// ============================================================================

/**
 * Get read confirmations for a specific document
 */
export async function getDocumentReadConfirmations(
  tenantId: string,
  documentId: string
): Promise<ReadConfirmation[]> {
  if (!db) throw new Error('Database not initialized');

  const ref = readConfirmationsCollection(tenantId);
  const q = query(
    ref,
    where('documentId', '==', documentId),
    orderBy('firstReadAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data() as ReadConfirmation);
}

/**
 * Get document read statistics including who has/hasn't read it
 */
export async function getDocumentReadStats(
  tenantId: string,
  documentId: string,
  allMembers: Array<{ userId: string; userName: string }>
): Promise<DocumentReadStats> {
  const confirmations = await getDocumentReadConfirmations(tenantId, documentId);
  const readerMap = new Map(confirmations.map((c) => [c.userId, c]));

  const readers = confirmations.map((c) => ({
    userId: c.userId,
    userName: c.userName,
    firstReadAt: c.firstReadAt,
    lastReadAt: c.lastReadAt,
    confirmed: c.confirmed,
  }));

  const nonReaders = allMembers
    .filter((m) => !readerMap.has(m.userId))
    .map((m) => ({
      userId: m.userId,
      userName: m.userName,
    }));

  const confirmedCount = confirmations.filter((c) => c.confirmed).length;

  return {
    documentId,
    totalMembers: allMembers.length,
    readCount: confirmations.length,
    confirmedCount,
    readPercentage: allMembers.length > 0
      ? (confirmations.length / allMembers.length) * 100
      : 0,
    readers,
    nonReaders,
  };
}

/**
 * Get all documents a user has read in a tenant
 */
export async function getUserReadHistory(
  tenantId: string,
  userId: string
): Promise<ReadConfirmation[]> {
  if (!db) throw new Error('Database not initialized');

  const ref = readConfirmationsCollection(tenantId);
  const q = query(
    ref,
    where('userId', '==', userId),
    orderBy('lastReadAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data() as ReadConfirmation);
}

/**
 * Check if a user has read a specific document
 */
export async function hasUserReadDocument(
  tenantId: string,
  documentId: string,
  userId: string
): Promise<{ read: boolean; confirmed: boolean }> {
  if (!db) throw new Error('Database not initialized');

  const confirmationRef = readConfirmationDoc(tenantId, documentId, userId);
  const docSnap = await getDoc(confirmationRef);

  if (!docSnap.exists()) {
    return { read: false, confirmed: false };
  }

  const data = docSnap.data() as ReadConfirmation;
  return { read: true, confirmed: data.confirmed };
}
