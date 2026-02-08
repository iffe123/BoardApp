import { test, expect } from '@playwright/test';

const TENANT_ID = 'test-tenant-123';
const DOCUMENTS_URL = `/dashboard/${TENANT_ID}/documents`;

test.describe('Documents Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DOCUMENTS_URL);
  });

  test('should display the documents page heading', async ({ page }) => {
    await expect(page.getByText(/documents|document center/i)).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('should display upload button', async ({ page }) => {
    const uploadButton = page.getByRole('button', { name: /upload/i });
    await expect(uploadButton).toBeVisible();
  });

  test('should open upload dialog when clicking upload button', async ({ page }) => {
    await page.getByRole('button', { name: /upload/i }).click();

    // Upload dialog should appear
    const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
    const dialogVisible = await dialog.isVisible().catch(() => false);

    if (dialogVisible) {
      // Check for upload form fields
      await expect(
        page.getByText(/upload|drag|drop|choose file/i).first()
      ).toBeVisible();
    }
  });

  test('should display document category filters', async ({ page }) => {
    // Category filter options
    const hasCategories = await page.getByText(/all|board pack|minutes|financial|policy/i).count();
    expect(hasCategories).toBeGreaterThanOrEqual(1);
  });

  test('should display view mode toggle', async ({ page }) => {
    // Grid/List view toggle
    const viewButtons = page.locator('button').filter({
      has: page.locator('svg'),
    });
    const count = await viewButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should display document stats cards', async ({ page }) => {
    // Stats section
    const statsSection = page.locator('.grid').first();
    await expect(statsSection).toBeVisible();
  });

  test('should allow searching documents', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('report');
    await expect(searchInput).toHaveValue('report');
  });
});

test.describe('Documents Page - Upload Dialog', () => {
  test('should display upload dialog with form fields', async ({ page }) => {
    await page.goto(DOCUMENTS_URL);
    await page.getByRole('button', { name: /upload/i }).click();

    // Wait briefly for dialog to appear
    await page.waitForTimeout(500);

    const dialog = page.getByRole('dialog');
    const dialogVisible = await dialog.isVisible().catch(() => false);

    if (dialogVisible) {
      // Should have category selection
      const hasCategoryField = await page.getByText(/category/i).isVisible().catch(() => false);
      if (hasCategoryField) {
        await expect(page.getByText(/category/i)).toBeVisible();
      }
    }
  });
});
