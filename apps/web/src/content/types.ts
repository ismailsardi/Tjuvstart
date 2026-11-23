import type { Level } from '@tjuvstart/engine';

/** Types mirror content/schema/lesson.schema.json. The .NET validator enforces the schema in CI. */

export const SKILLS = ['reading', 'listening', 'writing', 'speaking'] as const;
export type Skill = (typeof SKILLS)[number];

export const FOCUS_POINTS = [
  'v2-word-order',
  'subordinate-clause',
  'ikke-placement',
  'noun-gender',
  'definite-form',
  'object-pronouns',
  'verb-present',
  'modal-verbs',
  'conjunctions',
  'question-words',
  'time-expressions',
  'fixed-expressions',
] as const;
export type FocusPoint = (typeof FOCUS_POINTS)[number];

interface ItemBase {
  id: string;
  skill: Skill;
  level: Level;
  descriptors: string[];
  /** Grammar or usage points practised; repeated mistakes on them are recycled. */
  focus?: FocusPoint[];
  difficulty: number;
  prompt: string;
  hint?: string;
  /** Norwegian text the learner hears instead of reads. Every listening item has one. */
  audio?: string;
}

export interface MultipleChoiceItem extends ItemBase {
  type: 'multiple-choice';
  options: string[];
  answer: number;
}

export interface GapFillItem extends ItemBase {
  type: 'gap-fill';
  answers: string[];
}

export interface WordOrderItem extends ItemBase {
  type: 'word-order';
  tokens: string[];
  answer: string;
}

/** The learner writes down what they hear. The answer is the audio text. */
export interface DictationItem extends ItemBase {
  type: 'dictation';
  audio: string;
}

export type Item = MultipleChoiceItem | GapFillItem | WordOrderItem | DictationItem;

/** A text shaped like a real-world document, simplified to the lesson's level. */
export interface LessonDocument {
  kind: 'letter' | 'ad' | 'job-ad' | 'notice';
  from?: string;
}

export interface Lesson {
  id: string;
  level: Level;
  title: string;
  summary: string;
  document?: LessonDocument;
  text?: string;
  items: Item[];
}

// Skill names stay in Norwegian: learners meet them again in the exam and in class.
export const SKILL_NAMES: Record<Skill, string> = {
  reading: 'Lesing',
  listening: 'Lytting',
  writing: 'Skriving',
  speaking: 'Muntlig',
};
