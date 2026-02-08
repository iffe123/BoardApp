/**
 * Google Workspace / Google Calendar Integration Service
 *
 * Handles OAuth flow and calendar sync with Google Calendar API.
 * Supports creating, updating, and cancelling calendar events
 * synced from GovernanceOS meetings.
 */

import { collections, Timestamp, db } from '@/lib/firebase';
import { getDocs, query, where, updateDoc, addDoc } from 'firebase/firestore';
import type { CalendarConnection } from '@/types/schema';

// Google OAuth & Calendar API configuration
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

const USE_MOCK = process.env.GOOGLE_USE_MOCK === 'true' || !GOOGLE_CLIENT_ID;

// Required scopes for calendar access
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

// Types
export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface GoogleUserInfo {
  email: string;
  name: string;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'accepted' | 'declined' | 'tentative';
  }>;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: 'video' | 'phone';
      uri: string;
    }>;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(tenantId: string, redirectUri: string): string {
  const state = Buffer.from(JSON.stringify({ tenantId })).toString('base64');

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange Google code: ${error}`);
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
export async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Google token: ${error}`);
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
 * Mock Google connection for development
 */
export async function mockGoogleConnect(tenantId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.calendarConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'google'));
  const existingSnap = await getDocs(existingQuery);

  const connection: Omit<CalendarConnection, 'id'> = {
    tenantId,
    provider: 'google',
    status: 'active',
    accessToken: 'mock-google-access-token',
    refreshToken: 'mock-google-refresh-token',
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
 * Store Google connection details for a tenant
 */
export async function storeGoogleConnection(
  tenantId: string,
  tokens: GoogleTokens,
  userInfo?: GoogleUserInfo
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.calendarConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'google'));
  const existingSnap = await getDocs(existingQuery);

  const connection: Omit<CalendarConnection, 'id'> = {
    tenantId,
    provider: 'google',
    status: 'active',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenExpiresAt: Timestamp.fromDate(tokens.expiresAt),
    accountEmail: userInfo?.email,
    accountName: userInfo?.name,
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
 * Disconnect Google calendar from tenant
 */
export async function disconnectGoogle(tenantId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.calendarConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'google'));
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
 * Get valid Google access token (refresh if needed)
 */
export async function getValidGoogleToken(tenantId: string): Promise<string> {
  if (!db) throw new Error('Database not initialized');

  const connectionsRef = collections.calendarConnections(tenantId);
  const connectionsQuery = query(
    connectionsRef,
    where('provider', '==', 'google'),
    where('status', '==', 'active')
  );
  const connectionsSnap = await getDocs(connectionsQuery);

  if (connectionsSnap.empty) {
    throw new Error('Google calendar not connected');
  }

  const connectionDoc = connectionsSnap.docs[0]!;
  const connection = connectionDoc.data() as CalendarConnection;

  if (!connection.accessToken || !connection.refreshToken) {
    throw new Error('Invalid Google connection credentials');
  }

  const expiresAt = connection.tokenExpiresAt?.toDate() || new Date(0);

  // Check if token needs refresh (5 minute buffer)
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const newTokens = await refreshGoogleToken(connection.refreshToken);
    await storeGoogleConnection(tenantId, newTokens, {
      email: connection.accountEmail || '',
      name: connection.accountName || '',
    });
    return newTokens.accessToken;
  }

  return connection.accessToken;
}

/**
 * Get Google calendar connection status for a tenant
 */
export async function getGoogleConnectionStatus(
  tenantId: string
): Promise<CalendarConnection | null> {
  if (!db) return null;

  const connectionsRef = collections.calendarConnections(tenantId);
  const existingQuery = query(connectionsRef, where('provider', '==', 'google'));
  const existingSnap = await getDocs(existingQuery);

  if (existingSnap.empty) return null;

  return {
    id: existingSnap.docs[0]!.id,
    ...existingSnap.docs[0]!.data(),
  } as CalendarConnection;
}

// ============================================================================
// CALENDAR API REQUESTS
// ============================================================================

/**
 * Make authenticated request to Google Calendar API
 */
async function calendarRequest<T>(
  tenantId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidGoogleToken(tenantId);

  const response = await fetch(`${GOOGLE_CALENDAR_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Calendar API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Get current user info from Google
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  const data = await response.json();

  return {
    email: data.email,
    name: data.name,
  };
}

/**
 * Create a calendar event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  tenantId: string,
  event: GoogleCalendarEvent,
  calendarId: string = 'primary'
): Promise<{ id: string }> {
  if (USE_MOCK) {
    return { id: `mock-google-event-${Date.now()}` };
  }

  return calendarRequest<{ id: string }>(
    tenantId,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify(event),
    }
  );
}

/**
 * Update a calendar event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  tenantId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>,
  calendarId: string = 'primary'
): Promise<void> {
  if (USE_MOCK) return;

  await calendarRequest(
    tenantId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(event),
    }
  );
}

/**
 * Delete a calendar event in Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  tenantId: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  if (USE_MOCK) return;

  const accessToken = await getValidGoogleToken(tenantId);
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_URL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error(`Failed to delete Google calendar event: ${response.status}`);
  }
}

/**
 * Sync a meeting to Google Calendar
 */
export async function syncMeetingToGoogle(
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
  const event: GoogleCalendarEvent = {
    summary: meeting.title,
    description: meeting.description,
    start: {
      dateTime: meeting.scheduledStart.toISOString(),
      timeZone: meeting.timezone,
    },
    end: {
      dateTime: meeting.scheduledEnd.toISOString(),
      timeZone: meeting.timezone,
    },
    location: meeting.location,
    attendees: meeting.attendees?.map((a) => ({
      email: a.email,
      displayName: a.name,
      responseStatus: 'needsAction' as const,
    })),
    conferenceData: meeting.videoConferenceUrl
      ? {
          entryPoints: [
            {
              entryPointType: 'video',
              uri: meeting.videoConferenceUrl,
            },
          ],
        }
      : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  const result = await createGoogleCalendarEvent(tenantId, event);
  return { eventId: result.id };
}

export { USE_MOCK as GOOGLE_USE_MOCK };
