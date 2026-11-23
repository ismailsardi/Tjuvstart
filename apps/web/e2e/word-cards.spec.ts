import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('a learner can open a word card, learn it and review it', async ({ page }) => {
  await page.goto('./');
  await chooseLanguages(page, 'English');

  await page.getByRole('link', { name: /Word cards/ }).click();
  await expect(page.getByRole('heading', { name: 'Word cards' })).toBeVisible();

  await page.getByText('Jobben').click();
  const card = page.getByTestId('card-sjef');
  await card.getByRole('button', { name: /en sjef/ }).click();
  await expect(card).toContainText('boss, manager');
  await expect(card).toContainText('Look-alike: not «chef»');

  await card.getByRole('button', { name: 'Learn' }).click();
  await expect(card).toContainText('Learning');

  await page.getByRole('link', { name: 'Review now' }).click();
  await expect(page.getByText('en sjef')).toBeVisible();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Good' }).click();
  await expect(page.getByRole('status')).toContainText('All done for now');
});
