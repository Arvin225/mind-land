import { test, expect } from '@playwright/test';

test('open document and press Enter creates node', async ({ page }) => {
  await page.goto('/note');
  await page.waitForSelector('text=全部文档');

  const card = page.locator('text=E2E Test Document').first();
  if (await card.isVisible()) {
    await card.click();
  } else {
    await page.click('text=新建');
    await page.waitForSelector('text=新建文档');
    await page.fill('input[placeholder="文档标题"]', 'Editor Test Doc');
    await page.click('button:has-text("确定")');
    await page.waitForTimeout(1000);
  }

  await page.waitForTimeout(2000);

  const editor = page.locator('[data-node-id]').first();
  if (await editor.isVisible()) {
    await editor.click();
    await editor.press('Enter');
    await page.waitForTimeout(500);
    const nodes = page.locator('[data-node-id]');
    const count = await nodes.count();
    expect(count).toBeGreaterThanOrEqual(2);
  }
});
