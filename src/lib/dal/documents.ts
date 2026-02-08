/**
 * Data Access Layer - Documents
 *
 * Centralized Firestore operations for documents.
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
import { documentConverter } from '@/lib/firebase/converters';
import { logger } from '@/lib/logger';
import type { Document, DocumentCategory } from '@/types/schema';

interface ListDocumentsOptions {
  category?: DocumentCategory | 'all';
  meetingId?: string;
  limit?: number;
  includeArchived?: boolean;
}

export const documentsDAL = {
  /**
   * List documents for a tenant with optional filters.
   */
  async list(tenantId: string, options: ListDocumentsOptions = {}): Promise<Document[]> {
    const { category, meetingId, limit: maxResults = 50, includeArchived = false } = options;

    const ref = collections.documents(tenantId).withConverter(documentConverter);
    const constraints = [
      ...(includeArchived ? [] : [where('isArchived', '==', false)]),
      orderBy('createdAt', 'desc'),
      firestoreLimit(maxResults),
    ];

    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);
    let documents = snapshot.docs.map((doc) => doc.data());

    // Client-side filtering for compound query limitations
    if (category && category !== 'all') {
      documents = documents.filter((d) => d.category === category);
    }
    if (meetingId) {
      documents = documents.filter((d) => d.meetingIds.includes(meetingId));
    }

    return documents;
  },

  /**
   * Get a single document by ID.
   */
  async get(tenantId: string, documentId: string): Promise<Document | null> {
    const ref = collections.document(tenantId, documentId).withConverter(documentConverter);
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? snapshot.data() : null;
  },

  /**
   * Create a new document record.
   */
  async create(tenantId: string, data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = collections.documents(tenantId);
    const docRef = await addDoc(ref, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    logger.info('Document created', {
      orgId: tenantId,
      action: 'document.created',
      metadata: { documentId: docRef.id, name: data.name },
    });

    return docRef.id;
  },

  /**
   * Update an existing document.
   */
  async update(tenantId: string, documentId: string, data: Partial<Document>): Promise<void> {
    const ref = collections.document(tenantId, documentId);
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    logger.info('Document updated', {
      orgId: tenantId,
      action: 'document.updated',
      metadata: { documentId },
    });
  },

  /**
   * Soft-delete a document (archive it).
   */
  async archive(tenantId: string, documentId: string): Promise<void> {
    const ref = collections.document(tenantId, documentId);
    await updateDoc(ref, {
      isArchived: true,
      updatedAt: serverTimestamp(),
    });

    logger.info('Document archived', {
      orgId: tenantId,
      action: 'document.archived',
      metadata: { documentId },
    });
  },

  /**
   * Hard-delete a document.
   */
  async delete(tenantId: string, documentId: string): Promise<void> {
    const ref = collections.document(tenantId, documentId);
    await deleteDoc(ref);

    logger.info('Document deleted', {
      orgId: tenantId,
      action: 'document.deleted',
      metadata: { documentId },
    });
  },
};
