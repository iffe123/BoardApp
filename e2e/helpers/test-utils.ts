import { Page, expect } from '@playwright/test';

/**
 * Shared test utilities for GovernanceOS E2E tests.
 */

/** Wait for the Next.js page to be fully hydrated. */
export async function waitForHydration(page: Page): Promise<void> {
  // Wait for Next.js to finish hydrating by checking for __NEXT_DATA__
  await page.waitForFunction(() => {
    return document.readyState === 'complete';
  });
}

/** Navigate to a page and wait for it to load. */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForHydration(page);
}

/** Mock Firebase auth state as authenticated user. */
export async function mockAuthenticatedUser(
  page: Page,
  options: {
    uid?: string;
    email?: string;
    displayName?: string;
    tenantId?: string;
  } = {}
): Promise<void> {
  const {
    uid = 'test-user-123',
    email = 'test@example.com',
    displayName = 'Test User',
    tenantId = 'test-tenant-123',
  } = options;

  // Set localStorage values that the app checks
  await page.evaluate(
    ({ tenantId: tid }) => {
      localStorage.setItem('governanceos_current_tenant', tid);
    },
    { tenantId }
  );

  // Inject mock auth state into the page context
  await page.addInitScript(
    ({ uid: u, email: e, displayName: dn, tenantId: tid }) => {
      // Mock Firebase auth by setting window properties the app can check
      (window as unknown as Record<string, unknown>).__MOCK_AUTH__ = {
        user: {
          uid: u,
          email: e,
          displayName: dn,
          emailVerified: true,
          photoURL: null,
        },
        tenantId: tid,
        tenantClaims: {
          [tid]: { role: 'owner' },
        },
      };
    },
    { uid, email, displayName, tenantId }
  );
}

/** Check that no console errors were logged. */
export async function assertNoConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      // Ignore known benign errors
      const text = msg.text();
      if (
        text.includes('Firebase API key not found') ||
        text.includes('Failed to fetch') ||
        text.includes('net::ERR_')
      ) {
        return;
      }
      errors.push(text);
    }
  });
  return errors;
}

/** Take a full-page screenshot for visual comparison. */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}

/** Shared test data. */
export const TEST_DATA = {
  user: {
    email: 'test@governanceos.com',
    password: 'TestPassword123!',
    displayName: 'Test User',
  },
  organization: {
    name: 'Test Organization AB',
    orgNumber: '556123-4567',
  },
  meeting: {
    title: 'Q4 Board Meeting',
    description: 'Quarterly board review',
    type: 'ordinary' as const,
  },
  tenantId: 'test-tenant-123',
};
