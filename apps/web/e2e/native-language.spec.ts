import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('a French speaker gets a French interface, French tips and highlighted cognates', async ({
  page,
}) => {
  await page.goto('./');
  await chooseLanguages(page, 'Français', ['English']);

  await expect(page.getByRole('heading', { name: 'Votre niveau' })).toBeVisible();
  await expect(page.getByTestId('languages')).toContainText('Français, English');

  await page.getByRole('link', { name: /Første dag på jobben/ }).click();
  await expect(page.locator('.reading-text mark.cognate', { hasText: 'prosjekt' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Mots que vous connaissez probablement' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Utvikler', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Sjefen til Sara', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('veut dire la même chose');

  // Languages can be changed later from the home page.
  await page.getByRole('link', { name: '← Accueil' }).click();
  await page.getByRole('link', { name: 'Modifier' }).click();
  await chooseLanguages(page, 'English');
  await expect(page.getByRole('heading', { name: 'Your level' })).toBeVisible();
});
