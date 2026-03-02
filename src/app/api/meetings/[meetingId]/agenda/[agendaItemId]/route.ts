import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDoc, updateDoc } from 'firebase/firestore';
import { collections, Timestamp } from '@/lib/firebase';
import { requireTenantAccess, withIdempotency, writeAuditEvent } from '@/lib/actions/server';

const schema = z.object({ tenantId: z.string().min(1), title: z.string().optional(), estimatedDuration: z.number().optional(), responsibleMemberId: z.string().optional() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ meetingId: string; agendaItemId: string }> }) {
  try {
    const { meetingId, agendaItemId } = await params;
    const body = schema.parse(await request.json());
    const user = await requireTenantAccess(request, body.tenantId, ['owner', 'admin', 'chair', 'secretary']);
    const result = await withIdempotency(body.tenantId, request.headers.get('x-idempotency-key'), async () => {
      const ref = collections.meeting(body.tenantId, meetingId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Meeting not found');
      const meeting = snap.data();
      const agendaItems = (meeting.agendaItems || []).map((item: { id: string; [key: string]: unknown }) => item.id === agendaItemId ? { ...item, ...body } : item);
      await updateDoc(ref, { agendaItems, updatedAt: Timestamp.now(), lastModifiedBy: user.uid });
      await writeAuditEvent(body.tenantId, user.uid, 'meeting.agenda.update', 'success', { meetingId, agendaItemId });
      return { ok: true };
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 422 });
  }
}
