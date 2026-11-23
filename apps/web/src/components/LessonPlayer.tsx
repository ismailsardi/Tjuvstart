import { useState } from 'react';
import { correctAnswer, isCorrect, type Response } from '../content/answers';
import type { Lesson } from '../content/types';
import { recordAnswer } from '../data/progress';
import { homeHref } from '../routing/useHashRoute';
import { ItemView } from './ItemView';

type Feedback = { correct: boolean; answer: string } | null;

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [score, setScore] = useState(0);

  const item = lesson.items[index];

  if (!item) {
    return (
      <section aria-labelledby="done-heading">
        <h1 id="done-heading">Ferdig!</h1>
        <p>
          You got {score} of {lesson.items.length} right. Your level estimate has been updated.
        </p>
        <a className="button" href={homeHref}>
          Back to home
        </a>
      </section>
    );
  }

  async function submit(response: Response) {
    if (!item || feedback) return;
    const correct = isCorrect(item, response);
    setFeedback({ correct, answer: correctAnswer(item) });
    if (correct) setScore((s) => s + 1);
    await recordAnswer(item, lesson.id, correct);
  }

  function next() {
    setFeedback(null);
    setIndex((i) => i + 1);
  }

  return (
    <article aria-labelledby="lesson-heading">
      <a href={homeHref} className="muted">
        ← Home
      </a>
      <h1 id="lesson-heading">{lesson.title}</h1>
      {lesson.text && (
        <p className="reading-text" lang="nb">
          {lesson.text}
        </p>
      )}

      <progress value={index} max={lesson.items.length} aria-label="Lesson progress" />
      <p className="muted">
        Question {index + 1} of {lesson.items.length}
      </p>

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
              'Correct!'
            ) : (
              <>
                Not quite. The answer is <strong lang="nb">{feedback.answer}</strong>.
              </>
            )}
          </p>
          <button type="button" onClick={next} autoFocus>
            Continue
          </button>
        </div>
      )}
    </article>
  );
}
