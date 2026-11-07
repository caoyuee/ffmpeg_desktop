import { expect, test } from '@playwright/test';
import { installTauriMock } from './helpers/tauriMock';

// R2.3：三套设置归一，所有字段只存在唯一键 `ffmpegDesktop.settings`（schemaVersion 1）。
// 旧键 theme / language / appSettings 仅在首次迁移时读取，E2E 不再直接读写它们。
const SETTINGS_KEY = 'ffmpegDesktop.settings';

test.beforeEach(async ({ page }) => {
  await installTauriMock(page);
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      'ffmpegDesktop.settings',
      JSON.stringify({ schemaVersion: 1, language: 'zh-CN' }),
    );
  });
});

test('switches language from Chinese to English', async ({ page }) => {
  await page.goto('/settings');

  const generalSection = page.locator('.settings-section').first();
  await expect(generalSection).toBeVisible();

  await generalSection.locator('select').first().selectOption('en-US');

  await expect(page.getByText('Encoding Queue', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();

  const storedLanguage = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { language?: string }).language : null;
  }, SETTINGS_KEY);
  expect(storedLanguage).toBe('en-US');
});

test('persists selected light theme', async ({ page }) => {
  await page.goto('/settings');

  const generalSection = page.locator('.settings-section').first();
  await expect(generalSection).toBeVisible();

  await generalSection.locator('select').nth(1).selectOption('light');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  const storedTheme = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { theme?: string }).theme : null;
  }, SETTINGS_KEY);
  expect(storedTheme).toBe('light');
});
