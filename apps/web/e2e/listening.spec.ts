import { expect, test } from '@playwright/test';
import { answerAnything, chooseLanguages, stubAudio } from './helpers';

test('listening practice plays messages and dictations at the learner’s speed', async ({
  page,
}) => {
  const played = await stubAudio(page);
  await page.goto('./');
  await chooseLanguages(page, 'English');

  const panel = page.getByRole('region', { name: 'Listening practice' });
  await expect(panel.getByTestId('home-listening-speed')).toHaveText('Speed 85%');
  await panel.getByRole('link', { name: 'Start' }).click();

  await expect(page.getByRole('heading', { name: 'Listening practice' })).toBeVisible();
  await expect(page.getByTestId('listening-speed')).toHaveText('Speed 85%');
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(page.locator('.reading-text')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play' }).click();
  await expect.poll(() => played.length).toBeGreaterThan(0);

  await answerAnything(page);
  await expect(page.getByText(/^Question 2 of 8$/)).toBeVisible();
});
