import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('real-world texts read like the documents they come from', async ({ page }) => {
  await page.goto('./');
  await chooseLanguages(page, 'English');

  // Home shows only the track in progress; the others are on the lessons page.
  await expect(page.getByTestId('next-track')).toContainText('De første ukene i Norge');
  await expect(page.getByRole('region', { name: 'Ekte tekster' })).toHaveCount(0);

  await page.getByRole('link', { name: 'All lessons' }).click();
  const track = page.getByRole('region', { name: 'Ekte tekster' });
  await expect(track).toContainText('0 of 4 done');
  await track.getByRole('link', { name: /Brev fra NAV/ }).click();

  const doc = page.getByTestId('document');
  await expect(doc).toContainText('Real-world text, simplified to A2');
  await expect(doc).toContainText('From: NAV');
  await expect(doc).toContainText('meldekort hver fjortende dag');
});

test('a learner picks a line of work and gets its word deck', async ({ page }) => {
  await page.goto('./');
  await chooseLanguages(page, 'English');

  await page.getByRole('navigation').getByRole('link', { name: 'Words' }).click();
  await expect(page.getByTestId('deck-a2-job-it')).toHaveCount(0);
  await page.getByRole('button', { name: 'Construction' }).click();

  const deck = page.getByTestId('deck-a2-job-construction');
  await expect(deck).toContainText('12 words · not started');
  await expect(page.getByTestId('deck-a2-job-it')).toHaveCount(0);

  await page.getByRole('navigation').getByRole('link', { name: 'Me' }).click();
  await expect(page.getByTestId('job-field')).toContainText('My job: Construction');
});
