import type { CanDoStatus } from '@tjuvstart/engine';
import { canDoText, type Descriptor } from '../content/descriptors';
import type { LanguagePack } from '../content/packs';
import { SKILL_NAMES } from '../content/types';
import { useI18n } from '../i18n/useI18n';

const MARK: Record<CanDoStatus, string> = {
  'not-started': '○',
  practising: '◐',
  'can-do': '✓',
};

/** Can-do statements grouped by skill, each with where the learner stands. */
export function CanDoList({
  descriptors,
  status,
  packs = [],
}: {
  descriptors: readonly Descriptor[];
  status: ReadonlyMap<string, CanDoStatus>;
  packs?: readonly LanguagePack[];
}) {
  const { t } = useI18n();
  const skills = [...new Set(descriptors.map((d) => d.skill))];
  return (
    <div className="can-do">
      {skills.map((skill) => (
        <div key={skill}>
          <h3 className="small" lang="nb">
            {SKILL_NAMES[skill]}
          </h3>
          <ul>
            {descriptors
              .filter((d) => d.skill === skill)
              .map((descriptor) => {
                const state = status.get(descriptor.id) ?? 'not-started';
                const { text, pack } = canDoText(descriptor, packs);
                return (
                  <li key={descriptor.id} className={`can-do-${state}`} data-testid="can-do">
                    <span className="can-do-mark" aria-hidden="true">
                      {MARK[state]}
                    </span>
                    <span lang={pack?.language ?? 'en'} dir={pack?.direction}>
                      {text}
                    </span>{' '}
                    <span className="visually-hidden">({t(`canDo_${state}`)})</span>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
