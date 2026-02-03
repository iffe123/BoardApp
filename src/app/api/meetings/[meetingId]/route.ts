import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp } from '@/lib/firebase';
import { getDoc, updateDoc } from 'firebase/firestore';
import type { Meeting } from '@/types/schema';

interface RouteParams {
  params: {
    meetingId: string;
  };
}

// GET /api/meetings/[meetingId] - Get a single meeting
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const { meetingId } = params;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const docRef = collections.meeting(tenantId, meetingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: docSnap.id,
      ...docSnap.data(),
    } as Meeting);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}

// PATCH /api/meetings/[meetingId] - Update a meeting
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const { meetingId } = params;
    const body = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const docRef = collections.meeting(tenantId, meetingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Partial<Meeting> = {
      ...body,
      updatedAt: Timestamp.now(),
    };

    // Convert date strings to Timestamps
    if (body.scheduledStart) {
      updateData.scheduledStart = Timestamp.fromDate(new Date(body.scheduledStart));
    }
    if (body.scheduledEnd) {
      updateData.scheduledEnd = Timestamp.fromDate(new Date(body.scheduledEnd));
    }
    if (body.actualStart) {
      updateData.actualStart = Timestamp.fromDate(new Date(body.actualStart));
    }
    if (body.actualEnd) {
      updateData.actualEnd = Timestamp.fromDate(new Date(body.actualEnd));
    }

    await updateDoc(docRef, updateData);

    const updatedSnap = await getDoc(docRef);
    return NextResponse.json({
      id: updatedSnap.id,
      ...updatedSnap.data(),
    });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

// DELETE /api/meetings/[meetingId] - Delete a meeting
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const { meetingId } = params;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const docRef = collections.meeting(tenantId, meetingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Soft delete by updating status to cancelled
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    );
  }
}
