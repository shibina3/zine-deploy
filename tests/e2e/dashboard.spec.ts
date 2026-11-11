import { expect, test, type Page } from '@playwright/test';

async function setup(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Set up your salon' })).toBeVisible();
  await page.locator('#businessName').fill('Insights Parlour');
  await page.locator('#ownerName').fill('Anita Rao');
  await page.locator('#username').fill('owner');
  await page.locator('#password').fill('salon1234');
  await page.locator('#confirm').fill('salon1234');
  await page.getByRole('button', { name: 'Create salon & sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Business dashboard' })).toBeVisible({
    timeout: 20_000,
  });
}

test('owner dashboard shows period analytics with comparisons', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await setup(page);

  // Monthly is the default and analytics sections are present.
  await expect(page.getByRole('heading', { name: 'Services that are a hit' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Who brought the income' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Period comparison' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How customers paid' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sales & collections by day' })).toBeVisible();
  await expect(page.locator('input[type="month"]')).toBeVisible();
  await expect(page.getByText(/vs /).first()).toBeVisible();

  // Daily view switches the chart to hourly buckets.
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sales & collections by hour' })).toBeVisible();
  await expect(page.locator('input[type="date"]')).toBeVisible();

  // Custom range exposes two date inputs and keeps the comparison sections.
  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  await expect(page.locator('input[type="date"]')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Services that are a hit' })).toBeVisible();

  expect(errors).toEqual([]);
});
