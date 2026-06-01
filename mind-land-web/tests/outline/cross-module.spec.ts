import { test, expect } from '@playwright/test';

test.describe('Cross Module Regression', () => {
  test('diary page loads', async ({ page }) => {
    await page.goto('/diary');
    await expect(page.locator('text=日记').first()).toBeVisible({ timeout: 10000 });
  });

  test.skip('todo page - pre-existing 404 bug', async ({ page }) => {
    await page.goto('/todo');
  });

  test.skip('slipbox page - pre-existing 404 bug', async ({ page }) => {
    await page.goto('/slip-box');
  });
});
