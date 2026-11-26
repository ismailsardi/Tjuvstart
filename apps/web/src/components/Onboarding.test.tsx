import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getProfile } from '../data/progress';
import { Onboarding } from './Onboarding';

describe('Onboarding', () => {
  it('switches to French when French is picked and saves the languages', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} />);

    expect(screen.getByRole('button', { name: 'Continue' })).toHaveProperty('disabled', true);
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'de',
      'en',
      'es',
      'fr',
      'other',
    ]);

    await user.click(screen.getByRole('radio', { name: 'Français' }));
    expect(screen.getByText('Quelle est votre langue maternelle ?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('checkbox', { name: 'English' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    // How much Norwegian. Nothing is saved until the learner picks an answer.
    expect(screen.getByRole('button', { name: 'Continuer' })).toHaveProperty('disabled', true);
    await user.click(screen.getByRole('radio', { name: /^Je débute/ }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    // Last, a name for the troll, with Tusse filled in.
    const name = screen.getByRole('textbox', { name: 'Nom' });
    expect(name).toHaveProperty('value', 'Tusse');
    await user.clear(name);
    await user.type(name, 'Trollbert');
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith('beginner'));
    const profile = await getProfile();
    expect(profile.nativeLanguage).toBe('fr');
    expect(profile.knownLanguages).toEqual(['en']);
    expect(profile.startingPoint).toBe('beginner');
    expect(profile.trollName).toBe('Trollbert');
  });

  it('does not ask for the level or the name again when the learner edits their languages', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<Onboarding nativeLanguage="en" knownLanguages={[]} onDone={onDone} />);

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(undefined));
  });
});
