import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Timestamp, collections, doc, setDoc } from '@/lib/firebase';
import { requireTenantAccess, withIdempotency, writeAuditEvent } from '@/lib/actions/server';

const schema = z.object({ tenantId: z.string().min(1), name: z.string().min(1), parentId: z.string().optional() });

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const user = await requireTenantAccess(request, body.tenantId, ['owner', 'admin']);
    const result = await withIdempotency(body.tenantId, request.headers.get('x-idempotency-key'), async () => {
      const folderRef = doc(collections.documents(body.tenantId));
      await setDoc(folderRef, {
        id: folderRef.id,
        tenantId: body.tenantId,
        kind: 'folder',
        name: body.name,
        parentId: body.parentId || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user.uid,
        updatedBy: user.uid,
      });
      await writeAuditEvent(body.tenantId, user.uid, 'doc.folder.create', 'success', { folderId: folderRef.id });
      return { folderId: folderRef.id };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 422 });
  }
}
