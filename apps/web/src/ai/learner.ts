import { MIN_ANSWERS_FOR_ESTIMATE, ratingToLevel, type Level } from '@tjuvstart/engine';
import type { Skill } from '../content/types';
import type { Profile } from '../data/db';
import type { UiLanguage } from '../i18n/strings';
import type { LearnerContext } from './prompts';

const LANGUAGE_NAMES: Record<UiLanguage, string> = { en: 'English', fr: 'French' };
const JOB_NAMES: Record<string, string> = {
  it: 'IT and software',
  health: 'health and care',
  construction: 'construction',
  hospitality: 'hotels and restaurants',
};

/** The level for a skill once it has an estimate; the app's audience starts around A2. */
export function levelFor(profile: Profile, skill: Skill): Level {
  return profile.answers[skill] >= MIN_ANSWERS_FOR_ESTIMATE
    ? ratingToLevel(profile.ratings[skill])
    : 'A2';
}

export function learnerContext(
  profile: Profile,
  skill: Skill,
  language: UiLanguage,
  focus: readonly string[],
): LearnerContext {
  return {
    level: levelFor(profile, skill),
    explainIn: LANGUAGE_NAMES[language],
    job: profile.jobField ? JOB_NAMES[profile.jobField] : undefined,
    focus,
  };
}
