import { useEffect, useState } from 'react';
import { buildSession } from '@tjuvstart/engine';
import { allItems } from '../content/lessons';
import type { LanguagePack } from '../content/packs';
import type { Lesson, Skill } from '../content/types';
import { getProfile, mistakeMemory } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { homeHref } from '../routing/useHashRoute';
import { LessonPlayer } from './LessonPlayer';

export const PRACTICE_SIZE = 8;

/**
 * A practice session built from the learner's weak skills and recurring mistakes, or from one
 * skill only (listening practice).
 */
export function Practice({
  packs = [],
  skill,
}: {
  packs?: readonly LanguagePack[];
  skill?: Skill;
}) {
  const { t } = useI18n();
  const [session, setSession] = useState<Lesson | null>(null);

  useEffect(() => {
    void (async () => {
      const [profile, memory] = await Promise.all([getProfile(), mistakeMemory()]);
      const pool = skill ? allItems.filter((item) => item.skill === skill) : allItems;
      const items = buildSession(pool, profile.ratings, {
        size: PRACTICE_SIZE,
        recurring: memory.recurring,
        missed: memory.missed,
        exclude: memory.recentlyCorrect,
      });
      setSession({
        id: skill ? `practice-${skill}` : 'practice',
        level: 'A2',
        title: t(skill === 'listening' ? 'listeningTitle' : 'practiceTitle'),
        summary: '',
        items,
      });
    })();
    // Build the session once per visit, in the language active at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) return null;
  if (session.items.length === 0) {
    return (
      <p className="panel">
        {t('practiceEmpty')} <a href={homeHref}>{t('backHome')}</a>
      </p>
    );
  }
  return <LessonPlayer lesson={session} packs={packs} practice />;
}
