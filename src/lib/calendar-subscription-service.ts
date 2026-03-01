import { createHash, randomBytes } from 'crypto';

export function hashCalendarToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateCalendarToken(): string {
  return randomBytes(32).toString('hex');
}

export function buildCalendarFeedUrls(token: string): { webcalUrl: string; httpsUrl: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const httpsBaseUrl = appUrl.replace(/^webcal:/i, 'https:').replace(/^http:/i, 'https:').replace(/\/$/, '');
  const path = `/api/calendar/subscribe/${token}`;

  return {
    httpsUrl: `${httpsBaseUrl}${path}`,
    webcalUrl: `webcal://${httpsBaseUrl.replace(/^https:\/\//, '')}${path}`,
  };
}
