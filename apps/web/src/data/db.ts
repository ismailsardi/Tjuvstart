import Dexie, { type EntityTable, type Transaction } from 'dexie';
import type { CardState, Grade, ListeningSpeed } from '@tjuvstart/engine';
import type { Skill } from '../content/types';
import type { JobField } from '../content/vocab';

/**
 * Fields the sync layer maintains on every synced row (ADR 0011). Code that records progress
 * never sets them: hooks stamp them on write.
 */
export interface SyncFields {
  /** Last local change, in milliseconds since the epoch. Strictly increasing on one device. */
  updatedAt?: number;
}

/** Log rows also get a random id, so rows from several devices never collide on the server. */
export interface LogSyncFields extends SyncFields {
  syncKey?: string;
}

export interface Profile extends SyncFields {
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
  /** The learner's line of work, for the "my job" word deck. */
  jobField?: JobField;
  createdAt: number;
}

export interface Attempt extends LogSyncFields {
  id?: number;
  lessonId: string;
  itemId: string;
  skill: Skill;
  correct: boolean;
  ratingAfter: number;
  at: number;
}

/** Spaced repetition state for a card the learner has started studying. */
export interface CardProgress extends CardState, SyncFields {
  cardId: string;
  addedAt: number;
}

/** Every card review is kept, so a better scheduler can be fitted to real data later (ADR 0005). */
export interface Review extends LogSyncFields {
  id?: number;
  cardId: string;
  grade: Grade;
  at: number;
}

export interface Completion extends SyncFields {
  lessonId: string;
  bestScore: number;
  total: number;
  firstCompletedAt: number;
  lastCompletedAt: number;
}

/** One sentence said aloud in a shadowing session, with the learner's own verdict. */
export interface ShadowingAttempt extends LogSyncFields {
  id?: number;
  lessonId: string;
  text: string;
  verdict: 'close' | 'again';
  at: number;
}

/**
 * The learner's own API key for the optional AI features. It is kept in a table of its own,
 * apart from the profile, so it never travels with progress if sync is added later.
 */
export interface AiSettings {
  id: 'ai';
  apiKey: string;
  model: string;
}

/** Where sync left off, and the signed-in session. One row with id 'sync'. */
export interface SyncState {
  id: 'sync';
  /** Server sequence number of the last pulled change. */
  cursor: number;
  /** Local rows with updatedAt at or above this still need pushing. */
  pushFrom: number;
  /** When the last sync round finished, in milliseconds since the epoch. */
  lastSyncedAt?: number;
  session?: {
    accountId: string;
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
  };
}

export const GUEST_ID = 'guest';

export const STATE_TABLES = ['profiles', 'cards', 'completions'] as const;
export const LOG_TABLES = ['attempts', 'reviews', 'shadowing'] as const;
export type SyncedTable = (typeof STATE_TABLES)[number] | (typeof LOG_TABLES)[number];

/** Transactions that apply pulled changes; hooks leave their timestamps alone. */
export const remoteTransactions = new WeakSet<Transaction>();

let lastStamp = 0;
function stamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

export class TjuvstartDb extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;
  cards!: EntityTable<CardProgress, 'cardId'>;
  reviews!: EntityTable<Review, 'id'>;
  completions!: EntityTable<Completion, 'lessonId'>;
  shadowing!: EntityTable<ShadowingAttempt, 'id'>;
  aiSettings!: EntityTable<AiSettings, 'id'>;
  syncState!: EntityTable<SyncState, 'id'>;

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
    this.version(4).stores({
      aiSettings: 'id',
    });
    this.version(5)
      .stores({
        profiles: 'id, updatedAt',
        attempts: '++id, lessonId, itemId, skill, at, updatedAt, &syncKey',
        cards: 'cardId, due, updatedAt',
        reviews: '++id, cardId, at, updatedAt, &syncKey',
        completions: 'lessonId, updatedAt',
        shadowing: '++id, lessonId, at, updatedAt, &syncKey',
        syncState: 'id',
      })
      .upgrade(async (tx) => {
        // Stamp rows written before sync existed, so the first sign-in uploads them.
        for (const name of [...STATE_TABLES, ...LOG_TABLES]) {
          const isLog = (LOG_TABLES as readonly string[]).includes(name);
          await tx
            .table(name)
            .toCollection()
            .modify((row: LogSyncFields) => {
              row.updatedAt = stamp();
              if (isLog) row.syncKey = crypto.randomUUID();
            });
        }
      });
    this.trackChanges();
  }

  /** Stamps every local write to a synced table, so the next sync knows to push it. */
  private trackChanges() {
    for (const name of [...STATE_TABLES, ...LOG_TABLES]) {
      const table = this.table<LogSyncFields>(name);
      const isLog = (LOG_TABLES as readonly string[]).includes(name);
      table.hook('creating', (_key, row, tx) => {
        if (remoteTransactions.has(tx)) return;
        row.updatedAt = stamp();
        if (isLog) row.syncKey ??= crypto.randomUUID();
      });
      table.hook('updating', (_changes, _key, _row, tx) =>
        remoteTransactions.has(tx) ? undefined : { updatedAt: stamp() },
      );
    }
  }
}

export const db = new TjuvstartDb();
