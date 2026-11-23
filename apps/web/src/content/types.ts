import type { Level } from '@tjuvstart/engine';

/** Types mirror content/schema/lesson.schema.json. The .NET validator enforces the schema in CI. */

export const SKILLS = ['reading', 'listening', 'writing', 'speaking'] as const;
export type Skill = (typeof SKILLS)[number];

interface ItemBase {
  id: string;
  skill: Skill;
  level: Level;
  descriptors: string[];
  difficulty: number;
  prompt: string;
  hint?: string;
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

export type Item = MultipleChoiceItem | GapFillItem | WordOrderItem;

export interface Lesson {
  id: string;
  level: Level;
  title: string;
  summary: string;
  text?: string;
  items: Item[];
}
