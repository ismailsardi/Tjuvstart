import { expect, test, type Route } from '@playwright/test';
import { chooseLanguages } from './helpers';

// A placeholder key: requests are answered below and never leave the browser.
const FAKE_KEY = 'sk-ant-api03-e2e-placeholder-key-000000';

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

function reply(route: Route, output: unknown) {
  return route.fulfill({
    status: 200,
    headers: cors,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'msg_e2e',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-5-5',
      content: [{ type: 'text', text: JSON.stringify(output) }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      stop_details: null,
      usage: { input_tokens: 10, output_tokens: 10 },
    }),
  });
}

test('with their own key a learner can role-play and get writing feedback', async ({ page }) => {
  const requests: { headers: Record<string, string>; body: { model: string } }[] = [];
  await page.route('https://api.anthropic.com/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    requests.push({ headers: request.headers(), body: request.postDataJSON() });
    const system = JSON.stringify(request.postDataJSON().system);
    if (system.includes('Norskprøven')) {
      return reply(route, {
        level: 'A2',
        scores: { task: 4, coherence: 3, vocabulary: 3, grammar: 2 },
        summary: 'Good start. Work on word order after time expressions.',
        corrections: [
          {
            original: 'I dag jeg er syk',
            corrected: 'I dag er jeg syk',
            explanation: 'Verb second.',
          },
        ],
        improved: 'Hei Lise, i dag er jeg dessverre syk.',
      });
    }
    return reply(route, {
      reply: 'Så bra! Hvor kommer du fra?',
      correction: '',
      explanation: '',
    });
  });

  await page.goto('./');
  await chooseLanguages(page, 'English');

  await page.getByRole('navigation').getByRole('link', { name: 'Me' }).click();
  await page.getByRole('textbox', { name: 'API key' }).fill(FAKE_KEY);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('ai-key-saved')).toContainText('claude-opus-5-5');

  await page.getByRole('link', { name: 'AI practice' }).click();
  await page.getByRole('link', { name: 'Første dag på jobben' }).click();
  await page.getByLabel('Your message').fill('Ja, jeg er ny her.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Så bra! Hvor kommer du fra?')).toBeVisible();

  // The key goes to Anthropic only (the route above matches api.anthropic.com).
  expect(requests[0]!.headers['authorization']).toBe(`Bearer ${FAKE_KEY}`);
  expect(requests[0]!.body.model).toBe('claude-opus-5-5');

  await page.goto('./#/ai/writing/sick-email');
  await page
    .getByLabel('Your text')
    .fill('Hei Lise. I dag jeg er syk. Jeg kommer tilbake i morgen.');
  await page.getByRole('button', { name: 'Get feedback' }).click();
  const report = page.getByTestId('writing-feedback');
  await expect(report).toContainText('Your text shows level A2');
  await expect(report).toContainText('I dag er jeg syk');
});
