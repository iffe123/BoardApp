import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/verify-session', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server');
  return {
    verifySession: jest.fn().mockResolvedValue({ user: { uid: 'admin-1', email: 'admin@example.com', tenants: { 'tenant-1': 'admin' } } }),
    verifyTenantRole: jest.fn(),
    authErrorResponse: jest.fn().mockImplementation((error: { message?: string; statusCode?: number }) =>
      NextResponse.json({ error: error.message || 'Auth error' }, { status: error.statusCode || 401 })),
    AuthError: class extends Error { statusCode: number; constructor(m: string, s: number) { super(m); this.statusCode = s; } },
  };
});

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }));
jest.mock('@/lib/audit-service', () => ({ createAuditLog: jest.fn().mockResolvedValue('audit-id'), getRequestMetadata: jest.fn(() => ({})) }));
jest.mock('@/lib/firebase', () => ({
  collections: {
    exportJob: jest.fn((tenantId: string, exportId: string) => ({ path: `tenants/${tenantId}/exports/${exportId}`, id: exportId })),
  },
  Timestamp: { now: jest.fn(() => ({ toDate: () => new Date() })) },
}));

const docs = new Map<string, unknown>();
const mockGetDoc = jest.fn((ref: { path: string }) => Promise.resolve({ exists: () => docs.has(ref.path), data: () => docs.get(ref.path) }));
const mockSetDoc = jest.fn((ref: { path: string }, payload: unknown) => { docs.set(ref.path, payload); return Promise.resolve(); });

jest.mock('firebase/firestore', () => ({
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

import { POST } from '@/app/api/exports/exit-mode/route';
import { GET } from '@/app/api/exports/exit-mode/[exportId]/route';

describe('Exit mode e2e flow', () => {
  it('generates export then exposes download endpoint', async () => {
    const createRequest = new NextRequest('http://localhost:3000/api/exports/exit-mode', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-1', from: '2025-01-01', to: '2025-12-31', contentTypes: ['minutes'] }),
    });

    const createResponse = await POST(createRequest);
    const createData = await createResponse.json();

    const downloadRequest = new NextRequest(`http://localhost:3000/api/exports/exit-mode/${createData.exportId}?tenantId=tenant-1`);
    const downloadResponse = await GET(downloadRequest, { params: { exportId: createData.exportId } });

    expect(createResponse.status).toBe(200);
    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get('Content-Type')).toBe('application/zip');
  });
});
