import type { TjuvstartDb, SyncState } from '../data/db';
import type { SyncedTable } from '../data/db';

/** Session returned by sign-in and refresh (services/SyncApi). */
export interface Session {
  accountId: string;
  isNewAccount: boolean;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface SyncChange {
  collection: SyncedTable;
  key: string;
  updatedAt: number;
  data?: Record<string, unknown>;
  deleted?: boolean;
}

export interface SyncedRecord extends SyncChange {
  sequence: number;
}

export interface PushResponse {
  accepted: number;
  ignored: number;
  cursor: number;
}

export interface PullResponse {
  changes: SyncedRecord[];
  cursor: number;
  hasMore: boolean;
}

/** The session ended (signed out elsewhere, refresh token reused or expired). Sign in again. */
export class SignedOutError extends Error {
  constructor() {
    super('The sync session has ended.');
    this.name = 'SignedOutError';
  }
}

const REFRESH_MARGIN_MS = 60_000;

/**
 * Talks to the sync API with the stored session, refreshing the access token when needed.
 * Refresh tokens rotate and a reused one ends the session, so refreshes are serialized across
 * tabs with a Web Lock.
 */
export class SyncApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly db: TjuvstartDb,
    private readonly fetchFn: typeof fetch = (...args) => fetch(...args),
  ) {}

  async signIn(provider: 'google' | 'apple', idToken: string): Promise<Session> {
    const session = await this.post<Session>('/v1/auth/sign-in', { provider, idToken });
    await this.saveSession(session);
    return session;
  }

  async signOut(): Promise<void> {
    const state = await this.db.syncState.get('sync');
    if (state?.session) {
      await this.post('/v1/auth/sign-out', { refreshToken: state.session.refreshToken }).catch(
        () => undefined,
      );
    }
    await this.db.syncState.update('sync', { session: undefined });
  }

  /** Downloads everything the server stores for the account (GDPR export). */
  async exportAccount(): Promise<Blob> {
    const response = await this.authorizedResponse('GET', '/v1/account/export');
    if (!response.ok) throw new Error(`Sync API answered ${response.status}`);
    return response.blob();
  }

  /**
   * Permanently deletes the account and everything stored on the server. Progress on this
   * device stays, and the app carries on in guest mode.
   */
  async deleteAccount(): Promise<void> {
    const response = await this.authorizedResponse('DELETE', '/v1/account');
    if (!response.ok && response.status !== 404)
      throw new Error(`Sync API answered ${response.status}`);
    await this.db.syncState.put({ id: 'sync', cursor: 0, pushFrom: 0 });
  }

  push(changes: SyncChange[]): Promise<PushResponse> {
    return this.authorized<PushResponse>('POST', '/v1/sync/push', { changes });
  }

  pull(after: number): Promise<PullResponse> {
    return this.authorized<PullResponse>('GET', `/v1/sync/pull?after=${after}`);
  }

  private async authorized<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.read<T>(await this.authorizedResponse(method, path, body));
  }

  private async authorizedResponse(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    let token = await this.accessToken();
    let response = await this.send(method, path, body, token);
    if (response.status === 401) {
      token = await this.accessToken(true);
      response = await this.send(method, path, body, token);
    }
    if (response.status === 401) throw new SignedOutError();
    return response;
  }

  private async accessToken(force = false): Promise<string> {
    const state = await this.db.syncState.get('sync');
    if (!state?.session) throw new SignedOutError();
    if (!force && !expiresSoon(state.session)) return state.session.accessToken;

    return withLock('tjuvstart-sync-auth', async () => {
      // Another tab may have refreshed while this one waited for the lock.
      const current = (await this.db.syncState.get('sync'))?.session;
      if (!current) throw new SignedOutError();
      if (current.refreshToken !== state.session?.refreshToken) return current.accessToken;

      const response = await this.send('POST', '/v1/auth/refresh', {
        refreshToken: current.refreshToken,
      });
      if (response.status === 401) {
        await this.db.syncState.update('sync', { session: undefined });
        throw new SignedOutError();
      }
      const session = await this.read<Session>(response);
      await this.saveSession(session);
      return session.accessToken;
    });
  }

  private async saveSession(session: Session) {
    const stored: SyncState['session'] = {
      accountId: session.accountId,
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      refreshToken: session.refreshToken,
    };
    const state = await this.db.syncState.get('sync');
    if (state && state.session?.accountId !== session.accountId) {
      // A different account: start its history from the beginning.
      await this.db.syncState.put({ id: 'sync', cursor: 0, pushFrom: 0, session: stored });
    } else {
      await this.db.syncState.put({
        id: 'sync',
        cursor: 0,
        pushFrom: 0,
        ...state,
        session: stored,
      });
    }
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.read<T>(await this.send('POST', path, body));
  }

  private send(method: string, path: string, body?: unknown, token?: string): Promise<Response> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async read<T>(response: Response): Promise<T> {
    if (!response.ok) throw new Error(`Sync API answered ${response.status}`);
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }
}

function expiresSoon(session: NonNullable<SyncState['session']>): boolean {
  return Date.parse(session.accessTokenExpiresAt) - Date.now() < REFRESH_MARGIN_MS;
}

function withLock<T>(name: string, work: () => Promise<T>): Promise<T> {
  // Web Locks are in every current browser; without them (tests, very old browsers) the
  // refresh simply runs unguarded.
  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(name, work)
    : work();
}
