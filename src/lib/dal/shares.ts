/**
 * Data Access Layer - Shares & Transactions
 *
 * Centralized Firestore operations for share entries
 * and share transactions in the digital Aktiebok.
 */

import {
  collections,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  query,
  where,
  orderBy,
} from '@/lib/firebase';
import { shareEntryConverter, shareTransactionConverter, shareholderConverter } from '@/lib/firebase/converters';
import { logger } from '@/lib/logger';
import type { ShareEntry, ShareTransaction, CapTableSummary, ShareClass } from '@/types/schema';

export const sharesDAL = {
  /**
   * List all share entries for a tenant.
   */
  async list(tenantId: string): Promise<ShareEntry[]> {
    const ref = collections.shares(tenantId).withConverter(shareEntryConverter);
    const snapshot = await getDocs(ref);
    return snapshot.docs.map((doc) => doc.data());
  },

  /**
   * List active share entries only.
   */
  async listActive(tenantId: string): Promise<ShareEntry[]> {
    const ref = collections.shares(tenantId).withConverter(shareEntryConverter);
    const q = query(ref, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  /**
   * List share entries for a specific shareholder.
   */
  async listByShareholder(tenantId: string, shareholderId: string): Promise<ShareEntry[]> {
    const ref = collections.shares(tenantId).withConverter(shareEntryConverter);
    const q = query(ref, where('shareholderId', '==', shareholderId), where('isActive', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  /**
   * Get a single share entry.
   */
  async get(tenantId: string, shareId: string): Promise<ShareEntry | null> {
    const ref = collections.share(tenantId, shareId).withConverter(shareEntryConverter);
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? snapshot.data() : null;
  },

  /**
   * Create a new share entry.
   */
  async create(tenantId: string, shareId: string, data: Omit<ShareEntry, 'id' | 'createdAt'>): Promise<void> {
    const ref = collections.share(tenantId, shareId);
    await setDoc(ref, {
      ...data,
      id: shareId,
      createdAt: Timestamp.now(),
    });

    logger.info('Share entry created', {
      orgId: tenantId,
      action: 'share.created',
      metadata: { shareId, shareholderId: data.shareholderId, numberOfShares: data.numberOfShares },
    });
  },

  /**
   * Deactivate a share entry (when shares are transferred/redeemed).
   */
  async deactivate(tenantId: string, shareId: string): Promise<void> {
    const ref = collections.share(tenantId, shareId);
    await updateDoc(ref, { isActive: false });

    logger.info('Share entry deactivated', {
      orgId: tenantId,
      action: 'share.deactivated',
      metadata: { shareId },
    });
  },
};

export const shareTransactionsDAL = {
  /**
   * List all transactions for a tenant.
   */
  async list(tenantId: string): Promise<ShareTransaction[]> {
    const ref = collections.shareTransactions(tenantId).withConverter(shareTransactionConverter);
    const q = query(ref, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  /**
   * Get a single transaction.
   */
  async get(tenantId: string, transactionId: string): Promise<ShareTransaction | null> {
    const ref = collections.shareTransaction(tenantId, transactionId).withConverter(shareTransactionConverter);
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? snapshot.data() : null;
  },

  /**
   * Create a new transaction (immutable — no update/delete).
   */
  async create(tenantId: string, transactionId: string, data: Omit<ShareTransaction, 'id' | 'createdAt'>): Promise<void> {
    const ref = collections.shareTransaction(tenantId, transactionId);
    await setDoc(ref, {
      ...data,
      id: transactionId,
      createdAt: Timestamp.now(),
    });

    logger.info('Share transaction created', {
      orgId: tenantId,
      action: 'share_transaction.created',
      metadata: { transactionId, type: data.type, numberOfShares: data.numberOfShares },
    });
  },
};

/**
 * Compute the cap table summary from active share entries and shareholders.
 */
export async function computeCapTable(tenantId: string): Promise<CapTableSummary> {
  const [activeShares, shareholders] = await Promise.all([
    sharesDAL.listActive(tenantId),
    (async () => {
      const ref = collections.shareholders(tenantId).withConverter(shareholderConverter);
      const q = query(ref, where('isActive', '==', true));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data());
    })(),
  ]);

  // Build shareholder name lookup
  const shareholderMap = new Map(shareholders.map((s) => [s.id, s.name]));

  // Aggregate by share class
  const classAggregates = new Map<ShareClass, { totalShares: number; votesPerShare: number; totalVotes: number }>();
  // Aggregate by shareholder
  const shareholderAggregates = new Map<string, {
    totalShares: number;
    totalVotes: number;
    sharesByClass: Partial<Record<ShareClass, number>>;
  }>();

  let totalShares = 0;
  let totalShareCapital = 0;
  let totalVotes = 0;

  for (const share of activeShares) {
    totalShares += share.numberOfShares;
    totalShareCapital += share.numberOfShares * share.nominalValue;
    const votes = share.numberOfShares * share.votesPerShare;
    totalVotes += votes;

    // By class
    const classAgg = classAggregates.get(share.shareClass) || { totalShares: 0, votesPerShare: share.votesPerShare, totalVotes: 0 };
    classAgg.totalShares += share.numberOfShares;
    classAgg.totalVotes += votes;
    classAggregates.set(share.shareClass, classAgg);

    // By shareholder
    const shAgg = shareholderAggregates.get(share.shareholderId) || { totalShares: 0, totalVotes: 0, sharesByClass: {} };
    shAgg.totalShares += share.numberOfShares;
    shAgg.totalVotes += votes;
    shAgg.sharesByClass[share.shareClass] = (shAgg.sharesByClass[share.shareClass] || 0) + share.numberOfShares;
    shareholderAggregates.set(share.shareholderId, shAgg);
  }

  const shareClasses = Array.from(classAggregates.entries()).map(([cls, agg]) => ({
    class: cls,
    totalShares: agg.totalShares,
    votesPerShare: agg.votesPerShare,
    totalVotes: agg.totalVotes,
    percentage: totalShares > 0 ? (agg.totalShares / totalShares) * 100 : 0,
  }));

  const shareholderSummaries = Array.from(shareholderAggregates.entries()).map(([shId, agg]) => ({
    shareholderId: shId,
    name: shareholderMap.get(shId) || 'Unknown',
    totalShares: agg.totalShares,
    totalVotes: agg.totalVotes,
    ownershipPercentage: totalShares > 0 ? (agg.totalShares / totalShares) * 100 : 0,
    votingPercentage: totalVotes > 0 ? (agg.totalVotes / totalVotes) * 100 : 0,
    sharesByClass: agg.sharesByClass,
  }));

  // Sort shareholders by ownership descending
  shareholderSummaries.sort((a, b) => b.ownershipPercentage - a.ownershipPercentage);

  return {
    tenantId,
    totalShares,
    totalShareCapital,
    shareClasses,
    shareholders: shareholderSummaries,
    lastUpdated: Timestamp.now(),
  };
}
