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
  const ids = (text.toLocaleLowerCase('nb').match(/[a-zæøåé]+/g) ?? []).flatMap(
    (word) => byForm.get(word) ?? [],
  );
  return [...new Set(ids)];
}

/**
 * Where a new learner starts at each level: the first everyday words at A1, the words for the
 * job at A2 and B1, since the learners are adults moving for work.
 */
const STARTER_TOPIC: Readonly<Record<Level, string>> = {
  A1: 'first-words',
  A2: 'work',
  B1: 'work',
  B2: 'work',
};

/**
 * The one deck to suggest next, for a learner at `level` who already studies the cards in
 * `learning`. A deck already started and not finished comes first, then the starter deck for the
 * level, then the next unfinished deck at the level, then the levels above. Undefined once every
 * general deck from the level up is fully in the learner's cards.
 */
export function recommendedDeck(
  level: Level,
  learning: ReadonlySet<string>,
  all: readonly Deck[] = decks,
): Deck | undefined {
  const general = all.filter((deck) => deck.field === undefined);
  const studied = (deck: Deck) => deck.cards.filter((card) => learning.has(card.id)).length;
  const unfinished = (deck: Deck) => studied(deck) < deck.cards.length;
  const levels = general.map((deck) => deck.level).filter((l, i, list) => list.indexOf(l) === i);
  const from = levels.indexOf(level) < 0 ? 0 : levels.indexOf(level);
  for (const at of levels.slice(from)) {
    const here = general.filter((deck) => deck.level === at && unfinished(deck));
    const started = here.find((deck) => studied(deck) > 0);
    const pick = started ?? here.find((deck) => deck.topic === STARTER_TOPIC[at]) ?? here[0];
    if (pick) return pick;
  }
  return undefined;
}
