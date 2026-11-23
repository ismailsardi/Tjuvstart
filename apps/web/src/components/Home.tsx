import { useLiveQuery } from 'dexie-react-hooks';
import { MIN_ANSWERS_FOR_ESTIMATE, ratingToLevel } from '@tjuvstart/engine';
import { lessons } from '../content/lessons';
import { SKILLS, type Skill } from '../content/types';
import { getProfile } from '../data/progress';
import { lessonHref } from '../routing/useHashRoute';

const SKILL_NAMES: Record<Skill, string> = {
  reading: 'Lesing',
  listening: 'Lytting',
  writing: 'Skriving',
  speaking: 'Muntlig',
};

export function Home() {
  const profile = useLiveQuery(() => getProfile());

  return (
    <>
      <header>
        <h1>Tjuvstart</h1>
        <p className="muted">Norwegian from A1 to B2, adapted to your level.</p>
      </header>

      <section aria-labelledby="level-heading">
        <h2 id="level-heading">Your level</h2>
        <ul className="skills">
          {SKILLS.map((skill) => {
            const answers = profile?.answers[skill] ?? 0;
            const rating = profile?.ratings[skill];
            const assessed = rating !== undefined && answers >= MIN_ANSWERS_FOR_ESTIMATE;
            return (
              <li key={skill} data-testid={`skill-${skill}`}>
                <span>{SKILL_NAMES[skill]}</span>
                <span className={assessed ? undefined : 'muted'}>
                  {assessed
                    ? `${ratingToLevel(rating)} (estimated)`
                    : `Not assessed yet (${answers}/${MIN_ANSWERS_FOR_ESTIMATE} answers)`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="lessons-heading">
        <h2 id="lessons-heading">Lessons</h2>
        <ul className="lessons">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <a href={lessonHref(lesson.id)}>
                <span className="badge">{lesson.level}</span>
                <strong>{lesson.title}</strong>
                <span className="muted">{lesson.summary}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
