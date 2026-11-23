import { useCallback, useState } from 'react';
import { askClaude } from '../ai/client';
import {
  GeneratedText,
  READING_TOPICS,
  readingSystem,
  toItems,
  type ReadingTopic,
} from '../ai/prompts';
import type { LanguagePack } from '../content/packs';
import type { Lesson } from '../content/types';
import { useI18n } from '../i18n/useI18n';
import { aiHref } from '../routing/useHashRoute';
import { LessonPlayer } from './LessonPlayer';
import { useAi } from './useAi';

/** A reading text written for the learner's level, played like a lesson but not recorded. */
export function AiReading({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const { settings, learner, loading, errorText } = useAi('reading');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback((score: number) => setDone(score), []);

  if (loading) return null;
  if (!settings || !learner) {
    return (
      <p className="panel">
        <a href={aiHref}>{t('aiTitle')}</a>
      </p>
    );
  }

  async function generate(id: ReadingTopic) {
    if (!settings || !learner) return;
    const topic = READING_TOPICS[id];
    setBusy(true);
    setError(null);
    try {
      const text = await askClaude(settings, {
        system: readingSystem(topic, learner),
        messages: [{ role: 'user', content: `Topic: ${topic}` }],
        schema: GeneratedText,
      });
      setLesson({
        id: 'ai-reading',
        level: learner.level,
        title: text.title,
        summary: '',
        text: text.text,
        items: toItems(text, learner.level),
      });
      setDone(null);
      setRound((n) => n + 1);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const topics = (
    <div className="chips" role="group" aria-label={t('aiPickTopic')}>
      {(Object.keys(READING_TOPICS) as ReadingTopic[]).map((id) => (
        <button
          key={id}
          type="button"
          className="chip"
          disabled={busy}
          onClick={() => void generate(id)}
        >
          {t(`topic_${id}`)}
        </button>
      ))}
    </div>
  );

  if (lesson && done === null) {
    return <LessonPlayer key={round} lesson={lesson} packs={packs} ephemeral onFinish={finish} />;
  }

  return (
    <article aria-labelledby="ai-reading-heading">
      <a href={aiHref} className="muted">
        ← {t('aiTitle')}
      </a>
      <h1 id="ai-reading-heading">{t('aiReading')}</h1>
      {done !== null && lesson && (
        <p role="status" className="panel">
          {t('aiReadingScore', { score: done, total: lesson.items.length })}
        </p>
      )}
      <p className="muted">{done === null ? t('aiPickTopic') : t('aiAnotherText')}</p>
      {topics}
      {busy && <p className="muted">{t('aiThinking')}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
