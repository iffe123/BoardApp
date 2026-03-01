import { test, expect } from '@playwright/test';

const TENANT_ID = 'test-tenant-123';

test('creates shareholder from Ny aktieägare modal', async ({ page }) => {
  const createdShareholder = {
    id: 'sh-100',
    tenantId: TENANT_ID,
    name: 'Anna Andersson',
    type: 'individual',
    isActive: true,
  };

  let shareholderListCalls = 0;

  await page.route(`**/api/shares/cap-table?tenantId=${TENANT_ID}`, async (route) => {
    await route.fulfill({ status: 200, json: null });
  });

  await page.route(`**/api/shares/transactions?tenantId=${TENANT_ID}`, async (route) => {
    await route.fulfill({ status: 200, json: { transactions: [] } });
  });

  await page.route(`**/api/shareholders?tenantId=${TENANT_ID}`, async (route) => {
    shareholderListCalls += 1;
    await route.fulfill({
      status: 200,
      json: {
        shareholders: shareholderListCalls > 1 ? [createdShareholder] : [],
        total: shareholderListCalls > 1 ? 1 : 0,
      },
    });
  });

  await page.route('**/api/shareholders', async (route) => {
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    expect(payload.tenantId).toBe(TENANT_ID);
    expect(payload.name).toBe('Anna Andersson');
    expect(payload.type).toBe('individual');

    await route.fulfill({
      status: 201,
      json: createdShareholder,
    });
  });

  await page.goto(`/dashboard/${TENANT_ID}/share-registry`);
  await page.getByRole('tab', { name: 'Aktieägare' }).click();
  await page.getByRole('button', { name: 'Ny aktieägare' }).click();

  await page.getByLabel('Namn *').fill('Anna Andersson');
  await page.getByRole('button', { name: 'Spara' }).click();

  await expect(page.getByRole('dialog', { name: 'Ny aktieägare' })).toBeHidden();
  await expect(page.getByText('Anna Andersson')).toBeVisible();
  await expect(page.getByText('Aktieägaren sparades.')).toBeVisible();
});
