import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { answerAnything, chooseLanguages, finishLesson, stubAudio } from './helpers';

/**
 * Runs axe (WCAG 2.2 A and AA rules) on every screen of the app, in light and dark mode.
 * Any violation fails the test, and the report lists each rule with the offending nodes.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function audit(page: Page, screen: string) {
  // Let entrance animations settle so colour contrast is measured on the final state.
  await page.waitForTimeout(400);
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const report = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n` +
      v.nodes.map((n) => `    ${n.target.join(' ')}\n      ${n.failureSummary}`).join('\n'),
  );
  expect.soft(report, `${screen}\n${report.join('\n')}`).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme, reducedMotion: 'reduce' });

    test('onboarding has no axe violations', async ({ page }) => {
      await page.goto('./');
      await expect(page.getByRole('heading', { name: 'Velkommen!' })).toBeVisible();
      await audit(page, 'onboarding: native language');
      await page.getByRole('radio', { name: 'English' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();
      await audit(page, 'onboarding: other languages');
      await page.getByRole('button', { name: 'Continue' }).click();
      await audit(page, 'onboarding: starting point');
    });

    test('main screens have no axe violations', async ({ page }) => {
      await stubAudio(page);
      await page.goto('./');
      await chooseLanguages(page, 'English');
      await audit(page, 'home');

      for (const [hash, screen] of [
        ['#/lessons', 'lessons'],
        ['#/alphabet', 'alphabet'],
        ['#/words', 'words'],
        ['#/words/a2-work', 'word deck'],
        ['#/me', 'me'],
        ['#/practice', 'practice'],
        ['#/listening', 'listening'],
        ['#/ai', 'ai hub'],
        ['#/languages', 'languages'],
        ['#/shadow/a2-first-day-at-work', 'shadowing'],
        ['#/placement', 'level check'],
        ['#/goal', 'daily goal'],
      ] as const) {
        await page.goto(`./${hash}`);
        await expect(page.getByRole('main')).toBeVisible();
        await audit(page, screen);
      }
    });

    test('a lesson has no axe violations, before and after an answer', async ({ page }) => {
      await stubAudio(page);
      await page.goto('./');
      await chooseLanguages(page, 'English');
      await page.goto('./#/lesson/a2-first-day-at-work');
      await expect(page.getByRole('main')).toBeVisible();
      await audit(page, 'lesson: first exercise');
      await answerAnything(page);
      await audit(page, 'lesson: second exercise');
      await answerAnything(page);
      await audit(page, 'lesson: third exercise');

      // Writing exercises fold the text away; check them closed and open.
      const toggle = page.getByTestId('text-toggle');
      while (!(await toggle.isVisible())) await answerAnything(page);
      await audit(page, 'lesson: writing exercise, text folded');
      await toggle.getByText('Show the text').click();
      await audit(page, 'lesson: writing exercise, text open');
    });

    test('the end of a lesson has no axe violations', async ({ page }) => {
      await stubAudio(page);
      await page.goto('./');
      await chooseLanguages(page, 'English');
      await page.goto('./#/lesson/a2-first-day-at-work');
      await finishLesson(page);
      await expect(page.getByTestId('skill-change').first()).toBeVisible();
      await audit(page, 'lesson: end screen');
    });

    test('Today with the daily goal met has no axe violations', async ({ page }) => {
      await stubAudio(page);
      await page.goto('./');
      await chooseLanguages(page, 'English');
      await page.goto('./#/lesson/a2-first-day-at-work');
      await finishLesson(page);
      await page.goto('./');
      // The next lesson is now the filled block at the top of the page.
      await expect(page.getByRole('link', { name: /Start lesson$/ })).toBeVisible();
      await audit(page, 'home: daily goal met');
    });

    test('the daily session has no axe violations', async ({ page }) => {
      await stubAudio(page);
      await page.goto('./');
      await chooseLanguages(page, 'English');
      await page.goto('./#/daily');
      await expect(page.getByRole('main')).toBeVisible();
      await audit(page, 'daily session');
    });
  });
}

test('moving between pages names the tab and moves focus to the new heading', async ({ page }) => {
  await page.goto('./');
  await chooseLanguages(page, 'English');
  await expect(page).toHaveTitle('Tjuvstart');

  await page.getByRole('navigation').getByRole('link', { name: 'Words' }).press('Enter');
  const heading = page.getByRole('heading', { level: 1, name: 'Word cards' });
  await expect(heading).toBeFocused();
  await expect(page).toHaveTitle('Word cards – Tjuvstart');
});

test('a lesson can be done by keyboard, with focus on each new question', async ({ page }) => {
  await stubAudio(page);
  await page.goto('./');
  await chooseLanguages(page, 'English');
  await page.goto('./#/lesson/a2-first-day-at-work');

  for (let n = 0; n < 3; n++) {
    const options = page.getByRole('group', { name: 'Answer options' });
    await options.getByRole('button').first().focus();
    await page.keyboard.press('Enter');

    // The feedback is read out with the Continue button, which takes focus.
    const next = page.getByRole('button', { name: 'Continue' });
    await expect(next).toBeFocused();
    await expect(next).toHaveAccessibleDescription(/Correct|Not quite/);
    await page.keyboard.press('Enter');

    // Focus lands on the next question instead of falling back to the top of the page.
    await expect(page.locator('h2.prompt')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(options.getByRole('button').first()).toBeFocused();
  }
});
