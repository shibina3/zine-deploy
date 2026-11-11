import { expect, test, type Page } from '@playwright/test';

async function setupOwner(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Set up your salon' })).toBeVisible();
  await page.locator('#businessName').fill('Permission Test Parlour');
  await page.locator('#ownerName').fill('Owner');
  await page.locator('#username').fill('owner');
  await page.locator('#password').fill('salon1234');
  await page.locator('#confirm').fill('salon1234');
  await page.getByRole('button', { name: 'Create salon & sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Business dashboard' })).toBeVisible({ timeout: 20_000 });
}

async function createEmployeeLogin(page: Page) {
  await page.goto('/employees');
  await expect(page.getByRole('heading', { name: 'Employees', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Add employee' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'New employee' })).toBeVisible();
  await dialog.getByPlaceholder('Anita Rao').fill('Meera Nair');
  await dialog.getByRole('switch').last().click();
  await dialog.getByPlaceholder('anita', { exact: true }).fill('meera');
  await dialog.locator('input[type="password"]').last().fill('meera1234');
  await dialog.getByRole('button', { name: 'Add employee' }).click();
  await expect(page.getByText('Employee added')).toBeVisible();
}

test('employees get the default restricted navigation and routes', async ({ page }) => {
  await setupOwner(page);
  await createEmployeeLogin(page);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.locator('#login-username').fill('meera');
  await page.locator('#login-password').fill('meera1234');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const nav = page.locator('nav');
  await expect(nav.getByRole('link', { name: 'New bill' })).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/billing\/new$/);
  await expect(nav.getByRole('link', { name: 'Customers' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Appointments' })).toBeVisible();

  for (const hidden of ['Dashboard', 'Salary & payroll', 'Reports', 'Settings', 'Products', 'Refunds']) {
    await expect(nav.getByRole('link', { name: hidden, exact: true })).toHaveCount(0);
  }

  await page.goto('/finance/reports');
  await expect(page).toHaveURL(/\/billing\/new$/);
  await page.goto('/inventory');
  await expect(page).toHaveURL(/\/billing\/new$/);
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/billing\/new$/);

  await page.goto('/billing/new');
  await expect(page.getByRole('heading', { name: 'New bill', level: 1 })).toBeVisible();

  await page.goto('/services');
  await expect(page.getByRole('heading', { name: 'Services', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add service' })).toHaveCount(0);
});

test('permissions can be granted to an employee by the owner', async ({ page }) => {
  await setupOwner(page);
  await createEmployeeLogin(page);

  await page.goto('/settings/security');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  const meeraRow = page.locator('li').filter({ hasText: 'Meera Nair' });
  await meeraRow.getByRole('button', { name: 'Manage' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /Meera Nair/ })).toBeVisible();
  const reportsSwitch = dialog.locator('label').filter({ hasText: 'View reports' }).getByRole('switch');
  await reportsSwitch.click();
  await dialog.getByRole('button', { name: 'Save account' }).click();
  await expect(page.getByText('Account updated')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.locator('#login-username').fill('meera');
  await page.locator('#login-password').fill('meera1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  const nav = page.locator('nav');
  await expect(nav.getByRole('link', { name: 'Reports' })).toBeVisible({ timeout: 20_000 });
  await page.goto('/finance/reports');
  await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
});
