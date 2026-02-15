/**
 * UI Zustand Store
 *
 * Client-side state management for UI state including
 * sidebar, modals, command palette, and layout preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

interface UIStoreState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Command palette
  commandPaletteOpen: boolean;

  // Active modals
  activeModal: string | null;
  modalData: Record<string, unknown>;

  // Search
  globalSearchQuery: string;
  globalSearchOpen: boolean;

  // Layout
  contentWidth: 'default' | 'wide' | 'full';

  // Recently viewed items for quick access
  recentItems: Array<{
    type: 'meeting' | 'document' | 'member' | 'financial';
    id: string;
    title: string;
    url: string;
    visitedAt: number;
  }>;

  // Actions - Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Actions - Command Palette
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  // Actions - Modals
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Actions - Search
  setGlobalSearchQuery: (query: string) => void;
  setGlobalSearchOpen: (open: boolean) => void;

  // Actions - Layout
  setContentWidth: (width: 'default' | 'wide' | 'full') => void;

  // Actions - Recent Items
  addRecentItem: (item: Omit<UIStoreState['recentItems'][0], 'visitedAt'>) => void;
  clearRecentItems: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useUIStore = create<UIStoreState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarOpen: true,
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      activeModal: null,
      modalData: {},
      globalSearchQuery: '',
      globalSearchOpen: false,
      contentWidth: 'default',
      recentItems: [],

      // Sidebar
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Command Palette
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),

      // Modals
      openModal: (modalId, data = {}) =>
        set({ activeModal: modalId, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: {} }),

      // Search
      setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
      setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),

      // Layout
      setContentWidth: (width) => set({ contentWidth: width }),

      // Recent Items
      addRecentItem: (item) =>
        set((state) => {
          const filtered = state.recentItems.filter((r) => r.id !== item.id);
          const newItem = { ...item, visitedAt: Date.now() };
          return {
            recentItems: [newItem, ...filtered].slice(0, 20),
          };
        }),
      clearRecentItems: () => set({ recentItems: [] }),
    }),
    {
      name: 'governanceos-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        contentWidth: state.contentWidth,
        recentItems: state.recentItems,
      }),
    }
  )
);
