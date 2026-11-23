import { useState } from 'react';
import { askClaude, type ChatMessage } from '../ai/client';
import { RolePlayTurn, SCENARIOS, rolePlaySystem } from '../ai/prompts';
import { useI18n } from '../i18n/useI18n';
import { aiHref } from '../routing/useHashRoute';
import { useAi } from './useAi';

interface Line {
  from: 'partner' | 'learner';
  text: string;
  correction?: string;
  explanation?: string;
}

/** A typed conversation with an AI partner, with a gentle correction after each message. */
export function RolePlay({ scenarioId }: { scenarioId: string }) {
  const { t } = useI18n();
  const { settings, learner, loading, errorText } = useAi('writing');
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  const [lines, setLines] = useState<Line[]>(() =>
    scenario ? [{ from: 'partner', text: scenario.opening }] : [],
  );
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (!scenario || !settings || !learner) {
    return (
      <p className="panel">
        <a href={aiHref}>{t('aiTitle')}</a>
      </p>
    );
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy || !scenario || !settings || !learner) return;
    const next: Line[] = [...lines, { from: 'learner', text }];
    setLines(next);
    setDraft('');
    setBusy(true);
    setError(null);
    // The API expects the user to speak first, so the partner's opening follows a short cue.
    const messages: ChatMessage[] = [
      { role: 'user', content: '(The learner arrives. Start the conversation.)' },
      ...next.map((line) => ({
        role: line.from === 'partner' ? ('assistant' as const) : ('user' as const),
        content: line.text,
      })),
    ];
    try {
      const turn = await askClaude(settings, {
        system: rolePlaySystem(scenario, learner),
        messages,
        schema: RolePlayTurn,
      });
      setLines([
        ...next.slice(0, -1),
        {
          from: 'learner',
          text,
          correction: turn.correction || undefined,
          explanation: turn.explanation || undefined,
        },
        { from: 'partner', text: turn.reply },
      ]);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="roleplay" aria-labelledby="roleplay-heading">
      <a href={aiHref} className="muted">
        ← {t('aiTitle')}
      </a>
      <h1 id="roleplay-heading" lang="nb">
        {scenario.title}
      </h1>
      <ol className="chat" aria-live="polite">
        {lines.map((line, i) => (
          <li key={i} className={`bubble ${line.from}`} data-testid={`line-${line.from}`}>
            <p lang="nb">{line.text}</p>
            {line.correction && (
              <p className="correction small">
                {t('aiBetter')} <strong lang="nb">{line.correction}</strong>
                {line.explanation && <span className="muted"> {line.explanation}</span>}
              </p>
            )}
          </li>
        ))}
        {busy && <li className="bubble partner muted">{t('aiThinking')}</li>}
      </ol>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form className="chat-input" onSubmit={(e) => void send(e)}>
        <label className="visually-hidden" htmlFor="roleplay-input">
          {t('aiYourMessage')}
        </label>
        <input
          id="roleplay-input"
          lang="nb"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !draft.trim()}>
          {t('aiSend')}
        </button>
      </form>
    </article>
  );
}
