import { annotate, firstNote, getPack, type LanguagePack } from '../content/packs';
import { cardLabel, type Card } from '../content/vocab';
import { useI18n } from '../i18n/useI18n';

interface Props {
  card: Card;
  packs: readonly LanguagePack[];
  /** Whether the back of the card (meaning, hook, example) is shown. */
  revealed: boolean;
}

/** One word card. The front is the Norwegian word; the back explains it in the learner's language. */
export function WordCard({ card, packs, revealed }: Props) {
  const { t } = useI18n();
  // Learners whose language has no pack yet get the English meanings.
  const sources = packs.length > 0 ? packs : [getPack('en')].filter((p) => p !== undefined);
  const meaning = firstNote(sources, (pack) => pack.words?.[card.id]?.meaning);
  const hook = firstNote(sources, (pack) => pack.words?.[card.id]?.hook);
  const familiar = annotate(card.nb, packs)[0]?.word;

  return (
    <div className={revealed ? 'word-card revealed' : 'word-card'}>
      <p className="word" lang="nb">
        {cardLabel(card)}
      </p>
      {revealed && (
        <div className="back">
          {meaning && (
            <p className="meaning" lang={meaning.pack.language} dir={meaning.pack.direction}>
              {meaning.text}
            </p>
          )}
          {familiar && (
            <p className={`tag ${familiar.kind}`}>
              {familiar.kind === 'cognate'
                ? t('probablyKnown')
                : t('lookAlike', { word: familiar.looksLike ?? '' })}
            </p>
          )}
          {hook && (
            <p className="hook" lang={hook.pack.language} dir={hook.pack.direction}>
              {hook.text}
            </p>
          )}
          <p className="example">
            <span className="visually-hidden">{t('example')}: </span>
            <span lang="nb">{card.example}</span>
          </p>
        </div>
      )}
    </div>
  );
}
