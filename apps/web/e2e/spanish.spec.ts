import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('a Spanish speaker gets a Spanish interface, Spanish tips and highlighted cognates', async ({
  page,
}) => {
  await page.goto('./');
  await chooseLanguages(page, 'Español');

  await expect(page.getByRole('heading', { name: 'Tu nivel', exact: true })).toBeVisible();

  await page
    .getByRole('region', { name: 'Siguiente lección' })
    .getByRole('link', { name: /Første dag på jobben/ })
    .click();
  await expect(page.locator('.reading-text mark.cognate', { hasText: 'prosjekt' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Palabras que probablemente conoces' }),
  ).toBeVisible();
  await expect(page.getByText('El sujeto no se omite nunca')).toBeVisible();
});
