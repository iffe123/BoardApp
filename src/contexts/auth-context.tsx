'use client';

/**
 * Authentication Context
 *
 * Provides Firebase authentication state and user tenant claims
 * throughout the application.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  collections,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
} from '@/lib/firebase';
import type { User as UserProfile, MemberRole, Tenant } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface TenantClaims {
  [tenantId: string]: MemberRole;
}

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

interface AuthContextValue {
  // Auth state
  user: AuthUser | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Tenant claims
  tenantClaims: TenantClaims;
  currentTenantId: string | null;
  currentTenantRole: MemberRole | null;
  currentTenant: Tenant | null;

  // Tenant management
  setCurrentTenant: (tenantId: string) => Promise<void>;
  hasAccessToTenant: (tenantId: string) => boolean;
  getTenantRole: (tenantId: string) => MemberRole | null;

  // Auth actions
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;

  // Error handling
  error: string | null;
  clearError: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantClaims, setTenantClaims] = useState<TenantClaims>({});
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clear error helper
  const clearError = useCallback(() => setError(null), []);

  // Fetch user profile from Firestore
  const fetchUserProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(collections.user(uid));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as UserProfile;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  }, []);

  // Create user profile in Firestore
  const createUserProfile = useCallback(async (firebaseUser: User): Promise<UserProfile> => {
    const profile: UserProfile = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || 'User',
      avatarUrl: firebaseUser.photoURL || undefined,
      locale: 'sv-SE',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      notifications: {
        email: true,
        push: true,
        meetingReminders: true,
        documentUpdates: true,
        taskAssignments: true,
      },
      bankIdVerified: false,
    };

    await setDoc(collections.user(firebaseUser.uid), profile);
    return profile;
  }, []);

  // Fetch tenant details
  const fetchTenant = useCallback(async (tenantId: string): Promise<Tenant | null> => {
    try {
      const tenantDoc = await getDoc(collections.tenant(tenantId));
      if (tenantDoc.exists()) {
        return { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
      }
      return null;
    } catch (err) {
      console.error('Error fetching tenant:', err);
      return null;
    }
  }, []);

  // Extract tenant claims from Firebase user token
  const extractTenantClaims = useCallback(async (firebaseUser: User): Promise<TenantClaims> => {
    try {
      const tokenResult = await firebaseUser.getIdTokenResult();
      const claims = tokenResult.claims.tenants as TenantClaims | undefined;
      return claims || {};
    } catch (err) {
      console.error('Error extracting tenant claims:', err);
      return {};
    }
  }, []);

  // Fetch memberships from Firestore as fallback when claims are empty
  const fetchMembershipsFromFirestore = useCallback(async (userId: string): Promise<TenantClaims> => {
    try {
      // Query all tenants and check for membership
      const tenantsSnapshot = await getDocs(collections.tenants());
      const memberships: TenantClaims = {};

      for (const tenantDoc of tenantsSnapshot.docs) {
        const memberDoc = await getDoc(collections.member(tenantDoc.id, userId));
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          memberships[tenantDoc.id] = memberData.role as MemberRole;
        }
      }

      return memberships;
    } catch (err) {
      console.error('Error fetching memberships from Firestore:', err);
      return {};
    }
  }, []);

  // Set current tenant
  const setCurrentTenant = useCallback(async (tenantId: string) => {
    if (!tenantClaims[tenantId]) {
      setError('You do not have access to this organization');
      return;
    }

    const tenant = await fetchTenant(tenantId);
    if (tenant) {
      setCurrentTenantId(tenantId);
      setCurrentTenantState(tenant);
      // Persist selection
      localStorage.setItem('governanceos_current_tenant', tenantId);
    }
  }, [tenantClaims, fetchTenant]);

  // Check tenant access
  const hasAccessToTenant = useCallback((tenantId: string): boolean => {
    return tenantId in tenantClaims;
  }, [tenantClaims]);

  // Get tenant role
  const getTenantRole = useCallback((tenantId: string): MemberRole | null => {
    return tenantClaims[tenantId] || null;
  }, [tenantClaims]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);

      if (firebaseUser) {
        // Map Firebase user to our AuthUser type
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
        };
        setUser(authUser);

        // Fetch or create user profile
        let profile = await fetchUserProfile(firebaseUser.uid);
        if (!profile) {
          profile = await createUserProfile(firebaseUser);
        }
        setUserProfile(profile);

        // Extract tenant claims from JWT, fallback to Firestore
        let claims = await extractTenantClaims(firebaseUser);

        // If no claims from JWT, check Firestore memberships as fallback
        if (Object.keys(claims).length === 0) {
          claims = await fetchMembershipsFromFirestore(firebaseUser.uid);
        }

        // Also check for pending tenant from recent org creation
        const pendingTenantId = localStorage.getItem('governanceos_pending_tenant');
        if (pendingTenantId && !claims[pendingTenantId]) {
          // Check if user is member of pending tenant
          const memberDoc = await getDoc(collections.member(pendingTenantId, firebaseUser.uid));
          if (memberDoc.exists()) {
            const memberData = memberDoc.data();
            claims[pendingTenantId] = memberData.role as MemberRole;
          }
          localStorage.removeItem('governanceos_pending_tenant');
        }

        setTenantClaims(claims);

        // Restore or set current tenant
        const savedTenantId = localStorage.getItem('governanceos_current_tenant');
        const tenantIds = Object.keys(claims);

        if (savedTenantId && claims[savedTenantId]) {
          const tenant = await fetchTenant(savedTenantId);
          setCurrentTenantId(savedTenantId);
          setCurrentTenantState(tenant);
        } else if (tenantIds.length > 0) {
          const firstTenantId = tenantIds[0];
          const tenant = await fetchTenant(firstTenantId);
          setCurrentTenantId(firstTenantId);
          setCurrentTenantState(tenant);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setTenantClaims({});
        setCurrentTenantId(null);
        setCurrentTenantState(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile, createUserProfile, extractTenantClaims, fetchMembershipsFromFirestore, fetchTenant]);

  // Auth actions
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
      throw err;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setError(message);
      throw err;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      await signInWithPopup(auth, provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(message);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      localStorage.removeItem('governanceos_current_tenant');
      await firebaseSignOut(auth);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      setError(message);
      throw err;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(message);
      throw err;
    }
  }, []);

  const updateUserProfileAction = useCallback(async (data: { displayName?: string; photoURL?: string }) => {
    setError(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      await updateProfile(currentUser, data);

      if (userProfile) {
        const updates: Partial<UserProfile> = {
          updatedAt: Timestamp.now(),
        };
        if (data.displayName) updates.displayName = data.displayName;
        if (data.photoURL) updates.avatarUrl = data.photoURL;

        await setDoc(collections.user(currentUser.uid), updates, { merge: true });
        setUserProfile({ ...userProfile, ...updates });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
      throw err;
    }
  }, [userProfile]);

  const currentTenantRole = currentTenantId ? tenantClaims[currentTenantId] || null : null;

  const value: AuthContextValue = {
    user,
    userProfile,
    isLoading,
    isAuthenticated: !!user,
    tenantClaims,
    currentTenantId,
    currentTenantRole,
    currentTenant,
    setCurrentTenant,
    hasAccessToTenant,
    getTenantRole,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateUserProfile: updateUserProfileAction,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

export function usePermissions() {
  const { currentTenantRole } = useAuth();

  const isAdmin = currentTenantRole === 'owner' || currentTenantRole === 'admin';
  const isOwner = currentTenantRole === 'owner';
  const canManageMeetings = ['owner', 'admin', 'secretary', 'chair'].includes(currentTenantRole || '');
  const canManageMembers = isAdmin;
  const canManageDocuments = ['owner', 'admin', 'secretary'].includes(currentTenantRole || '');
  const canViewFinancials = ['owner', 'admin', 'chair', 'director', 'auditor'].includes(currentTenantRole || '');
  const canSignDocuments = ['owner', 'admin', 'chair', 'secretary', 'director'].includes(currentTenantRole || '');
  const isObserver = currentTenantRole === 'observer';

  return {
    isAdmin,
    isOwner,
    canManageMeetings,
    canManageMembers,
    canManageDocuments,
    canViewFinancials,
    canSignDocuments,
    isObserver,
    role: currentTenantRole,
  };
}
