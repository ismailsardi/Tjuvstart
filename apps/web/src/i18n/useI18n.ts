import { createContext, useContext } from 'react';
import { translate, type StringKey, type UiLanguage } from './strings';

export const I18nContext = createContext<UiLanguage>('en');

/** The current interface language and a translate function bound to it. */
export function useI18n() {
  const language = useContext(I18nContext);
  return {
    language,
    t: (key: StringKey, vars?: Record<string, string | number>) => translate(language, key, vars),
  };
}
