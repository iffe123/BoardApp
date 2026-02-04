import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp, storage, ref, uploadBytes, getDownloadURL } from '@/lib/firebase';
import { addDoc } from 'firebase/firestore';
import type { Document, DocumentCategory } from '@/types/schema';
import { createAuditLog } from '@/lib/audit-service';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME types for security
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType) || mimeType.startsWith('image/');
}

function sanitizeFilename(filename: string): string {
  // Remove any path components and sanitize the filename
  return filename
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

// POST /api/documents/upload - Upload file to Firebase Storage
export async function POST(request: NextRequest) {
  try {
    // Check if storage is available
    if (!storage) {
      return NextResponse.json(
        { error: 'Storage is not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    // Extract file and metadata
    const file = formData.get('file') as File | null;
    const tenantId = formData.get('tenantId') as string;
    const userId = formData.get('userId') as string;
    const userName = formData.get('userName') as string;
    const category = (formData.get('category') as DocumentCategory) || 'other';
    const description = formData.get('description') as string | null;
    const visibility = (formData.get('visibility') as 'internal' | 'shared' | 'confidential') || 'internal';
    const tagsRaw = formData.get('tags') as string | null;
    const meetingIds = formData.get('meetingIds') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Sanitize filename and create storage path
    const sanitizedFilename = sanitizeFilename(file.name);
    const timestamp = Date.now();
    const storagePath = `tenants/${tenantId}/documents/${timestamp}_${sanitizedFilename}`;

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: file.type,
      customMetadata: {
        tenantId,
        uploadedBy: userId || 'unknown',
        originalName: file.name,
      },
    };

    await uploadBytes(storageRef, fileBuffer, metadata);

    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);

    // Parse tags
    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    // Parse meeting IDs
    const parsedMeetingIds = meetingIds
      ? meetingIds.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    // Create document record in Firestore
    const document: Omit<Document, 'id'> = {
      tenantId,
      name: file.name,
      description: description || '',
      category,
      mimeType: file.type,
      size: file.size,
      storagePath,
      downloadUrl,
      version: 1,
      visibility,
      meetingIds: parsedMeetingIds,
      agendaItemIds: [],
      tags,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      uploadedBy: userId || 'unknown',
      isArchived: false,
    };

    const docRef = await addDoc(collections.documents(tenantId), document);

    // Create audit log
    await createAuditLog({
      tenantId,
      action: 'document.uploaded',
      resourceType: 'document',
      resourceId: docRef.id,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        category,
        visibility,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: docRef.id,
        ...document,
      },
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
