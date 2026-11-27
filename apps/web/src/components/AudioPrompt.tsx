import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_LISTENING_RATE } from '@tjuvstart/engine';
import { getProfile } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { SpeakButton } from './SpeakButton';

const SLOW_RATE = 0.75;

/**
 * The audio of a listening exercise, played at the learner's current listening speed, with a
 * slower replay. The text itself is never shown before the answer.
 */
export function AudioPrompt({ text }: { text: string }) {
  const { t } = useI18n();
  const rate = useLiveQuery(() => getProfile())?.listening?.rate ?? DEFAULT_LISTENING_RATE;
  return (
    <div className="audio-prompt">
      <SpeakButton
        text={text}
        rate={rate}
        label={t('playAudio')}
        className="button play-main"
        essential
      />
      <div className="audio-options">
        {rate > SLOW_RATE && (
          <SpeakButton
            text={text}
            rate={SLOW_RATE}
            label={t('listenSlow')}
            className="button secondary play-slow"
            essential
          />
        )}
        <span className="speed-note muted small" data-testid="listening-speed">
          {t('listeningSpeed', { percent: Math.round(rate * 100) })}
        </span>
      </div>
    </div>
  );
}
