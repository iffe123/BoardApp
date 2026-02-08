/**
 * Fortnox ERP Integration Service
 *
 * Handles OAuth flow, data sync, and account mapping for Fortnox integration.
 * Swedish accounting platform integration for automated financial reporting.
 */

import { collections, Timestamp, db } from '@/lib/firebase';
import { updateDoc, addDoc, getDocs, query, where } from 'firebase/firestore';
import type { FinancialPeriod, ERPConnection } from '@/types/schema';

// Fortnox API configuration
const FORTNOX_AUTH_URL = 'https://apps.fortnox.se/oauth-v1/auth';
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';
const FORTNOX_API_URL = 'https://api.fortnox.se/3';

const FORTNOX_CLIENT_ID = process.env.FORTNOX_CLIENT_ID || '';
const FORTNOX_CLIENT_SECRET = process.env.FORTNOX_CLIENT_SECRET || '';

// Types
export interface FortnoxTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface FortnoxCompanyInfo {
  companyName: string;
  organizationNumber: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export interface FortnoxFinancialData {
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
 * Generate OAuth authorization URL for Fortnox
 */
export function getFortnoxAuthUrl(tenantId: string, redirectUri: string): string {
  const state = Buffer.from(JSON.stringify({ tenantId })).toString('base64');

  const params = new URLSearchParams({
    client_id: FORTNOX_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'companyinformation bookkeeping invoice',
    state,
    response_type: 'code',
    access_type: 'offline',
  });

  return `${FORTNOX_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeFortnoxCode(
  code: string,
  redirectUri: string
): Promise<FortnoxTokens> {
  const response = await fetch(FORTNOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${FORTNOX_CLIENT_ID}:${FORTNOX_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
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
export async function refreshFortnoxToken(refreshToken: string): Promise<FortnoxTokens> {
  const response = await fetch(FORTNOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${FORTNOX_CLIENT_ID}:${FORTNOX_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
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
 * Store Fortnox connection details for a tenant
 */
export async function storeFortnoxConnection(
  tenantId: string,
  tokens: FortnoxTokens,
  companyInfo?: FortnoxCompanyInfo
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // Check if an existing Fortnox connection exists
  const connectionsRef = collections.erpConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'fortnox'));
  const existingSnap = await getDocs(existingQuery);

  const erpConnection: Omit<ERPConnection, 'id'> = {
    tenantId,
    provider: 'fortnox',
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
    // Update existing connection
    const existingDoc = existingSnap.docs[0]!;
    await updateDoc(existingDoc.ref, {
      ...erpConnection,
      connectedAt: existingDoc.data().connectedAt || Timestamp.now(),
    });
  } else {
    // Create new connection
    await addDoc(connectionsRef, erpConnection);
  }
}

/**
 * Disconnect Fortnox from tenant
 */
export async function disconnectFortnox(tenantId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.erpConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'fortnox'));
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

  // Find the Fortnox connection in the erpConnections subcollection
  const connectionsRef = collections.erpConnections(tenantId);
  const connectionsQuery = query(connectionsRef, where('provider', '==', 'fortnox'), where('status', '==', 'active'));
  const connectionsSnap = await getDocs(connectionsQuery);

  if (connectionsSnap.empty) {
    throw new Error('Fortnox not connected');
  }

  const connectionDoc = connectionsSnap.docs[0]!;
  const connection = connectionDoc.data() as ERPConnection;

  if (!connection.accessToken || !connection.refreshToken) {
    throw new Error('Invalid Fortnox connection credentials');
  }

  const expiresAt = connection.tokenExpiresAt?.toDate() || new Date(0);

  // Check if token needs refresh (5 minute buffer)
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const newTokens = await refreshFortnoxToken(connection.refreshToken);
    await storeFortnoxConnection(tenantId, newTokens);
    return newTokens.accessToken;
  }

  return connection.accessToken;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Make authenticated request to Fortnox API
 */
async function fortnoxRequest<T>(
  tenantId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidAccessToken(tenantId);

  const response = await fetch(`${FORTNOX_API_URL}${endpoint}`, {
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
    throw new Error(`Fortnox API error: ${error}`);
  }

  return response.json();
}

/**
 * Fetch company information from Fortnox
 */
export async function getFortnoxCompanyInfo(tenantId: string): Promise<FortnoxCompanyInfo> {
  const data = await fortnoxRequest<{
    CompanyInformation: {
      CompanyName: string;
      OrganizationNumber: string;
      Address: string;
      City: string;
      ZipCode: string;
      Country: string;
    };
  }>(tenantId, '/companyinformation');

  return {
    companyName: data.CompanyInformation.CompanyName,
    organizationNumber: data.CompanyInformation.OrganizationNumber,
    address: {
      street: data.CompanyInformation.Address,
      city: data.CompanyInformation.City,
      postalCode: data.CompanyInformation.ZipCode,
      country: data.CompanyInformation.Country || 'Sweden',
    },
  };
}

/**
 * Fetch financial data for a specific period
 */
export async function getFortnoxFinancials(
  tenantId: string,
  year: number,
  month: number
): Promise<FortnoxFinancialData> {
  // Get account balances for the period
  const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const toDate = new Date(year, month, 0).toISOString().split('T')[0];

  // Fetch income statement (profit & loss)
  // Note: Financial year data endpoint available at /financialyears if needed

  // Get SIE export for detailed data
  // For simplicity, we'll use account balances endpoint
  const accountsData = await fortnoxRequest<{
    AccountBalances: {
      AccountNumber: number;
      AccountDescription: string;
      Balance: number;
    }[];
  }>(tenantId, `/accounts?fromdate=${fromDate}&todate=${toDate}`);

  // Aggregate financial data
  // Swedish account plan (BAS) ranges:
  // 3xxx - Revenue
  // 4xxx-7xxx - Costs
  // 1xxx - Assets
  // 2xxx - Liabilities + Equity

  let revenue = 0;
  let costs = 0;
  let assets = 0;
  let liabilities = 0;
  let equity = 0;

  for (const account of accountsData.AccountBalances || []) {
    const accountNum = account.AccountNumber;
    const balance = account.Balance;

    if (accountNum >= 3000 && accountNum < 4000) {
      revenue += Math.abs(balance); // Revenue is negative in BAS
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
 * Sync financial data from Fortnox to Firebase
 */
export async function syncFortnoxFinancials(
  tenantId: string,
  year: number,
  months: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
): Promise<{ synced: number; errors: string[] }> {
  if (!db) throw new Error('Database not initialized');

  const errors: string[] = [];
  let synced = 0;

  for (const month of months) {
    try {
      const financialData = await getFortnoxFinancials(tenantId, year, month);

      // Create or update financial period in Firestore
      const periodData: Omit<FinancialPeriod, 'id'> = {
        tenantId,
        period: `${year}-${String(month).padStart(2, '0')}`,
        periodType: 'monthly',
        fiscalYear: year,
        incomeStatement: {
          revenue: financialData.revenue,
          costOfGoodsSold: 0, // Would need more detailed account mapping
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
          totalCurrentAssets: financialData.assets * 0.5, // Estimate
          propertyPlantEquipment: 0,
          intangibleAssets: 0,
          longTermInvestments: 0,
          otherNonCurrentAssets: 0,
          totalNonCurrentAssets: financialData.assets * 0.5, // Estimate
          totalAssets: financialData.assets,
          accountsPayable: 0,
          shortTermDebt: 0,
          accruedLiabilities: 0,
          otherCurrentLiabilities: 0,
          totalCurrentLiabilities: financialData.liabilities * 0.5, // Estimate
          longTermDebt: 0,
          deferredTaxLiabilities: 0,
          otherNonCurrentLiabilities: 0,
          totalNonCurrentLiabilities: financialData.liabilities * 0.5, // Estimate
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
          grossMargin: financialData.revenue ? (financialData.profit / financialData.revenue) * 100 : 0,
          operatingMargin: financialData.revenue ? (financialData.profit / financialData.revenue) * 100 : 0,
          netMargin: financialData.revenue ? (financialData.profit / financialData.revenue) * 100 : 0,
          ebitda: financialData.profit,
          ebitdaMargin: financialData.revenue ? (financialData.profit / financialData.revenue) * 100 : 0,
          currentRatio: financialData.liabilities ? financialData.assets / financialData.liabilities : 0,
          quickRatio: financialData.liabilities ? financialData.assets / financialData.liabilities : 0,
          debtToEquity: financialData.equity ? financialData.liabilities / financialData.equity : 0,
          returnOnAssets: financialData.assets ? (financialData.profit / financialData.assets) * 100 : 0,
          returnOnEquity: financialData.equity ? (financialData.profit / financialData.equity) * 100 : 0,
          workingCapital: financialData.assets - financialData.liabilities,
        },
        source: 'fortnox',
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
      errors.push(`Month ${month}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update last sync date in the ERP connection
  const connectionsRef = collections.erpConnections(tenantId);
  const connectionsQuery = query(connectionsRef, where('provider', '==', 'fortnox'), where('status', '==', 'active'));
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
 * Mock Fortnox connection for development
 */
export async function mockFortnoxConnect(tenantId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const mockTokens: FortnoxTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 3600000),
  };

  const mockCompanyInfo: FortnoxCompanyInfo = {
    companyName: 'Test Company AB',
    organizationNumber: '556123-4567',
    address: {
      street: 'Testgatan 1',
      city: 'Stockholm',
      postalCode: '111 22',
      country: 'Sweden',
    },
  };

  await storeFortnoxConnection(tenantId, mockTokens, mockCompanyInfo);
}
