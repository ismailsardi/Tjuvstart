import { pickNextItem, type Item } from './picker';

export interface SessionItem extends Item {
  skill: string;
  focus?: readonly string[];
}

export interface SessionOptions {
  /** Number of items in the session. */
  size?: number;
  /** Focus points the learner keeps getting wrong, worst first. */
  recurring?: readonly string[];
  /** Items answered wrong before, most recent first. They are tried again first. */
  missed?: readonly string[];
  /** Items to leave out, such as ones answered correctly very recently. */
  exclude?: ReadonlySet<string>;
}

/**
 * Builds a practice session from weak spots: about half the items target recurring
 * mistakes (items missed before come first), the rest go to the weakest skills.
 * Every pick aims at the usual 80% expected success for the item's skill.
 */
export function buildSession<T extends SessionItem>(
  items: readonly T[],
  ratings: Readonly<Record<string, number>>,
  { size = 8, recurring = [], missed = [], exclude = new Set() }: SessionOptions = {},
): T[] {
  const chosen: T[] = [];
  const used = new Set(exclude);
  const take = (item: T | undefined) => {
    if (!item || used.has(item.id) || chosen.length >= size) return;
    chosen.push(item);
    used.add(item.id);
  };
  const ability = (item: T) => ratings[item.skill] ?? 1000;

  const targeted = items.filter((item) => item.focus?.some((f) => recurring.includes(f)));
  const mistakeBudget = recurring.length > 0 ? Math.ceil(size / 2) : 0;

  const byId = new Map(items.map((item) => [item.id, item]));
  for (const id of missed) {
    if (chosen.length >= mistakeBudget) break;
    const item = byId.get(id);
    if (item?.focus?.some((f) => recurring.includes(f))) take(item);
  }
  for (const focus of recurring) {
    if (chosen.length >= mistakeBudget) break;
    const pool = targeted.filter((item) => item.focus?.includes(focus));
    const first = pool[0];
    if (first) take(pickNextItem(ability(first), pool, { exclude: used }));
  }

  // Fill the rest from the skills with the lowest rating, one pick at a time.
  const skills = [...new Set(items.map((item) => item.skill))].sort(
    (a, b) => (ratings[a] ?? 1000) - (ratings[b] ?? 1000),
  );
  for (let round = 0; chosen.length < size && round < size; round++) {
    for (const skill of skills) {
      if (chosen.length >= size) break;
      const pool = items.filter((item) => item.skill === skill);
      take(pickNextItem(ratings[skill] ?? 1000, pool, { exclude: used }));
    }
  }
  return chosen;
}
