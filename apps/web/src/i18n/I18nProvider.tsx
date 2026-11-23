import type { ReactNode } from 'react';
import type { UiLanguage } from './strings';
import { I18nContext } from './useI18n';

export function I18nProvider({
  language,
  children,
}: {
  language: UiLanguage;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={language}>{children}</I18nContext.Provider>;
}
