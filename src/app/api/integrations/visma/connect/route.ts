import { NextRequest, NextResponse } from 'next/server';
import { getVismaAuthUrl } from '@/lib/visma-service';

export const dynamic = 'force-dynamic';

// GET /api/integrations/visma/connect - Initiate Visma OAuth flow
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

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/visma/callback`;
    const authUrl = getVismaAuthUrl(tenantId, redirectUri);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Visma connect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate Visma connection' },
      { status: 500 }
    );
  }
}
