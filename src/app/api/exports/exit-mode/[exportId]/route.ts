import { NextRequest, NextResponse } from 'next/server';
import { collections } from '@/lib/firebase';
import { getDoc } from 'firebase/firestore';
import { verifySession, verifyTenantRole, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { logger } from '@/lib/logger';
import type { TenantExport } from '@/types/schema';

export async function GET(request: NextRequest, { params }: { params: { exportId: string } }) {
  try {
    const { user } = await verifySession(request);
    const tenantId = new URL(request.url).searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    await verifyTenantRole(user, tenantId, ['admin', 'owner']);

    const exportSnapshot = await getDoc(collections.exportJob(tenantId, params.exportId));
    if (!exportSnapshot.exists()) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }

    const exportDoc = exportSnapshot.data() as TenantExport;
    if (exportDoc.status !== 'ready' || !exportDoc.downloadData) {
      return NextResponse.json({ error: 'Export is not ready' }, { status: 409 });
    }

    const bytes = Buffer.from(exportDoc.downloadData, 'base64');
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="exit-mode-${params.exportId}.zip"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Failed to download export', error);
    return NextResponse.json({ error: 'Failed to download export' }, { status: 500 });
  }
}
