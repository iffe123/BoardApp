import { NextRequest, NextResponse } from 'next/server';
import { extractDecisionsFromMeeting } from '../route';

// POST /api/decisions/sync - Sync decisions from a meeting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, meetingId, userId, userName } = body;

    if (!tenantId || !meetingId) {
      return NextResponse.json(
        { error: 'tenantId and meetingId are required' },
        { status: 400 }
      );
    }

    const decisions = await extractDecisionsFromMeeting(
      tenantId,
      meetingId,
      userId || 'unknown',
      userName || 'Unknown'
    );

    return NextResponse.json({
      success: true,
      decisionsCreated: decisions.length,
      decisions,
    });
  } catch (error) {
    console.error('Error syncing decisions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync decisions' },
      { status: 500 }
    );
  }
}
