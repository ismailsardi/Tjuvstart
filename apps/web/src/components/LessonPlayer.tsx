import { useEffect, useMemo, useRef, useState } from 'react';
import { correctAnswer, isCorrect, type Response } from '../content/answers';
import {
  annotate,
  contrastsFor,
  firstNote,
  type LanguagePack,
  type Segment,
} from '../content/packs';
import type { Lesson } from '../content/types';
import { lessonIdForItem, readingTextFor } from '../content/lessons';
import { cardLevel, cardsInText } from '../content/vocab';
import { completeLesson, recordAnswer } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { homeHref, shadowHref, wordsHref } from '../routing/useHashRoute';
import { sentences } from '../audio/speech';
import { SpeakButton } from './SpeakButton';
import { ItemView } from './ItemView';

type Feedback = { correct: boolean; answer: string } | null;

interface Props {
  lesson: Lesson;
  /** The learner's language packs, native language first. */
  packs?: readonly LanguagePack[];
  /**
   * A practice session mixes items from several lessons: each reading item shows its own
   * lesson's text, answers are recorded against that lesson, and nothing is marked completed.
   */
  practice?: boolean;
}

export function LessonPlayer({ lesson, packs = [], practice = false }: Props) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [score, setScore] = useState(0);

  const item = lesson.items[index];
  const text = practice ? (item ? readingTextFor(item) : undefined) : lesson.text;
  const segments = useMemo(() => (text ? annotate(text, packs) : []), [text, packs]);
  const contrasts = useMemo(
    () => (practice ? [] : contrastsFor(lesson.id, packs)),
    [practice, lesson.id, packs],
  );

  const finished = !item;
  const [newCards, setNewCards] = useState(0);
  const saved = useRef(false);

  useEffect(() => {
    if (!finished || saved.current || practice) return;
    saved.current = true;
    // Words from the lesson text at the lesson's level go to the learner's word cards.
    const cards = cardsInText(lesson.text ?? '').filter((id) => cardLevel(id) === lesson.level);
    void completeLesson(lesson.id, score, lesson.items.length, cards).then(setNewCards);
  }, [finished, lesson, score, practice]);

  if (!item) {
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
    setFeedback({ correct, answer: correctAnswer(item) });
    if (correct) setScore((s) => s + 1);
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
    <article aria-labelledby="lesson-heading">
      <a href={homeHref} className="muted">
        {t('home')}
      </a>
      <h1 id="lesson-heading" lang="nb">
        {lesson.title}
      </h1>
      {text && (
        <ReadingText
          key={text}
          text={text}
          segments={segments}
          lessonId={practice ? (lessonIdForItem(item.id) ?? lesson.id) : lesson.id}
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

      <progress value={index} max={lesson.items.length} aria-label={t('progress')} />
      <p className="muted">{t('question', { n: index + 1, total: lesson.items.length })}</p>

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
                {t('notQuite')} <strong lang="nb">{feedback.answer}</strong>.
              </>
            )}
          </p>
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
}: {
  text: string;
  segments: Segment[];
  lessonId: string;
}) {
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
      <div className="text-tools">
        <SpeakButton text={sentences(text)} label={t('listenText')} />
        <a href={shadowHref(lessonId)}>{t('shadowText')}</a>
      </div>
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
      {cognates.length > 0 && (
        <section className="glossary" aria-label={t('knownWords')}>
          <h2>{t('knownWords')}</h2>
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
        </section>
      )}
      {falseFriends.length > 0 && (
        <section className="glossary" aria-label={t('falseFriends')}>
          <h2>{t('falseFriends')}</h2>
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
        </section>
      )}
    </>
  );
}
