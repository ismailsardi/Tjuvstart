import { describe, expect, it } from 'vitest';
import {
  JOB_FIELDS,
  cardLabel,
  cardsInText,
  decks,
  deckId,
  getCard,
  getDeck,
  jobDeck,
  recommendedDeck,
} from './vocab';

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

describe('recommendedDeck', () => {
  const ids = (id: string) => getDeck(id)!.cards.map((card) => card.id);

  it('starts beginners on their first words and A2 learners on the words for work', () => {
    expect(deckId(recommendedDeck('A1', new Set())!)).toBe('a1-first-words');
    expect(deckId(recommendedDeck('A2', new Set())!)).toBe('a2-work');
  });

  it('keeps a started deck first, and moves on once a deck is finished', () => {
    const started = new Set(ids('a2-health').slice(0, 3));
    expect(deckId(recommendedDeck('A2', started)!)).toBe('a2-health');
    const work = recommendedDeck('A2', new Set(ids('a2-work')))!;
    expect(deckId(work)).not.toBe('a2-work');
    expect(work.level).toBe('A2');
  });

  it('never suggests a job deck', () => {
    const everyGeneralA2 = new Set(
      decks.filter((d) => d.level === 'A2' && !d.field).flatMap((d) => d.cards.map((c) => c.id)),
    );
    expect(recommendedDeck('A2', everyGeneralA2)?.level).toBe('B1');
  });
});
