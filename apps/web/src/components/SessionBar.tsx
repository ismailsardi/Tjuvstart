import { useI18n } from '../i18n/useI18n';

/**
 * The top of a focused session: a close button, a progress bar and a short counter. The full
 * "Question 3 of 8" text stays available to screen readers.
 */
export function SessionBar({
  closeHref,
  done,
  total,
  label,
}: {
  closeHref: string;
  /** Items finished so far. */
  done: number;
  total: number;
  /** The counter in words, such as "Question 3 of 8". */
  label: string;
}) {
  const { t } = useI18n();
  return (
    <>
      <div className="session-bar">
        <a className="session-close" href={closeHref} aria-label={t('closeSession')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </a>
        <progress value={done} max={total} aria-label={t('progress')} />
        <span className="session-count" aria-hidden="true">
          {Math.min(done + 1, total)}/{total}
        </span>
      </div>
      <p className="visually-hidden">{label}</p>
    </>
  );
}
