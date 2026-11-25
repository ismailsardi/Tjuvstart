import type { ReactNode } from 'react';
import { useI18n } from '../i18n/useI18n';
import { homeHref, lessonsHref, meHref, wordsHref, type Route } from '../routing/useHashRoute';

type Tab = 'home' | 'lessons' | 'words' | 'me';

const ICONS: Record<Tab, ReactNode> = {
  home: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  lessons: (
    <path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12H8.5A3.5 3.5 0 0 1 5 16.5zM5 16.5A3.5 3.5 0 0 1 8.5 13H19" />
  ),
  words: (
    <>
      <rect x="7" y="3.5" width="12" height="15" rx="2" />
      <path d="M4.5 7v11.5a2 2 0 0 0 2 2H15" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </>
  ),
};

/** Bottom tab bar on phones, top bar on wider screens. */
export function NavBar({ route }: { route: Route }) {
  const { t } = useI18n();
  const tabs: { id: Tab; href: string; label: string; active: boolean }[] = [
    { id: 'home', href: homeHref, label: t('navToday'), active: route.name === 'home' },
    { id: 'lessons', href: lessonsHref, label: t('navLessons'), active: route.name === 'lessons' },
    { id: 'words', href: wordsHref, label: t('navWords'), active: route.name === 'words' },
    {
      id: 'me',
      href: meHref,
      label: t('navMe'),
      active: route.name === 'me' || route.name === 'troll',
    },
  ];
  return (
    <nav className="tabbar" aria-label="Tjuvstart">
      <a className="wordmark" href={homeHref}>
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
        Tjuvstart
      </a>
      <ul>
        {tabs.map((tab) => (
          <li key={tab.id}>
            <a href={tab.href} aria-current={tab.active ? 'page' : undefined}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {ICONS[tab.id]}
              </svg>
              <span>{tab.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
