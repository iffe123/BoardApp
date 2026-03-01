import { NextRequest } from 'next/server';

const actionRuns = new Map<string, { result: unknown }>();
const auditEvents: Array<Record<string, unknown>> = [];

jest.mock('@/lib/actions/action-server', () => ({
  getAuthUser: jest.fn().mockResolvedValue({ uid: 'user-1' }),
  requireTenantAccess: jest.fn().mockResolvedValue(undefined),
  withIdempotency: jest.fn(async (tenantId: string, idempotencyKey: string, fn: () => Promise<unknown>) => {
    const key = `${tenantId}:${idempotencyKey}`;
    const existing = actionRuns.get(key);
    if (existing) {
      return existing.result;
    }

    const result = await fn();
    actionRuns.set(key, { result });
    return result;
  }),
  writeAuditEvent: jest.fn(async (_tenantId: string, _userId: string, _action: string, _outcome: string, metadata: Record<string, unknown>) => {
    auditEvents.push(metadata);
    return `evt-${auditEvents.length}`;
  }),
}));

import { POST } from '@/app/api/actions/ping/route';

describe('POST /api/actions/ping', () => {
  beforeEach(() => {
    actionRuns.clear();
    auditEvents.length = 0;
  });

  it('uses idempotency key to avoid duplicate action run creation', async () => {
    const headers = {
      'content-type': 'application/json',
      'x-idempotency-key': 'same-key',
    };

    const req1 = new NextRequest('http://localhost:3000/api/actions/ping', {
      method: 'POST',
      headers,
      body: JSON.stringify({ tenantId: 'tenant-1' }),
    });

    const req2 = new NextRequest('http://localhost:3000/api/actions/ping', {
      method: 'POST',
      headers,
      body: JSON.stringify({ tenantId: 'tenant-1' }),
    });

    const res1 = await POST(req1);
    const res2 = await POST(req2);

    const body1 = (await res1.json()) as { ok: boolean; timestamp: string };
    const body2 = (await res2.json()) as { ok: boolean; timestamp: string };

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(body1.ok).toBe(true);
    expect(body2.ok).toBe(true);
    expect(body2.timestamp).toBe(body1.timestamp);
    expect(actionRuns.size).toBe(1);
  });

  it('writes an audit event on success', async () => {
    const request = new NextRequest('http://localhost:3000/api/actions/ping', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-idempotency-key': 'audit-key',
      },
      body: JSON.stringify({ tenantId: 'tenant-1' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(auditEvents.length).toBeGreaterThan(0);
    expect(auditEvents[0]).toMatchObject({
      idempotencyKey: 'audit-key',
    });
  });
});
