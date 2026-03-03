import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateDoc } from 'firebase/firestore';
import { collections, Timestamp } from '@/lib/firebase';
import { requireTenantAccess, withIdempotency, writeAuditEvent } from '@/lib/actions/server';

const schema = z.object({ tenantId: z.string().min(1), minutesDraft: z.record(z.string(), z.any()) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const { meetingId } = await params;
    const body = schema.parse(await request.json());
    const user = await requireTenantAccess(request, body.tenantId, ['owner', 'admin', 'chair', 'secretary']);
    const result = await withIdempotency(body.tenantId, request.headers.get('x-idempotency-key'), async () => {
      await updateDoc(collections.meeting(body.tenantId, meetingId), {
        minutes: {
          ...body.minutesDraft,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        },
        updatedAt: Timestamp.now(),
        lastModifiedBy: user.uid,
      });
      await writeAuditEvent(body.tenantId, user.uid, 'minutes.save_draft', 'success', { meetingId });
      return { ok: true, version: body.minutesDraft.version || 1 };
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 422 });
  }
}
