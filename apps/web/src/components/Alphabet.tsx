import { alphabet } from '../content/alphabet';
import { useI18n } from '../i18n/useI18n';
import { SpeakButton } from './SpeakButton';

/** A reference page with every letter, how it is said and a word that uses it. */
export function Alphabet() {
  const { t } = useI18n();
  return (
    <>
      <header className="page-header">
        <h1>{t('alphabet')}</h1>
        <p className="muted">{t('alphabetIntro')}</p>
        <p className="muted">
          {t('alphabetRare')} {t('alphabetHow')}
        </p>
      </header>
      <ul className="alphabet" lang="nb">
        {alphabet.map(({ letter, name, example }) => (
          <li key={letter} className={'ÆØÅ'.includes(letter) ? 'extra' : undefined}>
            <span className="alphabet-letter">
              {letter}
              {letter.toLowerCase()}
            </span>
            <span className="muted small">«{name}»</span>
            <strong>{example}</strong>
            <SpeakButton text={[name, example]} />
          </li>
        ))}
      </ul>
    </>
  );
}
