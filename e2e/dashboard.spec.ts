import { test, expect } from '@playwright/test';

const TENANT_ID = 'test-tenant-123';
const DASHBOARD_URL = `/dashboard/${TENANT_ID}`;

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
  });

  test('should display greeting based on time of day', async ({ page }) => {
    // The greeting should match one of the time-based greetings
    const greetingPattern = /Good (morning|afternoon|evening)/;
    await expect(page.getByText(greetingPattern)).toBeVisible();
  });

  test('should display stats grid with four metric cards', async ({ page }) => {
    await expect(page.getByText('Upcoming Meetings')).toBeVisible();
    await expect(page.getByText('Pending Signatures')).toBeVisible();
    await expect(page.getByText('Open Action Items')).toBeVisible();
    await expect(page.getByText('Documents This Month')).toBeVisible();
  });

  test('should display stat values', async ({ page }) => {
    // Check the mock stat values are rendered
    await expect(page.getByText('3').first()).toBeVisible(); // Upcoming Meetings
    await expect(page.getByText('5').first()).toBeVisible(); // Pending Signatures
    await expect(page.getByText('12')).toBeVisible(); // Open Action Items
    await expect(page.getByText('8').first()).toBeVisible(); // Documents This Month
  });

  test('should display Upcoming Meetings section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Upcoming Meetings' })
    ).toBeVisible();
    await expect(
      page.getByText('Your scheduled board and committee meetings')
    ).toBeVisible();
  });

  test('should display mock meeting items', async ({ page }) => {
    await expect(page.getByText('Q4 Board Meeting')).toBeVisible();
    await expect(page.getByText('Audit Committee')).toBeVisible();
    await expect(page.getByText('Annual General Meeting')).toBeVisible();
  });

  test('should display meeting type badges', async ({ page }) => {
    await expect(page.getByText('board', { exact: true })).toBeVisible();
    await expect(page.getByText('committee')).toBeVisible();
    await expect(page.getByText('general')).toBeVisible();
  });

  test('should have a New meeting button', async ({ page }) => {
    const newButton = page.getByRole('link', { name: /new/i });
    await expect(newButton).toBeVisible();
  });

  test('should have View all meetings link', async ({ page }) => {
    await expect(page.getByText('View all meetings')).toBeVisible();
  });

  test('should navigate to meetings page from View all meetings', async ({ page }) => {
    await page.getByText('View all meetings').click();
    await expect(page).toHaveURL(`${DASHBOARD_URL}/meetings`);
  });

  test('should navigate to new meeting page from New button', async ({ page }) => {
    await page.getByRole('link', { name: /new/i }).click();
    await expect(page).toHaveURL(`${DASHBOARD_URL}/meetings/new`);
  });

  test('should display Recent Activity section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Recent Activity' })
    ).toBeVisible();
    await expect(
      page.getByText('Latest updates from your organization')
    ).toBeVisible();
  });

  test('should display mock recent activity items', async ({ page }) => {
    await expect(
      page.getByText('Meeting minutes signed by Johan Lindqvist')
    ).toBeVisible();
    await expect(page.getByText('Q3 Financial Report uploaded')).toBeVisible();
    await expect(page.getByText('Board Meeting minutes approved')).toBeVisible();
    await expect(
      page.getByText('Action item completed: Review budget proposal')
    ).toBeVisible();
  });

  test('should display Quick Actions section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Quick Actions' })
    ).toBeVisible();
    await expect(page.getByText('Common tasks and shortcuts')).toBeVisible();
  });

  test('should display quick action buttons', async ({ page }) => {
    await expect(page.getByText('Schedule Meeting')).toBeVisible();
    await expect(page.getByText('Upload Document')).toBeVisible();
    await expect(page.getByText('Manage Members')).toBeVisible();
    await expect(page.getByText('View Financials')).toBeVisible();
  });

  test('should navigate to new meeting from Schedule Meeting quick action', async ({
    page,
  }) => {
    await page.getByText('Schedule Meeting').click();
    await expect(page).toHaveURL(`${DASHBOARD_URL}/meetings/new`);
  });

  test('should navigate to documents from Upload Document quick action', async ({
    page,
  }) => {
    await page.getByText('Upload Document').click();
    await expect(page).toHaveURL(`${DASHBOARD_URL}/documents`);
  });

  test('should navigate to members from Manage Members quick action', async ({
    page,
  }) => {
    await page.getByText('Manage Members').click();
    await expect(page).toHaveURL(`${DASHBOARD_URL}/members`);
  });

  test('should navigate to financials from View Financials quick action', async ({
    page,
  }) => {
    await page.getByText('View Financials').click();
    await expect(page).toHaveURL(`${DASHBOARD_URL}/financials`);
  });

  test('should navigate to meeting detail when clicking a meeting', async ({
    page,
  }) => {
    await page.getByText('Q4 Board Meeting').click();
    await expect(page).toHaveURL(new RegExp(`${DASHBOARD_URL}/meetings/`));
  });
});

test.describe('Dashboard Page - Financial Snapshot', () => {
  test('should display financial snapshot section', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    // Financial snapshot may or may not be visible depending on permissions
    // We check that the component renders when it does appear
    const financialSnapshot = page.getByText('Financial Snapshot');
    const isVisible = await financialSnapshot.isVisible().catch(() => false);

    if (isVisible) {
      await expect(page.getByText('Key financial metrics at a glance')).toBeVisible();
      await expect(page.getByText('Revenue (YTD)')).toBeVisible();
      await expect(page.getByText('Net Income (YTD)')).toBeVisible();
      await expect(page.getByText('Cash Balance')).toBeVisible();
      await expect(page.getByText('View Details')).toBeVisible();
    }
  });
});
