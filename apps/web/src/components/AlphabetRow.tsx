import { useI18n } from '../i18n/useI18n';
import { alphabetHref } from '../routing/useHashRoute';

/** The alphabet page, listed with the decks and on the lessons page. */
export function AlphabetRow() {
  const { t } = useI18n();
  return (
    <a className="deck-row" href={alphabetHref}>
      <span className="badge" lang="nb">
        Aa
      </span>
      <span className="deck-row-main">
        <strong>{t('alphabet')}</strong>
        <span className="muted small">{t('alphabetLink')}</span>
      </span>
      <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </a>
  );
}
