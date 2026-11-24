import { useMemo, useRef, useState } from 'react';
import { canRecord, useRecorder } from '../audio/recorder';
import { playRecording, sentences, speak } from '../audio/speech';
import type { Lesson } from '../content/types';
import { recordShadowing } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { lessonHref } from '../routing/useHashRoute';
import { SpeakButton } from './SpeakButton';
import { useFocusOnChange } from './usePageFocus';

/** Slow enough to hear every sound, fast enough to keep the melody. */
const SLOW_RATE = 0.75;

/**
 * Shadowing, sentence by sentence: hear the model, say it out loud, record yourself and
 * compare. The learner judges each attempt; recordings never leave the page.
 */
export function Shadowing({ lesson }: { lesson: Lesson }) {
  const { t } = useI18n();
  const lines = useMemo(() => sentences(lesson.text ?? ''), [lesson.text]);
  const [index, setIndex] = useState(0);
  const [close, setClose] = useState(0);
  const [hideText, setHideText] = useState(false);
  const recorder = useRecorder();
  const recordingSupported = canRecord();
  const line = lines[index];
  // The verdict buttons go away after a verdict: focus moves to the next sentence instead.
  const lineRef = useRef<HTMLElement>(null);
  useFocusOnChange(lineRef, index);
  const setFocusTarget = (el: HTMLElement | null) => {
    lineRef.current = el;
  };
  // Without a microphone the learner repeats out loud and judges by ear.
  const canJudge = !!recorder.url || !recordingSupported || recorder.state === 'denied';

  const back = (
    <a href={lessonHref(lesson.id)} className="back-link">
      {t('backToLesson')}
    </a>
  );

  if (!line) {
    return (
      <section aria-labelledby="shadow-done" className="panel">
        <h1 id="shadow-done" lang="nb" ref={setFocusTarget} tabIndex={-1}>
          Ferdig!
        </h1>
        <p>{t('shadowDoneBody', { n: close, total: lines.length })}</p>
        <a className="button" href={lessonHref(lesson.id)}>
          {t('backToLesson')}
        </a>
      </section>
    );
  }

  async function judge(verdict: 'close' | 'again') {
    if (!line) return;
    await recordShadowing(lesson.id, line, verdict);
    recorder.clear();
    if (verdict === 'close') {
      setClose((n) => n + 1);
      setIndex((i) => i + 1);
    }
  }

  function skip() {
    recorder.clear();
    setIndex((i) => i + 1);
  }

  async function compare(url: string) {
    if (!line) return;
    await speak(line);
    await playRecording(url);
  }

  return (
    <article aria-labelledby="shadow-heading" className="shadowing">
      {back}
      <h1 id="shadow-heading">
        {t('shadowTitle')}: <span lang="nb">{lesson.title}</span>
      </h1>
      <p className="muted">{t('shadowIntro')}</p>

      <progress
        value={index}
        max={lines.length}
        aria-label={t('sentenceOf', { n: index + 1, total: lines.length })}
      />
      <p className="muted small">{t('sentenceOf', { n: index + 1, total: lines.length })}</p>

      <p
        className={hideText ? 'shadow-line hidden-line' : 'shadow-line'}
        lang="nb"
        data-testid="shadow-line"
        ref={setFocusTarget}
        tabIndex={-1}
      >
        {line}
      </p>
      <label className="small">
        <input type="checkbox" checked={hideText} onChange={(e) => setHideText(e.target.checked)} />{' '}
        {t('hideText')}
      </label>

      <div className="shadow-controls">
        <SpeakButton key={`n-${index}`} text={line} className="button" />
        <SpeakButton
          key={`s-${index}`}
          text={line}
          rate={SLOW_RATE}
          label={t('listenSlow')}
          className="button secondary"
        />
      </div>

      {recordingSupported && recorder.state !== 'denied' ? (
        <div className="shadow-controls">
          {recorder.state === 'recording' ? (
            <button type="button" className="button record recording" onClick={recorder.stop}>
              <span aria-hidden="true">■</span> {t('stopRecording')}
            </button>
          ) : (
            <button type="button" className="button record" onClick={() => void recorder.start()}>
              <span aria-hidden="true">●</span> {t('record')}
            </button>
          )}
          {recorder.url && (
            <>
              <button
                type="button"
                className="button secondary"
                onClick={() => void playRecording(recorder.url!)}
              >
                {t('playMine')}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => void compare(recorder.url!)}
              >
                {t('compare')}
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="muted small" role="status">
          {recorder.state === 'denied' ? t('micDenied') : t('micUnavailable')}
        </p>
      )}

      <div className="shadow-controls verdict">
        {canJudge ? (
          <>
            <button type="button" className="button secondary" onClick={() => void judge('again')}>
              {t('tryAgain')}
            </button>
            <button type="button" className="button" onClick={() => void judge('close')}>
              {t('soundedClose')}
            </button>
          </>
        ) : (
          <button type="button" className="button secondary" onClick={skip}>
            {t('nextSentence')}
          </button>
        )}
      </div>

      <p className="muted small">{t('recordingPrivacy')}</p>
    </article>
  );
}
