import { expect, test, type Page } from '@playwright/test';

const nav = (page: Page) => page.locator('nav');

test.describe('Zine end-to-end', () => {
  test('setup, bill a customer, and download an encrypted backup', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Set up your salon' })).toBeVisible();
    await page.locator('#businessName').fill('Zine Test Parlour');
    await page.locator('#ownerName').fill('Anita Rao');
    await page.locator('#username').fill('owner');
    await page.locator('#password').fill('salon1234');
    await page.locator('#confirm').fill('salon1234');
    await page.getByRole('button', { name: 'Create salon & sign in' }).click();

    await expect(page.getByRole('heading', { name: 'Business dashboard' })).toBeVisible({ timeout: 20_000 });

    await nav(page).getByRole('link', { name: 'Customers', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Customers', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Add customer' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('Sneha Kulkarni').fill('E2E Test Customer');
    await dialog.getByPlaceholder('99001 12233').fill('9876500011');
    await dialog.getByRole('button', { name: 'Add customer' }).click();
    await expect(page.getByText('Customer added')).toBeVisible();
    await expect(page.getByText('E2E Test Customer').first()).toBeVisible();

    // Saving a new customer opens their profile drawer — close it before navigating.
    const drawer = page.getByRole('dialog').last();
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await nav(page).getByRole('link', { name: 'New bill' }).click();
    await expect(page.getByRole('heading', { name: 'New bill', level: 1 })).toBeVisible();

    await page.getByPlaceholder('Search name or phone…').fill('E2E Test');
    await page.getByRole('button', { name: /E2E Test Customer/ }).click();
    await page.getByRole('button', { name: /Hair Spa/ }).first().click();
    await expect(page.getByText('Selected items')).toBeVisible();

    const generate = page.getByRole('button', { name: 'Generate bill' });
    await expect(generate).toBeEnabled();
    await generate.click();

    await expect(page.getByText('Bill created')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/ZN-\d{4}-\d{5}/).first()).toBeVisible();

    const receiptDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download receipt PDF' }).click();
    const receipt = await receiptDownload;
    expect(receipt.suggestedFilename()).toMatch(/Zine-Receipt-ZN-\d{4}-\d{5}\.pdf/);

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('heading', { name: 'Bills', level: 1 })).toBeVisible();

    await page.goto('/settings/backup');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    const passwords = page.locator('input[type="password"]');
    await passwords.nth(0).fill('backup-passphrase-1');
    await passwords.nth(1).fill('backup-passphrase-1');

    const backupDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download encrypted backup' }).click();
    const backup = await backupDownload;
    expect(backup.suggestedFilename()).toMatch(/^zine-backup-.*\.zinebackup$/);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await nav(page).getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Business dashboard' })).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('sign out and reject an incorrect password', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Set up your salon' })).toBeVisible();
    await page.locator('#businessName').fill('Login Test Parlour');
    await page.locator('#ownerName').fill('Owner');
    await page.locator('#username').fill('owner');
    await page.locator('#password').fill('salon1234');
    await page.locator('#confirm').fill('salon1234');
    await page.getByRole('button', { name: 'Create salon & sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Business dashboard' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    await page.locator('#login-username').fill('owner');
    await page.locator('#login-password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid username or password');

    await page.locator('#login-password').fill('salon1234');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Business dashboard' })).toBeVisible({ timeout: 20_000 });
  });
});
