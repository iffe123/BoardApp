/**
 * Visma ERP Integration Service
 *
 * Handles OAuth flow, data sync, and account mapping for Visma eEkonomi integration.
 * Swedish accounting platform integration for automated financial reporting.
 */

import { collections, Timestamp, db } from '@/lib/firebase';
import { updateDoc, addDoc, getDocs, query, where } from 'firebase/firestore';
import type { FinancialPeriod, ERPConnection } from '@/types/schema';

// Visma API configuration
const VISMA_AUTH_URL = 'https://identity.vismaonline.com/connect/authorize';
const VISMA_TOKEN_URL = 'https://identity.vismaonline.com/connect/token';
const VISMA_API_URL = 'https://eaccountingapi.vismaonline.com/v2';

const VISMA_CLIENT_ID = process.env.VISMA_CLIENT_ID || '';
const VISMA_CLIENT_SECRET = process.env.VISMA_CLIENT_SECRET || '';

// Types
export interface VismaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface VismaCompanyInfo {
  companyName: string;
  organizationNumber: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export interface VismaFinancialData {
  period: {
    year: number;
    month: number;
  };
  revenue: number;
  costs: number;
  profit: number;
  assets: number;
  liabilities: number;
  equity: number;
}

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * Generate OAuth authorization URL for Visma
 */
export function getVismaAuthUrl(tenantId: string, redirectUri: string): string {
  const state = Buffer.from(JSON.stringify({ tenantId })).toString('base64');

  const params = new URLSearchParams({
    client_id: VISMA_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'ea:api ea:sales ea:purchase ea:accounting offline_access',
    state,
    response_type: 'code',
  });

  return `${VISMA_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeVismaCode(
  code: string,
  redirectUri: string
): Promise<VismaTokens> {
  const response = await fetch(VISMA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: VISMA_CLIENT_ID,
      client_secret: VISMA_CLIENT_SECRET,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Refresh access token
 */
export async function refreshVismaToken(refreshToken: string): Promise<VismaTokens> {
  const response = await fetch(VISMA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: VISMA_CLIENT_ID,
      client_secret: VISMA_CLIENT_SECRET,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

/**
 * Store Visma connection details for a tenant
 */
export async function storeVismaConnection(
  tenantId: string,
  tokens: VismaTokens,
  companyInfo?: VismaCompanyInfo
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.erpConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'visma'));
  const existingSnap = await getDocs(existingQuery);

  const erpConnection: Omit<ERPConnection, 'id'> = {
    tenantId,
    provider: 'visma',
    status: 'active',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenExpiresAt: Timestamp.fromDate(tokens.expiresAt),
    syncEnabled: true,
    syncFrequency: 'daily',
    lastSyncAt: Timestamp.now(),
    lastSyncStatus: 'success',
    connectedAt: Timestamp.now(),
    connectedBy: 'system',
    updatedAt: Timestamp.now(),
    accountMapping: companyInfo
      ? {
          companyName: companyInfo.companyName,
          organizationNumber: companyInfo.organizationNumber,
        }
      : undefined,
  };

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0]!;
    await updateDoc(existingDoc.ref, {
      ...erpConnection,
      connectedAt: existingDoc.data().connectedAt || Timestamp.now(),
    });
  } else {
    await addDoc(connectionsRef, erpConnection);
  }
}

/**
 * Disconnect Visma from tenant
 */
export async function disconnectVisma(tenantId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.erpConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'visma'));
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    const connectionDoc = existingSnap.docs[0]!;
    await updateDoc(connectionDoc.ref, {
      status: 'disconnected',
      accessToken: null,
      refreshToken: null,
      updatedAt: Timestamp.now(),
    });
  }
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(tenantId: string): Promise<string> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.erpConnections(tenantId);
  const connectionsQuery = query(
    connectionsRef,
    where('provider', '==', 'visma'),
    where('status', '==', 'active')
  );
  const connectionsSnap = await getDocs(connectionsQuery);

  if (connectionsSnap.empty) {
    throw new Error('Visma not connected');
  }

  const connectionDoc = connectionsSnap.docs[0]!;
  const connection = connectionDoc.data() as ERPConnection;

  if (!connection.accessToken || !connection.refreshToken) {
    throw new Error('Invalid Visma connection credentials');
  }

  const expiresAt = connection.tokenExpiresAt?.toDate() || new Date(0);

  // Check if token needs refresh (5 minute buffer)
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const newTokens = await refreshVismaToken(connection.refreshToken);
    await storeVismaConnection(tenantId, newTokens);
    return newTokens.accessToken;
  }

  return connection.accessToken;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Make authenticated request to Visma API
 */
async function vismaRequest<T>(
  tenantId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidAccessToken(tenantId);

  const response = await fetch(`${VISMA_API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Visma API error: ${error}`);
  }

  return response.json();
}

/**
 * Fetch company information from Visma
 */
export async function getVismaCompanyInfo(tenantId: string): Promise<VismaCompanyInfo> {
  const data = await vismaRequest<{
    Name: string;
    CorporateIdentityNumber: string;
    Address1: string;
    City: string;
    PostalCode: string;
    Country: string;
  }>(tenantId, '/companyinformation');

  return {
    companyName: data.Name,
    organizationNumber: data.CorporateIdentityNumber,
    address: {
      street: data.Address1,
      city: data.City,
      postalCode: data.PostalCode,
      country: data.Country || 'Sweden',
    },
  };
}

/**
 * Fetch fiscal years from Visma
 */
export async function getVismaFiscalYears(tenantId: string): Promise<Array<{
  id: string;
  startDate: string;
  endDate: string;
}>> {
  const data = await vismaRequest<{
    Data: Array<{
      Id: string;
      StartDate: string;
      EndDate: string;
    }>;
  }>(tenantId, '/fiscalyears');

  return data.Data.map((fy) => ({
    id: fy.Id,
    startDate: fy.StartDate,
    endDate: fy.EndDate,
  }));
}

/**
 * Fetch account balances for a specific period from Visma
 */
export async function getVismaAccountBalances(
  tenantId: string,
  fiscalYearId: string
): Promise<Array<{
  accountNumber: number;
  accountName: string;
  balance: number;
}>> {
  const data = await vismaRequest<{
    Data: Array<{
      AccountNumber: number;
      AccountName: string;
      ClosingBalance: number;
    }>;
  }>(tenantId, `/accountbalances?fiscalYearId=${fiscalYearId}`);

  return data.Data.map((ab) => ({
    accountNumber: ab.AccountNumber,
    accountName: ab.AccountName,
    balance: ab.ClosingBalance,
  }));
}

/**
 * Fetch financial data for a specific period
 */
export async function getVismaFinancials(
  tenantId: string,
  year: number,
  month: number
): Promise<VismaFinancialData> {
  // Visma uses fiscal year IDs, fetch them first
  const fiscalYears = await getVismaFiscalYears(tenantId);
  const targetFiscalYear = fiscalYears.find((fy) => {
    const startYear = new Date(fy.startDate).getFullYear();
    const endYear = new Date(fy.endDate).getFullYear();
    return year >= startYear && year <= endYear;
  });

  if (!targetFiscalYear) {
    throw new Error(`No fiscal year found for ${year}`);
  }

  const accountBalances = await getVismaAccountBalances(tenantId, targetFiscalYear.id);

  // Aggregate using Swedish BAS account plan ranges
  let revenue = 0;
  let costs = 0;
  let assets = 0;
  let liabilities = 0;
  let equity = 0;

  for (const account of accountBalances) {
    const accountNum = account.accountNumber;
    const balance = account.balance;

    if (accountNum >= 3000 && accountNum < 4000) {
      revenue += Math.abs(balance); // Revenue is credit (negative in BAS)
    } else if (accountNum >= 4000 && accountNum < 8000) {
      costs += balance;
    } else if (accountNum >= 1000 && accountNum < 2000) {
      assets += balance;
    } else if (accountNum >= 2000 && accountNum < 2100) {
      equity += Math.abs(balance);
    } else if (accountNum >= 2100 && accountNum < 3000) {
      liabilities += Math.abs(balance);
    }
  }

  return {
    period: { year, month },
    revenue,
    costs,
    profit: revenue - costs,
    assets,
    liabilities,
    equity,
  };
}

/**
 * Sync financial data from Visma to Firebase
 */
export async function syncVismaFinancials(
  tenantId: string,
  year: number,
  months: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
): Promise<{ synced: number; errors: string[] }> {
  if (!db) throw new Error('Database not initialized');

  const errors: string[] = [];
  let synced = 0;

  for (const month of months) {
    try {
      const financialData = await getVismaFinancials(tenantId, year, month);

      const periodData: Omit<FinancialPeriod, 'id'> = {
        tenantId,
        period: `${year}-${String(month).padStart(2, '0')}`,
        periodType: 'monthly',
        fiscalYear: year,
        incomeStatement: {
          revenue: financialData.revenue,
          costOfGoodsSold: 0,
          grossProfit: financialData.revenue,
          operatingExpenses: financialData.costs,
          operatingIncome: financialData.profit,
          interestExpense: 0,
          interestIncome: 0,
          otherIncome: 0,
          otherExpenses: 0,
          taxExpense: 0,
          netIncome: financialData.profit,
        },
        balanceSheet: {
          cashAndEquivalents: 0,
          accountsReceivable: 0,
          inventory: 0,
          prepaidExpenses: 0,
          otherCurrentAssets: 0,
          totalCurrentAssets: financialData.assets * 0.5,
          propertyPlantEquipment: 0,
          intangibleAssets: 0,
          longTermInvestments: 0,
          otherNonCurrentAssets: 0,
          totalNonCurrentAssets: financialData.assets * 0.5,
          totalAssets: financialData.assets,
          accountsPayable: 0,
          shortTermDebt: 0,
          accruedLiabilities: 0,
          otherCurrentLiabilities: 0,
          totalCurrentLiabilities: financialData.liabilities * 0.5,
          longTermDebt: 0,
          deferredTaxLiabilities: 0,
          otherNonCurrentLiabilities: 0,
          totalNonCurrentLiabilities: financialData.liabilities * 0.5,
          totalLiabilities: financialData.liabilities,
          commonStock: 0,
          retainedEarnings: financialData.equity,
          otherEquity: 0,
          totalEquity: financialData.equity,
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
          grossMargin: financialData.revenue
            ? (financialData.profit / financialData.revenue) * 100
            : 0,
          operatingMargin: financialData.revenue
            ? (financialData.profit / financialData.revenue) * 100
            : 0,
          netMargin: financialData.revenue
            ? (financialData.profit / financialData.revenue) * 100
            : 0,
          ebitda: financialData.profit,
          ebitdaMargin: financialData.revenue
            ? (financialData.profit / financialData.revenue) * 100
            : 0,
          currentRatio: financialData.liabilities
            ? financialData.assets / financialData.liabilities
            : 0,
          quickRatio: financialData.liabilities
            ? financialData.assets / financialData.liabilities
            : 0,
          debtToEquity: financialData.equity
            ? financialData.liabilities / financialData.equity
            : 0,
          returnOnAssets: financialData.assets
            ? (financialData.profit / financialData.assets) * 100
            : 0,
          returnOnEquity: financialData.equity
            ? (financialData.profit / financialData.equity) * 100
            : 0,
          workingCapital: financialData.assets - financialData.liabilities,
        },
        source: 'visma',
        sourceMetadata: {
          importedAt: Timestamp.now(),
          importedBy: 'system',
        },
        status: 'final',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'system',
      };

      await addDoc(collections.financials(tenantId), periodData);
      synced++;
    } catch (error) {
      errors.push(
        `Month ${month}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Update last sync date
  const connectionsRef = collections.erpConnections(tenantId);
  const connectionsQuery = query(
    connectionsRef,
    where('provider', '==', 'visma'),
    where('status', '==', 'active')
  );
  const connectionsSnap = await getDocs(connectionsQuery);

  if (!connectionsSnap.empty) {
    const connectionDoc = connectionsSnap.docs[0]!;
    await updateDoc(connectionDoc.ref, {
      lastSyncAt: Timestamp.now(),
      lastSyncStatus: errors.length > 0 ? 'partial' : 'success',
      updatedAt: Timestamp.now(),
    });
  }

  return { synced, errors };
}

// ============================================================================
// MOCK IMPLEMENTATION
// ============================================================================

/**
 * Mock Visma connection for development
 */
export async function mockVismaConnect(tenantId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const mockTokens: VismaTokens = {
    accessToken: 'mock-visma-access-token',
    refreshToken: 'mock-visma-refresh-token',
    expiresAt: new Date(Date.now() + 3600000),
  };

  const mockCompanyInfo: VismaCompanyInfo = {
    companyName: 'Test Företag AB',
    organizationNumber: '556789-0123',
    address: {
      street: 'Kungsgatan 10',
      city: 'Göteborg',
      postalCode: '411 19',
      country: 'Sweden',
    },
  };

  await storeVismaConnection(tenantId, mockTokens, mockCompanyInfo);
}
