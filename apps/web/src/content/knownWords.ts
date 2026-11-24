import { allItems } from './lessons';
import { decks } from './vocab';

let cache: Set<string> | undefined;

/**
 * Every Norwegian word form the app knows: word-card forms and the words of lesson answers,
 * prompts and listening texts. A typed answer that is one of these is a different word, not
 * a typo.
 */
export function knownWords(): ReadonlySet<string> {
  if (cache) return cache;
  const texts = [
    ...decks.flatMap((deck) => deck.cards.flatMap((card) => [...card.forms, card.example])),
    ...allItems.flatMap((item) => [
      item.prompt,
      item.audio ?? '',
      ...(item.type === 'gap-fill' ? item.answers : []),
      ...(item.type === 'multiple-choice' ? item.options : []),
      ...(item.type === 'word-order' ? item.tokens : []),
    ]),
  ];
  cache = new Set(texts.flatMap((text) => text.toLocaleLowerCase('nb').match(/[\p{L}-]+/gu) ?? []));
  return cache;
}
