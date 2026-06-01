import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/outline',
  timeout: 30000,
  retries: 0,
  use: { baseURL: 'http://localhost:3000', browserName: 'chromium', headless: true },
});
