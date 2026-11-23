import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AI_MODELS,
  DEFAULT_AI_MODEL,
  clearAiSettings,
  getAiSettings,
  looksLikeApiKey,
  saveAiSettings,
} from '../ai/settings';
import { useI18n } from '../i18n/useI18n';

/** Add, change or remove the learner's own API key. */
export function AiSettingsForm() {
  const { t } = useI18n();
  const settings = useLiveQuery(async () => (await getAiSettings()) ?? null);
  const [key, setKey] = useState('');
  const [model, setModel] = useState<string>(DEFAULT_AI_MODEL);
  const [invalid, setInvalid] = useState(false);

  if (settings === undefined) return null;

  if (settings) {
    return (
      <div className="ai-settings">
        <p data-testid="ai-key-saved">{t('aiKeySaved', { model: settings.model })}</p>
        <button type="button" className="secondary" onClick={() => void clearAiSettings()}>
          {t('aiKeyRemove')}
        </button>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!looksLikeApiKey(key)) {
      setInvalid(true);
      return;
    }
    await saveAiSettings(key, model);
    setKey('');
  }

  return (
    <form className="ai-settings" onSubmit={(e) => void submit(e)}>
      <p className="muted small">{t('aiKeyIntro')}</p>
      <label>
        {t('aiKeyLabel')}
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setInvalid(false);
          }}
          aria-invalid={invalid}
        />
      </label>
      {invalid && (
        <p className="error small" role="alert">
          {t('aiKeyInvalid')}
        </p>
      )}
      <label>
        {t('aiModelLabel')}
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          {AI_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">{t('aiSave')}</button>
    </form>
  );
}
