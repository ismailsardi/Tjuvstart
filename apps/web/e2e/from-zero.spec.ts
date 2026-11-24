import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('a complete beginner finds the from-zero track with tips in their language', async ({
  page,
}) => {
  await page.goto('./');
  await chooseLanguages(page, 'Français');

  // Home keeps suggesting the A2 track until the learner's level says otherwise.
  await expect(page.getByRole('region', { name: 'Helt fra start' })).toHaveCount(0);

  await page.goto('./#/lessons');
  const track = page.getByRole('region', { name: 'Helt fra start' });
  await expect(track).toContainText('Partir de zéro');
  await expect(track).toContainText('0 sur 8 terminées');

  await track.getByRole('link', { name: /Alfabetet og æ, ø, å/ }).click();
  await expect(page.getByText('Les sons de æ, ø et å')).toBeVisible();
  await expect(page.getByText('Les mots des exercices')).toBeVisible();
});
