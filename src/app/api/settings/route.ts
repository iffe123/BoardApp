import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp } from '@/lib/firebase';
import { getDoc, updateDoc } from 'firebase/firestore';
import { createAuditLog, AuditActions, getRequestMetadata } from '@/lib/audit-service';
import type { Tenant } from '@/types/schema';

// GET /api/settings - Get tenant settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const tenantRef = collections.tenant(tenantId);
    const tenantDoc = await getDoc(tenantRef);

    if (!tenantDoc.exists()) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenant = {
      id: tenantDoc.id,
      ...tenantDoc.data(),
    } as Tenant;

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - Update tenant settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      userId,
      userName,
      updates,
    } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const tenantRef = collections.tenant(tenantId);
    const tenantDoc = await getDoc(tenantRef);

    if (!tenantDoc.exists()) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const oldData = tenantDoc.data();

    // Build the update object
    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    // Handle nested updates for settings
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.organizationNumber !== undefined) {
      updateData.organizationNumber = updates.organizationNumber;
    }
    if (updates.website !== undefined) {
      updateData.website = updates.website;
    }
    if (updates.address !== undefined) {
      updateData.address = updates.address;
    }
    if (updates.settings !== undefined) {
      updateData.settings = {
        ...oldData?.settings,
        ...updates.settings,
      };
    }

    await updateDoc(tenantRef, updateData);

    // Create audit log
    try {
      const { actorIp, actorUserAgent } = getRequestMetadata(request);

      // Build changes array for audit
      const changes: Array<{ field: string; oldValue?: unknown; newValue?: unknown }> = [];

      Object.entries(updates).forEach(([key, newValue]) => {
        const oldValue = oldData?.[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({ field: key, oldValue, newValue });
        }
      });

      await createAuditLog({
        tenantId,
        action: AuditActions.SETTINGS_UPDATED,
        resourceType: 'settings',
        resourceId: tenantId,
        actorId: userId || 'unknown',
        actorName: userName || 'Unknown User',
        actorIp,
        actorUserAgent,
        changes,
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    // Fetch updated tenant
    const updatedDoc = await getDoc(tenantRef);
    const tenant = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as Tenant;

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
