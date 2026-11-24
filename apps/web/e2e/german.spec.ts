import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('a German speaker gets a German interface, German tips and highlighted cognates', async ({
  page,
}) => {
  await page.goto('./');
  await chooseLanguages(page, 'Deutsch');

  await expect(page.getByRole('heading', { name: 'Dein Niveau', exact: true })).toBeVisible();

  await page
    .getByRole('region', { name: 'Nächste Lektion' })
    .getByRole('link', { name: /Første dag på jobben/ })
    .click();
  await expect(page.locator('.reading-text mark.cognate', { hasText: 'prosjekt' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Wörter, die du wahrscheinlich kennst' }),
  ).toBeVisible();
  await expect(page.getByText('Das Verb an zweiter Stelle, wie im Deutschen')).toBeVisible();
});
