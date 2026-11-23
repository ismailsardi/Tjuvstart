import Dexie, { type EntityTable } from 'dexie';
import type { Skill } from '../content/types';

export interface Profile {
  id: string;
  /** Elo-style rating per skill (see packages/engine). */
  ratings: Record<Skill, number>;
  /** Number of answered items per skill. */
  answers: Record<Skill, number>;
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

export const GUEST_ID = 'guest';

export class TjuvstartDb extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;

  constructor(name = 'tjuvstart') {
    super(name);
    this.version(1).stores({
      profiles: 'id',
      attempts: '++id, lessonId, itemId, skill, at',
    });
  }
}

export const db = new TjuvstartDb();
