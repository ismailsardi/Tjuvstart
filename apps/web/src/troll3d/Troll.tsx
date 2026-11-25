import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Tusse } from '../components/Tusse';
import { troll3dEnabled } from './flag';
import type { TrollScene } from './trollScene';

/** 3D needs WebGL and motion; everyone else gets the drawn troll. */
function canShow3d(): boolean {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

type Props = ComponentProps<typeof Tusse>;

/**
 * The troll for the big spots (Today, the wardrobe). Shows the drawn troll unless the 3D preview
 * is on and the device can draw it; three.js is only downloaded in that case. If anything fails,
 * it stays on the drawing.
 */
export function Troll(props: Props) {
  const [use3d] = useState(() => troll3dEnabled() && canShow3d());
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  if (!use3d || failed) return <Tusse {...props} />;
  return <Troll3d {...props} onError={onError} />;
}

function Troll3d({
  pose = 'rest',
  outfit = {},
  size = 96,
  className,
  onError,
}: Props & { onError: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<TrollScene | null>(null);
  const initial = useRef({ pose, outfit });

  useEffect(() => {
    let cancelled = false;
    import('./trollScene')
      .then(({ mountTroll }) => mountTroll(canvas.current!, initial.current))
      .then((s) => {
        if (cancelled) s.dispose();
        else scene.current = s;
      })
      .catch(onError);
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [onError]);

  useEffect(() => scene.current?.setPose(pose), [pose]);
  useEffect(() => scene.current?.setOutfit(outfit), [outfit]);

  return (
    <canvas
      ref={canvas}
      className={['tusse tusse-3d', className].filter(Boolean).join(' ')}
      style={{ width: size, height: (size * 220) / 200 }}
      aria-hidden="true"
    />
  );
}
