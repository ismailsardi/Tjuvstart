import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TjuvstartDb } from '../data/db';
import { addCards } from '../data/progress';
import { SyncApiClient } from '../sync/api';
import { fakeSyncServer } from '../sync/fakeSyncServer';
import { SyncPanel } from './SyncPanel';

let db: TjuvstartDb;

function setup() {
  const server = fakeSyncServer();
  db = new TjuvstartDb(`panel-${Math.random()}`);
  const api = new SyncApiClient('https://sync.example', db, server.fetch);
  // Stands in for Google's button: "clicking" it hands back an ID token at once.
  const renderButton = vi.fn(
    async (
      parent: HTMLElement,
      _clientId: string,
      _locale: string,
      onIdToken: (t: string) => void,
    ) => {
      const button = document.createElement('button');
      button.textContent = 'Continue with Google';
      button.onclick = () => onIdToken('google-id-token');
      parent.append(button);
    },
  );
  render(<SyncPanel api={api} googleClientId="client-id" db={db} renderButton={renderButton} />);
  return { server, api, renderButton };
}

afterEach(async () => {
  cleanup();
  await db?.delete();
});

describe('SyncPanel', () => {
  it('is hidden when the build has no sync API or Google client ID', () => {
    db = new TjuvstartDb(`panel-${Math.random()}`);
    const { container } = render(<SyncPanel api={undefined} googleClientId="x" db={db} />);
    expect(container.innerHTML).toBe('');
  });

  it('signs in with Google and uploads local progress', async () => {
    const { server } = setup();
    await addCards(['jobb'], 1000, db);

    await userEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByText(/Last synced/)).toBeTruthy();
    expect(server.records.has('cards/jobb')).toBe(true);
  });

  it('signs out and keeps progress on the device', async () => {
    setup();
    await addCards(['jobb'], 1000, db);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeTruthy();
    expect(await db.cards.count()).toBe(1);
  });

  it('asks before deleting the account, then deletes it on the server', async () => {
    const { server } = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));
    await screen.findByText(/Last synced/);

    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    expect(screen.getByRole('alertdialog').textContent).toMatch(/permanently deletes/);
    await userEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    await waitFor(() => expect(server.calls).toContain('DELETE /v1/account'));
    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeTruthy();
  });

  it('downloads the export as a JSON file', async () => {
    const { server } = setup();
    const createObjectURL = vi.fn(() => 'blob:export');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));
    await screen.findByText(/Last synced/);

    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(server.calls).toContain('GET /v1/account/export');
  });
});
