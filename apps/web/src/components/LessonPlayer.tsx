import { useEffect, useMemo, useRef, useState } from 'react';
import { correctAnswer, dictationWords, isCorrect, type Response } from '../content/answers';
import {
  annotate,
  contrastsFor,
  firstNote,
  type LanguagePack,
  type Segment,
} from '../content/packs';
import type { Lesson, LessonDocument } from '../content/types';
import { getLesson, lessonIdForItem, readingTextFor } from '../content/lessons';
import { cardLevel, cardsInText } from '../content/vocab';
import { completeLesson, recordAnswer } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { homeHref, shadowHref, wordsHref } from '../routing/useHashRoute';
import { sentences } from '../audio/speech';
import { SpeakButton } from './SpeakButton';
import { ItemView } from './ItemView';
import { SessionBar } from './SessionBar';

type Feedback = { correct: boolean; answer: string; given?: string } | null;

interface Props {
  lesson: Lesson;
  /** Where the close button leads. Home by default. */
  closeHref?: string;
  /** The learner's language packs, native language first. */
  packs?: readonly LanguagePack[];
  /**
   * A practice session mixes items from several lessons: each reading item shows its own
   * lesson's text, answers are recorded against that lesson, and nothing is marked completed.
   */
  practice?: boolean;
  /** Called at the end instead of showing the end screen, as in the daily session. */
  onFinish?: (score: number) => void;
  /**
   * For generated content that is not part of the course: answers do not change the ratings,
   * nothing is marked completed, and there is no shadowing link.
   */
  ephemeral?: boolean;
}

export function LessonPlayer({
  lesson,
  packs = [],
  practice = false,
  onFinish,
  ephemeral = false,
  closeHref = homeHref,
}: Props) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [score, setScore] = useState(0);

  const item = lesson.items[index];
  const text = practice ? (item ? readingTextFor(item) : undefined) : lesson.text;
  const textLesson = practice && item ? getLesson(lessonIdForItem(item.id) ?? '') : lesson;
  const segments = useMemo(() => (text ? annotate(text, packs) : []), [text, packs]);
  const contrasts = useMemo(
    () => (practice ? [] : contrastsFor(lesson.id, packs)),
    [practice, lesson.id, packs],
  );

  const finished = !item;
  const [newCards, setNewCards] = useState(0);
  const saved = useRef(false);

  useEffect(() => {
    if (finished) onFinish?.(score);
  }, [finished, onFinish, score]);

  useEffect(() => {
    if (!finished || saved.current || practice || ephemeral) return;
    saved.current = true;
    // Words from the lesson text at the lesson's level go to the learner's word cards.
    const cards = cardsInText(lesson.text ?? '').filter((id) => cardLevel(id) === lesson.level);
    void completeLesson(lesson.id, score, lesson.items.length, cards).then(setNewCards);
  }, [finished, lesson, score, practice, ephemeral]);

  if (!item) {
    if (onFinish) return null;
    return (
      <section aria-labelledby="done-heading">
        <h1 id="done-heading" lang="nb">
          Ferdig!
        </h1>
        <p>{t('doneBody', { score, total: lesson.items.length })}</p>
        {newCards > 0 && (
          <p>
            {newCards === 1 ? t('newCard') : t('newCards', { n: newCards })}{' '}
            <a href={wordsHref}>{t('wordCards')}</a>
          </p>
        )}
        <div className="actions">
          {lesson.text && (
            <a className="button secondary" href={shadowHref(lesson.id)}>
              {t('shadowText')}
            </a>
          )}
          <a className="button" href={homeHref}>
            {t('backHome')}
          </a>
        </div>
      </section>
    );
  }

  const note = firstNote(packs, (pack) => pack.itemNotes?.[item.id]);

  async function submit(response: Response) {
    if (!item || feedback) return;
    const correct = isCorrect(item, response);
    setFeedback({
      correct,
      answer: correctAnswer(item),
      given: response.kind === 'text' ? response.value : undefined,
    });
    if (correct) setScore((s) => s + 1);
    if (ephemeral) return;
    await recordAnswer(
      item,
      practice ? (lessonIdForItem(item.id) ?? lesson.id) : lesson.id,
      correct,
    );
  }

  function next() {
    setFeedback(null);
    setIndex((i) => i + 1);
  }

  return (
    <article className="session" aria-labelledby="lesson-heading">
      <SessionBar
        closeHref={closeHref}
        done={index}
        total={lesson.items.length}
        label={t('question', { n: index + 1, total: lesson.items.length })}
      />
      <h1 id="lesson-heading" className="eyebrow" lang="nb">
        {lesson.title}
      </h1>
      {text && (
        <ReadingText
          key={text}
          text={text}
          segments={segments}
          lessonId={practice ? (lessonIdForItem(item.id) ?? lesson.id) : lesson.id}
          document={textLesson?.document}
          canShadow={!ephemeral}
          level={textLesson?.level ?? lesson.level}
        />
      )}

      {contrasts.map((contrast) => (
        <details
          key={contrast.id}
          className="tip"
          lang={contrast.language}
          dir={contrast.direction}
        >
          <summary>
            {t('tip')}: {contrast.title}
          </summary>
          <p>{contrast.body}</p>
        </details>
      ))}

      <h2 className="prompt" lang="nb">
        {item.prompt}
      </h2>
      {item.hint && (
        <p className="muted" lang="nb">
          {item.hint}
        </p>
      )}

      <ItemView item={item} disabled={feedback !== null} onSubmit={submit} />

      {feedback && (
        <div className={feedback.correct ? 'feedback good' : 'feedback bad'} role="status">
          <p>
            {feedback.correct ? (
              t('correct')
            ) : (
              <>
                {t('notQuite')} <strong lang="nb">{feedback.answer}</strong>
                {/[.!?]$/.test(feedback.answer) ? '' : '.'}
              </>
            )}
          </p>
          {item.type === 'dictation' && !feedback.correct && (
            <p className="dictation-diff">
              <span className="small">{t('dictationFeedback')}</span>{' '}
              <span lang="nb">
                {dictationWords(item.audio, feedback.given ?? '').map((w, i) => (
                  <span key={i}>{w.ok ? w.word : <mark className="missed">{w.word}</mark>} </span>
                ))}
              </span>
            </p>
          )}
          {item.audio && item.type !== 'dictation' && (
            // After answering, the transcript helps connect sounds to words.
            <p className="transcript" lang="nb" data-testid="transcript">
              «{item.audio}»
            </p>
          )}
          {note && (
            <p className="note" lang={note.pack.language} dir={note.pack.direction}>
              {note.text}
            </p>
          )}
          <button type="button" onClick={next} autoFocus>
            {t('continue')}
          </button>
        </div>
      )}
    </article>
  );
}

/** The lesson text with familiar words and look-alikes marked, followed by short glossaries. */
function ReadingText({
  text,
  segments,
  lessonId,
  document,
  level,
  canShadow,
}: {
  text: string;
  segments: Segment[];
  lessonId: string;
  /** Set when the text is a simplified real-world document: a letter, an ad or a notice. */
  document?: LessonDocument;
  level: string;
  canShadow: boolean;
}) {
  const { t } = useI18n();
  const unique = (kind: 'cognate' | 'false-friend') => [
    ...new Map(
      segments.flatMap((s) => (s.word?.kind === kind ? [[s.word.nb, s.word] as const] : [])),
    ).values(),
  ];
  const cognates = unique('cognate');
  const body = (
    <p className="reading-text" lang="nb">
      {segments.map((segment, i) =>
        segment.word ? (
          <mark key={i} className={segment.word.kind}>
            {segment.text}
          </mark>
        ) : (
          segment.text
        ),
      )}
    </p>
  );
  const falseFriends = unique('false-friend');

  return (
    <>
      <div className="text-tools">
        <SpeakButton text={sentences(text)} label={t('listenText')} />
        {canShadow && <a href={shadowHref(lessonId)}>{t('shadowText')}</a>}
      </div>
      {document ? (
        <figure className={`doc doc-${document.kind}`} data-testid="document">
          <figcaption className="doc-meta">
            <span className="badge">{t('realText', { level })}</span>{' '}
            <span>{t(`doc_${document.kind}`)}</span>
            {document.from && (
              <>
                {' · '}
                <span lang="nb">{t('docFrom', { from: document.from })}</span>
              </>
            )}
          </figcaption>
          {body}
        </figure>
      ) : (
        body
      )}
      {cognates.length > 0 && (
        <details className="glossary" aria-label={t('knownWords')}>
          <summary>
            <h2>{t('knownWords')}</h2> <span className="muted">({cognates.length})</span>
          </summary>
          <ul>
            {cognates.map((word) => (
              <li key={word.nb}>
                <mark className="cognate" lang="nb">
                  {word.nb}
                </mark>{' '}
                <span lang={word.language}>{word.meaning}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {falseFriends.length > 0 && (
        <details className="glossary" open aria-label={t('falseFriends')}>
          <summary>
            <h2>{t('falseFriends')}</h2> <span className="muted">({falseFriends.length})</span>
          </summary>
          <ul>
            {falseFriends.map((word) => (
              <li key={word.nb}>
                <mark className="false-friend" lang="nb">
                  {word.nb}
                </mark>{' '}
                <span lang={word.language}>
                  {t('looksLike', { word: word.looksLike ?? '' })} «{word.meaning}»
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
