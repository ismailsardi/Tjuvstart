import {
  LOG_TABLES,
  remoteTransactions,
  STATE_TABLES,
  type LogSyncFields,
  type SyncedTable,
  type TjuvstartDb,
} from '../data/db';
import type { SyncApiClient, SyncChange, SyncedRecord } from './api';

const PUSH_BATCH = 500;

/** Primary key of each state table, used as the record key on the server. */
const STATE_KEYS = { profiles: 'id', cards: 'cardId', completions: 'lessonId' } as const;

const isLogTable = (name: SyncedTable): name is (typeof LOG_TABLES)[number] =>
  (LOG_TABLES as readonly string[]).includes(name);

export interface SyncResult {
  pushed: number;
  pulled: number;
}

/**
 * One sync round: push local changes, then pull everything newer than the stored cursor.
 * Safe to run at any time and to interrupt: pushes are idempotent and the cursor only moves
 * after the pulled changes are written.
 */
export async function syncOnce(db: TjuvstartDb, api: SyncApiClient): Promise<SyncResult> {
  const pushed = await pushChanges(db, api);
  const pulled = await pullChanges(db, api);
  await db.syncState.update('sync', { lastSyncedAt: Date.now() });
  return { pushed, pulled };
}

async function pushChanges(db: TjuvstartDb, api: SyncApiClient): Promise<number> {
  const state = await db.syncState.get('sync');
  if (!state) return 0;

  const changes: SyncChange[] = [];
  for (const name of [...STATE_TABLES, ...LOG_TABLES]) {
    // At or above, not strictly above: two tabs can stamp the same millisecond. The server
    // ignores changes it already has, so pushing a row twice costs nothing.
    const rows = await db
      .table<LogSyncFields & Record<string, unknown>>(name)
      .where('updatedAt')
      .aboveOrEqual(state.pushFrom)
      .toArray();
    for (const row of rows) changes.push(toChange(name, row));
  }
  changes.sort((a, b) => a.updatedAt - b.updatedAt);

  for (let i = 0; i < changes.length; i += PUSH_BATCH) {
    const batch = changes.slice(i, i + PUSH_BATCH);
    await api.push(batch);
    await db.syncState.update('sync', { pushFrom: batch.at(-1)!.updatedAt });
  }
  return changes.length;
}

async function pullChanges(db: TjuvstartDb, api: SyncApiClient): Promise<number> {
  let pulled = 0;
  for (;;) {
    const state = await db.syncState.get('sync');
    if (!state) return pulled;
    const page = await api.pull(state.cursor);
    await applyRemote(db, page.changes);
    await db.syncState.update('sync', { cursor: page.cursor });
    pulled += page.changes.length;
    if (!page.hasMore) return pulled;
  }
}

function toChange(name: SyncedTable, row: LogSyncFields & Record<string, unknown>): SyncChange {
  // Local auto-increment ids and the sync fields themselves stay on the device.
  const { updatedAt, syncKey, ...data } = row;
  if (isLogTable(name)) delete data.id;
  const key = isLogTable(name) ? syncKey : String(row[STATE_KEYS[name]]);
  return { collection: name, key: key!, updatedAt: updatedAt!, data };
}

/** Writes pulled records, keeping whichever version of a state record is newer. */
export async function applyRemote(db: TjuvstartDb, records: SyncedRecord[]): Promise<void> {
  if (records.length === 0) return;
  const tables = [...STATE_TABLES, ...LOG_TABLES].map((name) => db.table(name));
  await db.transaction('rw', tables, async (tx) => {
    remoteTransactions.add(tx);
    for (const record of records) {
      const table = db.table<LogSyncFields & Record<string, unknown>>(record.collection);
      if (isLogTable(record.collection)) {
        const exists = await table.where('syncKey').equals(record.key).count();
        if (!exists && record.data) {
          await table.add({ ...record.data, syncKey: record.key, updatedAt: record.updatedAt });
        }
        continue;
      }
      const local = await table.get(record.key);
      if (local?.updatedAt !== undefined && local.updatedAt >= record.updatedAt) continue;
      if (record.deleted) await table.delete(record.key);
      else await table.put({ ...record.data, updatedAt: record.updatedAt });
    }
  });
}
