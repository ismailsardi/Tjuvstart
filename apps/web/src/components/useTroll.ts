import { useLiveQuery } from 'dexie-react-hooks';
import type { Profile } from '../data/db';
import { dailyProgress, getProfile } from '../data/progress';
import { earnedItems, outfitFor, trollName, type ItemId, type Outfit } from './outfits';

export interface Troll {
  name: string;
  outfit: Outfit;
  earned: Set<ItemId>;
  /** Longest streak so far, for "n more days" hints. */
  longest: number;
}

export function trollFor(profile: Profile | undefined, longest = 0): Troll {
  const earned = earnedItems(profile, longest);
  return {
    name: trollName(profile),
    outfit: outfitFor(profile, earned),
    earned,
    longest: Math.max(longest, profile?.bestStreak ?? 0),
  };
}

/** The learner's troll: its name, what it wears, and what it has earned. */
export function useTroll(): Troll {
  const data = useLiveQuery(async () => {
    const [profile, progress] = await Promise.all([getProfile(), dailyProgress()]);
    return { profile, longest: progress.longest };
  });
  return trollFor(data?.profile, data?.longest);
}
