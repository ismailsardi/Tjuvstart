import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from './I18nProvider';

afterEach(cleanup);

describe('I18nProvider', () => {
  it('declares the interface language on the page, for screen readers', () => {
    const { rerender } = render(<I18nProvider language="fr">menu</I18nProvider>);
    expect(document.documentElement.lang).toBe('fr');
    rerender(<I18nProvider language="en">menu</I18nProvider>);
    expect(document.documentElement.lang).toBe('en');
  });
});
