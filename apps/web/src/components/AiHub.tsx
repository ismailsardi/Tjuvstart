import { SCENARIOS, WRITING_TASKS } from '../ai/prompts';
import { useI18n } from '../i18n/useI18n';
import {
  aiReadingHref,
  homeHref,
  meHref,
  rolePlayHref,
  writingHref,
} from '../routing/useHashRoute';
import { useAi } from './useAi';

/** The optional AI features, or how to turn them on. */
export function AiHub() {
  const { t } = useI18n();
  const { settings, loading } = useAi('writing');
  if (loading) return null;

  return (
    <>
      <a href={homeHref} className="muted">
        {t('home')}
      </a>
      <header className="page-header">
        <h1>{t('aiTitle')}</h1>
        <p className="muted">{t('aiIntro')}</p>
      </header>

      {!settings ? (
        <p className="panel">
          {t('aiKeyCta')} <a href={meHref}>{t('navMe')}</a>
        </p>
      ) : (
        <>
          <section className="panel" aria-labelledby="ai-roleplay">
            <h2 id="ai-roleplay">{t('aiRolePlay')}</h2>
            <p className="muted">{t('aiRolePlayIntro')}</p>
            <ul className="link-list">
              {SCENARIOS.map((s) => (
                <li key={s.id}>
                  <a href={rolePlayHref(s.id)} lang="nb">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel" aria-labelledby="ai-writing">
            <h2 id="ai-writing">{t('aiWriting')}</h2>
            <p className="muted">{t('aiWritingIntro')}</p>
            <ul className="link-list">
              {WRITING_TASKS.map((task) => (
                <li key={task.id}>
                  <span className="badge">{task.level}</span>{' '}
                  <a href={writingHref(task.id)} lang="nb">
                    {task.prompt.split('. ')[0]}.
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel" aria-labelledby="ai-reading">
            <h2 id="ai-reading">{t('aiReading')}</h2>
            <p className="muted">{t('aiReadingIntro')}</p>
            <a className="button" href={aiReadingHref}>
              {t('start')}
            </a>
          </section>
        </>
      )}
    </>
  );
}
