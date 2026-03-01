import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/auth/verify-session', () => {
  return {
    verifySession: jest.fn().mockResolvedValue({ user: { uid: 'u1', tenants: { t1: 'admin' } }, token: 'token' }),
    verifyTenantAccess: jest.fn().mockResolvedValue(undefined),
    verifyTenantRole: jest.fn().mockResolvedValue(undefined),
    authErrorResponse: jest.fn().mockImplementation(() => NextResponse.json({ error: 'auth' }, { status: 401 })),
    AuthError: class extends Error { statusCode: number; constructor(m: string, c: number) { super(m); this.statusCode = c; } },
  };
});

const addDocMock = jest.fn();
const writeBatchMock = jest.fn();
const getDocMock = jest.fn();
const getDocsMock = jest.fn();
const runTransactionMock = jest.fn();
const updateDocMock = jest.fn();

jest.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  writeBatch: (...args: unknown[]) => writeBatchMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  runTransaction: (...args: unknown[]) => runTransactionMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  query: (...args: unknown[]) => args,
  where: (...args: unknown[]) => args,
  orderBy: (...args: unknown[]) => args,
  limit: (...args: unknown[]) => args,
  setDoc: jest.fn(),
  doc: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  db: {},
  Timestamp: { now: jest.fn(() => ({ toMillis: () => Date.now() })), fromDate: jest.fn((d: Date) => d) },
  collections: {
    signatureCases: jest.fn(() => ({ path: 'signatureCases' })),
    signatureCase: jest.fn((id: string) => ({ id })),
    signatureCaseSigners: jest.fn(() => ({ path: 'signers' })),
    signatureCaseSigner: jest.fn((caseId: string, signerId: string) => ({ id: `${caseId}/${signerId}` })),
    signatureCaseEvents: jest.fn(() => ({ path: 'events' })),
    signatureInboxItem: jest.fn(() => ({ path: 'inbox' })),
  },
}));

jest.mock('@/lib/signature-case-engine', () => ({
  appendSignatureEvent: jest.fn().mockResolvedValue(undefined),
  hydrateSignatureCase: jest.fn().mockResolvedValue({ id: 'case-1', signers: [], events: [] }),
  notifySigner: jest.fn().mockResolvedValue(undefined),
  setInboxStatus: jest.fn().mockResolvedValue(undefined),
  userSignerForCase: jest.fn().mockResolvedValue({ id: 'u1', data: () => ({ status: 'ready', signatureArtifact: { providerRef: 'ord-1' } }), ref: { id: 'ref' } }),
  allSignersSigned: jest.fn().mockResolvedValue(false),
  moveSequentialSigner: jest.fn().mockResolvedValue('u2'),
  notifyCaseCreatorDeclined: jest.fn().mockResolvedValue(undefined),
}));

import { POST as createCase } from '@/app/api/signature-cases/route';
import { POST as startCase } from '@/app/api/signature-cases/[caseId]/start/route';
import { POST as collectCase } from '@/app/api/signature-cases/[caseId]/sign/collect/route';
import { POST as remindCase } from '@/app/api/signature-cases/[caseId]/remind/route';

describe('signature cases api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addDocMock.mockResolvedValue({ id: 'case-1' });
    writeBatchMock.mockReturnValue({ set: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) });
    getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ tenantId: 't1', status: 'draft', signingOrder: 'parallel', title: 'Case', createdByUserId: 'u1' }) });
    getDocsMock.mockResolvedValue({ empty: false, size: 1, docs: [{ id: 'u1', data: () => ({ status: 'ready', userId: 'u1', email: 'a@a.com', name: 'A' }), ref: {} }] });
    runTransactionMock.mockImplementation(async (_db: unknown, fn: (tx: { get: (arg?: unknown) => Promise<unknown>; update: jest.Mock }) => Promise<void>) => {
      let call = 0;
      await fn({
        get: async () => {
          call += 1;
          if (call === 1) return { exists: () => true, data: () => ({ status: 'draft' }) };
          return { empty: false, docs: [{ ref: {}, data: () => ({}) }] };
        },
        update: jest.fn(),
      });
    });
  });

  it('create case returns 400 for invalid payload', async () => {
    const response = await createCase(new NextRequest('http://localhost/api/signature-cases', { method: 'POST', body: JSON.stringify({}) }));
    expect(response.status).toBe(400);
  });

  it('create case returns case id', async () => {
    const req = new NextRequest('http://localhost/api/signature-cases', { method: 'POST', body: JSON.stringify({ tenantId: 't1', title: 'T', targetType: 'document', targetId: 'd1', signingOrder: 'parallel', signers: [{ userId: 'u1', name: 'A', email: 'a@a.com' }] }) });
    const res = await createCase(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.caseId).toBe('case-1');
  });

  it('start case succeeds', async () => {
    const req = new NextRequest('http://localhost/api/signature-cases/case-1/start', { method: 'POST' });
    const res = await startCase(req, { params: Promise.resolve({ caseId: 'case-1' }) });
    expect(res.status).toBe(200);
  });

  it('collect requires orderRef match', async () => {
    const req = new NextRequest('http://localhost/api/signature-cases/case-1/sign/collect', { method: 'POST', body: JSON.stringify({ tenantId: 't1', orderRef: 'wrong' }) });
    const res = await collectCase(req, { params: Promise.resolve({ caseId: 'case-1' }) });
    expect(res.status).toBe(403);
  });

  it('remind enforces rate limit', async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => true, data: () => ({ tenantId: 't1', title: 'Case', lastReminderAt: { toMillis: () => Date.now() } }) });
    const req = new NextRequest('http://localhost/api/signature-cases/case-1/remind', { method: 'POST' });
    const res = await remindCase(req, { params: Promise.resolve({ caseId: 'case-1' }) });
    expect(res.status).toBe(429);
  });
});