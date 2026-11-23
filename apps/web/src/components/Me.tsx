import { useLiveQuery } from 'dexie-react-hooks';
import type { LanguagePack } from '../content/packs';
import { getProfile, mistakeMemory, shadowedSentences } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { languagesHref, placementHref, wordsHref } from '../routing/useHashRoute';
import { MistakeList } from './MistakeList';
import { SkillLevels } from './SkillLevels';

export function Me({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const profile = useLiveQuery(() => getProfile());
  const memory = useLiveQuery(() => mistakeMemory());
  const shadowed = useLiveQuery(() => shadowedSentences()) ?? 0;
  const languageNames =
    packs.length > 0 ? packs.map((pack) => pack.nativeName).join(', ') : t('otherLanguage');
  return (
    <>
      <h1>{t('profile')}</h1>
      <section className="panel" aria-labelledby="me-level">
        <h2 id="me-level">{t('yourLevel')}</h2>
        <SkillLevels profile={profile} />
        <p className="muted small" data-testid="shadowed">
          {t('shadowedCount', { n: shadowed })}
        </p>
        <a href={placementHref}>{t('redoPlacement')}</a>
      </section>
      <section className="panel" aria-labelledby="me-mistakes">
        <h2 id="me-mistakes">{t('recurringMistakes')}</h2>
        <MistakeList focus={memory?.recurring ?? []} />
      </section>
      <section className="panel" aria-label={t('languages', { languages: '' })}>
        <p data-testid="languages">
          {t('languages', { languages: languageNames })} · <a href={languagesHref}>{t('change')}</a>
        </p>
        <p data-testid="job-field">
          {t('myJob')}: {profile?.jobField ? t(`field_${profile.jobField}`) : '–'} ·{' '}
          <a href={wordsHref}>{t('change')}</a>
        </p>
      </section>
    </>
  );
}
