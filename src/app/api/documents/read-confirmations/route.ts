import { NextRequest, NextResponse } from 'next/server';
import {
  trackDocumentRead,
  confirmDocumentRead,
  getDocumentReadConfirmations,
  hasUserReadDocument,
} from '@/lib/read-confirmation-service';

// GET /api/documents/read-confirmations - Get read status for a document
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const documentId = searchParams.get('documentId');
    const userId = searchParams.get('userId');

    if (!tenantId || !documentId) {
      return NextResponse.json(
        { error: 'tenantId and documentId are required' },
        { status: 400 }
      );
    }

    // If userId is provided, return individual read status
    if (userId) {
      const status = await hasUserReadDocument(tenantId, documentId, userId);
      return NextResponse.json(status);
    }

    // Otherwise return all read confirmations for the document
    const confirmations = await getDocumentReadConfirmations(tenantId, documentId);
    return NextResponse.json({ confirmations });
  } catch (error) {
    console.error('Read confirmation fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch read confirmations' },
      { status: 500 }
    );
  }
}

// POST /api/documents/read-confirmations - Track or confirm a document read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, documentId, userId, userName, confirm, timeSpentSeconds } = body;

    if (!tenantId || !documentId || !userId) {
      return NextResponse.json(
        { error: 'tenantId, documentId, and userId are required' },
        { status: 400 }
      );
    }

    if (confirm) {
      await confirmDocumentRead(tenantId, documentId, userId, userName || 'Unknown');
    } else {
      await trackDocumentRead(
        tenantId,
        documentId,
        userId,
        userName || 'Unknown',
        timeSpentSeconds || 0
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Read confirmation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record read confirmation' },
      { status: 500 }
    );
  }
}
