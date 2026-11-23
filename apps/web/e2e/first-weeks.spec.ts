import { expect, test } from '@playwright/test';
import { answerAnything, chooseLanguages } from './helpers';

test('the first-weeks track shows progress and suggests the next scenario', async ({ page }) => {
  await page.goto('./');
  await chooseLanguages(page, 'Français');

  const track = page.getByRole('region', { name: 'De første ukene i Norge' });
  await expect(track).toContainText('0 sur 6 terminées');
  await expect(track).toContainText('Les situations de vos premières semaines');

  await track.getByRole('link', { name: /Første dag på jobben/ }).click();
  const counter = page.getByText(/^Question \d+ sur (\d+)$/);
  const total = Number((await counter.textContent())!.match(/sur (\d+)/)![1]);
  for (let n = 0; n < total; n++) await answerAnything(page);
  await expect(page.getByRole('heading', { name: 'Ferdig!' })).toBeVisible();

  await page.getByRole('link', { name: 'Retour à l’accueil' }).click();
  await expect(track).toContainText('1 sur 6 terminées');
  await expect(track.locator('[aria-current="step"]')).toContainText('Skattekortet');
  await expect(page.getByRole('region', { name: 'Prochaine leçon' })).toContainText('Skattekortet');
});
