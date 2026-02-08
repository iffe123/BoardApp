/**
 * Data Access Layer - Members
 *
 * Centralized Firestore operations for organization members.
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
  serverTimestamp,
  query,
  where,
} from '@/lib/firebase';
import { memberConverter } from '@/lib/firebase/converters';
import { logger } from '@/lib/logger';
import type { Member, MemberRole } from '@/types/schema';

export const membersDAL = {
  /**
   * List all members of a tenant.
   */
  async list(tenantId: string): Promise<Member[]> {
    const ref = collections.members(tenantId).withConverter(memberConverter);
    const snapshot = await getDocs(ref);
    return snapshot.docs.map((doc) => doc.data());
  },

  /**
   * List active members only.
   */
  async listActive(tenantId: string): Promise<Member[]> {
    const ref = collections.members(tenantId).withConverter(memberConverter);
    const q = query(ref, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  /**
   * Get a single member by their user ID.
   */
  async get(tenantId: string, memberId: string): Promise<Member | null> {
    const ref = collections.member(tenantId, memberId).withConverter(memberConverter);
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? snapshot.data() : null;
  },

  /**
   * Add a new member to a tenant.
   */
  async create(tenantId: string, memberId: string, data: Omit<Member, 'id'>): Promise<void> {
    const ref = collections.member(tenantId, memberId);
    await setDoc(ref, {
      ...data,
      id: memberId,
      joinedAt: Timestamp.now(),
    });

    logger.info('Member added', {
      orgId: tenantId,
      action: 'member.created',
      metadata: { memberId, role: data.role },
    });
  },

  /**
   * Update a member's role.
   */
  async updateRole(tenantId: string, memberId: string, role: MemberRole): Promise<void> {
    const ref = collections.member(tenantId, memberId);
    await updateDoc(ref, { role, updatedAt: serverTimestamp() });

    logger.info('Member role updated', {
      orgId: tenantId,
      action: 'member.role_changed',
      metadata: { memberId, newRole: role },
    });
  },

  /**
   * Remove a member from a tenant.
   */
  async remove(tenantId: string, memberId: string): Promise<void> {
    const ref = collections.member(tenantId, memberId);
    await deleteDoc(ref);

    logger.info('Member removed', {
      orgId: tenantId,
      action: 'member.removed',
      metadata: { memberId },
    });
  },
};
