import { test, expect } from '@playwright/test';

test.describe('File Management', () => {
  test('navigate to /note shows document home', async ({ page }) => {
    await page.goto('/note');
    await expect(page.locator('text=全部文档')).toBeVisible({ timeout: 10000 });
  });

  test('create folder via dialog', async ({ page }) => {
    await page.goto('/note');
    await page.click('button:has-text("新建")');
    await page.click('button:has-text("文件夹")');
    await page.fill('input[placeholder="文件夹名称"]', 'E2ETest');
    await page.click('button:has-text("确定")');
    await expect(page.locator('text=E2ETest').first()).toBeVisible({ timeout: 5000 });
  });

  test('create document via dialog', async ({ page }) => {
    await page.goto('/note');
    await page.click('button:has-text("新建")');
    await page.fill('input[placeholder="文档标题"]', 'E2EDoc');
    await page.click('button:has-text("确定")');
    await expect(page.locator('text=E2EDoc').first()).toBeVisible({ timeout: 5000 });
  });
});
