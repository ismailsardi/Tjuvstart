import { useEffect, useState } from 'react';
import { MIN_ANSWERS_FOR_ESTIMATE, type CanDoStatus } from '@tjuvstart/engine';
import { SKILLS, type Skill } from '../content/types';
import type { Profile } from '../data/db';
import { canDoProgress, getProfile } from '../data/progress';

export interface ProgressSnapshot {
  profile: Profile;
  canDo: Map<string, CanDoStatus>;
}

async function snapshot(): Promise<ProgressSnapshot> {
  const [profile, canDo] = await Promise.all([getProfile(), canDoProgress()]);
  return { profile, canDo };
}

/**
 * Reads the learner's ratings and can-do statements when a session starts and again when it
 * ends, so the end screen can show what moved. Does nothing while `enabled` is false.
 */
export function useProgressSnapshot(done: boolean, enabled = true) {
  const [before, setBefore] = useState<ProgressSnapshot | null>(null);
  const [after, setAfter] = useState<ProgressSnapshot | null>(null);
  useEffect(() => {
    if (enabled) void snapshot().then(setBefore);
  }, [enabled]);
  useEffect(() => {
    if (enabled && done) void snapshot().then(setAfter);
  }, [enabled, done]);
  return { before, after };
}

export interface SkillChange {
  skill: Skill;
  before: number;
  after: number;
}

/** Skills the session gave answers in, once they have an estimate, with ratings before and after. */
export function skillChanges(before: ProgressSnapshot, after: ProgressSnapshot): SkillChange[] {
  return SKILLS.filter(
    (skill) =>
      after.profile.answers[skill] > before.profile.answers[skill] &&
      after.profile.answers[skill] >= MIN_ANSWERS_FOR_ESTIMATE,
  ).map((skill) => ({
    skill,
    before: before.profile.ratings[skill],
    after: after.profile.ratings[skill],
  }));
}
