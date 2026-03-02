import { withIdempotency } from '@/lib/actions/server';

const getDoc = jest.fn();
const setDoc = jest.fn();
const docFn = jest.fn(() => ({ id: 'run' }));

jest.mock('@/lib/firebase', () => ({
  collections: { actionAuditEvents: jest.fn(() => 'col') },
  doc: (...args: unknown[]) => docFn(...args),
  getDoc: (...args: unknown[]) => getDoc(...args),
  setDoc: (...args: unknown[]) => setDoc(...args),
  Timestamp: { now: () => 'now' },
}));

describe('idempotent write wrappers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shareholder.create returns stored response on repeated key', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ response: { shareholderId: 's1' } }) });

    const first = await withIdempotency('t1', 'k1', async () => ({ shareholderId: 's1' }));
    const second = await withIdempotency('t1', 'k1', async () => ({ shareholderId: 's2' }));

    expect(first).toEqual({ shareholderId: 's1' });
    expect(second).toEqual({ shareholderId: 's1' });
  });

  it('doc.update returns same response when idempotency key repeats', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ response: { ok: true, documentId: 'd1' } }) });

    const first = await withIdempotency('t1', 'k2', async () => ({ ok: true, documentId: 'd1' }));
    const second = await withIdempotency('t1', 'k2', async () => ({ ok: false, documentId: 'd2' }));

    expect(first).toEqual({ ok: true, documentId: 'd1' });
    expect(second).toEqual({ ok: true, documentId: 'd1' });
  });

  it('minutes.save_draft is deduplicated by key', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ response: { ok: true, version: 2 } }) });

    const first = await withIdempotency('t1', 'k3', async () => ({ ok: true, version: 2 }));
    const second = await withIdempotency('t1', 'k3', async () => ({ ok: true, version: 3 }));

    expect(first).toEqual({ ok: true, version: 2 });
    expect(second).toEqual({ ok: true, version: 2 });
  });
});
