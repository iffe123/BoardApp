import { NextRequest, NextResponse } from 'next/server';
import { parseSIE4, importSIE4ToFirestore } from '@/lib/sie-parser';
import { createAuditLog } from '@/lib/audit-service';

// POST /api/integrations/sie4 - Import SIE4 file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tenantId = formData.get('tenantId') as string | null;
    const userId = formData.get('userId') as string | null;
    const userName = formData.get('userName') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.se') && !fileName.endsWith('.si') && !fileName.endsWith('.sie')) {
      return NextResponse.json(
        { error: 'Invalid file format. Expected .se, .si, or .sie file.' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Parse SIE4 data
    const parsedData = parseSIE4(content);

    if (!parsedData.company.companyName && !parsedData.company.organizationNumber) {
      return NextResponse.json(
        { error: 'Could not parse company information from SIE file' },
        { status: 400 }
      );
    }

    // Import to Firestore
    const result = await importSIE4ToFirestore(
      tenantId,
      parsedData,
      userId || 'unknown'
    );

    // Create audit log
    await createAuditLog({
      tenantId,
      action: 'financial.data_imported',
      resourceType: 'financial',
      resourceId: tenantId,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      metadata: {
        source: 'sie4',
        fileName: file.name,
        fileSize: file.size,
        format: parsedData.format,
        program: parsedData.program,
        companyName: parsedData.company.companyName,
        periodsImported: result.periodsImported,
        errors: result.errors.length,
      },
    });

    return NextResponse.json({
      success: result.success,
      company: result.company,
      periodsImported: result.periodsImported,
      errors: result.errors,
      metadata: {
        format: parsedData.format,
        program: parsedData.program,
        generatedDate: parsedData.generatedDate,
        accountCount: parsedData.accounts.size,
        fiscalYears: parsedData.fiscalYears.length,
      },
    });
  } catch (error) {
    console.error('SIE4 import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import SIE4 file' },
      { status: 500 }
    );
  }
}
