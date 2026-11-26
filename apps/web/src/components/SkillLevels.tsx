import type { CSSProperties } from 'react';
import { levelProgress, MIN_ANSWERS_FOR_ESTIMATE } from '@tjuvstart/engine';
import { SKILL_NAMES, SKILLS } from '../content/types';
import type { Profile } from '../data/db';
import { useI18n } from '../i18n/useI18n';

/**
 * One row per skill, always in the same shape: a headline, a meter and a note. With an
 * estimate the headline is the level and the meter shows the way to the next one; without, the
 * headline says how many answers are still needed and the meter counts them.
 */
export function SkillLevels({ profile }: { profile: Profile | undefined }) {
  const { t } = useI18n();
  const rows = SKILLS.map((skill) => {
    const answers = profile?.answers[skill] ?? 0;
    const rating = profile?.ratings[skill];
    const assessed = rating !== undefined && answers >= MIN_ANSWERS_FOR_ESTIMATE;
    return { skill, answers, progress: assessed ? levelProgress(rating) : undefined };
  });
  const pending = rows.some((row) => !row.progress);
  return (
    <>
      <ul className="skills">
        {rows.map(({ skill, answers, progress }) => {
          const missing = MIN_ANSWERS_FOR_ESTIMATE - Math.min(answers, MIN_ANSWERS_FOR_ESTIMATE);
          return (
            <li
              key={skill}
              className={progress ? undefined : 'pending'}
              data-testid={`skill-${skill}`}
            >
              <span lang="nb">{SKILL_NAMES[skill]}</span>
              <span className="skill-level">
                <span className="level">
                  {progress
                    ? progress.level
                    : missing === 1
                      ? t('needsAnswer')
                      : t('needsAnswers', { n: missing })}
                </span>
                <span
                  className="level-meter"
                  style={
                    {
                      '--to': progress
                        ? progress.fraction
                        : (MIN_ANSWERS_FOR_ESTIMATE - missing) / MIN_ANSWERS_FOR_ESTIMATE,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                >
                  <span className="level-meter-fill static" />
                </span>
                {progress && (
                  <span className="muted small">
                    {progress.next ? t('levelToward', { level: progress.next }) : t('levelTop')}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="muted small">
        {pending
          ? t('skillPendingHint', { min: MIN_ANSWERS_FOR_ESTIMATE })
          : t('skillEstimateHint')}
      </p>
    </>
  );
}
