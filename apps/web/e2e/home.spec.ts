import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('first visit asks for languages, then shows skills, lessons and the manifest', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Velkommen!' })).toBeVisible();
  await chooseLanguages(page, 'English');

  await expect(page.getByTestId('skill-reading')).toContainText('Not assessed yet');
  await expect(page.getByRole('link', { name: /Første dag på jobben/ })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);

  // The choice is stored, so a returning learner goes straight to the home page.
  await page.reload();
  await expect(page.getByTestId('languages')).toContainText('English');
});
