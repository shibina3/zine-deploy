import { expect, test, type Page } from '@playwright/test';

const ROUTES: Array<{ path: string; heading: string }> = [
  { path: '/', heading: 'Dashboard' },
  { path: '/billing', heading: 'Bills' },
  { path: '/billing/new', heading: 'New bill' },
  { path: '/payments', heading: 'Payments' },
  { path: '/refunds', heading: 'Refunds' },
  { path: '/calendar', heading: 'Appointments' },
  { path: '/calendar/bridal', heading: 'Bridal bookings' },
  { path: '/calendar/blocks', heading: 'Blocked dates' },
  { path: '/customers', heading: 'Customers' },
  { path: '/services', heading: 'Services' },
  { path: '/offers', heading: 'Offers & combos' },
  { path: '/inventory', heading: 'Products' },
  { path: '/inventory/inward', heading: 'Stock inward' },
  { path: '/inventory/outward', heading: 'Stock outward' },
  { path: '/inventory/suppliers', heading: 'Suppliers' },
  { path: '/inventory/alerts', heading: 'Stock alerts' },
  { path: '/employees', heading: 'Employees' },
  { path: '/employees/leave', heading: 'Leave management' },
  { path: '/employees/payroll', heading: 'Salary & payroll' },
  { path: '/finance/income', heading: 'Income' },
  { path: '/finance/expenses', heading: 'Expenses' },
  { path: '/finance/reports', heading: 'Reports' },
  { path: '/settings', heading: 'Settings' },
  { path: '/settings/receipt', heading: 'Settings' },
  { path: '/settings/backup', heading: 'Settings' },
  { path: '/settings/security', heading: 'Settings' },
];

async function setup(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Set up your salon' })).toBeVisible();
  await page.locator('#businessName').fill('Route Sweep Parlour');
  await page.locator('#ownerName').fill('Owner');
  await page.locator('#username').fill('owner');
  await page.locator('#password').fill('salon1234');
  await page.locator('#confirm').fill('salon1234');
  await page.getByRole('button', { name: 'Create salon & sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Business dashboard' })).toBeVisible({ timeout: 20_000 });
}

test('every route renders without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await setup(page);

  for (const route of ROUTES) {
    await page.goto(route.path);
    if (route.path === '/') {
      await expect(page.getByRole('heading', { name: 'Business dashboard' })).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(page.getByRole('heading', { name: route.heading, level: 1 })).toBeVisible({
        timeout: 15_000,
      });
    }
    await expect(page.locator('body')).not.toBeEmpty();
  }

  await page.goto('/not-a-real-page');
  await expect(
    page.getByRole('heading', { name: 'This page is not part of the salon' }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test('calendar views, payroll generation and report filters work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await setup(page);

  await page.goto('/calendar');
  await page.getByRole('button', { name: 'Week' }).click();
  await expect(page.getByRole('heading', { name: 'Appointments', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Month' }).click();
  await page.getByRole('button', { name: 'List' }).click();
  await expect(page.getByRole('heading', { name: 'Appointments', level: 1 })).toBeVisible();

  await page.goto('/employees/payroll');
  await page.getByRole('button', { name: /Generate/ }).first().click();
  await expect(page.getByText(/Payroll drafts created|Nothing to generate/)).toBeVisible({
    timeout: 15_000,
  });

  await page.goto('/finance/reports');
  await page.getByRole('button', { name: 'Last 30 days' }).click();
  await expect(page.getByText('Estimated profit').first()).toBeVisible();

  expect(errors).toEqual([]);
});
