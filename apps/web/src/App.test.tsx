import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('shows the four skills', () => {
    render(<App />);
    for (const skill of ['Lesing', 'Lytting', 'Skriving', 'Muntlig']) {
      expect(screen.getByText(skill)).toBeTruthy();
    }
  });
});
