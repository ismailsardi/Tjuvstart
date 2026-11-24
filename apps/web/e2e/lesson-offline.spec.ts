import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('sample lesson works offline and updates the level estimate', async ({ page, context }) => {
  await page.goto('./');
  await chooseLanguages(page, 'English');
  // Wait until the service worker controls the page, so the app shell is precached.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();

  await page
    .getByRole('region', { name: /^(Next lesson|Prochaine leçon)$/ })
    .getByRole('link', { name: /Første dag på jobben/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Første dag på jobben' })).toBeVisible();

  // The first five items are reading questions; answer them correctly.
  const answers = ['Utvikler', 'Sjefen til Sara', 'Klokka 11.30', 'De har et møte', 'Klokka 13.00'];
  for (const answer of answers) {
    await page.getByRole('button', { name: answer, exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Correct!');
    await page.getByRole('button', { name: 'Continue' }).click();
  }

  await page.getByRole('link', { name: 'Close' }).click();
  await expect(page.getByTestId('skill-reading')).toContainText('(estimated)');

  // Progress is stored on the device and survives a reload.
  await page.reload();
  await expect(page.getByTestId('skill-reading')).toContainText('(estimated)');
});
