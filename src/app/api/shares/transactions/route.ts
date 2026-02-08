import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from '@/lib/firebase';
import { verifySession, verifyTenantAccess, verifyTenantRole, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { checkRateLimit, RateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { shareTransactionsDAL, sharesDAL } from '@/lib/dal/shares';
import { shareholdersDAL } from '@/lib/dal/shareholders';
import { ShareTransactionCreateSchema } from '@/types/schema';

// GET /api/shares/transactions - List all transactions for a tenant
export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    verifyTenantAccess(user, tenantId);

    const rateCheck = checkRateLimit(`api:${user.uid}`, RateLimits.api);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    const transactions = await shareTransactionsDAL.list(tenantId);

    return NextResponse.json({
      transactions,
      total: transactions.length,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error fetching transactions', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST /api/shares/transactions - Create a new share transaction
export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const body = await request.json();
    const { tenantId, ...transactionData } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    verifyTenantRole(user, tenantId, ['owner', 'admin']);

    const rateCheck = checkRateLimit(`api:${user.uid}`, RateLimits.api);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    const parsed = ShareTransactionCreateSchema.safeParse(transactionData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate that target shareholder exists
    const toShareholder = await shareholdersDAL.get(tenantId, data.toShareholderId);
    if (!toShareholder) {
      return NextResponse.json(
        { error: 'Target shareholder not found' },
        { status: 404 }
      );
    }

    // Validate share number range
    if (data.shareNumberTo < data.shareNumberFrom) {
      return NextResponse.json(
        { error: 'shareNumberTo must be greater than or equal to shareNumberFrom' },
        { status: 400 }
      );
    }

    const expectedShares = data.shareNumberTo - data.shareNumberFrom + 1;
    if (expectedShares !== data.numberOfShares) {
      return NextResponse.json(
        { error: `numberOfShares (${data.numberOfShares}) does not match share number range (${expectedShares})` },
        { status: 400 }
      );
    }

    // For transfers, validate source shareholder and deactivate their shares
    if (data.type === 'transfer' || data.type === 'redemption') {
      if (!data.fromShareholderId) {
        return NextResponse.json(
          { error: 'fromShareholderId is required for transfer/redemption transactions' },
          { status: 400 }
        );
      }

      const fromShareholder = await shareholdersDAL.get(tenantId, data.fromShareholderId);
      if (!fromShareholder) {
        return NextResponse.json(
          { error: 'Source shareholder not found' },
          { status: 404 }
        );
      }
    }

    const transactionId = uuidv4();
    const transactionDate = typeof data.date === 'string' ? Timestamp.fromDate(new Date(data.date)) : Timestamp.now();

    // Create the transaction record
    await shareTransactionsDAL.create(tenantId, transactionId, {
      tenantId,
      type: data.type,
      date: transactionDate,
      description: data.description,
      fromShareholderId: data.fromShareholderId,
      toShareholderId: data.toShareholderId,
      shareClass: data.shareClass,
      numberOfShares: data.numberOfShares,
      shareNumberFrom: data.shareNumberFrom,
      shareNumberTo: data.shareNumberTo,
      pricePerShare: data.pricePerShare,
      totalAmount: data.totalAmount,
      decisionId: data.decisionId,
      meetingId: data.meetingId,
      registeredBy: user.uid,
      registeredAt: Timestamp.now(),
    });

    // Create new share entry for the recipient (except for redemptions)
    if (data.type !== 'redemption') {
      const shareId = uuidv4();
      await sharesDAL.create(tenantId, shareId, {
        tenantId,
        shareholderId: data.toShareholderId,
        shareClass: data.shareClass,
        shareNumberFrom: data.shareNumberFrom,
        shareNumberTo: data.shareNumberTo,
        numberOfShares: data.numberOfShares,
        nominalValue: data.nominalValue,
        votesPerShare: data.votesPerShare,
        acquisitionDate: transactionDate,
        acquisitionPrice: data.pricePerShare,
        transactionId,
        isActive: true,
      });
    }

    return NextResponse.json({
      id: transactionId,
      type: data.type,
      numberOfShares: data.numberOfShares,
      shareClass: data.shareClass,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error creating share transaction', error);
    return NextResponse.json(
      { error: 'Failed to create share transaction' },
      { status: 500 }
    );
  }
}
