import { expect, test } from '@playwright/test';

test('home page shows skills, lessons and the web manifest', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Tjuvstart' })).toBeVisible();
  await expect(page.getByTestId('skill-reading')).toContainText('Not assessed yet');
  await expect(page.getByRole('link', { name: /Første dag på jobben/ })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
});
