import { useEffect, useState } from 'react';
import { speak, speakAll, stopSpeaking } from '../audio/speech';
import { useI18n } from '../i18n/useI18n';

interface Props {
  /** One text, or several to read one after the other. */
  text: string | string[];
  label?: string;
  /** Playback speed; 1 is normal. */
  rate?: number;
  className?: string;
}

/** Reads Norwegian text aloud; pressing it again stops. */
export function SpeakButton({ text, label, rate = 1, className = 'speak' }: Props) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  async function toggle() {
    if (playing) {
      stopSpeaking();
      return;
    }
    setPlaying(true);
    const ok = Array.isArray(text) ? await speakAll(text, { rate }) : await speak(text, { rate });
    setPlaying(false);
    setUnavailable(!ok);
  }

  return (
    <>
      <button
        type="button"
        className={className}
        aria-pressed={playing}
        onClick={() => void toggle()}
      >
        <span aria-hidden="true">{playing ? '■' : '▶'}</span>{' '}
        {playing ? t('stopListening') : (label ?? t('listen'))}
      </button>
      {unavailable && (
        <span className="muted small" role="status">
          {t('noVoice')}
        </span>
      )}
    </>
  );
}
