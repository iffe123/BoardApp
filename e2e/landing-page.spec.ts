import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the GovernanceOS branding', async ({ page }) => {
    // Navigation bar brand
    const brand = page.locator('nav').getByText('GovernanceOS');
    await expect(brand).toBeVisible();
  });

  test('should display hero section with correct heading', async ({ page }) => {
    await expect(page.getByText('Board Governance')).toBeVisible();
    await expect(page.getByText('Reimagined')).toBeVisible();
  });

  test('should display the hero subtitle', async ({ page }) => {
    await expect(
      page.getByText('The AI-native platform for modern board management')
    ).toBeVisible();
  });

  test('should display the availability badge', async ({ page }) => {
    await expect(
      page.getByText('Now available for Nordic enterprises')
    ).toBeVisible();
  });

  test('should have Sign In and Get Started navigation links', async ({ page }) => {
    const signInLink = page.locator('nav').getByText('Sign In');
    const getStartedLink = page.locator('nav').getByText('Get Started');

    await expect(signInLink).toBeVisible();
    await expect(getStartedLink).toBeVisible();
  });

  test('should navigate to login page when clicking Sign In', async ({ page }) => {
    await page.locator('nav').getByText('Sign In').click();
    await expect(page).toHaveURL('/auth/login');
  });

  test('should navigate to signup page when clicking Get Started', async ({ page }) => {
    await page.locator('nav').getByText('Get Started').click();
    await expect(page).toHaveURL('/auth/signup');
  });

  test('should navigate to signup when clicking Start Free Trial', async ({ page }) => {
    // Click the first "Start Free Trial" button in the hero
    await page.getByText('Start Free Trial').first().click();
    await expect(page).toHaveURL('/auth/signup');
  });

  test('should display the three platform pillars', async ({ page }) => {
    await expect(page.getByText('Intelligent Meetings')).toBeVisible();
    await expect(page.getByText('Financial Oversight')).toBeVisible();
    await expect(page.getByText('Compliance Engine')).toBeVisible();
  });

  test('should display platform section heading', async ({ page }) => {
    await expect(
      page.getByText('Three pillars of intelligent governance')
    ).toBeVisible();
  });

  test('should display capabilities section', async ({ page }) => {
    await expect(page.getByText('AI-Generated Minutes')).toBeVisible();
    await expect(page.getByText('Conflict of Interest Detection')).toBeVisible();
    await expect(page.getByText('BankID Digital Signatures')).toBeVisible();
    await expect(page.getByText('Real-time Financial Consolidation')).toBeVisible();
    await expect(page.getByText('ERP Integration (Fortnox, Visma)')).toBeVisible();
    await expect(page.getByText('Multi-Organization Management')).toBeVisible();
  });

  test('should display the enterprise section', async ({ page }) => {
    await expect(page.getByText('Ready for the')).toBeVisible();
    await expect(page.getByText('modern boardroom')).toBeVisible();
    await expect(page.getByText('Contact Sales')).toBeVisible();
  });

  test('should display footer with copyright', async ({ page }) => {
    const currentYear = new Date().getFullYear().toString();
    await expect(
      page.getByText(`${currentYear} GovernanceOS. Built for the Nordic market.`)
    ).toBeVisible();
  });

  test('should have proper page title', async ({ page }) => {
    await expect(page).toHaveTitle(/GovernanceOS/);
  });

  test('should have correct navigation links in desktop view', async ({ page }) => {
    // Desktop nav items
    await expect(page.locator('nav').getByText('Platform')).toBeVisible();
    await expect(page.locator('nav').getByText('Capabilities')).toBeVisible();
    await expect(page.locator('nav').getByText('Enterprise')).toBeVisible();
  });

  test('should scroll to platform section when clicking Platform nav link', async ({ page }) => {
    await page.locator('nav').getByText('Platform').click();
    // Verify the URL hash changed
    await expect(page).toHaveURL(/#platform/);
  });

  test('should scroll to capabilities section when clicking Capabilities nav link', async ({ page }) => {
    await page.locator('nav').getByText('Capabilities').click();
    await expect(page).toHaveURL(/#capabilities/);
  });
});

test.describe('Landing Page - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('should display mobile-friendly layout', async ({ page }) => {
    await page.goto('/');
    // Brand should still be visible
    await expect(page.locator('nav').getByText('GovernanceOS')).toBeVisible();
    // Hero should be visible
    await expect(page.getByText('Board Governance')).toBeVisible();
  });

  test('should have Sign In and Get Started visible on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').getByText('Sign In')).toBeVisible();
    await expect(page.locator('nav').getByText('Get Started')).toBeVisible();
  });
});
