import { expect, test } from '@playwright/test';
import { installTauriMock } from './helpers/tauriMock';

test.beforeEach(async ({ page }) => {
  await installTauriMock(page);
});

test('opens the encoding queue by default', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/queue$/);
  await expect(page.locator('.navigation-tabs')).toBeVisible();
  await expect(page.locator('.encoding-queue-page')).toBeVisible();
  await expect(page.getByText('编码队列', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /开始/ })).toBeVisible();
});

test('navigates between primary pages', async ({ page }) => {
  await page.goto('/');

  await page.getByText('参数面板', { exact: true }).click();
  await expect(page).toHaveURL(/\/params$/);
  await expect(page.locator('.parameter-panel')).toBeVisible();

  await page.getByText('设置', { exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.locator('.settings-page')).toBeVisible();
});
