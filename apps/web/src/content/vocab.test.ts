import { describe, expect, it } from 'vitest';
import { JOB_FIELDS, cardLabel, cardsInText, decks, getCard, jobDeck } from './vocab';

describe('word cards', () => {
  it('loads decks with unique card ids', () => {
    const ids = decks.flatMap((deck) => deck.cards.map((card) => card.id));
    expect(ids.length).toBeGreaterThan(100);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shows nouns with their article and verbs with «å»', () => {
    expect(cardLabel(getCard('jobb')!)).toBe('en jobb');
    expect(cardLabel(getCard('jobbe')!)).toBe('å jobbe');
    expect(cardLabel(getCard('og')!)).toBe('og');
  });

  it('finds the cards for the words in a text, including inflected forms', () => {
    expect(cardsInText('Sjefen har et nytt prosjekt.')).toEqual([
      'sjef',
      'ha',
      'et',
      'ny',
      'prosjekt',
    ]);
  });

  it('has one A2 deck for each line of work', () => {
    for (const field of JOB_FIELDS) {
      const deck = jobDeck(field);
      expect(deck?.level).toBe('A2');
      expect(deck?.cards.length).toBeGreaterThanOrEqual(10);
    }
    expect(decks.filter((deck) => deck.field).length).toBe(JOB_FIELDS.length);
  });
});
