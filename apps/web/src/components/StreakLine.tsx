import type { CSSProperties } from 'react';
import { DAY_MS } from '@tjuvstart/engine';
import type { DailyProgress } from '../data/progress';
import { useI18n } from '../i18n/useI18n';

/** A ring that closes as today's activity reaches the goal. */
function GoalRing({ today, goal }: { today: number; goal: number }) {
  const share = Math.min(today, goal) / goal;
  return (
    <svg
      className={['goal-ring', today >= goal && 'met', today === 0 && 'empty']
        .filter(Boolean)
        .join(' ')}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <circle className="goal-ring-track" cx="24" cy="24" r="20" pathLength={100} />
      <circle
        className="goal-ring-fill"
        cx="24"
        cy="24"
        r="20"
        pathLength={100}
        style={{ '--share': share } as CSSProperties}
      />
      <text x="24" y="24" textAnchor="middle" dominantBaseline="central">
        {today >= goal ? '✓' : Math.min(today, goal)}
      </text>
    </svg>
  );
}

/** Day numbers count days in the learner's time zone, so noon UTC falls on the right weekday. */
function weekday(day: number, language: string, style: 'narrow' | 'long') {
  return new Intl.DateTimeFormat(language, { weekday: style, timeZone: 'UTC' }).format(
    new Date(day * DAY_MS + DAY_MS / 2),
  );
}

/**
 * The forgiving streak, a ring for today's goal and the last seven days. The ring and the week
 * are pictures of what the text already says, so screen readers get the text and a plain list.
 */
export function StreakLine({ progress }: { progress: DailyProgress }) {
  const { t, language } = useI18n();
  const { streak, today, goal, streakMin, week } = progress;
  return (
    <div className="streak" data-testid="streak">
      <div className="streak-main">
        <GoalRing today={today} goal={goal} />
        <div>
          <p>
            <strong>
              {streak.days === 0
                ? t('streakNone', { goal: streakMin })
                : streak.days === 1
                  ? t('streakDay')
                  : t('streakDays', { n: streak.days })}
            </strong>
          </p>
          <p className="muted small">
            {today >= goal
              ? t('goalReached')
              : streak.doneToday
                ? `${t('dailyGoalMet')} ${t('dailyProgress', { n: today, goal })}`
                : t('dailyProgress', { n: today, goal })}
          </p>
          {streak.atRisk && <p className="muted small">{t('streakAtRisk')}</p>}
        </div>
      </div>
      <ol className="week" aria-label={t('lastSevenDays')}>
        {week.map((d, i) => (
          <li
            key={d.day}
            className={[d.active && 'active', i === week.length - 1 && 'today']
              .filter(Boolean)
              .join(' ')}
          >
            <span className="week-dot" aria-hidden="true" />
            <span className="week-day" aria-hidden="true">
              {weekday(d.day, language, 'narrow')}
            </span>
            <span className="visually-hidden">
              {weekday(d.day, language, 'long')}: {d.active ? t('dayDone') : t('dayNotDone')}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
