import { useLiveQuery } from 'dexie-react-hooks';
import { getLesson } from './content/lessons';
import { learnerPacks } from './content/packs';
import { Home } from './components/Home';
import { LessonPlayer } from './components/LessonPlayer';
import { Onboarding } from './components/Onboarding';
import { UpdatePrompt } from './components/UpdatePrompt';
import { getProfile } from './data/progress';
import { I18nProvider } from './i18n/I18nProvider';
import { useI18n } from './i18n/useI18n';
import { uiLanguageFor } from './i18n/strings';
import { homeHref, useHashRoute } from './routing/useHashRoute';

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
  if (route.name !== 'lesson') return <Home packs={packs} />;

  const lesson = getLesson(route.lessonId);
  if (!lesson) {
    return (
      <p>
        {t('lessonNotFound')} <a href={homeHref}>{t('backHome')}</a>
      </p>
    );
  }
  return <LessonPlayer key={lesson.id} lesson={lesson} packs={packs} />;
}
