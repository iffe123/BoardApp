/**
 * Data Access Layer - Barrel exports
 *
 * Import from '@/lib/dal' for all data operations.
 */

export { meetingsDAL } from './meetings';
export { documentsDAL } from './documents';
export { membersDAL } from './members';
export { shareholdersDAL } from './shareholders';
export { sharesDAL, shareTransactionsDAL, computeCapTable } from './shares';
