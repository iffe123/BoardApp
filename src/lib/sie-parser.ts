/**
 * SIE4 File Parser
 *
 * Parses Swedish SIE4 (Standard Import Export) files for financial data import.
 * SIE4 is the standard file format for exchanging financial data between
 * Swedish accounting systems.
 *
 * Reference: https://sie.se/format/
 */

import { collections, Timestamp, db } from '@/lib/firebase';
import { addDoc } from 'firebase/firestore';
import type { FinancialPeriod } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

export interface SIECompanyInfo {
  companyName: string;
  organizationNumber: string;
  address?: string;
  sniCode?: string;
}

export interface SIEAccountBalance {
  accountNumber: number;
  accountName: string;
  balance: number;
  yearIndex: number; // 0 = current year, -1 = previous year
}

export interface SIETransaction {
  verificationNumber: string;
  date: string;
  text: string;
  entries: Array<{
    accountNumber: number;
    amount: number;
    text?: string;
  }>;
}

export interface SIEPeriodBalance {
  yearIndex: number;
  month: number;
  accountNumber: number;
  balance: number;
}

export interface SIEParsedData {
  format: string; // 'SIE4' or 'SIE1-3'
  program: string;
  programVersion: string;
  generatedDate: string;
  company: SIECompanyInfo;
  fiscalYears: Array<{
    yearIndex: number;
    startDate: string;
    endDate: string;
  }>;
  accounts: Map<number, string>;
  openingBalances: SIEAccountBalance[];
  closingBalances: SIEAccountBalance[];
  periodBalances: SIEPeriodBalance[];
  transactions: SIETransaction[];
  dimensions: Map<number, string>;
}

export interface SIEImportResult {
  success: boolean;
  company: SIECompanyInfo;
  periodsImported: number;
  errors: string[];
}

// ============================================================================
// PARSER
// ============================================================================

/**
 * Decode SIE file content (handles CP437 / Latin-1 encoding)
 */
function decodeSIEContent(buffer: ArrayBuffer): string {
  // SIE files use CP437 or ISO-8859-1 encoding
  const decoder = new TextDecoder('iso-8859-1');
  return decoder.decode(buffer);
}

/**
 * Parse a quoted SIE field value, handling Swedish characters
 */
function parseSIEString(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Split a SIE line into tokens, respecting quoted strings
 */
function tokenizeSIELine(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ' ' && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse SIE4 file content into structured data
 */
export function parseSIE4(content: string): SIEParsedData {
  const result: SIEParsedData = {
    format: '',
    program: '',
    programVersion: '',
    generatedDate: '',
    company: {
      companyName: '',
      organizationNumber: '',
    },
    fiscalYears: [],
    accounts: new Map(),
    openingBalances: [],
    closingBalances: [],
    periodBalances: [],
    transactions: [],
    dimensions: new Map(),
  };

  const lines = content.split(/\r?\n/);
  let currentTransaction: SIETransaction | null = null;
  let inTransaction = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('//')) continue;

    // Handle transaction blocks
    if (line === '{') {
      continue;
    }

    if (line === '}') {
      if (currentTransaction && inTransaction) {
        result.transactions.push(currentTransaction);
        currentTransaction = null;
        inTransaction = false;
      }
      continue;
    }

    // Transaction entry lines start with #TRANS
    if (inTransaction && line.startsWith('#TRANS')) {
      const tokens = tokenizeSIELine(line);
      if (currentTransaction && tokens.length >= 3) {
        currentTransaction.entries.push({
          accountNumber: parseInt(tokens[1]!, 10),
          amount: parseFloat(tokens[3] || tokens[2]!),
          text: tokens.length > 4 ? parseSIEString(tokens[4]!) : undefined,
        });
      }
      continue;
    }

    if (!line.startsWith('#')) continue;

    const tokens = tokenizeSIELine(line);
    const tag = tokens[0]!.toUpperCase();

    switch (tag) {
      case '#SIETYP':
        result.format = `SIE${tokens[1] || ''}`;
        break;

      case '#PROGRAM':
        result.program = parseSIEString(tokens[1] || '');
        result.programVersion = parseSIEString(tokens[2] || '');
        break;

      case '#GEN':
        result.generatedDate = tokens[1] || '';
        break;

      case '#FNAMN':
        result.company.companyName = parseSIEString(tokens[1] || '');
        break;

      case '#ORGNR':
        result.company.organizationNumber = tokens[1] || '';
        break;

      case '#ADRESS':
        result.company.address = parseSIEString(tokens[1] || '');
        break;

      case '#SNI':
        result.company.sniCode = tokens[1] || '';
        break;

      case '#RAR': {
        // Fiscal year: #RAR yearIndex startDate endDate
        if (tokens.length >= 4) {
          result.fiscalYears.push({
            yearIndex: parseInt(tokens[1]!, 10),
            startDate: tokens[2]!,
            endDate: tokens[3]!,
          });
        }
        break;
      }

      case '#KONTO': {
        // Account: #KONTO accountNumber accountName
        if (tokens.length >= 3) {
          result.accounts.set(
            parseInt(tokens[1]!, 10),
            parseSIEString(tokens[2]!)
          );
        }
        break;
      }

      case '#IB': {
        // Opening balance: #IB yearIndex accountNumber balance
        if (tokens.length >= 4) {
          result.openingBalances.push({
            yearIndex: parseInt(tokens[1]!, 10),
            accountNumber: parseInt(tokens[2]!, 10),
            accountName: result.accounts.get(parseInt(tokens[2]!, 10)) || '',
            balance: parseFloat(tokens[3]!),
          });
        }
        break;
      }

      case '#UB': {
        // Closing balance: #UB yearIndex accountNumber balance
        if (tokens.length >= 4) {
          result.closingBalances.push({
            yearIndex: parseInt(tokens[1]!, 10),
            accountNumber: parseInt(tokens[2]!, 10),
            accountName: result.accounts.get(parseInt(tokens[2]!, 10)) || '',
            balance: parseFloat(tokens[3]!),
          });
        }
        break;
      }

      case '#PSALDO': {
        // Period balance: #PSALDO yearIndex month accountNumber {} balance
        if (tokens.length >= 5) {
          const yearIndex = parseInt(tokens[1]!, 10);
          const month = parseInt(tokens[2]!, 10);
          // tokens[3] is accountNumber, tokens[4] could be {} (dimensions) or balance
          let accountNumber: number;
          let balance: number;

          if (tokens[3] === '{}') {
            // No dimensions
            accountNumber = parseInt(tokens[2]!, 10);
            balance = parseFloat(tokens[4]!);
          } else {
            accountNumber = parseInt(tokens[3]!, 10);
            // Find the balance token (skip dimension objects)
            const balanceIdx = tokens.findIndex(
              (t, i) => i > 3 && !t.startsWith('{') && !t.endsWith('}')
            );
            balance = balanceIdx >= 0 ? parseFloat(tokens[balanceIdx]!) : 0;
          }

          result.periodBalances.push({
            yearIndex,
            month,
            accountNumber,
            balance,
          });
        }
        break;
      }

      case '#VER': {
        // Verification/transaction: #VER series verNumber date text
        currentTransaction = {
          verificationNumber: `${parseSIEString(tokens[1] || '')}${tokens[2] || ''}`,
          date: tokens[3] || '',
          text: parseSIEString(tokens[4] || ''),
          entries: [],
        };
        inTransaction = true;
        break;
      }

      case '#DIM': {
        // Dimension definition
        if (tokens.length >= 3) {
          result.dimensions.set(
            parseInt(tokens[1]!, 10),
            parseSIEString(tokens[2]!)
          );
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Parse SIE4 from ArrayBuffer (file upload)
 */
export function parseSIE4FromBuffer(buffer: ArrayBuffer): SIEParsedData {
  const content = decodeSIEContent(buffer);
  return parseSIE4(content);
}

// ============================================================================
// FINANCIAL DATA AGGREGATION
// ============================================================================

/**
 * Aggregate parsed SIE data into financial periods using Swedish BAS account plan
 */
export function aggregateSIEFinancials(
  data: SIEParsedData,
  yearIndex: number = 0
): Map<string, {
  revenue: number;
  costOfGoodsSold: number;
  operatingExpenses: number;
  assets: number;
  liabilities: number;
  equity: number;
}> {
  const periods = new Map<string, {
    revenue: number;
    costOfGoodsSold: number;
    operatingExpenses: number;
    assets: number;
    liabilities: number;
    equity: number;
  }>();

  // Find fiscal year for the given index
  const fiscalYear = data.fiscalYears.find((fy) => fy.yearIndex === yearIndex);
  if (!fiscalYear) return periods;

  const startYear = parseInt(fiscalYear.startDate.substring(0, 4), 10);

  // If we have period balances, use those for monthly data
  if (data.periodBalances.length > 0) {
    const monthlyBalances = data.periodBalances.filter((pb) => pb.yearIndex === yearIndex);

    for (const pb of monthlyBalances) {
      const periodKey = `${startYear}-${String(pb.month).padStart(2, '0')}`;

      if (!periods.has(periodKey)) {
        periods.set(periodKey, {
          revenue: 0,
          costOfGoodsSold: 0,
          operatingExpenses: 0,
          assets: 0,
          liabilities: 0,
          equity: 0,
        });
      }

      const period = periods.get(periodKey)!;
      const acctNum = pb.accountNumber;
      const balance = pb.balance;

      // Swedish BAS account plan classification
      if (acctNum >= 3000 && acctNum < 4000) {
        period.revenue += Math.abs(balance);
      } else if (acctNum >= 4000 && acctNum < 5000) {
        period.costOfGoodsSold += balance;
      } else if (acctNum >= 5000 && acctNum < 8000) {
        period.operatingExpenses += balance;
      } else if (acctNum >= 1000 && acctNum < 2000) {
        period.assets += balance;
      } else if (acctNum >= 2000 && acctNum < 2100) {
        period.equity += Math.abs(balance);
      } else if (acctNum >= 2100 && acctNum < 3000) {
        period.liabilities += Math.abs(balance);
      }
    }
  } else {
    // Fall back to closing balances for annual data
    const closingBalances = data.closingBalances.filter((cb) => cb.yearIndex === yearIndex);
    const periodKey = `${startYear}-12`; // Use year-end as the period

    const period = {
      revenue: 0,
      costOfGoodsSold: 0,
      operatingExpenses: 0,
      assets: 0,
      liabilities: 0,
      equity: 0,
    };

    for (const cb of closingBalances) {
      const acctNum = cb.accountNumber;
      const balance = cb.balance;

      if (acctNum >= 3000 && acctNum < 4000) {
        period.revenue += Math.abs(balance);
      } else if (acctNum >= 4000 && acctNum < 5000) {
        period.costOfGoodsSold += balance;
      } else if (acctNum >= 5000 && acctNum < 8000) {
        period.operatingExpenses += balance;
      } else if (acctNum >= 1000 && acctNum < 2000) {
        period.assets += balance;
      } else if (acctNum >= 2000 && acctNum < 2100) {
        period.equity += Math.abs(balance);
      } else if (acctNum >= 2100 && acctNum < 3000) {
        period.liabilities += Math.abs(balance);
      }
    }

    periods.set(periodKey, period);
  }

  return periods;
}

// ============================================================================
// IMPORT TO FIRESTORE
// ============================================================================

/**
 * Import SIE4 data into Firestore financial periods
 */
export async function importSIE4ToFirestore(
  tenantId: string,
  data: SIEParsedData,
  importedBy: string
): Promise<SIEImportResult> {
  if (!db) throw new Error('Database not initialized');

  const errors: string[] = [];
  let periodsImported = 0;

  try {
    const aggregated = aggregateSIEFinancials(data, 0);

    for (const [periodKey, financials] of Array.from(aggregated.entries())) {
      try {
        const [yearStr] = periodKey.split('-');
        const year = parseInt(yearStr!, 10);
        const grossProfit = financials.revenue - financials.costOfGoodsSold;
        const operatingIncome = grossProfit - financials.operatingExpenses;
        const netIncome = operatingIncome;

        const periodData: Omit<FinancialPeriod, 'id'> = {
          tenantId,
          period: periodKey,
          periodType: 'monthly',
          fiscalYear: year,
          incomeStatement: {
            revenue: financials.revenue,
            costOfGoodsSold: financials.costOfGoodsSold,
            grossProfit,
            operatingExpenses: financials.operatingExpenses,
            operatingIncome,
            interestExpense: 0,
            interestIncome: 0,
            otherIncome: 0,
            otherExpenses: 0,
            taxExpense: 0,
            netIncome,
          },
          balanceSheet: {
            cashAndEquivalents: 0,
            accountsReceivable: 0,
            inventory: 0,
            prepaidExpenses: 0,
            otherCurrentAssets: 0,
            totalCurrentAssets: financials.assets * 0.5,
            propertyPlantEquipment: 0,
            intangibleAssets: 0,
            longTermInvestments: 0,
            otherNonCurrentAssets: 0,
            totalNonCurrentAssets: financials.assets * 0.5,
            totalAssets: financials.assets,
            accountsPayable: 0,
            shortTermDebt: 0,
            accruedLiabilities: 0,
            otherCurrentLiabilities: 0,
            totalCurrentLiabilities: financials.liabilities * 0.5,
            longTermDebt: 0,
            deferredTaxLiabilities: 0,
            otherNonCurrentLiabilities: 0,
            totalNonCurrentLiabilities: financials.liabilities * 0.5,
            totalLiabilities: financials.liabilities,
            commonStock: 0,
            retainedEarnings: financials.equity,
            otherEquity: 0,
            totalEquity: financials.equity,
          },
          cashFlow: {
            operatingCashFlow: 0,
            investingCashFlow: 0,
            financingCashFlow: 0,
            netCashFlow: 0,
            beginningCash: 0,
            endingCash: 0,
          },
          kpis: {
            grossMargin: financials.revenue ? (grossProfit / financials.revenue) * 100 : 0,
            operatingMargin: financials.revenue
              ? (operatingIncome / financials.revenue) * 100
              : 0,
            netMargin: financials.revenue ? (netIncome / financials.revenue) * 100 : 0,
            ebitda: operatingIncome,
            ebitdaMargin: financials.revenue
              ? (operatingIncome / financials.revenue) * 100
              : 0,
            currentRatio: financials.liabilities
              ? financials.assets / financials.liabilities
              : 0,
            quickRatio: financials.liabilities
              ? financials.assets / financials.liabilities
              : 0,
            debtToEquity: financials.equity
              ? financials.liabilities / financials.equity
              : 0,
            returnOnAssets: financials.assets
              ? (netIncome / financials.assets) * 100
              : 0,
            returnOnEquity: financials.equity
              ? (netIncome / financials.equity) * 100
              : 0,
            workingCapital: financials.assets - financials.liabilities,
          },
          source: 'import',
          sourceMetadata: {
            importedAt: Timestamp.now(),
            importedBy,
            erpConnectionId: `sie4-import-${data.program}`,
          },
          status: 'final',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: importedBy,
        };

        await addDoc(collections.financials(tenantId), periodData);
        periodsImported++;
      } catch (error) {
        errors.push(
          `Period ${periodKey}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  } catch (error) {
    errors.push(
      `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return {
    success: errors.length === 0,
    company: data.company,
    periodsImported,
    errors,
  };
}
