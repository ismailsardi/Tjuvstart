import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_GOAL, GOAL_SIZES, type GoalSize } from '../data/daily';
import { getProfile, saveDailyGoal } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { homeHref } from '../routing/useHashRoute';

const HINTS = {
  light: 'goal_lightHint',
  regular: 'goal_regularHint',
  serious: 'goal_seriousHint',
} as const;

/** Lets the learner pick how much to do each day. Saves on change. Hide the legend under a heading that already says it. */
export function GoalPicker({
  value,
  hideLegend = false,
}: {
  value: GoalSize;
  hideLegend?: boolean;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="goal-picker">
      <legend className={hideLegend ? 'visually-hidden' : undefined}>{t('dailyGoalTitle')}</legend>
      <p className="muted small">{t('dailyGoalIntro')}</p>
      {(Object.keys(GOAL_SIZES) as GoalSize[]).map((size) => (
        <label key={size} className="choice">
          <input
            type="radio"
            name="daily-goal"
            value={size}
            // Uncontrolled, so the radio follows the click at once; the profile saves behind it.
            defaultChecked={value === size}
            onChange={() => void saveDailyGoal(size)}
          />
          <span>
            {t(`goal_${size}`)}
            <span className="choice-hint muted small">
              {' '}
              {t(HINTS[size], { n: GOAL_SIZES[size] })}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** The daily goal on a page of its own, linked from Today. */
export function GoalPage() {
  const { t } = useI18n();
  const profile = useLiveQuery(() => getProfile());
  if (!profile) return null;
  return (
    <>
      <h1>{t('dailyGoalTitle')}</h1>
      <section className="panel">
        <GoalPicker value={profile.dailyGoal ?? DEFAULT_GOAL} hideLegend />
        <p className="muted small">{t('streakRule')}</p>
      </section>
      <a className="button page-action" href={homeHref}>
        {t('backHome')}
      </a>
    </>
  );
}
