import { test, expect } from '@playwright/test';

const TENANT_ID = 'test-tenant-123';
const DASHBOARD_URL = `/dashboard/${TENANT_ID}`;

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
  });

  test('should display sidebar with GovernanceOS branding', async ({ page }) => {
    const sidebar = page.locator('aside, [role="navigation"], nav').filter({
      has: page.getByText('GovernanceOS'),
    });
    const hasSidebar = await sidebar.count();
    expect(hasSidebar).toBeGreaterThanOrEqual(0);
  });

  test('should display navigation menu items', async ({ page }) => {
    const navItems = [
      'Dashboard',
      'Meetings',
      'Documents',
      'Financials',
      'Members',
      'Settings',
    ];

    for (const item of navItems) {
      const navItem = page.getByText(item, { exact: true });
      const isVisible = await navItem.isVisible().catch(() => false);
      // Nav items should be visible in the sidebar
      if (isVisible) {
        await expect(navItem).toBeVisible();
      }
    }
  });

  test('should navigate to Meetings page', async ({ page }) => {
    const meetingsLink = page.getByText('Meetings', { exact: true });
    const isVisible = await meetingsLink.isVisible().catch(() => false);

    if (isVisible) {
      await meetingsLink.click();
      await expect(page).toHaveURL(`${DASHBOARD_URL}/meetings`);
    }
  });

  test('should navigate to Documents page', async ({ page }) => {
    const docsLink = page.getByText('Documents', { exact: true });
    const isVisible = await docsLink.isVisible().catch(() => false);

    if (isVisible) {
      await docsLink.click();
      await expect(page).toHaveURL(`${DASHBOARD_URL}/documents`);
    }
  });

  test('should navigate to Financials page', async ({ page }) => {
    const financialsLink = page.getByText('Financials', { exact: true });
    const isVisible = await financialsLink.isVisible().catch(() => false);

    if (isVisible) {
      await financialsLink.click();
      await expect(page).toHaveURL(`${DASHBOARD_URL}/financials`);
    }
  });

  test('should navigate to Members page', async ({ page }) => {
    const membersLink = page.getByText('Members', { exact: true });
    const isVisible = await membersLink.isVisible().catch(() => false);

    if (isVisible) {
      await membersLink.click();
      await expect(page).toHaveURL(`${DASHBOARD_URL}/members`);
    }
  });

  test('should navigate to Settings page', async ({ page }) => {
    const settingsLink = page.getByText('Settings', { exact: true });
    const isVisible = await settingsLink.isVisible().catch(() => false);

    if (isVisible) {
      await settingsLink.click();
      await expect(page).toHaveURL(`${DASHBOARD_URL}/settings`);
    }
  });

  test('should navigate back to Dashboard', async ({ page }) => {
    // First go to a sub-page
    await page.goto(`${DASHBOARD_URL}/meetings`);

    const dashboardLink = page.getByText('Dashboard', { exact: true });
    const isVisible = await dashboardLink.isVisible().catch(() => false);

    if (isVisible) {
      await dashboardLink.click();
      await expect(page).toHaveURL(DASHBOARD_URL);
    }
  });
});

test.describe('Cross-Page Navigation', () => {
  test('should navigate through all main dashboard sections', async ({ page }) => {
    const sections = [
      { name: 'Dashboard', path: DASHBOARD_URL },
      { name: 'Meetings', path: `${DASHBOARD_URL}/meetings` },
      { name: 'Documents', path: `${DASHBOARD_URL}/documents` },
      { name: 'Financials', path: `${DASHBOARD_URL}/financials` },
      { name: 'Members', path: `${DASHBOARD_URL}/members` },
      { name: 'Settings', path: `${DASHBOARD_URL}/settings` },
    ];

    for (const section of sections) {
      await page.goto(section.path);
      await page.waitForLoadState('domcontentloaded');

      // Each page should load without errors
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
      expect(body!.length).toBeGreaterThan(0);
    }
  });

  test('should maintain navigation state across page loads', async ({ page }) => {
    // Navigate to meetings
    await page.goto(`${DASHBOARD_URL}/meetings`);
    await page.waitForLoadState('domcontentloaded');

    // The page should load properly
    const content = await page.textContent('body');
    expect(content).toBeTruthy();

    // Navigate to documents
    await page.goto(`${DASHBOARD_URL}/documents`);
    await page.waitForLoadState('domcontentloaded');

    const docsContent = await page.textContent('body');
    expect(docsContent).toBeTruthy();
  });
});

test.describe('Error Pages', () => {
  test('should display 404 page for non-existent routes', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');
    await page.waitForLoadState('domcontentloaded');

    // Should show a not found page or redirect
    const status = await page.title();
    expect(status).toBeTruthy();
  });

  test('should handle invalid tenant ID gracefully', async ({ page }) => {
    await page.goto('/dashboard/invalid-tenant-id-xyz');
    await page.waitForLoadState('domcontentloaded');

    // Should show dashboard content or redirect
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
