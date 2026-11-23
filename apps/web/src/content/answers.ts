import type { Item } from './types';

/** Lower-case, trim, collapse spaces and drop sentence punctuation, so "Bor." matches "bor". */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase('nb')
    .replace(/[.,!?;:«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type Response = { kind: 'choice'; index: number } | { kind: 'text'; value: string };

export function isCorrect(item: Item, response: Response): boolean {
  switch (item.type) {
    case 'multiple-choice':
      return response.kind === 'choice' && response.index === item.answer;
    case 'gap-fill':
      return (
        response.kind === 'text' &&
        item.answers.some((answer) => normalize(answer) === normalize(response.value))
      );
    case 'word-order':
      return response.kind === 'text' && normalize(response.value) === normalize(item.answer);
  }
}

/** The answer to show after a wrong attempt. */
export function correctAnswer(item: Item): string {
  switch (item.type) {
    case 'multiple-choice':
      return item.options[item.answer] ?? '';
    case 'gap-fill':
      return item.answers[0] ?? '';
    case 'word-order':
      return item.answer;
  }
}
