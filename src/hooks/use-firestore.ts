/**
 * Firestore Hooks
 *
 * React hooks for fetching and managing Firestore data.
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collections,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from '@/lib/firebase';
import type { Meeting, Document, Member, FinancialPeriod, Decision } from '@/types/schema';
import {
  isDemoTenant,
  demoMeetings,
  demoDocuments,
  demoMembers,
  demoFinancials,
  demoDecisions,
} from '@/lib/demo-data';

// ============================================================================
// MEETINGS HOOKS
// ============================================================================

export function useMeetings(tenantId: string | null, status?: string) {
  return useQuery({
    queryKey: ['meetings', tenantId, status],
    queryFn: async () => {
      if (!tenantId) return [];

      if (isDemoTenant(tenantId)) {
        let meetings = [...demoMeetings];
        if (status && status !== 'all') {
          meetings = meetings.filter((m) => m.status === status);
        }
        return meetings;
      }

      const meetingsRef = collections.meetings(tenantId);
      let q = query(meetingsRef, orderBy('scheduledStart', 'desc'));

      if (status && status !== 'all') {
        q = query(meetingsRef, where('status', '==', status), orderBy('scheduledStart', 'desc'));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Meeting[];
    },
    enabled: !!tenantId,
  });
}

export function useMeeting(tenantId: string | null, meetingId: string | null) {
  return useQuery({
    queryKey: ['meeting', tenantId, meetingId],
    queryFn: async () => {
      if (!tenantId || !meetingId) return null;

      if (isDemoTenant(tenantId)) {
        return demoMeetings.find((m) => m.id === meetingId) || null;
      }

      const docRef = collections.meeting(tenantId, meetingId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Meeting;
    },
    enabled: !!tenantId && !!meetingId,
  });
}

export function useCreateMeeting(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meeting: Omit<Meeting, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
      if (!tenantId) throw new Error('No tenant ID');

      const docRef = collections.meeting(tenantId, `meeting-${Date.now()}`);
      const newMeeting: Omit<Meeting, 'id'> = {
        ...meeting,
        tenantId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(docRef, newMeeting);
      return { id: docRef.id, ...newMeeting };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', tenantId] });
    },
  });
}

export function useUpdateMeeting(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, updates }: { meetingId: string; updates: Partial<Meeting> }) => {
      if (!tenantId) throw new Error('No tenant ID');

      const docRef = collections.meeting(tenantId, meetingId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    },
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['meeting', tenantId, meetingId] });
    },
  });
}

// ============================================================================
// DOCUMENTS HOOKS
// ============================================================================

export function useDocuments(tenantId: string | null, category?: string) {
  return useQuery({
    queryKey: ['documents', tenantId, category],
    queryFn: async () => {
      if (!tenantId) return [];

      if (isDemoTenant(tenantId)) {
        let documents = demoDocuments.filter((d) => !d.isArchived);
        if (category && category !== 'all') {
          documents = documents.filter((d) => d.category === category);
        }
        return documents;
      }

      const docsRef = collections.documents(tenantId);
      const q = query(docsRef, where('isArchived', '==', false), orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      let documents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Document[];

      if (category && category !== 'all') {
        documents = documents.filter((d) => d.category === category);
      }

      return documents;
    },
    enabled: !!tenantId,
  });
}

export function useUploadDocument(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: Omit<Document, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
      if (!tenantId) throw new Error('No tenant ID');

      const docRef = collections.document(tenantId, `doc-${Date.now()}`);
      const newDocument: Omit<Document, 'id'> = {
        ...document,
        tenantId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(docRef, newDocument);
      return { id: docRef.id, ...newDocument };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', tenantId] });
    },
  });
}

// ============================================================================
// MEMBERS HOOKS
// ============================================================================

export function useMembers(tenantId: string | null, activeOnly = true) {
  return useQuery({
    queryKey: ['members', tenantId, activeOnly],
    queryFn: async () => {
      if (!tenantId) return [];

      if (isDemoTenant(tenantId)) {
        let members = [...demoMembers];
        if (activeOnly) {
          members = members.filter((m) => m.isActive);
        }
        return members;
      }

      const membersRef = collections.members(tenantId);
      const q = query(membersRef, orderBy('joinedAt', 'desc'));

      const snapshot = await getDocs(q);
      let members = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Member[];

      if (activeOnly) {
        members = members.filter((m) => m.isActive);
      }

      return members;
    },
    enabled: !!tenantId,
  });
}

export function useInviteMember(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (member: Omit<Member, 'id' | 'tenantId' | 'joinedAt'>) => {
      if (!tenantId) throw new Error('No tenant ID');

      const docRef = collections.member(tenantId, `member-${Date.now()}`);
      const newMember: Omit<Member, 'id'> = {
        ...member,
        tenantId,
        joinedAt: Timestamp.now(),
      };

      await setDoc(docRef, newMember);
      return { id: docRef.id, ...newMember };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', tenantId] });
    },
  });
}

// ============================================================================
// FINANCIALS HOOKS
// ============================================================================

export function useFinancials(tenantId: string | null, periodType?: string) {
  return useQuery({
    queryKey: ['financials', tenantId, periodType],
    queryFn: async () => {
      if (!tenantId) return [];

      if (isDemoTenant(tenantId)) {
        let periods = [...demoFinancials];
        if (periodType && periodType !== 'all') {
          periods = periods.filter((p) => p.periodType === periodType);
        }
        return periods;
      }

      const financialsRef = collections.financials(tenantId);
      const q = query(financialsRef, orderBy('period', 'desc'));

      const snapshot = await getDocs(q);
      let periods = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FinancialPeriod[];

      if (periodType && periodType !== 'all') {
        periods = periods.filter((p) => p.periodType === periodType);
      }

      return periods;
    },
    enabled: !!tenantId,
  });
}

// ============================================================================
// DECISIONS HOOKS
// ============================================================================

export function useDecisions(tenantId: string | null, outcome?: string) {
  return useQuery({
    queryKey: ['decisions', tenantId, outcome],
    queryFn: async () => {
      if (!tenantId) return [];

      if (isDemoTenant(tenantId)) {
        let decisions = [...demoDecisions];
        if (outcome && outcome !== 'all') {
          decisions = decisions.filter((d) => d.outcome === outcome);
        }
        return decisions;
      }

      const decisionsRef = collections.decisions(tenantId);
      const q = query(decisionsRef, orderBy('decidedAt', 'desc'));

      const snapshot = await getDocs(q);
      let decisions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Decision[];

      if (outcome && outcome !== 'all') {
        decisions = decisions.filter((d) => d.outcome === outcome);
      }

      return decisions;
    },
    enabled: !!tenantId,
  });
}

// ============================================================================
// REAL-TIME SUBSCRIPTION HOOK
// ============================================================================

export function useRealtimeMeeting(tenantId: string | null, meetingId: string | null) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId || !meetingId) {
      setLoading(false);
      return;
    }

    // Demo tenant: return static data, no real-time subscription
    if (isDemoTenant(tenantId)) {
      const found = demoMeetings.find((m) => m.id === meetingId) || null;
      setMeeting(found);
      setLoading(false);
      return;
    }

    const docRef = collections.meeting(tenantId, meetingId);

    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          setMeeting({ id: doc.id, ...doc.data() } as Meeting);
        } else {
          setMeeting(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId, meetingId]);

  return { meeting, loading, error };
}
