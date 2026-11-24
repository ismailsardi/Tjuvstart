import { describe, expect, it } from 'vitest';
import { DEFAULT_RATING, expectedScore, updateRating } from './rating';
import {
  PLACEMENT_DEFAULTS,
  PLACEMENT_PRIOR,
  estimate,
  maxPlacementQuestions,
  nextPlacementItem,
  recordPlacementAnswer,
  skillPlaced,
  startPlacement,
} from './placement';

const items = [700, 800, 900, 1000, 1100, 1200, 1300, 1400].flatMap((difficulty) =>
  ['reading', 'writing'].flatMap((skill) =>
    [1, 2].map((n) => ({ id: `${skill}-${difficulty}-${n}`, skill, difficulty })),
  ),
);

function run(answer: (item: { skill: string; difficulty: number }) => boolean, guess = 0) {
  let state = startPlacement(['reading', 'writing']);
  const asked: string[] = [];
  for (let item = nextPlacementItem(state, items); item; item = nextPlacementItem(state, items)) {
    asked.push(item.skill);
    state = recordPlacementAnswer(state, item, answer(item), guess);
  }
  return { state, asked };
}

describe('guessing', () => {
  it('never expects less than the guessing floor', () => {
    expect(expectedScore(600, 1400, 1 / 3)).toBeGreaterThan(1 / 3);
    expect(expectedScore(1000, 1000, 1 / 3)).toBeCloseTo(2 / 3);
  });

  it('gives a right answer on a guessable item less weight', () => {
    expect(updateRating(1000, 1000, 1, { guess: 1 / 3 })).toBeLessThan(updateRating(1000, 1000, 1));
    const right = { difficulty: 1200, correct: true };
    expect(estimate([{ ...right, guess: 1 / 3 }]).mean).toBeLessThan(
      estimate([{ ...right, guess: 0 }]).mean,
    );
  });
});

describe('estimate', () => {
  it('starts at the prior and gets more certain with every answer', () => {
    expect(estimate([])).toMatchObject({ mean: expect.closeTo(PLACEMENT_PRIOR.mean, 0) });
    const answers = [
      { difficulty: 1000, guess: 0, correct: true },
      { difficulty: 1100, guess: 0, correct: false },
      { difficulty: 1050, guess: 0, correct: true },
    ];
    const errors = [1, 2, 3].map((n) => estimate(answers.slice(0, n)).sd);
    expect(errors[0]).toBeLessThan(estimate([]).sd);
    expect(errors[1]).toBeLessThan(errors[0]!);
    expect(errors[2]).toBeLessThan(errors[1]!);
  });
});

describe('placement', () => {
  it('alternates skills and stops each one between the minimum and the maximum', () => {
    const { asked } = run((item) => item.difficulty <= 1000);
    const reading = asked.filter((s) => s === 'reading').length;
    expect(asked[0]).not.toBe(asked[1]);
    expect(reading).toBeGreaterThanOrEqual(PLACEMENT_DEFAULTS.min);
    expect(reading).toBeLessThanOrEqual(PLACEMENT_DEFAULTS.max);
    expect(asked.length).toBeLessThanOrEqual(maxPlacementQuestions(['reading', 'writing']));
  });

  it('needs more questions when answers can be guessed', () => {
    const learner = (item: { difficulty: number }) => item.difficulty <= 1000;
    expect(run(learner, 1 / 3).asked.length).toBeGreaterThanOrEqual(run(learner, 0).asked.length);
  });

  it('lets answers in one skill move the others', () => {
    let state = startPlacement(['reading', 'writing']);
    for (const difficulty of [1100, 1200, 1300]) {
      state = recordPlacementAnswer(
        state,
        { id: `r${difficulty}`, skill: 'reading', difficulty },
        true,
      );
    }
    expect(state.ratings.writing).toBeGreaterThan(DEFAULT_RATING);
    expect(state.ratings.writing).toBeLessThan(state.ratings.reading!);
    expect(skillPlaced(state, 'writing')).toBe(false);
  });

  it('moves towards the learner: up after right answers, down after wrong ones', () => {
    expect(run(() => true).state.ratings.reading).toBeGreaterThan(DEFAULT_RATING + 100);
    expect(run(() => false).state.ratings.reading).toBeLessThan(DEFAULT_RATING - 100);
  });
});
