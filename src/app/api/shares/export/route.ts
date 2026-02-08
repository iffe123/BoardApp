import { NextRequest, NextResponse } from 'next/server';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { checkRateLimit, RateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { computeCapTable } from '@/lib/dal/shares';
import { shareTransactionsDAL } from '@/lib/dal/shares';

// GET /api/shares/export - Export share registry as CSV
export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const format = searchParams.get('format') || 'csv';

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

    const capTable = await computeCapTable(tenantId);
    const transactions = await shareTransactionsDAL.list(tenantId);

    if (format === 'csv') {
      const csvLines: string[] = [];

      // Cap table section
      csvLines.push('AKTIEBOK - ÄGARFÖRTECKNING');
      csvLines.push('');
      csvLines.push('Aktieägare,Antal aktier,Ägarandel (%),Röstandel (%),Aktieslag');

      for (const sh of capTable.shareholders) {
        const classSummary = Object.entries(sh.sharesByClass)
          .map(([cls, count]) => `${cls}: ${count}`)
          .join('; ');
        csvLines.push(
          `"${sh.name}",${sh.totalShares},${sh.ownershipPercentage.toFixed(2)},${sh.votingPercentage.toFixed(2)},"${classSummary}"`
        );
      }

      csvLines.push('');
      csvLines.push(`Totalt antal aktier,${capTable.totalShares}`);
      csvLines.push(`Totalt aktiekapital,${capTable.totalShareCapital}`);

      // Transactions section
      csvLines.push('');
      csvLines.push('TRANSAKTIONSHISTORIK');
      csvLines.push('');
      csvLines.push('Datum,Typ,Beskrivning,Aktieslag,Antal,Från aktienr,Till aktienr,Pris/aktie,Totalt belopp');

      for (const tx of transactions) {
        const date = tx.date && 'toDate' in tx.date
          ? tx.date.toDate().toISOString().split('T')[0]
          : '';
        csvLines.push(
          `${date},"${tx.type}","${tx.description}",${tx.shareClass},${tx.numberOfShares},${tx.shareNumberFrom},${tx.shareNumberTo},${tx.pricePerShare ?? ''},${tx.totalAmount ?? ''}`
        );
      }

      const csvContent = csvLines.join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="aktiebok-${tenantId}.csv"`,
        },
      });
    }

    // Default: return JSON data for PDF generation on the client
    return NextResponse.json({
      capTable,
      transactions,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error exporting share registry', error);
    return NextResponse.json(
      { error: 'Failed to export share registry' },
      { status: 500 }
    );
  }
}
