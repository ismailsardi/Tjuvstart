import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('a learner can swipe through a deck and review it later', async ({ page }) => {
  await page.goto('./');
  await chooseLanguages(page, 'English');

  await page.getByRole('navigation').getByRole('link', { name: 'Words' }).click();
  await page.getByTestId('deck-a2-work').click();
  await expect(page.getByRole('heading', { name: 'Jobben' })).toBeVisible();

  const card = page.getByTestId('swipe-card');
  await expect(card).toContainText('en jobb');
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(card).toContainText('job, work');

  // Swipe right: "know it".
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('swipe-card')).toContainText('å jobbe');

  // The buttons do the same as swiping; "again" sends the card to the end of the deck.
  await page.getByRole('button', { name: /Again/ }).click();
  await expect(page.getByTestId('swipe-card')).toContainText('å arbeide');

  await page.getByRole('link', { name: 'Close' }).click();
  await expect(page.getByTestId('deck-a2-work')).toContainText('2 of 15 learning');
});
