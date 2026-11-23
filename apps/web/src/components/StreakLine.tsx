import type { DailyProgress } from '../data/progress';
import { useI18n } from '../i18n/useI18n';

/** The forgiving streak in one or two lines, with today's progress toward the goal. */
export function StreakLine({ progress }: { progress: DailyProgress }) {
  const { t } = useI18n();
  const { streak, today, goal } = progress;
  return (
    <div className="streak" data-testid="streak">
      <p>
        <strong>
          {streak.days === 0
            ? t('streakNone', { goal })
            : streak.days === 1
              ? t('streakDay')
              : t('streakDays', { n: streak.days })}
        </strong>{' '}
        <span className="muted small">
          {streak.doneToday
            ? t('dailyGoalMet')
            : t('dailyProgress', { n: Math.min(today, goal), goal })}
        </span>
      </p>
      {streak.atRisk && <p className="muted small">{t('streakAtRisk')}</p>}
      <progress value={Math.min(today, goal)} max={goal} aria-hidden="true" />
    </div>
  );
}
