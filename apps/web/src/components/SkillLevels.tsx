import type { CSSProperties } from 'react';
import { levelProgress, MIN_ANSWERS_FOR_ESTIMATE } from '@tjuvstart/engine';
import { SKILL_NAMES, SKILLS } from '../content/types';
import type { Profile } from '../data/db';
import { useI18n } from '../i18n/useI18n';

/**
 * The level estimate per skill with how far it is toward the next level, or a meter of the
 * answers still needed for an estimate.
 */
export function SkillLevels({ profile }: { profile: Profile | undefined }) {
  const { t } = useI18n();
  const rows = SKILLS.map((skill) => {
    const answers = profile?.answers[skill] ?? 0;
    const rating = profile?.ratings[skill];
    const assessed = rating !== undefined && answers >= MIN_ANSWERS_FOR_ESTIMATE;
    return { skill, answers, progress: assessed ? levelProgress(rating) : undefined };
  });
  return (
    <>
      <ul className="skills">
        {rows.map(({ skill, answers, progress }) => (
          <li key={skill} data-testid={`skill-${skill}`}>
            <span lang="nb">{SKILL_NAMES[skill]}</span>
            {progress ? (
              <span className="skill-level">
                <span className="level">{t('estimated', { level: progress.level })}</span>
                <span
                  className="level-meter"
                  style={{ '--to': progress.fraction } as CSSProperties}
                  aria-hidden="true"
                >
                  <span className="level-meter-fill static" />
                </span>
                <span className="muted small">
                  {progress.next ? t('levelToward', { level: progress.next }) : t('levelTop')}
                </span>
              </span>
            ) : (
              <span className="skill-pending">
                <progress
                  value={Math.min(answers, MIN_ANSWERS_FOR_ESTIMATE)}
                  max={MIN_ANSWERS_FOR_ESTIMATE}
                  aria-hidden="true"
                />
                <span className="muted small">
                  {t('notAssessed', { answers, min: MIN_ANSWERS_FOR_ESTIMATE })}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
      {rows.some((row) => !row.progress) && (
        <p className="muted small">{t('skillPendingHint', { min: MIN_ANSWERS_FOR_ESTIMATE })}</p>
      )}
    </>
  );
}
