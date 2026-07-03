import { expect, test } from '@playwright/test';
import { installTauriMock } from './helpers/tauriMock';

test.beforeEach(async ({ page }) => {
  await installTauriMock(page);
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('language', 'zh-CN');
  });
});

test('switches language from Chinese to English', async ({ page }) => {
  await page.goto('/settings');

  const generalSection = page.locator('.settings-section').first();
  await expect(generalSection).toBeVisible();

  await generalSection.locator('select').first().selectOption('en-US');

  await expect(page.getByText('Encoding Queue', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.evaluate(() => localStorage.getItem('language'))).resolves.toBe('en-US');
});

test('persists selected light theme', async ({ page }) => {
  await page.goto('/settings');

  const generalSection = page.locator('.settings-section').first();
  await expect(generalSection).toBeVisible();

  await generalSection.locator('select').nth(1).selectOption('light');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.evaluate(() => localStorage.getItem('theme'))).resolves.toBe('light');
});
