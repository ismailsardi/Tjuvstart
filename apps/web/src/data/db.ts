import Dexie, { type EntityTable } from 'dexie';
import type { CardState, Grade, ListeningSpeed } from '@tjuvstart/engine';
import type { Skill } from '../content/types';

export interface Profile {
  id: string;
  /** Elo-style rating per skill (see packages/engine). */
  ratings: Record<Skill, number>;
  /** Number of answered items per skill. */
  answers: Record<Skill, number>;
  /** ISO 639-1 code, or 'other' when Tjuvstart has no pack for it yet. Unset until onboarding. */
  nativeLanguage?: string;
  /** Other languages the learner knows well, used for extra cognate hints. */
  knownLanguages?: string[];
  /** When the placement check was last completed. */
  placedAt?: number;
  /** Playback speed for listening exercises; it rises as the learner follows faster speech. */
  listening?: ListeningSpeed;
  createdAt: number;
}

export interface Attempt {
  id?: number;
  lessonId: string;
  itemId: string;
  skill: Skill;
  correct: boolean;
  ratingAfter: number;
  at: number;
}

/** Spaced repetition state for a card the learner has started studying. */
export interface CardProgress extends CardState {
  cardId: string;
  addedAt: number;
}

/** Every card review is kept, so a better scheduler can be fitted to real data later (ADR 0005). */
export interface Review {
  id?: number;
  cardId: string;
  grade: Grade;
  at: number;
}

export interface Completion {
  lessonId: string;
  bestScore: number;
  total: number;
  firstCompletedAt: number;
  lastCompletedAt: number;
}

/** One sentence said aloud in a shadowing session, with the learner's own verdict. */
export interface ShadowingAttempt {
  id?: number;
  lessonId: string;
  text: string;
  verdict: 'close' | 'again';
  at: number;
}

export const GUEST_ID = 'guest';

export class TjuvstartDb extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;
  cards!: EntityTable<CardProgress, 'cardId'>;
  reviews!: EntityTable<Review, 'id'>;
  completions!: EntityTable<Completion, 'lessonId'>;
  shadowing!: EntityTable<ShadowingAttempt, 'id'>;

  constructor(name = 'tjuvstart') {
    super(name);
    this.version(1).stores({
      profiles: 'id',
      attempts: '++id, lessonId, itemId, skill, at',
    });
    this.version(2).stores({
      cards: 'cardId, due',
      reviews: '++id, cardId, at',
      completions: 'lessonId',
    });
    this.version(3).stores({
      shadowing: '++id, lessonId, at',
    });
  }
}

export const db = new TjuvstartDb();
