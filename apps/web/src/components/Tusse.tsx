import { useEffect, useRef, useState, type AnimationEvent } from 'react';
import type { TusseRig } from './tusse/rig';
import type { Outfit } from './outfits';
import { hatStillFile, layerFiles, layerUrl, outfitKey } from './tusse/layers';
import { PAD, RIG } from './tusse/rigData';

/**
 * Tusse, the app's troll (the learner can rename it). Purely decorative: it reacts to answers and
 * wears the clothes the learner has earned and picked, but never carries information the text
 * doesn't already give.
 */
export type TussePose = 'rest' | 'coffee' | 'thumbs' | 'shrug' | 'cheer' | 'wave' | 'sleep';

export interface TusseProps {
  pose?: TussePose;
  /** What it wears, one item per slot. */
  outfit?: Outfit;
  /** Width in CSS pixels. The troll's box is 200 × 220. */
  size?: number;
  /** Small idle movements (breathing, blinking, fidgets). Off under reduced motion either way. */
  idle?: boolean;
  className?: string;
}

function artUrl(pose: TussePose): string {
  return `${import.meta.env.BASE_URL}troll/tusse-${pose}.webp`;
}

let rigSupport: boolean | undefined;
/** The rig needs WebGL2 and motion. Checked once. */
function canRig(): boolean {
  if (rigSupport === undefined) {
    try {
      rigSupport =
        !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches &&
        typeof WebGL2RenderingContext !== 'undefined' &&
        !!document.createElement('canvas').getContext('webgl2');
    } catch {
      rigSupport = false;
    }
  }
  return rigSupport;
}

/**
 * Tusse as the learner sees it: the illustrated troll, one rendered pose per state, in a 200 × 220
 * box.
 *
 * Where the device can, the pose is animated by the rig (tusse/rig.ts, loaded on demand): it
 * breathes, blinks, looks around and at the pointer, and each pose plays its own act. Until the rig
 * is ready, and on devices without WebGL2 or with reduced motion, the still is shown with a CSS
 * idle bounce and a hop on tap.
 *
 * Clothes are layers drawn for each pose (tusse/layers.ts), so the troll looks the same dressed or
 * not, still or moving. The coffee pose brings its own rock.
 */
export function Tusse({
  pose = 'rest',
  outfit = {},
  size = 96,
  idle = true,
  className,
}: TusseProps) {
  const [hopping, setHopping] = useState(false);
  const [rigged] = useState(() => idle && canRig());
  if (rigged && idle)
    return <RiggedTusse pose={pose} outfit={outfit} size={size} className={className} />;
  return (
    <Still
      pose={pose}
      outfit={outfit}
      size={size}
      className={[
        'tusse',
        'tusse-art',
        `tusse-${pose}`,
        idle && 'tusse-idle',
        hopping && 'tusse-hopping',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      // A tap is only for fun: it changes nothing, so there's no keyboard or screen reader equivalent.
      onPointerDown={idle ? () => setHopping(true) : undefined}
      onAnimationEnd={(e) => {
        if (e.animationName === 'tusse-hop') setHopping(false);
      }}
    />
  );
}

/**
 * The still pose, with its clothes laid over it. Undressed, it's a single image. Dressed, the
 * pieces are stacked on the still in the same box; they're drawn in the rig's art space, so poses
 * the rig scales to match the others (rest and wave) get the same scale here.
 */
function Still({
  pose,
  outfit,
  size,
  className,
  ...events
}: {
  pose: TussePose;
  outfit: Outfit;
  size: number;
  className?: string;
  onPointerDown?: () => void;
  onAnimationEnd?: (e: AnimationEvent) => void;
}) {
  const height = (size * 220) / 200;
  const back = layerFiles(outfit, pose, 'back');
  const front = [...layerFiles(outfit, pose, 'body'), ...layerFiles(outfit, pose, 'head')];
  const base = import.meta.env.BASE_URL;
  // Under a hat, a copy of the still without the hair that would poke through it.
  const hatStill = hatStillFile(outfit, pose);
  const img = (
    <img
      src={hatStill ? layerUrl(base, hatStill) : artUrl(pose)}
      onError={
        hatStill
          ? (e) => {
              const el = e.currentTarget;
              if (!el.src.endsWith(artUrl(pose))) el.src = artUrl(pose);
            }
          : undefined
      }
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={height}
      className={back.length || front.length ? undefined : className}
      {...(back.length || front.length ? {} : events)}
    />
  );
  if (!back.length && !front.length) return img;
  const fit = RIG[pose].fit;
  // The rig maps art x to tx + (x - cx) · sx and y to 425 + (y - 425) · sy (in 400 × 440 units).
  const transform = fit
    ? `translate(${(fit[3] - fit[2] * fit[0]) / 4}%, ${(425 * (1 - fit[1])) / 4.4}%) scale(${fit[0]}, ${fit[1]})`
    : undefined;
  const layer = (file: string) => (
    <img
      key={file}
      className="tusse-layer"
      src={layerUrl(base, file)}
      alt=""
      draggable={false}
      style={transform ? { transform } : undefined}
    />
  );
  return (
    <span
      className={['tusse-dressed', className].filter(Boolean).join(' ')}
      style={{ width: size, height }}
      aria-hidden="true"
      data-outfit={outfitKey(outfit)}
      {...events}
    >
      {back.map(layer)}
      {img}
      {front.map(layer)}
    </span>
  );
}

/**
 * The animated troll. The canvas is larger than the troll's box (room for hops and raised arms)
 * and centred on it the same way the rig centres the art, so the troll lands exactly where the
 * still was. The still stays underneath until the first frame is drawn, and for good if the rig
 * fails to load.
 */
function RiggedTusse({
  pose,
  outfit,
  size,
  className,
}: {
  pose: TussePose;
  outfit: Outfit;
  size: number;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const rig = useRef<TusseRig | null>(null);
  const latest = useRef(pose);
  const latestOutfit = useRef(outfit);
  const [ready, setReady] = useState(false);
  const key = outfitKey(outfit);

  useEffect(() => {
    let cancelled = false;
    const el = canvas.current;
    if (!el) return;
    import('./tusse/rig')
      .then(({ createTusseRig }) =>
        createTusseRig(el, latest.current, import.meta.env.BASE_URL, latestOutfit.current),
      )
      .then((r) => {
        if (cancelled) return r.dispose();
        rig.current = r;
        r.setOutfit(latestOutfit.current);
        r.setPose(latest.current);
        setReady(true);
      })
      .catch(() => {
        // The still stays.
      });
    return () => {
      cancelled = true;
      rig.current?.dispose();
      rig.current = null;
    };
  }, []);

  useEffect(() => {
    latest.current = pose;
    rig.current?.setPose(pose);
  }, [pose]);

  useEffect(() => {
    latestOutfit.current = outfit;
    rig.current?.setOutfit(outfit);
    // The key says when the clothes really changed; a new object with the same items doesn't count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const height = (size * 220) / 200;
  // The rig draws its 400 × 440 art inside a larger canvas (PAD), so scale by art units.
  const unit = size / 400;
  const cw = PAD.w * unit;
  const ch = PAD.h * unit;
  const dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2.5);
  return (
    <span
      className={['tusse', 'tusse-rig', `tusse-${pose}`, ready && 'tusse-rig-ready', className]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height }}
      aria-hidden="true"
      // A tap is only for fun: it changes nothing, so there's no keyboard or screen reader equivalent.
      onPointerDown={() => rig.current?.tap()}
    >
      <Still pose={pose} outfit={outfit} size={size} className="tusse-rig-still" />
      <canvas
        ref={canvas}
        width={Math.round(cw * dpr)}
        height={Math.round(ch * dpr)}
        style={{ width: cw, height: ch, left: -PAD.x * unit, top: -PAD.y * unit }}
      />
    </span>
  );
}
