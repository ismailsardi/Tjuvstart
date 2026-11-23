import { useEffect, useState } from 'react';
import { canPlay, speak, speakAll, stopSpeaking } from '../audio/speech';
import { useI18n } from '../i18n/useI18n';

interface Props {
  /** One text, or several to read one after the other. */
  text: string | string[];
  label?: string;
  /** Playback speed; 1 is normal. */
  rate?: number;
  className?: string;
  /**
   * The audio is the exercise itself, as in a listening item: always show the button, and say
   * so if the audio fails to load, rather than leaving the learner with nothing to press.
   */
  essential?: boolean;
}

/**
 * Reads Norwegian text aloud; pressing it again stops. Text with no recording, on a device
 * with no Norwegian voice (such as a newly generated AI text), gets no button at all, unless the
 * audio is essential.
 */
export function SpeakButton({
  text,
  label,
  rate = 1,
  className = 'speak',
  essential = false,
}: Props) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const key = Array.isArray(text) ? text.join('\n') : text;

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (essential) return;
    let live = true;
    const check = () => void canPlay(key.split('\n')).then((ok) => live && setAvailable(ok));
    check();
    // Browsers load their voices late; check again when they arrive.
    const synth = 'speechSynthesis' in window ? window.speechSynthesis : undefined;
    synth?.addEventListener?.('voiceschanged', check);
    return () => {
      live = false;
      synth?.removeEventListener?.('voiceschanged', check);
    };
  }, [key, essential]);

  if (available === false) return null;

  async function toggle() {
    if (playing) {
      stopSpeaking();
      return;
    }
    setPlaying(true);
    const ok = Array.isArray(text) ? await speakAll(text, { rate }) : await speak(text, { rate });
    setPlaying(false);
    setFailed(!ok);
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
      {failed && (
        <span className="muted small" role="status">
          {t('audioFailed')}
        </span>
      )}
    </>
  );
}
