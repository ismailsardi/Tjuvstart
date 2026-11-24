import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('first visit asks for languages, then shows skills, lessons and the manifest', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Velkommen!' })).toBeVisible();
  await chooseLanguages(page, 'English');

  // Until a skill has an estimate, the level card says so in one line.
  await expect(page.getByRole('region', { name: 'Your level', exact: true })).toContainText(
    'No estimate yet',
  );
  await expect(
    page
      .getByRole('region', { name: /^(Next lesson|Prochaine leçon)$/ })
      .getByRole('link', { name: /Første dag på jobben/ }),
  ).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);

  // The choice is stored, so a returning learner goes straight to the home page.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hei!' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Me' }).click();
  await expect(page.getByTestId('languages')).toContainText('English');
});
