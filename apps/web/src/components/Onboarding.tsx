import { useState, type FormEvent } from 'react';
import { packs } from '../content/packs';
import { saveLanguages } from '../data/progress';
import { I18nProvider } from '../i18n/I18nProvider';
import { useI18n } from '../i18n/useI18n';
import { uiLanguageFor } from '../i18n/strings';

interface Props {
  nativeLanguage?: string;
  knownLanguages?: readonly string[];
  /** Called after the languages are saved. */
  onDone?: () => void;
}

/** Asks for the learner's languages. The interface switches language as soon as one is picked. */
export function Onboarding(props: Props) {
  const [native, setNative] = useState(props.nativeLanguage ?? '');
  return (
    <I18nProvider language={uiLanguageFor(native)}>
      <OnboardingForm {...props} native={native} setNative={setNative} />
    </I18nProvider>
  );
}

function OnboardingForm({
  knownLanguages = [],
  onDone,
  native,
  setNative,
}: Props & { native: string; setNative: (code: string) => void }) {
  const { t } = useI18n();
  const [known, setKnown] = useState<string[]>([...knownLanguages]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!native) return;
    await saveLanguages(native, known);
    onDone?.();
  }

  return (
    <form className="onboarding" onSubmit={submit} aria-labelledby="onboarding-heading">
      <h1 id="onboarding-heading" lang="nb">
        {t('onboardingTitle')}
      </h1>
      <p>{t('onboardingIntro')}</p>

      <fieldset>
        <legend>{t('nativeQuestion')}</legend>
        {packs.map((pack) => (
          <label key={pack.language} className="choice">
            <input
              type="radio"
              name="native"
              value={pack.language}
              checked={native === pack.language}
              onChange={() => setNative(pack.language)}
            />
            <span lang={pack.language}>{pack.nativeName}</span>
          </label>
        ))}
        <label className="choice">
          <input
            type="radio"
            name="native"
            value="other"
            checked={native === 'other'}
            onChange={() => setNative('other')}
          />
          <span>{t('otherLanguage')}</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>{t('knownQuestion')}</legend>
        {packs
          .filter((pack) => pack.language !== native)
          .map((pack) => (
            <label key={pack.language} className="choice">
              <input
                type="checkbox"
                checked={known.includes(pack.language)}
                onChange={(event) =>
                  setKnown(
                    event.target.checked
                      ? [...known, pack.language]
                      : known.filter((code) => code !== pack.language),
                  )
                }
              />
              <span lang={pack.language}>{pack.nativeName}</span>
            </label>
          ))}
      </fieldset>

      <button type="submit" disabled={!native}>
        {t('save')}
      </button>
    </form>
  );
}
