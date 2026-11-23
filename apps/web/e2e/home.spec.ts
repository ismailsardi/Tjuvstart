import { expect, test } from '@playwright/test';

test('home page loads and links the web manifest', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tjuvstart' })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
});
