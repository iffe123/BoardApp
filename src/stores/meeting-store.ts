/**
 * Meeting Zustand Store
 *
 * Client-side state management for meeting workflows including
 * active meeting state, agenda editing, and real-time collaboration.
 */

import { create } from 'zustand';
import type { Meeting, AgendaItem } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface MeetingDraft {
  title: string;
  description: string;
  meetingType: Meeting['meetingType'];
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  timezone: string;
  location: Meeting['location'];
  quorumRequired: number;
  agendaItems: AgendaItem[];
  attendeeIds: string[];
  templateId?: string;
}

interface ActiveMeetingState {
  meetingId: string | null;
  currentAgendaItemIndex: number;
  isRecording: boolean;
  notes: Record<string, string>; // agendaItemId -> notes
  timer: {
    isRunning: boolean;
    elapsed: number; // seconds
    startedAt: number | null;
  };
}

interface MeetingStoreState {
  // Meeting list
  meetings: Meeting[];
  isLoadingMeetings: boolean;

  // Draft for new/edit meeting
  draft: MeetingDraft;

  // Active meeting session
  activeMeeting: ActiveMeetingState;

  // Selected meeting for viewing
  selectedMeetingId: string | null;

  // Actions - Meeting list
  setMeetings: (meetings: Meeting[]) => void;
  setLoadingMeetings: (loading: boolean) => void;

  // Actions - Draft
  updateDraft: (updates: Partial<MeetingDraft>) => void;
  resetDraft: () => void;
  addAgendaItem: (item: AgendaItem) => void;
  updateAgendaItem: (itemId: string, updates: Partial<AgendaItem>) => void;
  removeAgendaItem: (itemId: string) => void;
  reorderAgendaItems: (items: AgendaItem[]) => void;

  // Actions - Active meeting
  startMeeting: (meetingId: string) => void;
  endMeeting: () => void;
  nextAgendaItem: () => void;
  previousAgendaItem: () => void;
  setAgendaItemIndex: (index: number) => void;
  updateNotes: (agendaItemId: string, notes: string) => void;
  toggleTimer: () => void;
  resetTimer: () => void;

  // Actions - Selection
  setSelectedMeetingId: (id: string | null) => void;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const defaultDraft: MeetingDraft = {
  title: '',
  description: '',
  meetingType: 'ordinary',
  scheduledStart: null,
  scheduledEnd: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  location: {
    type: 'virtual',
  },
  quorumRequired: 3,
  agendaItems: [],
  attendeeIds: [],
};

const defaultActiveMeeting: ActiveMeetingState = {
  meetingId: null,
  currentAgendaItemIndex: 0,
  isRecording: false,
  notes: {},
  timer: {
    isRunning: false,
    elapsed: 0,
    startedAt: null,
  },
};

// ============================================================================
// STORE
// ============================================================================

export const useMeetingStore = create<MeetingStoreState>((set) => ({
  // Initial state
  meetings: [],
  isLoadingMeetings: false,
  draft: { ...defaultDraft },
  activeMeeting: { ...defaultActiveMeeting },
  selectedMeetingId: null,

  // Meeting list actions
  setMeetings: (meetings) => set({ meetings }),
  setLoadingMeetings: (loading) => set({ isLoadingMeetings: loading }),

  // Draft actions
  updateDraft: (updates) =>
    set((state) => ({
      draft: { ...state.draft, ...updates },
    })),

  resetDraft: () => set({ draft: { ...defaultDraft } }),

  addAgendaItem: (item) =>
    set((state) => ({
      draft: {
        ...state.draft,
        agendaItems: [...state.draft.agendaItems, item],
      },
    })),

  updateAgendaItem: (itemId, updates) =>
    set((state) => ({
      draft: {
        ...state.draft,
        agendaItems: state.draft.agendaItems.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
      },
    })),

  removeAgendaItem: (itemId) =>
    set((state) => ({
      draft: {
        ...state.draft,
        agendaItems: state.draft.agendaItems
          .filter((item) => item.id !== itemId)
          .map((item, index) => ({ ...item, orderIndex: index })),
      },
    })),

  reorderAgendaItems: (items) =>
    set((state) => ({
      draft: {
        ...state.draft,
        agendaItems: items.map((item, index) => ({
          ...item,
          orderIndex: index,
        })),
      },
    })),

  // Active meeting actions
  startMeeting: (meetingId) =>
    set({
      activeMeeting: {
        ...defaultActiveMeeting,
        meetingId,
        timer: {
          isRunning: true,
          elapsed: 0,
          startedAt: Date.now(),
        },
      },
    }),

  endMeeting: () =>
    set({
      activeMeeting: { ...defaultActiveMeeting },
    }),

  nextAgendaItem: () =>
    set((state) => {
      const maxIndex = state.draft.agendaItems.length - 1;
      return {
        activeMeeting: {
          ...state.activeMeeting,
          currentAgendaItemIndex: Math.min(
            state.activeMeeting.currentAgendaItemIndex + 1,
            maxIndex
          ),
        },
      };
    }),

  previousAgendaItem: () =>
    set((state) => ({
      activeMeeting: {
        ...state.activeMeeting,
        currentAgendaItemIndex: Math.max(
          state.activeMeeting.currentAgendaItemIndex - 1,
          0
        ),
      },
    })),

  setAgendaItemIndex: (index) =>
    set((state) => ({
      activeMeeting: {
        ...state.activeMeeting,
        currentAgendaItemIndex: index,
      },
    })),

  updateNotes: (agendaItemId, notes) =>
    set((state) => ({
      activeMeeting: {
        ...state.activeMeeting,
        notes: {
          ...state.activeMeeting.notes,
          [agendaItemId]: notes,
        },
      },
    })),

  toggleTimer: () =>
    set((state) => {
      const { timer } = state.activeMeeting;
      if (timer.isRunning) {
        // Pause
        const elapsed = timer.startedAt
          ? timer.elapsed + (Date.now() - timer.startedAt) / 1000
          : timer.elapsed;
        return {
          activeMeeting: {
            ...state.activeMeeting,
            timer: { isRunning: false, elapsed, startedAt: null },
          },
        };
      } else {
        // Resume
        return {
          activeMeeting: {
            ...state.activeMeeting,
            timer: { ...timer, isRunning: true, startedAt: Date.now() },
          },
        };
      }
    }),

  resetTimer: () =>
    set((state) => ({
      activeMeeting: {
        ...state.activeMeeting,
        timer: { isRunning: false, elapsed: 0, startedAt: null },
      },
    })),

  // Selection
  setSelectedMeetingId: (id) => set({ selectedMeetingId: id }),
}));
