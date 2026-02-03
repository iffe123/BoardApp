import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp } from '@/lib/firebase';
import { getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import type { Meeting } from '@/types/schema';

// GET /api/meetings - List meetings for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Build query
    let meetingsQuery = query(
      collections.meetings(tenantId),
      orderBy('scheduledStart', 'desc')
    );

    if (status && status !== 'all') {
      meetingsQuery = query(
        collections.meetings(tenantId),
        where('status', '==', status),
        orderBy('scheduledStart', 'desc')
      );
    }

    const snapshot = await getDocs(meetingsQuery);
    const meetings: Meeting[] = [];

    snapshot.forEach((doc) => {
      meetings.push({
        id: doc.id,
        ...doc.data(),
      } as Meeting);
    });

    return NextResponse.json({
      meetings: meetings.slice(0, limit),
      total: meetings.length,
    });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

// POST /api/meetings - Create a new meeting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      title,
      description,
      meetingType,
      scheduledStart,
      scheduledEnd,
      timezone,
      location,
      attendeeIds,
      quorumRequired,
      createdBy,
    } = body;

    // Validate required fields
    if (!tenantId || !title || !scheduledStart || !scheduledEnd) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create attendees array from IDs
    const attendees = (attendeeIds || []).map((id: string, index: number) => ({
      memberId: id,
      userId: id,
      displayName: `Member ${index + 1}`, // In real app, fetch from members
      role: index === 0 ? 'chair' : index === 1 ? 'secretary' : 'director',
      invitedAt: Timestamp.now(),
      response: 'pending',
      hasVotingRights: true,
    }));

    // Default agenda items
    const defaultAgendaItems: Meeting['agendaItems'] = [
      {
        id: `agenda-${Date.now()}-1`,
        orderIndex: 0,
        title: 'Opening of the meeting',
        type: 'formality' as const,
        estimatedDuration: 5,
        documentIds: [],
        conflictKeywords: [],
        recusedMemberIds: [],
        actionItems: [],
        isConfidential: false,
        isCompleted: false,
      },
      {
        id: `agenda-${Date.now()}-2`,
        orderIndex: 1,
        title: 'Election of adjuster',
        type: 'formality' as const,
        estimatedDuration: 5,
        documentIds: [],
        conflictKeywords: [],
        recusedMemberIds: [],
        actionItems: [],
        isConfidential: false,
        isCompleted: false,
      },
      {
        id: `agenda-${Date.now()}-3`,
        orderIndex: 2,
        title: 'Approval of agenda',
        type: 'formality' as const,
        estimatedDuration: 5,
        documentIds: [],
        conflictKeywords: [],
        recusedMemberIds: [],
        actionItems: [],
        isConfidential: false,
        isCompleted: false,
      },
      {
        id: `agenda-${Date.now()}-4`,
        orderIndex: 3,
        title: 'Closing of the meeting',
        type: 'formality' as const,
        estimatedDuration: 5,
        documentIds: [],
        conflictKeywords: [],
        recusedMemberIds: [],
        actionItems: [],
        isConfidential: false,
        isCompleted: false,
      },
    ];

    const meeting: Omit<Meeting, 'id'> = {
      tenantId,
      title,
      description: description || '',
      meetingType: meetingType || 'ordinary',
      status: 'draft',
      scheduledStart: Timestamp.fromDate(new Date(scheduledStart)),
      scheduledEnd: Timestamp.fromDate(new Date(scheduledEnd)),
      timezone: timezone || 'Europe/Stockholm',
      location: location || {
        type: 'physical',
        address: '',
        room: '',
      },
      attendees,
      quorumRequired: quorumRequired || 3,
      agendaItems: defaultAgendaItems,
      agendaLocked: false,
      documentIds: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: createdBy || 'system',
      lastModifiedBy: createdBy || 'system',
    };

    const docRef = await addDoc(collections.meetings(tenantId), meeting);

    return NextResponse.json({
      id: docRef.id,
      ...meeting,
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
