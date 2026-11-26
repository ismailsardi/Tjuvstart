import { useEffect, useMemo, useRef, useState } from 'react';
import { checkAnswer, correctAnswer, dictationWords, type Response } from '../content/answers';
import type { Spelling } from '../content/spelling';
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
import { SessionResult } from './SessionResult';
import { Tusse } from './Tusse';
import { useTroll } from './useTroll';
import { useFocusOnChange } from './usePageFocus';
import { useProgressSnapshot } from './useProgressSnapshot';

type Feedback = { correct: boolean; spelling: Spelling; answer: string; given?: string } | null;

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
  onFinish?: (score: number, bestRun: number) => void;
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
  // Right answers in a row: the current run and the best one this session.
  const [run, setRun] = useState({ now: 0, best: 0 });

  const item = lesson.items[index];
  const text = practice ? (item ? readingTextFor(item) : undefined) : lesson.text;
  const textLesson = practice && item ? getLesson(lessonIdForItem(item.id) ?? '') : lesson;
  const segments = useMemo(() => (text ? annotate(text, packs) : []), [text, packs]);
  const contrasts = useMemo(
    () => (practice ? [] : contrastsFor(lesson.id, packs)),
    [practice, lesson.id, packs],
  );

  const finished = !item;
  const troll = useTroll();
  const { before, after } = useProgressSnapshot(finished, !onFinish && !ephemeral);
  const [newCards, setNewCards] = useState(0);
  const saved = useRef(false);
  // A new question, or the end screen, takes focus from the Continue button that just went away.
  const promptRef = useRef<HTMLHeadingElement>(null);
  useFocusOnChange(promptRef, index);

  useEffect(() => {
    if (finished) onFinish?.(score, run.best);
  }, [finished, onFinish, score, run.best]);

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
      <SessionResult
        heading={<span lang="nb">Ferdig!</span>}
        headingRef={promptRef}
        score={score}
        total={lesson.items.length}
        bestRun={run.best}
        before={before}
        after={after}
        packs={packs}
        extra={
          newCards > 0 && (
            <p>
              {newCards === 1 ? t('newCard') : t('newCards', { n: newCards })}{' '}
              <a href={wordsHref}>{t('wordCards')}</a>
            </p>
          )
        }
      >
        <a className="button" href={homeHref}>
          {t('backHome')}
        </a>
        {lesson.text && <a href={shadowHref(lesson.id)}>{t('shadowText')}</a>}
      </SessionResult>
    );
  }

  const note = firstNote(packs, (pack) => pack.itemNotes?.[item.id]);
  // Reading questions need the text in view. Other exercises keep it one tap away, so the
  // question and answers are not pushed below the fold by a text they do not ask about.
  const textInView = practice || item.skill === 'reading';
  // Listening exercises are about what the learner hears. The lesson text often holds the
  // very sentence they are asked to write down, so it is not offered at all; the transcript
  // comes with the feedback instead.
  const textOffered = item.skill !== 'listening';
  const textLessonId = practice ? (lessonIdForItem(item.id) ?? lesson.id) : lesson.id;

  async function submit(response: Response) {
    if (!item || feedback) return;
    // Small typos and missing æ, ø, å count as right; the feedback shows the spelling.
    const { correct, spelling, meant } = checkAnswer(item, response);
    setFeedback({
      correct,
      spelling,
      answer: meant ?? correctAnswer(item),
      given: response.kind === 'text' ? response.value : undefined,
    });
    if (correct) setScore((s) => s + 1);
    setRun((r) => {
      const now = correct ? r.now + 1 : 0;
      return { now, best: Math.max(r.best, now) };
    });
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
      {text &&
        textOffered &&
        (textInView ? (
          <ReadingText
            key={text}
            text={text}
            segments={segments}
            lessonId={textLessonId}
            document={textLesson?.document}
            canShadow={!ephemeral}
            level={textLesson?.level ?? lesson.level}
          />
        ) : (
          <details className="text-toggle" data-testid="text-toggle">
            <summary>{t('showText')}</summary>
            <ReadingText
              text={text}
              segments={segments}
              lessonId={textLessonId}
              document={textLesson?.document}
              canShadow={!ephemeral}
              level={textLesson?.level ?? lesson.level}
            />
          </details>
        ))}

      <h2 className="prompt" lang="nb" ref={promptRef} tabIndex={-1}>
        {item.prompt}
      </h2>
      {item.hint && (
        <p className="muted" lang="nb">
          {item.hint}
        </p>
      )}

      <ItemView item={item} disabled={feedback !== null} onSubmit={submit} />

      {/* Word help and tips come after the answers: there when wanted, never in the way. */}
      {((text && textInView) || contrasts.length > 0) && (
        <div className="word-help">
          {text && textInView && <Glossaries segments={segments} />}
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
        </div>
      )}

      {feedback && (
        <div className={feedback.correct ? 'feedback good' : 'feedback bad'} role="status">
          <p id="feedback-text">
            <span>
              {feedback.correct && feedback.spelling !== 'exact' ? (
                <>
                  {t(feedback.spelling === 'letters' ? 'spellingLetters' : 'spellingTypo')}{' '}
                  <strong lang="nb">{feedback.answer}</strong>
                </>
              ) : feedback.correct ? (
                t('correct')
              ) : (
                <>
                  {t('notQuite')} <strong lang="nb">{feedback.answer}</strong>
                  {/[.!?]$/.test(feedback.answer) ? '' : '.'}
                </>
              )}
            </span>
          </p>
          {!feedback.correct && item.type !== 'dictation' && feedback.given?.trim() && (
            // The sheet can cover the input, so repeat what the learner typed next to the answer.
            <p className="given" data-testid="given">
              {t('youWrote')}: <s lang="nb">{feedback.given.trim()}</s>
            </p>
          )}
          <Tusse
            pose={feedback.correct ? 'thumbs' : 'shrug'}
            outfit={troll.outfit}
            size={60}
            className="feedback-tusse"
          />
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
          <button type="button" onClick={next} autoFocus aria-describedby="feedback-text">
            {t('continue')}
          </button>
        </div>
      )}
    </article>
  );
}

/** The lesson text with familiar words and look-alikes marked. */
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
    </>
  );
}

/** Short glossaries of the familiar words and look-alikes marked in the text. */
function Glossaries({ segments }: { segments: Segment[] }) {
  const { t } = useI18n();
  const unique = (kind: 'cognate' | 'false-friend') => [
    ...new Map(
      segments.flatMap((s) => (s.word?.kind === kind ? [[s.word.nb, s.word] as const] : [])),
    ).values(),
  ];
  const cognates = unique('cognate');
  const falseFriends = unique('false-friend');

  return (
    <>
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
