/**
 * Organization Zustand Store
 *
 * Client-side state management for the current organization/tenant context.
 * Manages tenant selection, member data, and organization-scoped preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tenant, Member, MemberRole } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface OrganizationStoreState {
  // Current tenant
  currentTenant: Tenant | null;
  currentMembership: Member | null;

  // Available tenants for the user
  availableTenants: Tenant[];

  // Members cache for current tenant
  members: Member[];
  isLoadingMembers: boolean;

  // ERP connection status
  erpStatus: {
    fortnox: 'connected' | 'disconnected' | 'error' | 'unknown';
    visma: 'connected' | 'disconnected' | 'error' | 'unknown';
  };

  // Calendar connection status
  calendarStatus: {
    google: 'connected' | 'disconnected' | 'error' | 'unknown';
    microsoft: 'connected' | 'disconnected' | 'error' | 'unknown';
  };

  // Actions - Tenant
  setCurrentTenant: (tenant: Tenant | null) => void;
  setCurrentMembership: (membership: Member | null) => void;
  setAvailableTenants: (tenants: Tenant[]) => void;

  // Actions - Members
  setMembers: (members: Member[]) => void;
  setLoadingMembers: (loading: boolean) => void;
  addMember: (member: Member) => void;
  updateMember: (memberId: string, updates: Partial<Member>) => void;
  removeMember: (memberId: string) => void;

  // Actions - Integration status
  setERPStatus: (provider: 'fortnox' | 'visma', status: OrganizationStoreState['erpStatus']['fortnox']) => void;
  setCalendarStatus: (provider: 'google' | 'microsoft', status: OrganizationStoreState['calendarStatus']['google']) => void;

  // Computed - Permission checks
  hasRole: (roles: MemberRole[]) => boolean;
  isAdmin: () => boolean;
  canManageMeetings: () => boolean;
  canManageDocuments: () => boolean;
  canAccessFinancials: () => boolean;
}

// ============================================================================
// STORE
// ============================================================================

export const useOrganizationStore = create<OrganizationStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTenant: null,
      currentMembership: null,
      availableTenants: [],
      members: [],
      isLoadingMembers: false,
      erpStatus: {
        fortnox: 'unknown',
        visma: 'unknown',
      },
      calendarStatus: {
        google: 'unknown',
        microsoft: 'unknown',
      },

      // Tenant actions
      setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
      setCurrentMembership: (membership) => set({ currentMembership: membership }),
      setAvailableTenants: (tenants) => set({ availableTenants: tenants }),

      // Members actions
      setMembers: (members) => set({ members }),
      setLoadingMembers: (loading) => set({ isLoadingMembers: loading }),
      addMember: (member) =>
        set((state) => ({ members: [...state.members, member] })),
      updateMember: (memberId, updates) =>
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, ...updates } : m
          ),
        })),
      removeMember: (memberId) =>
        set((state) => ({
          members: state.members.filter((m) => m.id !== memberId),
        })),

      // Integration status
      setERPStatus: (provider, status) =>
        set((state) => ({
          erpStatus: { ...state.erpStatus, [provider]: status },
        })),
      setCalendarStatus: (provider, status) =>
        set((state) => ({
          calendarStatus: { ...state.calendarStatus, [provider]: status },
        })),

      // Permission checks
      hasRole: (roles) => {
        const membership = get().currentMembership;
        if (!membership) return false;
        return roles.includes(membership.role);
      },

      isAdmin: () => {
        const membership = get().currentMembership;
        if (!membership) return false;
        return ['owner', 'admin'].includes(membership.role);
      },

      canManageMeetings: () => {
        const membership = get().currentMembership;
        if (!membership) return false;
        return ['owner', 'admin', 'secretary', 'chair'].includes(membership.role);
      },

      canManageDocuments: () => {
        const membership = get().currentMembership;
        if (!membership) return false;
        return membership.permissions?.canManageDocuments ||
          ['owner', 'admin', 'secretary'].includes(membership.role);
      },

      canAccessFinancials: () => {
        const membership = get().currentMembership;
        if (!membership) return false;
        return membership.permissions?.canAccessFinancials ||
          ['owner', 'admin', 'auditor'].includes(membership.role);
      },
    }),
    {
      name: 'governanceos-org',
      partialize: (state) => ({
        // Only persist tenant ID for quick reload
        currentTenant: state.currentTenant
          ? { id: state.currentTenant.id, name: state.currentTenant.name }
          : null,
      }),
    }
  )
);
