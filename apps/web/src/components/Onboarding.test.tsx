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
      'fr',
      'other',
    ]);

    await user.click(screen.getByRole('radio', { name: 'Français' }));
    expect(screen.getByText('Quelle est votre langue maternelle ?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('checkbox', { name: 'English' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    const profile = await getProfile();
    expect(profile.nativeLanguage).toBe('fr');
    expect(profile.knownLanguages).toEqual(['en']);
  });
});
