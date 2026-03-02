import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { addDoc } from 'firebase/firestore';
import { Timestamp, collections } from '@/lib/firebase';
import { requireTenantAccess, withIdempotency, writeAuditEvent } from '@/lib/actions/server';

const createSchema = z.object({
  tenantId: z.string().min(1),
  title: z.string().min(1),
  dateTime: z.string().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  attendees: z.array(z.any()).optional(),
  attendeeIds: z.array(z.string()).optional(),
  meetingType: z.string().optional(),
  description: z.string().optional(),
  location: z.any().optional(),
  quorumRequired: z.number().optional(),
  agendaItems: z.array(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const user = await requireTenantAccess(request, body.tenantId, ['owner', 'admin', 'chair', 'secretary']);

    const result = await withIdempotency(body.tenantId, request.headers.get('x-idempotency-key'), async () => {
      const scheduledStart = body.scheduledStart || body.dateTime;
      const scheduledEnd = body.scheduledEnd || body.dateTime;
      const meeting = {
        tenantId: body.tenantId,
        title: body.title,
        description: body.description || '',
        meetingType: body.meetingType || 'ordinary',
        status: 'scheduled',
        scheduledStart: Timestamp.fromDate(new Date(scheduledStart!)),
        scheduledEnd: Timestamp.fromDate(new Date(scheduledEnd!)),
        attendees: body.attendees || [],
        attendeeIds: body.attendeeIds || [],
        agendaItems: body.agendaItems || [],
        agendaLocked: false,
        documentIds: [],
        quorumRequired: body.quorumRequired || 1,
        location: body.location || { type: 'virtual' },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user.uid,
        lastModifiedBy: user.uid,
      };
      const created = await addDoc(collections.meetings(body.tenantId), meeting);
      await writeAuditEvent(body.tenantId, user.uid, 'meeting.create', 'success', { meetingId: created.id });
      return { meetingId: created.id, id: created.id };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create meeting' }, { status: 422 });
  }
}
