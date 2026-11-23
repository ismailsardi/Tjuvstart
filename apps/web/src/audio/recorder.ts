import { useCallback, useEffect, useRef, useState } from 'react';

/** Long enough for any lesson sentence, short enough that a forgotten recording stops itself. */
const MAX_RECORDING_MS = 15_000;

export function canRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export type RecorderState = 'idle' | 'recording' | 'denied';

/**
 * Records the microphone into a local object URL. Nothing leaves the device, and the
 * recording is released when a new one starts or the component unmounts.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [url, setUrl] = useState<string>();
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  useEffect(() => () => recorder.current?.stop(), []);

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState('denied');
      return;
    }
    const chunks: Blob[] = [];
    const media = new MediaRecorder(stream);
    media.ondataavailable = (event) => chunks.push(event.data);
    media.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      setUrl(URL.createObjectURL(new Blob(chunks, { type: media.mimeType })));
      setState('idle');
    };
    recorder.current = media;
    setUrl(undefined);
    media.start();
    setState('recording');
    timer.current = setTimeout(stop, MAX_RECORDING_MS);
  }, [stop]);

  const clear = useCallback(() => setUrl(undefined), []);

  return { state, url, start, stop, clear };
}
