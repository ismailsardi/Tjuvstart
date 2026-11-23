import { lazy, Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLesson } from './content/lessons';
import { learnerPacks } from './content/packs';
import { Home } from './components/Home';
import { LessonPlayer } from './components/LessonPlayer';
import { Onboarding } from './components/Onboarding';
import { DailySession } from './components/DailySession';
import { DeckSession } from './components/DeckSession';
import { LessonList } from './components/LessonList';
import { Me } from './components/Me';
import { NavBar } from './components/NavBar';
import { Placement } from './components/Placement';
import { Practice } from './components/Practice';
import { Shadowing } from './components/Shadowing';
import { Words } from './components/Words';
import { UpdatePrompt } from './components/UpdatePrompt';
import { getProfile } from './data/progress';
import { I18nProvider } from './i18n/I18nProvider';
import { useI18n } from './i18n/useI18n';
import { uiLanguageFor } from './i18n/strings';
import { homeHref, useHashRoute } from './routing/useHashRoute';

// The optional AI features load on first use, so learners who never add a key never download
// the SDK or the schema library.
const AiHub = lazy(() => import('./components/AiHub').then((m) => ({ default: m.AiHub })));
const AiReading = lazy(() =>
  import('./components/AiReading').then((m) => ({ default: m.AiReading })),
);
const RolePlay = lazy(() => import('./components/RolePlay').then((m) => ({ default: m.RolePlay })));
const WritingTaskView = lazy(() =>
  import('./components/WritingTaskView').then((m) => ({ default: m.WritingTaskView })),
);

export function App() {
  const route = useHashRoute();
  const profile = useLiveQuery(() => getProfile());

  // Render nothing for the few milliseconds it takes to read the profile from IndexedDB,
  // so returning learners never see the onboarding screen flash.
  if (!profile) return null;

  const language = uiLanguageFor(profile.nativeLanguage);
  const packs = learnerPacks(profile.nativeLanguage, profile.knownLanguages);
  const needsOnboarding = !profile.nativeLanguage || route.name === 'languages';

  return (
    <I18nProvider language={language}>
      <UpdatePrompt />
      {!needsOnboarding &&
        !['lesson', 'shadow', 'deck', 'placement', 'practice', 'listening'].includes(
          route.name,
        ) && <NavBar route={route} />}
      <main className="shell" lang={language}>
        {needsOnboarding ? (
          <Onboarding
            key={route.name}
            nativeLanguage={profile.nativeLanguage}
            knownLanguages={profile.knownLanguages}
            onDone={() => {
              window.location.hash = homeHref;
            }}
          />
        ) : (
          <Page route={route} packs={packs} />
        )}
      </main>
    </I18nProvider>
  );
}

function Page({
  route,
  packs,
}: {
  route: ReturnType<typeof useHashRoute>;
  packs: ReturnType<typeof learnerPacks>;
}) {
  const { t } = useI18n();
  if (route.name === 'lessons') return <LessonList packs={packs} />;
  if (route.name === 'words') return <Words />;
  if (route.name === 'deck')
    return <DeckSession key={route.deckId} deckId={route.deckId} packs={packs} />;
  if (route.name === 'me') return <Me packs={packs} />;
  if (route.name === 'placement') return <Placement />;
  if (route.name === 'practice') return <Practice packs={packs} />;
  if (route.name === 'daily') return <DailySession packs={packs} />;
  if (route.name.startsWith('ai'))
    return <Suspense fallback={null}>{aiPage(route, packs)}</Suspense>;
  if (route.name === 'listening')
    return <Practice key="listening" packs={packs} skill="listening" />;
  if (route.name !== 'lesson' && route.name !== 'shadow') return <Home packs={packs} />;

  const lesson = getLesson(route.lessonId);
  // Only lessons with a reading text can be shadowed.
  if (!lesson || (route.name === 'shadow' && !lesson.text)) {
    return (
      <p>
        {t('lessonNotFound')} <a href={homeHref}>{t('backHome')}</a>
      </p>
    );
  }
  if (route.name === 'shadow') return <Shadowing key={lesson.id} lesson={lesson} />;
  return <LessonPlayer key={lesson.id} lesson={lesson} packs={packs} />;
}

function aiPage(route: ReturnType<typeof useHashRoute>, packs: ReturnType<typeof learnerPacks>) {
  if (route.name === 'ai-roleplay') return <RolePlay key={route.id} scenarioId={route.id} />;
  if (route.name === 'ai-writing') return <WritingTaskView key={route.id} taskId={route.id} />;
  if (route.name === 'ai-reading') return <AiReading packs={packs} />;
  return <AiHub />;
}
