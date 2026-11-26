import { lazy, Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLesson } from './content/lessons';
import { learnerPacks } from './content/packs';
import { Home } from './components/Home';
import { NavBar } from './components/NavBar';
import { RouteFocus } from './components/RouteFocus';
import { UpdatePrompt } from './components/UpdatePrompt';
import { getProfile } from './data/progress';
import { I18nProvider } from './i18n/I18nProvider';
import { useI18n } from './i18n/useI18n';
import { uiLanguageFor } from './i18n/strings';
import { homeHref, placementStartHref, useHashRoute } from './routing/useHashRoute';

// Every screen except Today loads on first visit, so the first paint only needs Today. The
// service worker precaches these chunks, so they still open offline. The AI screens are never
// precached: learners who don't add a key never download the SDK or the schema library.
const Onboarding = lazy(() =>
  import('./components/Onboarding').then((m) => ({ default: m.Onboarding })),
);
const LessonPlayer = lazy(() =>
  import('./components/LessonPlayer').then((m) => ({ default: m.LessonPlayer })),
);
const LessonList = lazy(() =>
  import('./components/LessonList').then((m) => ({ default: m.LessonList })),
);
const DailySession = lazy(() =>
  import('./components/DailySession').then((m) => ({ default: m.DailySession })),
);
const DeckSession = lazy(() =>
  import('./components/DeckSession').then((m) => ({ default: m.DeckSession })),
);
const Alphabet = lazy(() => import('./components/Alphabet').then((m) => ({ default: m.Alphabet })));
const Words = lazy(() => import('./components/Words').then((m) => ({ default: m.Words })));
const GoalPage = lazy(() =>
  import('./components/GoalPicker').then((m) => ({ default: m.GoalPage })),
);
const Wardrobe = lazy(() => import('./components/Wardrobe').then((m) => ({ default: m.Wardrobe })));
const Me = lazy(() => import('./components/Me').then((m) => ({ default: m.Me })));
const Placement = lazy(() =>
  import('./components/Placement').then((m) => ({ default: m.Placement })),
);
const Practice = lazy(() => import('./components/Practice').then((m) => ({ default: m.Practice })));
const Shadowing = lazy(() =>
  import('./components/Shadowing').then((m) => ({ default: m.Shadowing })),
);
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
        !['lesson', 'shadow', 'deck', 'placement', 'practice', 'listening', 'daily'].includes(
          route.name,
        ) && <NavBar route={route} />}
      <main className="shell" lang={language}>
        <Suspense fallback={null}>
          {needsOnboarding ? (
            <Onboarding
              key={route.name}
              nativeLanguage={profile.nativeLanguage}
              knownLanguages={profile.knownLanguages}
              onDone={(startingPoint) => {
                // Learners who know some Norwegian were promised a level check first, so
                // they go straight into its first question.
                window.location.hash = startingPoint === 'some' ? placementStartHref : homeHref;
              }}
            />
          ) : (
            <Page route={route} packs={packs} />
          )}
          <RouteFocus
            routeKey={JSON.stringify(route)}
            home={!needsOnboarding && route.name === 'home'}
          />
        </Suspense>
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
  if (route.name === 'alphabet') return <Alphabet />;
  if (route.name === 'deck')
    return <DeckSession key={route.deckId} deckId={route.deckId} packs={packs} />;
  if (route.name === 'me') return <Me packs={packs} />;
  if (route.name === 'goal') return <GoalPage />;
  if (route.name === 'troll') return <Wardrobe />;
  if (route.name === 'placement')
    return <Placement key={route.start ? 'start' : 'intro'} autoStart={route.start} />;
  if (route.name === 'practice') return <Practice packs={packs} />;
  if (route.name === 'daily') return <DailySession packs={packs} />;
  if (route.name.startsWith('ai')) return aiPage(route, packs);
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
