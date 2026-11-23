import { useLiveQuery } from 'dexie-react-hooks';
import { MIN_ANSWERS_FOR_ESTIMATE, ratingToLevel } from '@tjuvstart/engine';
import { lessons } from '../content/lessons';
import { firstNote, type LanguagePack } from '../content/packs';
import { SKILLS, type Skill } from '../content/types';
import { getProfile } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { languagesHref, lessonHref } from '../routing/useHashRoute';

// Skill names stay in Norwegian: learners meet them again in the exam and in class.
const SKILL_NAMES: Record<Skill, string> = {
  reading: 'Lesing',
  listening: 'Lytting',
  writing: 'Skriving',
  speaking: 'Muntlig',
};

export function Home({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const profile = useLiveQuery(() => getProfile());
  const languageNames =
    packs.length > 0 ? packs.map((pack) => pack.nativeName).join(', ') : t('otherLanguage');

  return (
    <>
      <header>
        <h1>Tjuvstart</h1>
        <p className="muted">{t('tagline')}</p>
        <p className="muted" data-testid="languages">
          {t('languages', { languages: languageNames })} · <a href={languagesHref}>{t('change')}</a>
        </p>
      </header>

      <section aria-labelledby="level-heading">
        <h2 id="level-heading">{t('yourLevel')}</h2>
        <ul className="skills">
          {SKILLS.map((skill) => {
            const answers = profile?.answers[skill] ?? 0;
            const rating = profile?.ratings[skill];
            const assessed = rating !== undefined && answers >= MIN_ANSWERS_FOR_ESTIMATE;
            return (
              <li key={skill} data-testid={`skill-${skill}`}>
                <span lang="nb">{SKILL_NAMES[skill]}</span>
                <span className={assessed ? undefined : 'muted'}>
                  {assessed
                    ? t('estimated', { level: ratingToLevel(rating) })
                    : t('notAssessed', { answers, min: MIN_ANSWERS_FOR_ESTIMATE })}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="lessons-heading">
        <h2 id="lessons-heading">{t('lessons')}</h2>
        <ul className="lessons">
          {lessons.map((lesson) => {
            const summary = firstNote(packs, (pack) => pack.lessonSummaries?.[lesson.id]);
            return (
              <li key={lesson.id}>
                <a href={lessonHref(lesson.id)}>
                  <span className="badge">{lesson.level}</span>
                  <strong lang="nb">{lesson.title}</strong>
                  {summary ? (
                    <span
                      className="muted"
                      lang={summary.pack.language}
                      dir={summary.pack.direction}
                    >
                      {summary.text}
                    </span>
                  ) : (
                    <span className="muted">{lesson.summary}</span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
