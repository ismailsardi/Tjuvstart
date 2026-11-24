import type { PullResponse, PushResponse, Session, SyncChange, SyncedRecord } from './api';

/**
 * In-memory stand-in for services/SyncApi with the same merge rules, for unit tests.
 * One account; every sign-in returns a fresh session.
 */
export function fakeSyncServer() {
  const records = new Map<string, SyncedRecord>();
  let sequence = 0;
  let tokenCounter = 0;
  const validAccess = new Set<string>();
  const validRefresh = new Set<string>();
  const calls: string[] = [];

  function session(): Session {
    tokenCounter++;
    const access = `access-${tokenCounter}`;
    const refresh = `refresh-${tokenCounter}`;
    validAccess.add(access);
    validRefresh.add(refresh);
    return {
      accountId: 'account-1',
      isNewAccount: tokenCounter === 1,
      accessToken: access,
      accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      refreshToken: refresh,
      refreshTokenExpiresAt: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    };
  }

  function push(changes: SyncChange[]): PushResponse {
    let accepted = 0;
    for (const change of changes) {
      const id = `${change.collection}/${change.key}`;
      const stored = records.get(id);
      const isLog = ['attempts', 'reviews', 'shadowing'].includes(change.collection);
      if (stored && (isLog || stored.updatedAt >= change.updatedAt)) continue;
      records.set(id, { ...change, sequence: ++sequence });
      accepted++;
    }
    return { accepted, ignored: changes.length - accepted, cursor: sequence };
  }

  function pull(after: number, limit: number): PullResponse {
    const newer = [...records.values()]
      .filter((r) => r.sequence > after)
      .sort((a, b) => a.sequence - b.sequence);
    const page = newer.slice(0, limit);
    return {
      changes: structuredClone(page),
      cursor: page.at(-1)?.sequence ?? after,
      hasMore: newer.length > limit,
    };
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const fetchFn: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const auth = new Headers(init?.headers).get('Authorization')?.replace('Bearer ', '');
    calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);

    switch (url.pathname) {
      case '/v1/auth/sign-in':
        return json(session());
      case '/v1/auth/refresh':
        if (!validRefresh.delete(body.refreshToken)) return json({}, 401);
        return json(session());
      case '/v1/auth/sign-out':
        validRefresh.delete(body.refreshToken);
        return new Response(null, { status: 204 });
    }
    if (!auth || !validAccess.has(auth)) return json({}, 401);
    if (url.pathname === '/v1/sync/push') return json(push(body.changes));
    if (url.pathname === '/v1/sync/pull') {
      return json(pull(Number(url.searchParams.get('after') ?? 0), server.pageSize));
    }
    return json({}, 404);
  };

  const server = {
    fetch: fetchFn,
    records,
    calls,
    pageSize: 500,
    /** Makes every access token handed out so far invalid, as if they expired. */
    expireAccessTokens: () => validAccess.clear(),
    /** Ends every session, as if the refresh token was revoked. */
    revokeSessions: () => {
      validAccess.clear();
      validRefresh.clear();
    },
  };
  return server;
}
