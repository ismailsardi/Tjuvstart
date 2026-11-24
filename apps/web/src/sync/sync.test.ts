import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { TjuvstartDb } from '../data/db';
import {
  addCards,
  completeLesson,
  getProfile,
  recordShadowing,
  reviewCard,
} from '../data/progress';
import { saveAiSettings } from '../ai/settings';
import { SignedOutError, SyncApiClient } from './api';
import { fakeSyncServer } from './fakeSyncServer';
import { syncOnce } from './sync';

const API = 'https://sync.example';
let dbs: TjuvstartDb[] = [];

function device(server: ReturnType<typeof fakeSyncServer>) {
  const db = new TjuvstartDb(`device-${dbs.length}-${Math.random()}`);
  dbs.push(db);
  return { db, api: new SyncApiClient(API, db, server.fetch) };
}

afterEach(async () => {
  await Promise.all(dbs.map((db) => db.delete()));
  dbs = [];
});

describe('change tracking', () => {
  it('stamps local writes with an increasing time and gives log rows a sync key', async () => {
    const { db } = device(fakeSyncServer());
    await addCards(['jobb'], 1000, db);
    await reviewCard('jobb', 'good', 2000, db);

    const card = await db.cards.get('jobb');
    const entry = (await db.reviews.toArray())[0]!;
    expect(card?.updatedAt).toBeGreaterThan(0);
    expect(entry.syncKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(entry.updatedAt).toBeGreaterThan(0);
  });

  it('stamps rows that existed before sync when the database is upgraded', async () => {
    const name = `upgrade-${Math.random()}`;
    const old = new Dexie(name);
    old.version(4).stores({
      profiles: 'id',
      attempts: '++id, lessonId, itemId, skill, at',
      cards: 'cardId, due',
      reviews: '++id, cardId, at',
      completions: 'lessonId',
      shadowing: '++id, lessonId, at',
      aiSettings: 'id',
    });
    await old.table('reviews').add({ cardId: 'jobb', grade: 'good', at: 1 });
    old.close();

    const db = new TjuvstartDb(name);
    dbs.push(db);
    const entry = (await db.reviews.toArray())[0]!;
    expect(entry.syncKey).toBeDefined();
    expect(entry.updatedAt).toBeGreaterThan(0);
  });
});

describe('syncOnce', () => {
  it('uploads local progress on the first sign-in', async () => {
    const server = fakeSyncServer();
    const { db, api } = device(server);
    await addCards(['jobb', 'hus'], 1000, db);
    await reviewCard('jobb', 'good', 2000, db);
    await completeLesson('first-day', 8, 10, [], 3000, db);

    await api.signIn('google', 'id-token');
    const result = await syncOnce(db, api);

    expect(result.pushed).toBe(4);
    expect([...server.records.keys()].sort()).toEqual(
      expect.arrayContaining(['cards/jobb', 'cards/hus', 'completions/first-day']),
    );
    const review = [...server.records.values()].find((r) => r.collection === 'reviews');
    expect(review?.data).toEqual({ cardId: 'jobb', grade: 'good', at: 2000 });
  });

  it('brings progress from one device to another without duplicates', async () => {
    const server = fakeSyncServer();
    const phone = device(server);
    const laptop = device(server);
    await addCards(['jobb'], 1000, phone.db);
    await reviewCard('jobb', 'easy', 2000, phone.db);
    await recordShadowing('first-day', 'Hei!', 'close', 3000, phone.db);
    await phone.api.signIn('google', 'id-token');
    await laptop.api.signIn('google', 'id-token');

    await syncOnce(phone.db, phone.api);
    await syncOnce(laptop.db, laptop.api);
    await syncOnce(laptop.db, laptop.api);
    await syncOnce(phone.db, phone.api);

    expect(await laptop.db.cards.get('jobb')).toMatchObject({ reps: 1 });
    expect(await laptop.db.reviews.count()).toBe(1);
    expect(await laptop.db.shadowing.count()).toBe(1);
    expect(await phone.db.reviews.count()).toBe(1);
    expect(server.records.size).toBe(3);
  });

  it('keeps the newer version when both devices changed the same record', async () => {
    const server = fakeSyncServer();
    const phone = device(server);
    const laptop = device(server);
    await phone.api.signIn('google', 'id-token');
    await laptop.api.signIn('google', 'id-token');
    await completeLesson('first-day', 5, 10, [], 1000, laptop.db);
    await completeLesson('first-day', 9, 10, [], 2000, phone.db);

    await syncOnce(laptop.db, laptop.api);
    await syncOnce(phone.db, phone.api);
    await syncOnce(laptop.db, laptop.api);

    expect((await laptop.db.completions.get('first-day'))?.bestScore).toBe(9);
    expect((await phone.db.completions.get('first-day'))?.bestScore).toBe(9);
  });

  it('pages through a long history', async () => {
    const server = fakeSyncServer();
    server.pageSize = 2;
    const phone = device(server);
    const laptop = device(server);
    await addCards(['a', 'b', 'c', 'd', 'e'], 1000, phone.db);
    await phone.api.signIn('google', 'id-token');
    await laptop.api.signIn('google', 'id-token');
    await syncOnce(phone.db, phone.api);

    const result = await syncOnce(laptop.db, laptop.api);

    expect(result.pulled).toBe(5);
    expect(await laptop.db.cards.count()).toBe(5);
  });

  it('never uploads the AI key or settings', async () => {
    const server = fakeSyncServer();
    const { db, api } = device(server);
    await saveAiSettings('sk-ant-secret', 'claude', db);
    await getProfile(db);

    await api.signIn('google', 'id-token');
    await syncOnce(db, api);

    expect(JSON.stringify([...server.records.values()])).not.toContain('sk-ant-secret');
  });
});

describe('SyncApiClient', () => {
  it('refreshes an expired access token once and retries', async () => {
    const server = fakeSyncServer();
    const { db, api } = device(server);
    await api.signIn('google', 'id-token');
    server.expireAccessTokens();

    await syncOnce(db, api);

    expect(server.calls).toContain('POST /v1/auth/refresh');
    expect((await db.syncState.get('sync'))?.session?.refreshToken).toBe('refresh-2');
  });

  it('forgets the session when the server has ended it', async () => {
    const server = fakeSyncServer();
    const { db, api } = device(server);
    await api.signIn('google', 'id-token');
    server.revokeSessions();

    await expect(syncOnce(db, api)).rejects.toBeInstanceOf(SignedOutError);
    expect((await db.syncState.get('sync'))?.session).toBeUndefined();
  });

  it('keeps local progress after signing out', async () => {
    const server = fakeSyncServer();
    const { db, api } = device(server);
    await addCards(['jobb'], 1000, db);
    await api.signIn('google', 'id-token');
    await syncOnce(db, api);

    await api.signOut();

    expect(await db.cards.count()).toBe(1);
    await expect(syncOnce(db, api)).rejects.toBeInstanceOf(SignedOutError);
  });
});
