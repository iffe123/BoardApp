import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp, db } from '@/lib/firebase';
import { getDocs, addDoc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { checkRateLimit, RateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import type { Decision, Meeting } from '@/types/schema';
import { createAuditLog } from '@/lib/audit-service';

// GET /api/decisions - List decisions for a tenant
export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const meetingId = searchParams.get('meetingId');
    const outcome = searchParams.get('outcome');
    const implementationStatus = searchParams.get('implementationStatus');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    verifyTenantAccess(user, tenantId);

    const rateCheck = checkRateLimit(`api:${user.uid}`, RateLimits.api);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    const decisionsRef = collections.decisions(tenantId);
    const decisionsQuery = query(decisionsRef, orderBy('decidedAt', 'desc'));

    const snapshot = await getDocs(decisionsQuery);
    let decisions: Decision[] = [];

    snapshot.forEach((doc) => {
      decisions.push({
        id: doc.id,
        ...doc.data(),
      } as Decision);
    });

    // Client-side filtering
    if (meetingId) {
      decisions = decisions.filter((d) => d.meetingId === meetingId);
    }

    if (outcome && outcome !== 'all') {
      decisions = decisions.filter((d) => d.outcome === outcome);
    }

    if (implementationStatus && implementationStatus !== 'all') {
      decisions = decisions.filter((d) => d.implementationStatus === implementationStatus);
    }

    return NextResponse.json({
      decisions: decisions.slice(0, limit),
      total: decisions.length,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error fetching decisions', error);
    return NextResponse.json(
      { error: 'Failed to fetch decisions' },
      { status: 500 }
    );
  }
}

// POST /api/decisions - Create a new decision (usually from a meeting)
export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const body = await request.json();
    const {
      tenantId,
      meetingId,
      agendaItemId,
      decisionNumber,
      title,
      description,
      motion,
      outcome,
      votingMethod,
      votesFor,
      votesAgainst,
      abstentions,
      participantIds,
      recusedMemberIds,
      actionItems,
      implementationDeadline,
      relatedDocumentIds,
    } = body;

    // Validate required fields
    if (!tenantId || !meetingId || !title || !outcome) {
      return NextResponse.json(
        { error: 'Missing required fields (tenantId, meetingId, title, outcome)' },
        { status: 400 }
      );
    }

    verifyTenantAccess(user, tenantId);

    // Generate decision number if not provided
    let finalDecisionNumber = decisionNumber;
    if (!finalDecisionNumber) {
      const year = new Date().getFullYear();
      const decisionsRef = collections.decisions(tenantId);
      const snapshot = await getDocs(decisionsRef);
      const count = snapshot.size + 1;
      finalDecisionNumber = `D-${year}-${String(count).padStart(3, '0')}`;
    }

    const decision: Omit<Decision, 'id'> = {
      tenantId,
      meetingId,
      agendaItemId: agendaItemId || '',
      decisionNumber: finalDecisionNumber,
      title,
      description: description || '',
      motion: motion || '',
      outcome,
      votingMethod: votingMethod || 'show_of_hands',
      votesFor: votesFor || 0,
      votesAgainst: votesAgainst || 0,
      abstentions: abstentions || 0,
      participantIds: participantIds || [],
      recusedMemberIds: recusedMemberIds || [],
      actionItems: actionItems || [],
      implementationDeadline: implementationDeadline
        ? Timestamp.fromDate(new Date(implementationDeadline))
        : undefined,
      implementationStatus: 'pending',
      relatedDocumentIds: relatedDocumentIds || [],
      relatedDecisionIds: [],
      decidedAt: Timestamp.now(),
      recordedBy: user.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collections.decisions(tenantId), decision);

    // Create audit log
    await createAuditLog({
      tenantId,
      action: 'decision.recorded',
      resourceType: 'decision',
      resourceId: docRef.id,
      actorId: user.uid,
      actorName: user.name || 'Unknown',
      metadata: {
        decisionNumber: finalDecisionNumber,
        title,
        outcome,
        meetingId,
      },
    });

    return NextResponse.json({
      id: docRef.id,
      ...decision,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error creating decision', error);
    return NextResponse.json(
      { error: 'Failed to create decision' },
      { status: 500 }
    );
  }
}

// Helper function to extract decisions from a meeting
export async function extractDecisionsFromMeeting(
  tenantId: string,
  meetingId: string,
  userId: string,
  userName: string
): Promise<Decision[]> {
  if (!db) throw new Error('Database not initialized');

  // Get the meeting
  const meetingRef = collections.meeting(tenantId, meetingId);
  const meetingSnap = await getDoc(meetingRef);

  if (!meetingSnap.exists()) {
    throw new Error('Meeting not found');
  }

  const meeting = meetingSnap.data() as Meeting;
  const decisions: Decision[] = [];

  // Find all decision-type agenda items
  for (const item of meeting.agendaItems || []) {
    if (item.type === 'decision' && item.decision?.outcome) {
      // Check if decision already exists
      const existingDecisionsQuery = query(
        collections.decisions(tenantId),
        where('meetingId', '==', meetingId),
        where('agendaItemId', '==', item.id)
      );
      const existingSnap = await getDocs(existingDecisionsQuery);

      if (existingSnap.empty) {
        // Generate decision number
        const year = new Date().getFullYear();
        const allDecisionsSnap = await getDocs(collections.decisions(tenantId));
        const count = allDecisionsSnap.size + decisions.length + 1;
        const decisionNumber = `D-${year}-${String(count).padStart(3, '0')}`;

        const decision: Omit<Decision, 'id'> = {
          tenantId,
          meetingId,
          agendaItemId: item.id,
          decisionNumber,
          title: item.title,
          description: item.description || '',
          motion: item.decision.motion || '',
          outcome: item.decision.outcome,
          votingMethod: item.decision.votingMethod || 'show_of_hands',
          votesFor: item.decision.votesFor || 0,
          votesAgainst: item.decision.votesAgainst || 0,
          abstentions: item.decision.abstentions || 0,
          participantIds: [],
          recusedMemberIds: item.recusedMemberIds || [],
          actionItems: item.actionItems || [],
          implementationStatus: 'pending',
          relatedDocumentIds: item.documentIds || [],
          relatedDecisionIds: [],
          decidedAt: Timestamp.now(),
          recordedBy: userId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collections.decisions(tenantId), decision);

        // Create audit log
        await createAuditLog({
          tenantId,
          action: 'decision.recorded',
          resourceType: 'decision',
          resourceId: docRef.id,
          actorId: userId,
          actorName: userName,
          metadata: {
            decisionNumber,
            title: item.title,
            outcome: item.decision.outcome,
            meetingId,
            extractedAutomatically: true,
          },
        });

        decisions.push({
          id: docRef.id,
          ...decision,
        } as Decision);
      }
    }
  }

  return decisions;
}
