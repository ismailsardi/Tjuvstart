import { expect, test } from '@playwright/test';
import { chooseLanguages, stubAudio } from './helpers';

test('the alphabet is one tap away from the lessons and words pages, with sound', async ({
  page,
}) => {
  const played = await stubAudio(page);
  await page.goto('./');
  await chooseLanguages(page, 'English');

  await page.getByRole('navigation').getByRole('link', { name: 'Words' }).click();
  await expect(page.getByRole('link', { name: /The alphabet/ })).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Lessons' }).click();
  await page.getByRole('link', { name: /The alphabet/ }).click();
  await expect(page.getByRole('heading', { name: 'The alphabet' })).toBeVisible();

  const letters = page.getByRole('main').getByRole('listitem');
  await expect(letters).toHaveCount(29);
  const oe = letters.filter({ hasText: 'Øø' });
  await expect(oe).toContainText('øst');
  await oe.getByRole('button', { name: /Listen/ }).click();
  await expect.poll(() => played).toEqual(['letter-28.mp3', 'example-28.mp3']);
});
