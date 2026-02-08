/**
 * Microsoft 365 / Outlook Calendar Integration Service
 *
 * Handles OAuth flow and calendar sync with Microsoft Graph API.
 * Supports creating, updating, and cancelling calendar events
 * synced from GovernanceOS meetings.
 */

import { collections, Timestamp, db } from '@/lib/firebase';
import { getDocs, query, where, updateDoc, addDoc } from 'firebase/firestore';
import type { CalendarConnection } from '@/types/schema';

// Microsoft Graph API configuration
const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_GRAPH_URL = 'https://graph.microsoft.com/v1.0';

const MS_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';

const USE_MOCK = process.env.MICROSOFT_USE_MOCK === 'true' || !MS_CLIENT_ID;

// Required scopes for calendar access
const SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'Calendars.ReadWrite',
  'User.Read',
].join(' ');

// Types
export interface MicrosoftTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface MicrosoftUserInfo {
  email: string;
  displayName: string;
}

export interface MicrosoftCalendarEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: { address: string; name?: string };
    type: 'required' | 'optional';
  }>;
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
}

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getMicrosoftAuthUrl(tenantId: string, redirectUri: string): string {
  const state = Buffer.from(JSON.stringify({ tenantId })).toString('base64');

  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    response_type: 'code',
    response_mode: 'query',
    prompt: 'consent',
  });

  return `${MS_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeMicrosoftCode(
  code: string,
  redirectUri: string
): Promise<MicrosoftTokens> {
  const response = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      scope: SCOPES,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange Microsoft code: ${error}`);
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
export async function refreshMicrosoftToken(refreshToken: string): Promise<MicrosoftTokens> {
  const response = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: SCOPES,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Microsoft token: ${error}`);
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
 * Mock Microsoft connection for development
 */
export async function mockMicrosoftConnect(tenantId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.calendarConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'microsoft'));
  const existingSnap = await getDocs(existingQuery);

  const connection: Omit<CalendarConnection, 'id'> = {
    tenantId,
    provider: 'microsoft',
    status: 'active',
    accessToken: 'mock-ms-access-token',
    refreshToken: 'mock-ms-refresh-token',
    tokenExpiresAt: Timestamp.fromDate(new Date(Date.now() + 3600 * 1000)),
    accountEmail: 'board@example.com',
    accountName: 'Board Admin',
    calendarId: 'primary',
    syncEnabled: true,
    syncDirection: 'one_way',
    autoSyncNewMeetings: true,
    lastSyncAt: Timestamp.now(),
    lastSyncStatus: 'success',
    connectedAt: Timestamp.now(),
    connectedBy: 'system',
    updatedAt: Timestamp.now(),
  };

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0]!;
    await updateDoc(existingDoc.ref, {
      ...connection,
      connectedAt: existingDoc.data().connectedAt || Timestamp.now(),
    });
  } else {
    await addDoc(connectionsRef, connection);
  }
}

/**
 * Store Microsoft connection details for a tenant
 */
export async function storeMicrosoftConnection(
  tenantId: string,
  tokens: MicrosoftTokens,
  userInfo?: MicrosoftUserInfo
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.calendarConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'microsoft'));
  const existingSnap = await getDocs(existingQuery);

  const connection: Omit<CalendarConnection, 'id'> = {
    tenantId,
    provider: 'microsoft',
    status: 'active',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenExpiresAt: Timestamp.fromDate(tokens.expiresAt),
    accountEmail: userInfo?.email,
    accountName: userInfo?.displayName,
    calendarId: 'primary',
    syncEnabled: true,
    syncDirection: 'one_way',
    autoSyncNewMeetings: true,
    lastSyncAt: Timestamp.now(),
    lastSyncStatus: 'success',
    connectedAt: Timestamp.now(),
    connectedBy: 'system',
    updatedAt: Timestamp.now(),
  };

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0]!;
    await updateDoc(existingDoc.ref, {
      ...connection,
      connectedAt: existingDoc.data().connectedAt || Timestamp.now(),
    });
  } else {
    await addDoc(connectionsRef, connection);
  }
}

/**
 * Disconnect Microsoft calendar from tenant
 */
export async function disconnectMicrosoft(tenantId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.calendarConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'microsoft'));
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    const connectionDoc = existingSnap.docs[0]!;
    await updateDoc(connectionDoc.ref, {
      status: 'disconnected',
      accessToken: null,
      refreshToken: null,
      syncEnabled: false,
      updatedAt: Timestamp.now(),
    });
  }
}

/**
 * Get valid Microsoft access token (refresh if needed)
 */
export async function getValidMicrosoftToken(tenantId: string): Promise<string> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.calendarConnections(tenantId);
  const connectionsQuery = query(
    connectionsRef,
    where('provider', '==', 'microsoft'),
    where('status', '==', 'active')
  );
  const connectionsSnap = await getDocs(connectionsQuery);

  if (connectionsSnap.empty) {
    throw new Error('Microsoft calendar not connected');
  }

  const connectionDoc = connectionsSnap.docs[0]!;
  const connection = connectionDoc.data() as CalendarConnection;

  if (!connection.accessToken || !connection.refreshToken) {
    throw new Error('Invalid Microsoft connection credentials');
  }

  const expiresAt = connection.tokenExpiresAt?.toDate() || new Date(0);

  // Check if token needs refresh (5 minute buffer)
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const newTokens = await refreshMicrosoftToken(connection.refreshToken);
    await storeMicrosoftConnection(tenantId, newTokens, {
      email: connection.accountEmail || '',
      displayName: connection.accountName || '',
    });
    return newTokens.accessToken;
  }

  return connection.accessToken;
}

/**
 * Get Microsoft calendar connection status for a tenant
 */
export async function getMicrosoftConnectionStatus(
  tenantId: string
): Promise<CalendarConnection | null> {
  if (!db) return null;

  const connectionsRef = collections.calendarConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'microsoft'));
  const existingSnap = await getDocs(existingQuery);

  if (existingSnap.empty) return null;

  return {
    id: existingSnap.docs[0]!.id,
    ...existingSnap.docs[0]!.data(),
  } as CalendarConnection;
}

// ============================================================================
// GRAPH API REQUESTS
// ============================================================================

/**
 * Make authenticated request to Microsoft Graph API
 */
async function graphRequest<T>(
  tenantId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidMicrosoftToken(tenantId);

  const response = await fetch(`${MS_GRAPH_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft Graph API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Get current user info from Microsoft Graph
 */
export async function getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const response = await fetch(`${MS_GRAPH_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Microsoft user info');
  }

  const data = await response.json();

  return {
    email: data.mail || data.userPrincipalName,
    displayName: data.displayName,
  };
}

/**
 * Create a calendar event in Microsoft 365
 */
export async function createMicrosoftCalendarEvent(
  tenantId: string,
  event: MicrosoftCalendarEvent
): Promise<{ id: string }> {
  if (USE_MOCK) {
    return { id: `mock-ms-event-${Date.now()}` };
  }

  return graphRequest<{ id: string }>(tenantId, '/me/calendar/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

/**
 * Update a calendar event in Microsoft 365
 */
export async function updateMicrosoftCalendarEvent(
  tenantId: string,
  eventId: string,
  event: Partial<MicrosoftCalendarEvent>
): Promise<void> {
  if (USE_MOCK) return;

  await graphRequest(tenantId, `/me/calendar/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(event),
  });
}

/**
 * Delete a calendar event in Microsoft 365
 */
export async function deleteMicrosoftCalendarEvent(
  tenantId: string,
  eventId: string
): Promise<void> {
  if (USE_MOCK) return;

  const accessToken = await getValidMicrosoftToken(tenantId);
  const response = await fetch(`${MS_GRAPH_URL}/me/calendar/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete Microsoft calendar event: ${response.status}`);
  }
}

/**
 * Sync a meeting to Microsoft 365 Calendar
 */
export async function syncMeetingToMicrosoft(
  tenantId: string,
  meeting: {
    id: string;
    title: string;
    description?: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    timezone: string;
    location?: string;
    videoConferenceUrl?: string;
    attendees?: Array<{ email: string; name?: string }>;
  }
): Promise<{ eventId: string }> {
  const event: MicrosoftCalendarEvent = {
    subject: meeting.title,
    body: meeting.description
      ? { contentType: 'HTML', content: meeting.description }
      : undefined,
    start: {
      dateTime: meeting.scheduledStart.toISOString().replace('Z', ''),
      timeZone: meeting.timezone,
    },
    end: {
      dateTime: meeting.scheduledEnd.toISOString().replace('Z', ''),
      timeZone: meeting.timezone,
    },
    location: meeting.location ? { displayName: meeting.location } : undefined,
    attendees: meeting.attendees?.map((a) => ({
      emailAddress: { address: a.email, name: a.name },
      type: 'required' as const,
    })),
    isOnlineMeeting: !!meeting.videoConferenceUrl,
  };

  const result = await createMicrosoftCalendarEvent(tenantId, event);
  return { eventId: result.id };
}

export { USE_MOCK as MICROSOFT_USE_MOCK };
