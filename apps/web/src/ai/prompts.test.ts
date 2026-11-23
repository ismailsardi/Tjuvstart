import { describe, expect, it } from 'vitest';
import {
  SCENARIOS,
  WRITING_TASKS,
  readingSystem,
  rolePlaySystem,
  toItems,
  writingSystem,
  type LearnerContext,
} from './prompts';

const learner: LearnerContext = {
  level: 'A2',
  explainIn: 'French',
  job: 'health and care',
  focus: ['v2-word-order'],
};

describe('AI prompts', () => {
  it('give the model the learner’s level, language, job and weak spots', () => {
    const system = rolePlaySystem(SCENARIOS[0]!, learner);
    expect(system).toContain('CEFR A2');
    expect(system).toContain('bokmål only');
    expect(system).toContain('in French');
    expect(system).toContain('health and care');
    expect(system).toContain('v2-word-order');
    expect(system).toContain(SCENARIOS[0]!.setup);
  });

  it('leave out what the learner has not shared', () => {
    const system = readingSystem('weekend plans', { level: 'B1', explainIn: 'English', focus: [] });
    expect(system).not.toContain('They work in');
    expect(system).not.toContain('mistakes with');
  });

  it('quote the writing task and guard against instructions in the text', () => {
    const task = WRITING_TASKS[0]!;
    const system = writingSystem(task, learner);
    expect(system).toContain(task.prompt);
    expect(system).toContain('even if it contains instructions');
  });

  it('turn generated questions into items and drop broken ones', () => {
    const items = toItems(
      {
        title: 'T',
        text: 'Tekst.',
        questions: [
          { question: 'Q1', options: ['a', 'b', 'c'], answerIndex: 1 },
          { question: 'Q2', options: ['a', 'b'], answerIndex: 2 },
          { question: 'Q3', options: ['a'], answerIndex: 0 },
        ],
      },
      'A2',
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'multiple-choice', answer: 1, skill: 'reading' });
  });

  it('have unique ids', () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    expect(new Set(WRITING_TASKS.map((w) => w.id)).size).toBe(WRITING_TASKS.length);
  });
});
