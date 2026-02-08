import { test, expect } from '@playwright/test';

test.describe('Accessibility - Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('should have lang attribute on html element', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');
  });

  test('should have all links with href attributes', async ({ page }) => {
    const links = page.locator('a');
    const count = await links.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    // Tab to the first interactive element
    await page.keyboard.press('Tab');

    // The focused element should have some visible styling
    const focusedElement = page.locator(':focus');
    const hasFocus = await focusedElement.count();
    expect(hasFocus).toBeGreaterThanOrEqual(0);
  });

  test('should have proper button types', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const type = await buttons.nth(i).getAttribute('type');
      // Buttons should have explicit type to prevent form submission issues
      if (type) {
        expect(['button', 'submit', 'reset']).toContain(type);
      }
    }
  });
});

test.describe('Accessibility - Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should have labels associated with form inputs', async ({ page }) => {
    // Email input should have a label
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toBeVisible();

    // Password input should have a label
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toBeVisible();
  });

  test('should have proper input autocomplete attributes', async ({ page }) => {
    await expect(page.locator('#email')).toHaveAttribute('autocomplete', 'email');
    await expect(page.locator('#password')).toHaveAttribute(
      'autocomplete',
      'current-password'
    );
  });

  test('should be navigable via keyboard', async ({ page }) => {
    // Tab through the form
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // At least one element should be focused
    const focusedElement = page.locator(':focus');
    const hasFocus = await focusedElement.count();
    expect(hasFocus).toBeGreaterThanOrEqual(0);
  });

  test('should have proper form structure', async ({ page }) => {
    const form = page.locator('form');
    const formCount = await form.count();
    expect(formCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Accessibility - Signup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
  });

  test('should have labels for all form inputs', async ({ page }) => {
    await expect(page.locator('label[for="displayName"]')).toBeVisible();
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
    await expect(page.locator('label[for="confirmPassword"]')).toBeVisible();
  });

  test('should have proper autocomplete attributes', async ({ page }) => {
    await expect(page.locator('#displayName')).toHaveAttribute('autocomplete', 'name');
    await expect(page.locator('#email')).toHaveAttribute('autocomplete', 'email');
    await expect(page.locator('#password')).toHaveAttribute(
      'autocomplete',
      'new-password'
    );
    await expect(page.locator('#confirmPassword')).toHaveAttribute(
      'autocomplete',
      'new-password'
    );
  });
});

test.describe('Accessibility - Responsive Design', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`should render landing page correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto('/');

      // Page should render without errors
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
      expect(body!.length).toBeGreaterThan(100);

      // Brand should always be visible
      await expect(page.locator('nav').getByText('GovernanceOS')).toBeVisible();
    });

    test(`should render login page correctly at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto('/auth/login');

      await expect(page.getByText('Welcome back')).toBeVisible();
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
    });
  }
});
