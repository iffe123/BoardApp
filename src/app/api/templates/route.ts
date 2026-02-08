/**
 * Meeting Templates API Route
 *
 * Handles CRUD operations for meeting templates.
 * Supports both system templates and tenant-specific custom templates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp } from '@/lib/firebase';
import { getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, verifyTenantRole, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { logger } from '@/lib/logger';
import type { MeetingTemplate } from '@/types/schema';
import {
  DEFAULT_TEMPLATES,
  getTemplateDefinition,
  generateAgendaFromTemplate,
  templateDefinitionToMeetingTemplate,
} from '@/lib/meeting-templates';

// ============================================================================
// GET - List templates
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const meetingType = searchParams.get('meetingType');
    const includeSystem = searchParams.get('includeSystem') !== 'false';
    const locale = (searchParams.get('locale') as 'en' | 'sv') || 'en';

    const templates: Array<MeetingTemplate & { isSystem: boolean }> = [];

    // Add system templates if requested
    if (includeSystem) {
      for (const definition of DEFAULT_TEMPLATES) {
        // Filter by meeting type if specified
        if (meetingType && definition.meetingType !== meetingType) {
          continue;
        }

        const template = templateDefinitionToMeetingTemplate(definition, locale);
        templates.push({
          id: definition.id,
          ...template,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'system',
          usageCount: 0,
          isSystem: true,
        });
      }
    }

    // Add tenant-specific templates if tenantId provided
    if (tenantId) {
      verifyTenantAccess(user, tenantId);

      try {
        const templatesQuery = query(
          collections.templates(tenantId),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(templatesQuery);

        snapshot.forEach((doc) => {
          const templateData = doc.data() as Omit<MeetingTemplate, 'id'>;

          // Filter by meeting type if specified
          if (meetingType && templateData.meetingType !== meetingType) {
            return;
          }

          templates.push({
            ...templateData,
            id: doc.id,
            isSystem: false,
          });
        });
      } catch (error) {
        logger.error('Error fetching tenant templates', error, { orgId: tenantId });
        // Continue with system templates only
      }
    }

    return NextResponse.json({
      templates,
      total: templates.length,
      systemCount: templates.filter(t => t.isSystem).length,
      customCount: templates.filter(t => !t.isSystem).length,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error fetching templates', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create a new template or get agenda from template
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const body = await request.json();
    const {
      action = 'create', // 'create' or 'generate_agenda'
      tenantId,
      templateId, // For generate_agenda action
      locale = 'en',
      // For create action:
      name,
      description,
      meetingType,
      agendaItems,
      defaultDuration,
      defaultQuorum,
      visibility = 'private',
      createdBy,
    } = body;

    // Action: Generate agenda from a template
    if (action === 'generate_agenda') {
      if (!templateId) {
        return NextResponse.json(
          { error: 'templateId is required for generate_agenda action' },
          { status: 400 }
        );
      }

      // Check if it's a system template
      const systemTemplate = getTemplateDefinition(templateId);
      if (systemTemplate) {
        const generatedItems = generateAgendaFromTemplate(templateId, locale);
        return NextResponse.json({
          templateId,
          templateName: locale === 'sv' ? systemTemplate.nameSv : systemTemplate.name,
          agendaItems: generatedItems,
          defaultDuration: systemTemplate.defaultDuration,
          defaultQuorum: systemTemplate.defaultQuorum,
          meetingType: systemTemplate.meetingType,
        });
      }

      // Check tenant templates
      if (!tenantId) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      // TODO: Implement fetching custom tenant template
      return NextResponse.json(
        { error: 'Custom template loading not yet implemented' },
        { status: 501 }
      );
    }

    // Action: Create a new custom template
    if (!tenantId || !name || !meetingType || !agendaItems || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields for template creation' },
        { status: 400 }
      );
    }

    // Only admins can create templates
    verifyTenantRole(user, tenantId, ['owner', 'admin']);

    const template: Omit<MeetingTemplate, 'id'> = {
      tenantId,
      name,
      description: description || '',
      meetingType,
      agendaItems: agendaItems.map((item: MeetingTemplate['agendaItems'][0]) => ({
        title: item.title,
        description: item.description,
        type: item.type,
        estimatedDuration: item.estimatedDuration,
        documentIds: item.documentIds || [],
        conflictKeywords: item.conflictKeywords || [],
        recusedMemberIds: [],
        isConfidential: item.isConfidential || false,
      })),
      defaultDuration: defaultDuration || 120,
      defaultQuorum: defaultQuorum || 3,
      visibility,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy,
      usageCount: 0,
    };

    const docRef = await addDoc(collections.templates(tenantId), template);

    return NextResponse.json({
      id: docRef.id,
      ...template,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error creating template', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
