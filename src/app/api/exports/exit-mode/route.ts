import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp } from '@/lib/firebase';
import { getDoc, setDoc } from 'firebase/firestore';
import { verifySession, verifyTenantRole, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-service';
import { logger } from '@/lib/logger';
import { buildExportId, buildExportZip, normalizeParameters, type ExitModeParameters } from '@/lib/exit-mode';
import type { TenantExport } from '@/types/schema';

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const body = await request.json() as Omit<ExitModeParameters, 'tenantId'> & { tenantId?: string };

    if (!body.tenantId || !body.from || !body.to || !Array.isArray(body.contentTypes) || body.contentTypes.length === 0) {
      return NextResponse.json({ error: 'Missing required export parameters' }, { status: 400 });
    }

    await verifyTenantRole(user, body.tenantId, ['admin', 'owner']);

    const parameters = normalizeParameters({
      tenantId: body.tenantId,
      from: body.from,
      to: body.to,
      boardrooms: body.boardrooms ?? [],
      contentTypes: body.contentTypes,
    });

    const exportId = buildExportId(parameters);
    const exportRef = collections.exportJob(body.tenantId, exportId);
    const existing = await getDoc(exportRef);

    if (existing.exists()) {
      const exportData = existing.data() as TenantExport;
      return NextResponse.json({ exportId, status: exportData.status, checksum: exportData.checksum, storagePath: exportData.storagePath });
    }

    await setDoc(exportRef, {
      id: exportId,
      tenantId: body.tenantId,
      createdBy: user.uid,
      createdAt: Timestamp.now(),
      status: 'generating',
      parameters: {
        from: parameters.from,
        to: parameters.to,
        boardrooms: parameters.boardrooms ?? [],
        contentTypes: parameters.contentTypes,
      },
      storagePath: `tenants/${body.tenantId}/exports/${exportId}.zip`,
      manifest: [],
      checksum: '',
    } satisfies TenantExport);

    const { archive, manifest, checksum } = await buildExportZip(parameters);

    const completedExport: TenantExport = {
      id: exportId,
      tenantId: body.tenantId,
      createdBy: user.uid,
      createdAt: Timestamp.now(),
      status: 'ready',
      parameters: {
        from: parameters.from,
        to: parameters.to,
        boardrooms: parameters.boardrooms ?? [],
        contentTypes: parameters.contentTypes,
      },
      storagePath: `tenants/${body.tenantId}/exports/${exportId}.zip`,
      manifest,
      checksum,
      downloadData: archive.toString('base64'),
    };

    await setDoc(exportRef, completedExport);

    await createAuditLog({
      tenantId: body.tenantId,
      action: 'export.created',
      resourceType: 'export',
      resourceId: exportId,
      actorId: user.uid,
      actorName: user.name || user.email || user.uid,
      metadata: {
        checksum,
        contentTypes: parameters.contentTypes,
      },
      ...getRequestMetadata(request),
    });

    return NextResponse.json({
      exportId,
      status: 'ready',
      checksum,
      storagePath: completedExport.storagePath,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Failed to generate exit mode export', error);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
