import { test, expect } from '@playwright/test';

const TENANT_ID = 'test-tenant-123';

test('create decision + action, mark done, dashboard updates', async ({ page }) => {
  let done = false;

  await page.route(`**/api/execution/summary?tenantId=${TENANT_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalDecisionsLast12Months: 1,
        decisionCompletionRate: done ? 1 : 0,
        openActionsCount: done ? 0 : 1,
        overdueCount: 0,
        avgCompletionTime: null,
        actionsByOwner: [{ ownerUserId: 'owner-1', count: 1 }],
        impactCategoryBreakdown: [{ category: 'strategy', count: 1 }],
        upcomingDeadlines: done
          ? []
          : [{ id: 'a1', title: 'Ship board plan', dueDate: new Date().toISOString(), ownerUserId: 'owner-1', status: 'open' }],
        boardPromises: [],
      }),
    });
  });

  await page.route('**/api/actions/a1', async (route) => {
    done = true;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.goto(`/dashboard/${TENANT_ID}/execution`);
  await expect(page.getByText('Open actions')).toBeVisible();
  await expect(page.getByText('1').first()).toBeVisible();

  await page.getByRole('button', { name: 'Mark done' }).click();

  await expect(page.getByText('0').first()).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();
});
