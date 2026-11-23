import { useState } from 'react';
import { askClaude } from '../ai/client';
import { RUBRIC, SCORE_MAX, WRITING_TASKS, WritingFeedback, writingSystem } from '../ai/prompts';
import { useI18n } from '../i18n/useI18n';
import { aiHref } from '../routing/useHashRoute';
import { useAi } from './useAi';

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** A Norskprøven-style writing task with rubric scores, corrections and an improved version. */
export function WritingTaskView({ taskId }: { taskId: string }) {
  const { t } = useI18n();
  const { settings, learner, loading, errorText } = useAi('writing');
  const task = WRITING_TASKS.find((w) => w.id === taskId);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);

  if (loading) return null;
  if (!task || !settings || !learner) {
    return (
      <p className="panel">
        <a href={aiHref}>{t('aiTitle')}</a>
      </p>
    );
  }

  const words = countWords(text);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!task || !settings || !learner || busy) return;
    setBusy(true);
    setError(null);
    try {
      setFeedback(
        await askClaude(settings, {
          system: writingSystem(task, learner),
          messages: [{ role: 'user', content: text }],
          schema: WritingFeedback,
          effort: 'medium',
        }),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="writing-task" aria-labelledby="writing-heading">
      <a href={aiHref} className="muted">
        ← {t('aiTitle')}
      </a>
      <h1 id="writing-heading">{t('aiWriting')}</h1>
      <p className="panel" lang="nb">
        <span className="badge">{task.level}</span> {task.prompt}
      </p>

      {!feedback ? (
        <form onSubmit={(e) => void submit(e)}>
          <label htmlFor="writing-text">{t('aiTextLabel')}</label>
          <textarea
            id="writing-text"
            lang="nb"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
          <p className={words < task.minWords ? 'muted small' : 'small'}>
            {t('aiWordCount', { n: words, min: task.minWords })}
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || words === 0}>
            {busy ? t('aiThinking') : t('aiGetFeedback')}
          </button>
        </form>
      ) : (
        <section className="feedback-report" aria-live="polite" data-testid="writing-feedback">
          <h2>{t('aiShowsLevel', { level: feedback.level })}</h2>
          <ul className="rubric">
            {RUBRIC.map((criterion) => {
              const score = Math.max(
                0,
                Math.min(SCORE_MAX, Math.round(feedback.scores[criterion])),
              );
              return (
                <li key={criterion}>
                  <span>{t(`rubric_${criterion}`)}</span>
                  <meter
                    min={0}
                    max={SCORE_MAX}
                    value={score}
                    aria-label={t(`rubric_${criterion}`)}
                  />
                  <span className="small">
                    {score}/{SCORE_MAX}
                  </span>
                </li>
              );
            })}
          </ul>
          <p>{feedback.summary}</p>
          {feedback.corrections.length > 0 && (
            <>
              <h3>{t('aiCorrections')}</h3>
              <ul className="corrections">
                {feedback.corrections.map((c, i) => (
                  <li key={i}>
                    <del lang="nb">{c.original}</del> → <ins lang="nb">{c.corrected}</ins>
                    <p className="muted small">{c.explanation}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3>{t('aiImproved')}</h3>
          <p className="reading-text" lang="nb">
            {feedback.improved}
          </p>
          <button type="button" className="secondary" onClick={() => setFeedback(null)}>
            {t('aiTryAgain')}
          </button>
        </section>
      )}
    </article>
  );
}
