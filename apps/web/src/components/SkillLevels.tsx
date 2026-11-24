import { MIN_ANSWERS_FOR_ESTIMATE, ratingToLevel } from '@tjuvstart/engine';
import { SKILL_NAMES, SKILLS } from '../content/types';
import type { Profile } from '../data/db';
import { useI18n } from '../i18n/useI18n';

/** The level estimate per skill, or a meter of the answers still needed for one. */
export function SkillLevels({ profile }: { profile: Profile | undefined }) {
  const { t } = useI18n();
  const rows = SKILLS.map((skill) => {
    const answers = profile?.answers[skill] ?? 0;
    const rating = profile?.ratings[skill];
    const assessed = rating !== undefined && answers >= MIN_ANSWERS_FOR_ESTIMATE;
    return { skill, answers, level: assessed ? ratingToLevel(rating) : undefined };
  });
  return (
    <>
      <ul className="skills">
        {rows.map(({ skill, answers, level }) => (
          <li key={skill} data-testid={`skill-${skill}`}>
            <span lang="nb">{SKILL_NAMES[skill]}</span>
            {level ? (
              <span className="level">{t('estimated', { level })}</span>
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
      {rows.some((row) => !row.level) && (
        <p className="muted small">{t('skillPendingHint', { min: MIN_ANSWERS_FOR_ESTIMATE })}</p>
      )}
    </>
  );
}
