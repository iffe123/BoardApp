/**
 * Firebase Configuration and Initialization
 *
 * Configures Firebase for the GovernanceOS platform with
 * European data residency (europe-west1/europe-north1).
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch,
  runTransaction,
  serverTimestamp,
  DocumentReference,
  CollectionReference,
  QueryConstraint,
} from 'firebase/firestore';
import {
  getStorage,
  FirebaseStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

// Firebase configuration - use environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function initializeFirebase() {
  // Skip initialization during build if no API key is available
  if (!firebaseConfig.apiKey) {
    console.warn('Firebase API key not found. Using mock Firebase configuration.');
    // Return mock objects for build time
    return {
      app: null as unknown as FirebaseApp,
      auth: null as unknown as Auth,
      db: null as unknown as Firestore,
      storage: null as unknown as FirebaseStorage,
    };
  }

  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Connect to emulators in development
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
    } catch {
      // Emulators already connected
    }
  }

  return { app, auth, db, storage };
}

// Initialize on module load
const firebase = initializeFirebase();
app = firebase.app;
auth = firebase.auth;
db = firebase.db;
storage = firebase.storage;

// Export initialized instances
export { app, auth, db, storage };

// Export Firebase utilities
export {
  // Auth exports
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  // Firestore exports
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch,
  runTransaction,
  serverTimestamp,
  // Storage exports
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
};

// Export types
export type {
  User,
  DocumentReference,
  CollectionReference,
  QueryConstraint,
};

// ============================================================================
// COLLECTION REFERENCES
// ============================================================================

export const collections = {
  users: () => collection(db, 'users'),
  user: (userId: string) => doc(db, 'users', userId),
  userPrivateNotes: (userId: string) => collection(db, 'users', userId, 'private_notes'),

  tenants: () => collection(db, 'tenants'),
  tenant: (tenantId: string) => doc(db, 'tenants', tenantId),

  members: (tenantId: string) => collection(db, 'tenants', tenantId, 'members'),
  member: (tenantId: string, memberId: string) => doc(db, 'tenants', tenantId, 'members', memberId),

  meetings: (tenantId: string) => collection(db, 'tenants', tenantId, 'meetings'),
  meeting: (tenantId: string, meetingId: string) => doc(db, 'tenants', tenantId, 'meetings', meetingId),

  documents: (tenantId: string) => collection(db, 'tenants', tenantId, 'documents'),
  document: (tenantId: string, documentId: string) => doc(db, 'tenants', tenantId, 'documents', documentId),

  financials: (tenantId: string) => collection(db, 'tenants', tenantId, 'financials'),
  financial: (tenantId: string, periodId: string) => doc(db, 'tenants', tenantId, 'financials', periodId),

  decisions: (tenantId: string) => collection(db, 'tenants', tenantId, 'decisions'),
  decision: (tenantId: string, decisionId: string) => doc(db, 'tenants', tenantId, 'decisions', decisionId),

  templates: (tenantId: string) => collection(db, 'tenants', tenantId, 'templates'),
  template: (tenantId: string, templateId: string) => doc(db, 'tenants', tenantId, 'templates', templateId),

  erpConnections: (tenantId: string) => collection(db, 'tenants', tenantId, 'erp_connections'),
  erpConnection: (tenantId: string, connectionId: string) => doc(db, 'tenants', tenantId, 'erp_connections', connectionId),

  auditLogs: (tenantId: string) => collection(db, 'tenants', tenantId, 'audit_logs'),
  signatureAudits: (tenantId: string) => collection(db, 'tenants', tenantId, 'signature_audits'),
  notifications: (tenantId: string) => collection(db, 'tenants', tenantId, 'notifications'),
  signatures: (tenantId: string) => collection(db, 'tenants', tenantId, 'signatures'),
  signature: (tenantId: string, signatureId: string) => doc(db, 'tenants', tenantId, 'signatures', signatureId),

  systemTemplates: () => collection(db, 'system_templates'),
  clientManagers: () => collection(db, 'client_managers'),
};

// ============================================================================
// TIMESTAMP UTILITIES
// ============================================================================

export function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

export function fromTimestamp(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

export function nowTimestamp(): Timestamp {
  return Timestamp.now();
}

// ============================================================================
// BATCH OPERATIONS HELPER
// ============================================================================

export async function batchWrite(
  operations: Array<{
    type: 'set' | 'update' | 'delete';
    ref: DocumentReference;
    data?: Record<string, unknown>;
  }>
): Promise<void> {
  const batch = writeBatch(db);

  for (const op of operations) {
    switch (op.type) {
      case 'set':
        batch.set(op.ref, op.data!);
        break;
      case 'update':
        batch.update(op.ref, op.data!);
        break;
      case 'delete':
        batch.delete(op.ref);
        break;
    }
  }

  await batch.commit();
}
