import { useLiveQuery } from 'dexie-react-hooks';
import type { LanguagePack } from '../content/packs';
import { getProfile } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { languagesHref } from '../routing/useHashRoute';
import { SkillLevels } from './SkillLevels';

export function Me({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const profile = useLiveQuery(() => getProfile());
  const languageNames =
    packs.length > 0 ? packs.map((pack) => pack.nativeName).join(', ') : t('otherLanguage');
  return (
    <>
      <h1>{t('profile')}</h1>
      <section className="panel" aria-labelledby="me-level">
        <h2 id="me-level">{t('yourLevel')}</h2>
        <SkillLevels profile={profile} />
      </section>
      <section className="panel" aria-label={t('languages', { languages: '' })}>
        <p data-testid="languages">
          {t('languages', { languages: languageNames })} · <a href={languagesHref}>{t('change')}</a>
        </p>
      </section>
    </>
  );
}
