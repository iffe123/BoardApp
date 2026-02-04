import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp, storage, ref, deleteObject } from '@/lib/firebase';
import { getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Document } from '@/types/schema';
import { createAuditLog } from '@/lib/audit-service';

interface Params {
  params: Promise<{ documentId: string }>;
}

// GET /api/documents/[documentId] - Get document details
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { documentId } = await params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const docRef = collections.document(tenantId, documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = {
      id: docSnap.id,
      ...docSnap.data(),
    } as Document;

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

// PATCH /api/documents/[documentId] - Update document metadata
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { documentId } = await params;
    const body = await request.json();
    const { tenantId, userId, userName, updates } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const docRef = collections.document(tenantId, documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const currentDoc = docSnap.data() as Document;

    // Prepare updates
    const allowedUpdates: Partial<Document> = {};
    if (updates.name !== undefined) allowedUpdates.name = updates.name;
    if (updates.description !== undefined) allowedUpdates.description = updates.description;
    if (updates.category !== undefined) allowedUpdates.category = updates.category;
    if (updates.visibility !== undefined) allowedUpdates.visibility = updates.visibility;
    if (updates.tags !== undefined) allowedUpdates.tags = updates.tags;
    if (updates.meetingIds !== undefined) allowedUpdates.meetingIds = updates.meetingIds;
    if (updates.agendaItemIds !== undefined) allowedUpdates.agendaItemIds = updates.agendaItemIds;

    // Always update timestamp
    const finalUpdates = {
      ...allowedUpdates,
      updatedAt: Timestamp.now(),
    };

    await updateDoc(docRef, finalUpdates);

    // Create audit log
    await createAuditLog({
      tenantId,
      action: 'document.updated',
      resourceType: 'document',
      resourceId: documentId,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      changes: Object.entries(allowedUpdates).map(([field, newValue]) => ({
        field,
        oldValue: currentDoc[field as keyof Document],
        newValue,
      })),
    });

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        ...currentDoc,
        ...finalUpdates,
      },
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[documentId] - Delete document
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { documentId } = await params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');
    const hardDelete = searchParams.get('hardDelete') === 'true';

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const docRef = collections.document(tenantId, documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = docSnap.data() as Document;

    if (hardDelete) {
      // Delete file from storage
      if (storage && document.storagePath) {
        try {
          const storageRef = ref(storage, document.storagePath);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
          // Continue with Firestore deletion even if storage delete fails
        }
      }

      // Delete Firestore document
      await deleteDoc(docRef);
    } else {
      // Soft delete - mark as archived
      await updateDoc(docRef, {
        isArchived: true,
        updatedAt: Timestamp.now(),
      });
    }

    // Create audit log
    await createAuditLog({
      tenantId,
      action: hardDelete ? 'document.deleted' : 'document.archived',
      resourceType: 'document',
      resourceId: documentId,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      metadata: {
        fileName: document.name,
        hardDelete,
      },
    });

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Document permanently deleted' : 'Document archived',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
