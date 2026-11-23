import { useEffect, useState } from 'react';
import { buildSession } from '@tjuvstart/engine';
import { allItems } from '../content/lessons';
import type { LanguagePack } from '../content/packs';
import type { Lesson } from '../content/types';
import { getProfile, mistakeMemory } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { homeHref } from '../routing/useHashRoute';
import { LessonPlayer } from './LessonPlayer';

export const PRACTICE_SIZE = 8;

/** A practice session built from the learner's weak skills and recurring mistakes. */
export function Practice({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const [session, setSession] = useState<Lesson | null>(null);

  useEffect(() => {
    void (async () => {
      const [profile, memory] = await Promise.all([getProfile(), mistakeMemory()]);
      const items = buildSession(allItems, profile.ratings, {
        size: PRACTICE_SIZE,
        recurring: memory.recurring,
        missed: memory.missed,
        exclude: memory.recentlyCorrect,
      });
      setSession({ id: 'practice', level: 'A2', title: t('practiceTitle'), summary: '', items });
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
