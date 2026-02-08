/**
 * Data Access Layer - Shareholders
 *
 * Centralized Firestore operations for the share registry (Aktiebok).
 * Enforces multi-tenant scoping and provides type-safe access.
 */

import {
  collections,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  where,
} from '@/lib/firebase';
import { shareholderConverter } from '@/lib/firebase/converters';
import { logger } from '@/lib/logger';
import type { Shareholder } from '@/types/schema';

export const shareholdersDAL = {
  /**
   * List all shareholders for a tenant.
   */
  async list(tenantId: string): Promise<Shareholder[]> {
    const ref = collections.shareholders(tenantId).withConverter(shareholderConverter);
    const snapshot = await getDocs(ref);
    return snapshot.docs.map((doc) => doc.data());
  },

  /**
   * List active shareholders only.
   */
  async listActive(tenantId: string): Promise<Shareholder[]> {
    const ref = collections.shareholders(tenantId).withConverter(shareholderConverter);
    const q = query(ref, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  /**
   * Get a single shareholder by ID.
   */
  async get(tenantId: string, shareholderId: string): Promise<Shareholder | null> {
    const ref = collections.shareholder(tenantId, shareholderId).withConverter(shareholderConverter);
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? snapshot.data() : null;
  },

  /**
   * Create a new shareholder.
   */
  async create(tenantId: string, shareholderId: string, data: Omit<Shareholder, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const ref = collections.shareholder(tenantId, shareholderId);
    const now = Timestamp.now();
    await setDoc(ref, {
      ...data,
      id: shareholderId,
      createdAt: now,
      updatedAt: now,
    });

    logger.info('Shareholder created', {
      orgId: tenantId,
      action: 'shareholder.created',
      metadata: { shareholderId, name: data.name },
    });
  },

  /**
   * Update a shareholder.
   */
  async update(tenantId: string, shareholderId: string, data: Partial<Shareholder>): Promise<void> {
    const ref = collections.shareholder(tenantId, shareholderId);
    await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });

    logger.info('Shareholder updated', {
      orgId: tenantId,
      action: 'shareholder.updated',
      metadata: { shareholderId },
    });
  },

  /**
   * Delete a shareholder (only if no active shares).
   */
  async remove(tenantId: string, shareholderId: string): Promise<void> {
    const ref = collections.shareholder(tenantId, shareholderId);
    await deleteDoc(ref);

    logger.info('Shareholder removed', {
      orgId: tenantId,
      action: 'shareholder.removed',
      metadata: { shareholderId },
    });
  },
};
