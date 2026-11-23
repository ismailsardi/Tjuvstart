import type { Level } from '@tjuvstart/engine';

/** Types mirror content/schema/vocab-deck.schema.json. */

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'determiner'
  | 'preposition'
  | 'conjunction'
  | 'number'
  | 'interjection'
  | 'phrase';

export interface Card {
  id: string;
  nb: string;
  pos: PartOfSpeech;
  gender?: 'en' | 'ei' | 'et';
  forms: string[];
  example: string;
}

export const JOB_FIELDS = ['it', 'health', 'construction', 'hospitality'] as const;
export type JobField = (typeof JOB_FIELDS)[number];

export interface Deck {
  level: Level;
  topic: string;
  title: string;
  /** Set on a "my job" deck: the line of work it is for. */
  field?: JobField;
  cards: Card[];
}

const modules = import.meta.glob<Deck>('../../../../content/vocab/*/*.json', {
  eager: true,
  import: 'default',
});

/** Decks ordered by level, then title. */
export const decks: readonly Deck[] = Object.values(modules).sort(
  (a, b) => a.level.localeCompare(b.level) || a.title.localeCompare(b.title, 'nb'),
);

const byId = new Map(decks.flatMap((deck) => deck.cards.map((card) => [card.id, card] as const)));
const levelById = new Map(
  decks.flatMap((deck) => deck.cards.map((card) => [card.id, deck.level] as const)),
);

export function cardLevel(id: string): Level | undefined {
  return levelById.get(id);
}

/** Route-friendly deck id, e.g. "a2-work". */
export function deckId(deck: Deck): string {
  return `${deck.level.toLowerCase()}-${deck.topic}`;
}

/** The "my job" deck for a line of work. */
export function jobDeck(field: JobField): Deck | undefined {
  return decks.find((deck) => deck.field === field);
}

export function getDeck(id: string): Deck | undefined {
  return decks.find((deck) => deckId(deck) === id);
}

export function getCard(id: string): Card | undefined {
  return byId.get(id);
}

/** How the word is shown on a card: nouns with their article, verbs with «å». */
export function cardLabel(card: Card): string {
  if (card.pos === 'noun' && card.gender) return `${card.gender} ${card.nb}`;
  if (card.pos === 'verb') return `å ${card.nb}`;
  return card.nb;
}

const byForm = new Map<string, string[]>();
for (const card of byId.values()) {
  for (const form of card.forms) byForm.set(form, [...(byForm.get(form) ?? []), card.id]);
}

/** Ids of the cards for every word in a text, in order of first appearance. */
export function cardsInText(text: string): string[] {
  const ids = (text.toLocaleLowerCase('nb').match(/[a-zæøå]+/g) ?? []).flatMap(
    (word) => byForm.get(word) ?? [],
  );
  return [...new Set(ids)];
}
