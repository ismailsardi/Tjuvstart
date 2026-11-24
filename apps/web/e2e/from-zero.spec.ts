import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('a complete beginner starts on the alphabet, with tips in their language', async ({
  page,
}) => {
  await page.goto('./');
  await chooseLanguages(page, 'Français', [], 'beginner');

  // No level check for a beginner: the next lesson is the first one of the from-zero track.
  await expect(page.getByRole('heading', { name: 'Trouver votre niveau' })).toHaveCount(0);
  const next = page.getByRole('region', { name: 'Prochaine leçon' });
  await expect(next).toContainText('Helt fra start · 0 sur 8 terminées');
  await next.getByRole('link', { name: /Alfabetet og æ, ø, å/ }).click();
  await expect(page.getByText('Les sons de æ, ø et å')).toBeVisible();
  await expect(page.getByText('Les mots des exercices')).toBeVisible();
});

test('a learner who knows some Norwegian is not sent back to the alphabet', async ({ page }) => {
  await page.goto('./');
  await chooseLanguages(page, 'English');
  await expect(page.getByRole('heading', { name: 'Find your level' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Next lesson' })).not.toContainText(
    'Helt fra start',
  );

  // The track is still there on the lessons page for anyone who wants it.
  await page.getByRole('navigation').getByRole('link', { name: 'Lessons' }).click();
  await expect(page.getByRole('region', { name: 'Helt fra start' })).toContainText('0 of 8 done');
});
