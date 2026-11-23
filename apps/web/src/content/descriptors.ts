import type { Level } from '@tjuvstart/engine';
import { allItems } from './lessons';
import { firstNote, getPack, type LanguagePack } from './packs';
import type { Skill } from './types';

export interface Descriptor {
  id: string;
  level: Level;
  skill: Skill;
  /** The CEFR-style statement, in English and in the third person. */
  text: string;
}

const files = import.meta.glob<{ descriptors: Descriptor[] }>(
  '../../../../content/descriptors.json',
  { eager: true, import: 'default' },
);

export const descriptors: readonly Descriptor[] = Object.values(files).flatMap(
  (file) => file.descriptors,
);

/** Descriptors that at least one exercise checks; the others cannot be tracked yet. */
const tagged = new Set(allItems.flatMap((item) => item.descriptors));
export const trackedDescriptors: readonly Descriptor[] = descriptors.filter((d) =>
  tagged.has(d.id),
);

/** A can-do statement in the learner's language, falling back to English. */
export function canDoText(
  descriptor: Descriptor,
  packs: readonly LanguagePack[],
): { text: string; pack?: LanguagePack } {
  const english = getPack('en');
  const note = firstNote(
    [...packs, ...(english ? [english] : [])],
    (pack) => pack.canDo?.[descriptor.id],
  );
  return note ?? { text: descriptor.text };
}
