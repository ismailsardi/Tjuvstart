import { MIN_ANSWERS_FOR_ESTIMATE, ratingToLevel } from '@tjuvstart/engine';
import { SKILLS, type Skill } from '../content/types';
import type { Profile } from '../data/db';
import { useI18n } from '../i18n/useI18n';

// Skill names stay in Norwegian: learners meet them again in the exam and in class.
const SKILL_NAMES: Record<Skill, string> = {
  reading: 'Lesing',
  listening: 'Lytting',
  writing: 'Skriving',
  speaking: 'Muntlig',
};

/** The level estimate per skill, or how many answers are still needed for one. */
export function SkillLevels({ profile }: { profile: Profile | undefined }) {
  const { t } = useI18n();
  return (
    <ul className="skills">
      {SKILLS.map((skill) => {
        const answers = profile?.answers[skill] ?? 0;
        const rating = profile?.ratings[skill];
        const assessed = rating !== undefined && answers >= MIN_ANSWERS_FOR_ESTIMATE;
        return (
          <li key={skill} data-testid={`skill-${skill}`}>
            <span lang="nb">{SKILL_NAMES[skill]}</span>
            <span className={assessed ? 'level' : 'muted'}>
              {assessed
                ? t('estimated', { level: ratingToLevel(rating) })
                : t('notAssessed', { answers, min: MIN_ANSWERS_FOR_ESTIMATE })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
