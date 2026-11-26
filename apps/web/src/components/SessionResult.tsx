import type { CSSProperties, ReactNode } from 'react';
import { levelProgress } from '@tjuvstart/engine';
import { trackedDescriptors } from '../content/descriptors';
import type { LanguagePack } from '../content/packs';
import { SKILL_NAMES } from '../content/types';
import { useI18n } from '../i18n/useI18n';
import { CanDoList } from './CanDoList';
import { Tusse } from './Tusse';
import { trollFor, useTroll } from './useTroll';
import { itemById, MASTERY_ANSWERS, type ItemId } from './outfits';
import { wardrobeHref } from '../routing/useHashRoute';
import { skillChanges, type ProgressSnapshot, type SkillChange } from './useProgressSnapshot';

/**
 * What the score line says. A weak result gets a plain, kind line instead of praise, so the
 * screen never celebrates something the learner knows went badly.
 */
function scoreTone(score: number, total: number): 'strong' | 'fair' | 'tough' {
  const share = total > 0 ? score / total : 0;
  if (share >= 0.8) return 'strong';
  return share >= 0.5 ? 'fair' : 'tough';
}

/** Each step of the reveal starts this long after the one before (see .reveal in CSS). */
const STEP_MS = 350;

function delayOf(i: number): string {
  return `${i * STEP_MS}ms`;
}

function step(i: number): CSSProperties {
  return { '--delay': delayOf(i) } as CSSProperties;
}

/** A ring that fills to the share of right answers, with the score inside. */
function ScoreRing({ score, total }: { score: number; total: number }) {
  const share = total > 0 ? score / total : 0;
  return (
    <svg className="score-ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle className="score-ring-track" cx="60" cy="60" r="52" pathLength={100} />
      <circle
        className="score-ring-fill"
        cx="60"
        cy="60"
        r="52"
        pathLength={100}
        style={{ '--share': share } as CSSProperties}
      />
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central">
        <tspan className="score-ring-score">{score}</tspan>
        <tspan className="score-ring-total" dx="2">
          /{total}
        </tspan>
      </text>
    </svg>
  );
}

function SkillMeter({ change, delay }: { change: SkillChange; delay: CSSProperties }) {
  const { t } = useI18n();
  const from = levelProgress(change.before);
  const to = levelProgress(change.after);
  const levelUp = to.level !== from.level && change.after > change.before;
  // After a level-up the meter starts again from the bottom of the new band.
  const start = levelUp || to.level !== from.level ? 0 : from.fraction;
  return (
    <li
      className={levelUp ? 'reveal skill-change level-up' : 'reveal skill-change'}
      style={delay}
      data-testid="skill-change"
    >
      <span className="skill-change-name" lang="nb">
        {SKILL_NAMES[change.skill]}
      </span>
      <span className="badge">{to.level}</span>
      <span
        className="level-meter"
        style={{ '--from': start, '--to': to.fraction } as CSSProperties}
        aria-hidden="true"
      >
        <span className="level-meter-fill" />
      </span>
      <span className="skill-change-note small">
        {levelUp
          ? t('levelUp', { level: to.level })
          : to.next
            ? t('levelToward', { level: to.next })
            : t('levelTop')}
      </span>
    </li>
  );
}

/**
 * The end of a session, revealed step by step rather than printed at once: the score ring
 * fills, then the extras, then each skill's level meter moves from where it was, then any new
 * can-do statements, and Tusse dances once it is all out. Everything is in the page from the start, so
 * screen readers get it all at once, and with reduced motion nothing animates.
 */
export function SessionResult({
  heading,
  headingRef,
  score,
  total,
  bestRun = 0,
  extra,
  before,
  after,
  packs = [],
  footer,
  children,
}: {
  heading: ReactNode;
  headingRef?: React.Ref<HTMLHeadingElement>;
  score: number;
  total: number;
  /** Most right answers in a row. Shown from three up. */
  bestRun?: number;
  /** Lines about this session, such as new word cards. */
  extra?: ReactNode;
  before?: ProgressSnapshot | null;
  after?: ProgressSnapshot | null;
  packs?: readonly LanguagePack[];
  /** Shown after the reveal, above the actions, such as the streak. */
  footer?: ReactNode;
  /** The actions. */
  children: ReactNode;
}) {
  const { t } = useI18n();
  const troll = useTroll();
  const tone = scoreTone(score, total);
  const changes = before && after ? skillChanges(before, after) : [];
  const reached =
    before && after
      ? trackedDescriptors.filter(
          (d) => after.canDo.get(d.id) === 'can-do' && before.canDo.get(d.id) !== 'can-do',
        )
      : [];

  // Clothes the troll earned during this session, by level or by streak.
  const trollBefore = before ? trollFor(before.profile, before.longest) : undefined;
  const trollAfter = after ? trollFor(after.profile, after.longest) : undefined;
  const newItems: ItemId[] =
    trollBefore && trollAfter
      ? [...trollAfter.earned].filter((id) => !trollBefore.earned.has(id))
      : [];

  let i = 1;
  const next = () => step(i++);
  const ringStep = next();
  const extrasStep = next();
  const skillSteps = changes.map(() => next());
  const itemsStep = newItems.length > 0 ? next() : undefined;
  const canDoStep = reached.length > 0 ? next() : undefined;
  const footerStep = next();
  // Tusse is there from the start and dances once everything else is out.
  const cheerDelay = delayOf(i - 1);

  return (
    <section
      className="done-screen session-result"
      aria-labelledby="result-heading"
      style={{ '--cheer': cheerDelay } as CSSProperties}
    >
      <div className="reveal result-tusse" style={step(0)}>
        <Tusse
          pose={tone === 'tough' ? 'thumbs' : 'cheer'}
          outfit={troll.outfit}
          size={112}
          className="done-tusse"
        />
      </div>
      <h1 id="result-heading" ref={headingRef} tabIndex={-1} className="reveal" style={step(0)}>
        {heading}
      </h1>
      <div className="reveal result-score" style={ringStep}>
        <ScoreRing score={score} total={total} />
        <p data-testid="score-line">
          {t(
            tone === 'strong' ? 'doneBodyStrong' : tone === 'tough' ? 'doneBodyTough' : 'doneBody',
            {
              score,
              total,
            },
          )}
        </p>
      </div>
      {(bestRun >= 3 || extra) && (
        <div className="reveal result-extras" style={extrasStep}>
          {bestRun >= 3 && (
            <p className="result-chip" data-testid="best-run">
              {t('bestRun', { n: bestRun })}
            </p>
          )}
          {extra}
        </div>
      )}
      {changes.length > 0 && (
        <ul className="skill-changes reveal" style={skillSteps[0]} aria-label={t('skillsAfter')}>
          {changes.map((change, n) => (
            <SkillMeter key={change.skill} change={change} delay={skillSteps[n] ?? step(0)} />
          ))}
        </ul>
      )}
      {itemsStep &&
        trollAfter &&
        newItems.map((id) => {
          const item = itemById(id);
          return (
            <section
              key={id}
              className="panel reveal gear-unlock"
              style={itemsStep}
              aria-labelledby={`earned-${id}`}
              data-testid="gear-unlock"
            >
              <Tusse
                pose="thumbs"
                outfit={{ ...trollAfter.outfit, [item.slot]: id }}
                size={72}
                idle={false}
              />
              <div>
                <h2 id={`earned-${id}`}>{t(`got_${id}`, { name: trollAfter.name })}</h2>
                <p className="muted small">
                  {'level' in item.unlock
                    ? t('earnedForLevel', { level: item.unlock.level, n: MASTERY_ANSWERS })
                    : t('earnedForStreak', { n: item.unlock.streak })}{' '}
                  <a href={wardrobeHref}>{t('changeOutfit')}</a>
                </p>
              </div>
            </section>
          );
        })}
      {canDoStep && after && (
        <section
          className="panel reveal result-can-do"
          style={canDoStep}
          aria-labelledby="new-can-do"
        >
          <h2 id="new-can-do">{t('canDoNew')}</h2>
          <CanDoList descriptors={reached} status={after.canDo} packs={packs} />
        </section>
      )}
      <div className="reveal" style={footerStep}>
        {footer}
        <div className="actions">{children}</div>
      </div>
    </section>
  );
}
