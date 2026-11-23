import { useLiveQuery } from 'dexie-react-hooks';
import { AiError } from '../ai/client';
import { learnerContext } from '../ai/learner';
import { getAiSettings } from '../ai/settings';
import type { Skill } from '../content/types';
import { getProfile, mistakeMemory } from '../data/progress';
import { useI18n } from '../i18n/useI18n';

/** Settings and learner context for an AI feature. `settings` is null when no key is saved. */
export function useAi(skill: Skill) {
  const { t, language } = useI18n();
  const data = useLiveQuery(async () => {
    const [settings, profile, memory] = await Promise.all([
      getAiSettings(),
      getProfile(),
      mistakeMemory(),
    ]);
    return {
      settings: settings ?? null,
      learner: learnerContext(profile, skill, language, memory.recurring),
    };
  }, [skill, language]);

  const errorText = (error: unknown) =>
    t(error instanceof AiError ? `aiError_${error.kind}` : 'aiError_other');

  return { ...data, loading: data === undefined, errorText };
}
