import { useEffect, type ReactNode } from 'react';
import type { UiLanguage } from './strings';
import { I18nContext } from './useI18n';

export function I18nProvider({
  language,
  children,
}: {
  language: UiLanguage;
  children: ReactNode;
}) {
  // The page's own language is the interface language, so screen readers read menus and
  // banners with the right voice. Norwegian content is marked with lang="nb" where it appears.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return <I18nContext.Provider value={language}>{children}</I18nContext.Provider>;
}
