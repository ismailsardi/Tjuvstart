import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('a French speaker gets a French interface, French tips and highlighted cognates', async ({
  page,
}) => {
  await page.goto('./');
  await chooseLanguages(page, 'Français', ['English']);

  await expect(page.getByRole('heading', { name: 'Votre niveau', exact: true })).toBeVisible();

  await page
    .getByRole('region', { name: /^(Next lesson|Prochaine leçon)$/ })
    .getByRole('link', { name: /Første dag på jobben/ })
    .click();
  const cognate = page.locator('.reading-text .cognate', { hasText: 'prosjekt' });
  await expect(cognate).toBeVisible();
  const tint = () => cognate.evaluate((el) => getComputedStyle(el).backgroundColor);
  const heading = page.getByRole('heading', { name: 'Mots que vous connaissez probablement' });
  await expect(heading).toBeVisible();
  // Familiar words are tinted only while their list is open; look-alikes always are.
  expect(await tint()).toBe('rgba(0, 0, 0, 0)');
  await heading.click();
  await expect.poll(tint).not.toBe('rgba(0, 0, 0, 0)');
  await heading.click();

  await page.getByRole('button', { name: 'Utvikler', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Sjefen til Sara', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('veut dire la même chose');

  // Languages can be changed later from the home page.
  await page.getByRole('link', { name: 'Fermer' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Moi' }).click();
  await expect(page.getByTestId('languages')).toContainText('Français, English');
  await page.getByTestId('languages').getByRole('link', { name: 'Modifier' }).click();
  await chooseLanguages(page, 'English', [], null);
  await expect(page.getByRole('heading', { name: 'Your level' })).toBeVisible();
});
