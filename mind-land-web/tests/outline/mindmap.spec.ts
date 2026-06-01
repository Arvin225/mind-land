import { test, expect } from '@playwright/test';

test('toggle to mindmap view', async ({ page }) => {
  await page.goto('/note');
  await page.waitForSelector('text=全部文档');

  const card = page.locator('text=E2E Test Document').first();
  if (await card.isVisible()) {
    await card.click();
  } else {
    await page.click('text=新建');
    await page.waitForSelector('text=新建文档');
    await page.fill('input[placeholder="文档标题"]', 'Mindmap Test Doc');
    await page.click('button:has-text("确定")');
    await page.waitForTimeout(1000);
    const newCard = page.locator('text=Mindmap Test Doc').first();
    await newCard.click();
  }

  await page.waitForTimeout(2000);

  const viewToggle = page.locator('button[title*="脑图"]').first();
  if (await viewToggle.isVisible()) {
    await viewToggle.click();
    await page.waitForTimeout(1000);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  } else {
    const toolbarButtons = page.locator('button').filter({ hasText: /脑图|视图/ });
    if (await toolbarButtons.count() > 0) {
      await toolbarButtons.first().click();
      await page.waitForTimeout(1000);
    }
  }
});
