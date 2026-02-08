/**
 * Firestore Data Converters
 *
 * Type-safe converters for Firestore documents.
 * These ensure that data read from and written to Firestore
 * is properly typed without manual casting.
 *
 * Usage:
 *   const ref = collection(db, path).withConverter(meetingConverter);
 *   const snapshot = await getDoc(ref); // snapshot.data() is Meeting | undefined
 */

import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  DocumentData,
} from 'firebase/firestore';
import type {
  Meeting,
  Document,
  Member,
  Tenant,
  FinancialPeriod,
  Decision,
  MeetingTemplate,
  AuditLog,
} from '@/types/schema';

/**
 * Generic converter factory that handles the id field extraction pattern
 */
function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): DocumentData {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = data;
      return rest;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): T {
      const data = snapshot.data(options);
      return { id: snapshot.id, ...data } as T;
    },
  };
}

export const tenantConverter = createConverter<Tenant>();
export const meetingConverter = createConverter<Meeting>();
export const memberConverter = createConverter<Member>();
export const documentConverter = createConverter<Document>();
export const financialConverter = createConverter<FinancialPeriod>();
export const decisionConverter = createConverter<Decision>();
export const templateConverter = createConverter<MeetingTemplate>();
export const auditLogConverter = createConverter<AuditLog>();
