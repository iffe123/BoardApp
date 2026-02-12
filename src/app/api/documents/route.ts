import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp } from '@/lib/firebase';
import { getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { checkRateLimit, RateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import type { Document } from '@/types/schema';

// GET /api/documents - List documents for a tenant
export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const category = searchParams.get('category');
    const meetingId = searchParams.get('meetingId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    await verifyTenantAccess(user, tenantId);

    const rateCheck = checkRateLimit(`api:${user.uid}`, RateLimits.api);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    // Build query
    const documentsQuery = query(
      collections.documents(tenantId),
      where('isArchived', '==', false),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(documentsQuery);
    let documents: Document[] = [];

    snapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data(),
      } as Document);
    });

    // Client-side filtering (Firestore has limitations on compound queries)
    if (category && category !== 'all') {
      documents = documents.filter((d) => d.category === category);
    }

    if (meetingId) {
      documents = documents.filter((d) => d.meetingIds.includes(meetingId));
    }

    return NextResponse.json({
      documents: documents.slice(0, limit),
      total: documents.length,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error fetching documents', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/documents - Create a new document record
export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const body = await request.json();
    const {
      tenantId,
      name,
      description,
      category,
      mimeType,
      size,
      storagePath,
      visibility,
      uploadedBy,
      meetingIds,
      tags,
    } = body;

    // Validate required fields
    if (!tenantId || !name || !storagePath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await verifyTenantAccess(user, tenantId);

    const document: Omit<Document, 'id'> = {
      tenantId,
      name,
      description: description || '',
      category: category || 'other',
      mimeType: mimeType || 'application/octet-stream',
      size: size || 0,
      storagePath,
      version: 1,
      visibility: visibility || 'internal',
      meetingIds: meetingIds || [],
      agendaItemIds: [],
      tags: tags || [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      uploadedBy: uploadedBy || user.uid,
      isArchived: false,
    };

    const docRef = await addDoc(collections.documents(tenantId), document);

    return NextResponse.json({
      id: docRef.id,
      ...document,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error creating document', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
