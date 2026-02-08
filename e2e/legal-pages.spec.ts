import { test, expect } from '@playwright/test';

test.describe('Terms of Service Page', () => {
  test('should load the terms page', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('domcontentloaded');

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(0);
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/terms');
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});

test.describe('Privacy Policy Page', () => {
  test('should load the privacy page', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('domcontentloaded');

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(0);
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/privacy');
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
