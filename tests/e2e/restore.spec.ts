import { expect, test, type Page } from '@playwright/test';

const PASSPHRASE = 'backup-passphrase-1';

async function setup(page: Page, business: string, password: string) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Set up your salon' })).toBeVisible();
  await page.locator('#businessName').fill(business);
  await page.locator('#ownerName').fill('Anita Rao');
  await page.locator('#username').fill('owner');
  await page.locator('#password').fill(password);
  await page.locator('#confirm').fill(password);
  await page.getByRole('button', { name: 'Create salon & sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Business dashboard' })).toBeVisible({ timeout: 20_000 });
}

async function downloadBackup(page: Page, path: string) {
  await page.goto('/settings/backup');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  const passwords = page.locator('input[type="password"]');
  await passwords.nth(0).fill(PASSPHRASE);
  await passwords.nth(1).fill(PASSPHRASE);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download encrypted backup' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^zine-backup-.*\.zinebackup$/);
  await file.saveAs(path);
}

test('a backup restores onto a fresh browser profile', async ({ browser }) => {
  const backupPath = test.info().outputPath('zine-backup.zinebackup');

  // --- Device 1: create data on the source device and take a backup.
  const source = await browser.newContext();
  const sourcePage = await source.newPage();
  await setup(sourcePage, 'Source Parlour', 'salon1234');

  // A reload must not reset the salon profile back to defaults.
  await sourcePage.reload();
  await expect(sourcePage.getByRole('heading', { name: 'Business dashboard' })).toBeVisible({ timeout: 20_000 });
  await expect(sourcePage.getByText('Source Parlour').first()).toBeVisible();

  await sourcePage.goto('/customers');
  await sourcePage.getByRole('button', { name: 'Add customer' }).first().click();
  const addDialog = sourcePage.getByRole('dialog');
  await addDialog.getByPlaceholder('Sneha Kulkarni').fill('Restore Me');
  await addDialog.getByPlaceholder('99001 12233').fill('9876500099');
  await addDialog.getByRole('button', { name: 'Add customer' }).click();
  await expect(sourcePage.getByText('Customer added')).toBeVisible();
  await sourcePage.getByRole('dialog').last().getByRole('button', { name: 'Close' }).click();

  await downloadBackup(sourcePage, backupPath);
  await expect(sourcePage.getByText('Encrypted backup downloaded')).toBeVisible();
  await source.close();

  // --- Device 2: a brand-new profile with its own empty database.
  const target = await browser.newContext();
  const targetPage = await target.newPage();
  await setup(targetPage, 'Fresh Device Parlour', 'otherpass1');

  await targetPage.goto('/customers');
  await expect(targetPage.getByText('Restore Me')).toHaveCount(0);

  await targetPage.goto('/settings/backup');
  const passwords = targetPage.locator('input[type="password"]');
  await passwords.nth(0).fill(PASSPHRASE);
  await passwords.nth(1).fill(PASSPHRASE);

  await targetPage.locator('input[type="file"]').setInputFiles(backupPath);
  await targetPage.getByRole('button', { name: 'Inspect backup' }).click();
  await expect(targetPage.getByText('Integrity verified')).toBeVisible({ timeout: 15_000 });
  await expect(targetPage.getByText('Source Parlour')).toBeVisible();

  await targetPage.getByRole('button', { name: 'Restore this backup' }).click();
  await targetPage.getByRole('button', { name: 'Restore backup' }).last().click();
  await expect(targetPage.getByText('Restore complete')).toBeVisible({ timeout: 20_000 });

  // The restored dataset replaces the old users, so the device asks to sign in again.
  await expect(targetPage.getByRole('heading', { name: 'Welcome back' })).toBeVisible({
    timeout: 20_000,
  });
  await targetPage.locator('#login-username').fill('owner');
  await targetPage.locator('#login-password').fill('salon1234');
  await targetPage.getByRole('button', { name: 'Sign in' }).click();

  await expect(targetPage.getByRole('heading', { name: 'Business dashboard' })).toBeVisible({ timeout: 20_000 });
  await expect(targetPage.getByText('Source Parlour').first()).toBeVisible();

  await targetPage.goto('/customers');
  await expect(targetPage.getByText('Restore Me').first()).toBeVisible();

  await target.close();
});
