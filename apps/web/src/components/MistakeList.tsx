import { focusKey } from '../i18n/focus';
import { useI18n } from '../i18n/useI18n';

/** A plain list naming the focus points the learner keeps getting wrong. */
export function MistakeList({ focus }: { focus: readonly string[] }) {
  const { t } = useI18n();
  if (focus.length === 0) return <p className="muted">{t('noRecurring')}</p>;
  return (
    <ul className="mistake-list" aria-label={t('recurringMistakes')}>
      {focus.map((f) => (
        <li key={f} data-testid={`mistake-${f}`}>
          {t(focusKey(f))}
        </li>
      ))}
    </ul>
  );
}
