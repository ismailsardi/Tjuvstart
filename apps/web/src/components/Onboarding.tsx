import { useState, type FormEvent } from 'react';
import { packs } from '../content/packs';
import type { StartingPoint } from '../data/db';
import { saveLanguages, saveStartingPoint, saveTrollName } from '../data/progress';
import { I18nProvider } from '../i18n/I18nProvider';
import { useI18n } from '../i18n/useI18n';
import { uiLanguageFor } from '../i18n/strings';
import { Tusse } from './Tusse';
import { DEFAULT_TROLL_NAME, MAX_TROLL_NAME } from './outfits';

interface Props {
  nativeLanguage?: string;
  knownLanguages?: readonly string[];
  /** Called after the languages are saved, with the starting point on the first run. */
  onDone?: (startingPoint?: StartingPoint) => void;
}

/**
 * Asks for the learner's languages and, on the first run, how much Norwegian they know.
 * The interface switches language as soon as one is picked.
 */
export function Onboarding(props: Props) {
  const [native, setNative] = useState(props.nativeLanguage ?? '');
  return (
    <I18nProvider language={uiLanguageFor(native)}>
      <OnboardingForm {...props} native={native} setNative={setNative} />
    </I18nProvider>
  );
}

function OnboardingForm({
  nativeLanguage,
  knownLanguages = [],
  onDone,
  native,
  setNative,
}: Props & { native: string; setNative: (code: string) => void }) {
  const { t } = useI18n();
  const [known, setKnown] = useState<string[]>([...knownLanguages]);
  const [startingPoint, setStartingPoint] = useState<StartingPoint | null>(null);
  const [name, setName] = useState(DEFAULT_TROLL_NAME);
  // One question per screen: the native language, other languages, then (first run only)
  // how much Norwegian the learner already knows and a name for their troll.
  const firstRun = nativeLanguage === undefined;
  const totalSteps = firstRun ? 4 : 2;
  const [step, setStep] = useState(1);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!native) return;
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }
    if (step === 3 && !startingPoint) return;
    // The starting point goes first: saving the languages ends onboarding, and Home must not
    // show (or be navigated away from) before the redirect below.
    if (startingPoint) await saveStartingPoint(startingPoint);
    if (firstRun) await saveTrollName(name);
    await saveLanguages(
      native,
      known.filter((code) => code !== native),
    );
    onDone?.(startingPoint ?? undefined);
  }

  return (
    <form className="onboarding" onSubmit={submit} aria-labelledby="onboarding-heading">
      <div className="steps-dots" aria-hidden="true">
        {Array.from({ length: totalSteps }, (_, i) => (
          <span key={i} className={step === i + 1 ? 'active' : undefined} />
        ))}
      </div>
      <p className="visually-hidden">{t('stepOf', { n: step, total: totalSteps })}</p>
      <div className="onboarding-head">
        <h1 id="onboarding-heading" lang="nb">
          {t('onboardingTitle')}
        </h1>
        {step === 1 && <Tusse pose="wave" size={76} className="onboarding-tusse" />}
      </div>
      {step === 1 && <p className="muted">{t('onboardingIntro')}</p>}

      {step === 1 ? (
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
      ) : step === 4 ? (
        <fieldset className="troll-step">
          <legend>{t('trollNameQuestion')}</legend>
          <Tusse pose="wave" size={132} className="troll-step-tusse" />
          <p className="muted">{t('trollNameIntro')}</p>
          <label htmlFor="onboarding-troll-name">{t('trollNameLabel')}</label>
          <input
            id="onboarding-troll-name"
            type="text"
            value={name}
            maxLength={MAX_TROLL_NAME}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="onboarding-troll-hint"
            onChange={(event) => setName(event.target.value)}
          />
          <p id="onboarding-troll-hint" className="muted small">
            {t('trollNameHint')}
          </p>
        </fieldset>
      ) : step === 3 ? (
        <fieldset>
          <legend>{t('levelQuestion')}</legend>
          {(
            [
              ['beginner', 'levelBeginner', 'levelBeginnerHint'],
              ['some', 'levelSome', 'levelSomeHint'],
            ] as const
          ).map(([value, label, hint]) => (
            <label key={value} className="choice">
              <input
                type="radio"
                name="starting-point"
                value={value}
                checked={startingPoint === value}
                onChange={() => setStartingPoint(value)}
              />
              <span>
                {t(label)}
                <span className="choice-hint muted small"> {t(hint)}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
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
      )}

      <div className="bottom-actions">
        {step > 1 && (
          <button type="button" className="secondary" onClick={() => setStep(step - 1)}>
            {t('back')}
          </button>
        )}
        <button type="submit" disabled={!native || (step === 3 && !startingPoint)}>
          {t('save')}
        </button>
      </div>
    </form>
  );
}
