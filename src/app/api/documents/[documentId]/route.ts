import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { collections, Timestamp, getDoc, updateDoc } from '@/lib/firebase';
import type { Document } from '@/types/schema';
import { requireTenantAccess, withIdempotency, writeAuditEvent } from '@/lib/actions/server';

interface Params { params: Promise<{ documentId: string }>; }

export async function GET(request: NextRequest, { params }: Params) {
  const { documentId } = await params;
  const tenantId = new URL(request.url).searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  const docSnap = await getDoc(collections.document(tenantId, documentId));
  if (!docSnap.exists()) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  return NextResponse.json({ document: { id: docSnap.id, ...docSnap.data() } as Document });
}

const patchSchema = z.object({
  tenantId: z.string().min(1),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.string().nullable().optional(),
  visibility: z.enum(['internal', 'shared', 'confidential']).optional(),
  category: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { documentId } = await params;
    const body = patchSchema.parse(await request.json());
    const user = await requireTenantAccess(request, body.tenantId, ['owner', 'admin', 'secretary']);
    const result = await withIdempotency(body.tenantId, request.headers.get('x-idempotency-key'), async () => {
      const docRef = collections.document(body.tenantId, documentId);
      await updateDoc(docRef, {
        ...(body.title !== undefined ? { name: body.title } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        ...(body.folderId !== undefined ? { folderId: body.folderId } : {}),
        ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        updatedAt: Timestamp.now(),
        updatedBy: user.uid,
      });
      await writeAuditEvent(body.tenantId, user.uid, 'doc.update', 'success', { documentId });
      return { ok: true, documentId };
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update document' }, { status: 422 });
  }
}

const deleteSchema = z.object({ tenantId: z.string().min(1) });

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { documentId } = await params;
    const body = deleteSchema.parse(await request.json());
    const user = await requireTenantAccess(request, body.tenantId, ['owner', 'admin']);
    const result = await withIdempotency(body.tenantId, request.headers.get('x-idempotency-key'), async () => {
      await updateDoc(collections.document(body.tenantId, documentId), {
        deletedAt: Timestamp.now(),
        deletedBy: user.uid,
        isArchived: true,
      });
      await writeAuditEvent(body.tenantId, user.uid, 'doc.delete', 'success', { documentId });
      return { ok: true, documentId };
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete document' }, { status: 422 });
  }
}
