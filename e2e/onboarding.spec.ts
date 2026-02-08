import { test, expect } from '@playwright/test';

test.describe('Onboarding Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding');
  });

  test('should display onboarding page heading', async ({ page }) => {
    await expect(page.getByText('Welcome to GovernanceOS')).toBeVisible();
    await expect(
      page.getByText("Let's set up your organization to get started")
    ).toBeVisible();
  });

  test('should display GovernanceOS logo link', async ({ page }) => {
    const logoLink = page.getByText('GovernanceOS').first();
    await expect(logoLink).toBeVisible();
  });

  test('should display step 1 with two options', async ({ page }) => {
    await expect(page.getByText('What would you like to do?')).toBeVisible();
    await expect(page.getByText('Create a new organization')).toBeVisible();
    await expect(page.getByText('Join an existing organization')).toBeVisible();
  });

  test('should have the Join option disabled', async ({ page }) => {
    // The "Join an existing organization" button should be disabled
    const joinButton = page.getByText('Join an existing organization').locator('..');
    await expect(joinButton).toBeDisabled();
  });

  test('should navigate to step 2 when clicking Create organization', async ({ page }) => {
    await page.getByText('Create a new organization').click();

    // Step 2 should show the organization form
    await expect(page.getByText('Organization Name')).toBeVisible();
    await expect(page.locator('#orgName')).toBeVisible();
  });

  test('should display organization form fields in step 2', async ({ page }) => {
    // Go to step 2
    await page.getByText('Create a new organization').click();

    // Check form fields
    await expect(page.getByText('Organization Name')).toBeVisible();
    await expect(page.locator('#orgName')).toBeVisible();
    await expect(page.locator('#orgName')).toHaveAttribute('placeholder', 'Acme AB');

    await expect(page.getByText('Organization Number')).toBeVisible();
    await expect(page.locator('#orgNumber')).toBeVisible();
    await expect(page.locator('#orgNumber')).toHaveAttribute('placeholder', '556123-4567');
  });

  test('should display optional label for organization number', async ({ page }) => {
    await page.getByText('Create a new organization').click();
    await expect(page.getByText('(optional)')).toBeVisible();
  });

  test('should display Swedish org number helper text', async ({ page }) => {
    await page.getByText('Create a new organization').click();
    await expect(
      page.getByText('Swedish organization number (organisationsnummer)')
    ).toBeVisible();
  });

  test('should display Back and Create buttons in step 2', async ({ page }) => {
    await page.getByText('Create a new organization').click();

    await expect(page.getByText('Back')).toBeVisible();
    await expect(page.getByText('Create', { exact: false })).toBeVisible();
  });

  test('should navigate back to step 1 when clicking Back', async ({ page }) => {
    // Go to step 2
    await page.getByText('Create a new organization').click();
    await expect(page.getByText('Organization Name')).toBeVisible();

    // Go back to step 1
    await page.getByText('Back').click();
    await expect(page.getByText('What would you like to do?')).toBeVisible();
  });

  test('should allow filling out organization details', async ({ page }) => {
    await page.getByText('Create a new organization').click();

    await page.locator('#orgName').fill('Test Organization AB');
    await page.locator('#orgNumber').fill('556123-4567');

    await expect(page.locator('#orgName')).toHaveValue('Test Organization AB');
    await expect(page.locator('#orgNumber')).toHaveValue('556123-4567');
  });

  test('should display footer with copyright', async ({ page }) => {
    const currentYear = new Date().getFullYear().toString();
    await expect(
      page.getByText(`${currentYear} GovernanceOS. Built for the Nordic market.`)
    ).toBeVisible();
  });

  test('should preserve org name when navigating back and forth', async ({ page }) => {
    // Go to step 2 and fill org name
    await page.getByText('Create a new organization').click();
    await page.locator('#orgName').fill('My Company AB');

    // Go back to step 1
    await page.getByText('Back').click();
    await expect(page.getByText('What would you like to do?')).toBeVisible();

    // Go to step 2 again - the value should be preserved (React state)
    await page.getByText('Create a new organization').click();
    await expect(page.locator('#orgName')).toHaveValue('My Company AB');
  });
});
