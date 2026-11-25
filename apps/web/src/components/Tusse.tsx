import { useState, type ComponentProps, type ReactNode } from 'react';
import type { Outfit } from './outfits';

/**
 * Tusse, the app's troll (the learner can rename it). Purely decorative: it reacts to answers and
 * wears the clothes the learner has earned and picked, but never carries information the text
 * doesn't already give.
 *
 * Between reactions it idles: it breathes, sways, blinks, looks around, twitches its ears and swishes
 * its tail, each on its own loop so the mix rarely repeats. A tap makes it hop. All of this is CSS
 * and switches off under prefers-reduced-motion.
 *
 * Drawn in a 200 × 220 box. The idle animations in index.css pivot on points in that box (the feet,
 * the eyes, the ear and tail roots), so moving those parts means moving the origins too.
 */
export type TussePose = 'rest' | 'coffee' | 'thumbs' | 'shrug' | 'cheer' | 'wave' | 'sleep';

const C = {
  navy: '#0f2440',
  navySoft: '#1d3a63',
  orange: '#e4572e',
  orangeDark: '#c8431f',
  orangeLight: '#f08a5d',
  snow: '#f4f6fa',
  body: '#86a3cb',
  bodyDark: '#6385b3',
  bodyShade: '#4f6f9c',
  belly: '#d2def0',
  bellyLine: '#b3c6e2',
  nose: '#f2a07b',
  blush: '#f59d86',
  ink: '#14213d',
  iris: '#2b4f86',
  tooth: '#fffaf0',
  steel: '#b8c3d3',
  steelDark: '#9aa8bc',
  horn: '#f3e6cf',
  hornEdge: '#d9c6a4',
};

const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Arm({ d }: { d: string }) {
  return <path d={d} stroke={C.bodyDark} strokeWidth={14} {...line} />;
}

/** A round paw with two finger creases, turned to face `angle` degrees. */
function Hand({ x, y, r = 9, angle = 0 }: { x: number; y: number; r?: number; angle?: number }) {
  return (
    <g transform={`rotate(${angle} ${x} ${y})`}>
      <circle cx={x} cy={y} r={r} fill={C.bodyDark} />
      <path
        d={`M${x - r * 0.35} ${y - r * 0.85} v${r * 0.5} M${x + r * 0.25} ${y - r * 0.9} v${r * 0.5}`}
        stroke={C.bodyShade}
        strokeWidth={1.6}
        {...line}
      />
    </g>
  );
}

const LEFT_REST = 'M48 140 C38 152 40 164 50 170';
const RIGHT_REST = 'M152 140 C162 152 160 164 150 170';

function Arms({ pose }: { pose: TussePose }) {
  switch (pose) {
    case 'thumbs':
      return (
        <>
          <Arm d={LEFT_REST} />
          <Hand x={50} y={172} angle={180} />
          <Arm d="M152 138 C168 130 174 116 172 104" />
          <circle cx={172} cy={100} r={11} fill={C.bodyDark} />
          <rect x={166} y={78} width={10} height={22} rx={5} fill={C.bodyDark} />
          <path d="M163 100 h14 M163 106 h12" stroke={C.bodyShade} strokeWidth={2} {...line} />
        </>
      );
    case 'shrug':
      return (
        <>
          <Arm d="M48 138 C32 132 26 118 30 106" />
          <Hand x={30} y={104} angle={-20} />
          <Arm d="M152 138 C168 132 174 118 170 106" />
          <Hand x={170} y={104} angle={20} />
        </>
      );
    case 'cheer':
      return (
        <>
          <Arm d="M50 128 C36 112 34 92 40 78" />
          <Hand x={40} y={74} angle={-10} />
          <Arm d="M150 128 C164 112 166 92 160 78" />
          <Hand x={160} y={74} angle={10} />
        </>
      );
    case 'wave':
      return (
        <>
          <Arm d={LEFT_REST} />
          <Hand x={50} y={172} angle={180} />
          <g className="tusse-wave">
            <Arm d="M152 136 C168 124 172 106 168 90" />
            <Hand x={168} y={84} r={11} angle={10} />
          </g>
          <path
            d="M182 70 q8 8 4 20 M190 64 q12 12 6 30"
            stroke={C.bodyDark}
            strokeWidth={3}
            opacity={0.6}
            {...line}
          />
        </>
      );
    case 'coffee':
      return (
        <>
          <Arm d="M48 140 C40 156 52 168 72 168" />
          <Arm d="M152 140 C160 156 148 168 128 168" />
          <g className="tusse-cup">
            <rect x={84} y={154} width={32} height={30} rx={6} fill={C.orange} />
            <path d="M116 162 c10 0 10 14 0 14" stroke={C.orange} strokeWidth={5} fill="none" />
            <rect x={84} y={154} width={32} height={7} rx={3} fill={C.orangeDark} />
            {/* A small heart on the mug. */}
            <path
              d="M100 176 c-6 -4 -7 -9 -3 -10 c2 0 3 1 3 3 c0 -2 1 -3 3 -3 c4 1 3 6 -3 10z"
              fill={C.snow}
              opacity={0.9}
            />
            <path
              className="tusse-steam"
              d="M94 150 c-3 -4 3 -6 0 -9 M106 150 c-3 -4 3 -6 0 -9"
              stroke={C.snow}
              strokeWidth={2.5}
              opacity={0.9}
              {...line}
            />
            <circle cx={76} cy={168} r={9} fill={C.bodyDark} />
            <circle cx={124} cy={168} r={9} fill={C.bodyDark} />
          </g>
        </>
      );
    default:
      return (
        <>
          <Arm d={LEFT_REST} />
          <Arm d={RIGHT_REST} />
          <Hand x={50} y={172} angle={180} />
          <Hand x={150} y={172} angle={180} />
        </>
      );
  }
}

const HAPPY_EYES = 'M70 108 q12 -13 24 0 M106 108 q12 -13 24 0';

function Face({ pose }: { pose: TussePose }) {
  const happy = pose === 'thumbs' || pose === 'cheer';
  const closed = pose === 'sleep';
  const worried = pose === 'shrug';
  const stroke = { stroke: C.ink, ...line };

  let eyes: ReactNode;
  if (closed) {
    eyes = (
      <>
        <path d="M70 105 q12 9 24 0 M106 105 q12 9 24 0" strokeWidth={3.2} {...stroke} />
        <path
          d="M72 108 l-3 3 M92 108 l3 3 M108 108 l-3 3 M128 108 l3 3"
          strokeWidth={2}
          {...stroke}
        />
      </>
    );
  } else if (happy) {
    eyes = <path d={HAPPY_EYES} strokeWidth={3.6} {...stroke} />;
  } else {
    const eye = (cx: number) => {
      const out = cx < 100 ? -1 : 1;
      return (
        <>
          <ellipse cx={cx} cy={104} rx={14} ry={15.5} fill="#fff" />
          <ellipse cx={cx + 1} cy={106} rx={10} ry={11.5} fill={C.iris} />
          <ellipse cx={cx + 1} cy={107.5} rx={6} ry={7} fill={C.ink} />
          <circle cx={cx + 5} cy={100.5} r={4} fill="#fff" />
          <circle cx={cx - 3} cy={112} r={1.9} fill="#fff" />
          {/* Two lashes at the outer corner. */}
          <path
            d={`M${cx + out * 12} ${95} l${out * 4} -4 M${cx + out * 14} ${100} l${out * 5} -2`}
            strokeWidth={2.2}
            {...stroke}
          />
        </>
      );
    };
    const open = (
      <g className="tusse-look">
        <g className="tusse-eyes">
          {eye(83)}
          {eye(117)}
        </g>
      </g>
    );
    // With coffee, the eyes close happily on each sip.
    eyes =
      pose === 'coffee' ? (
        <>
          <g className="tusse-sip-open">{open}</g>
          <path
            className="tusse-sip-happy"
            d={HAPPY_EYES}
            strokeWidth={3.6}
            opacity={0}
            {...stroke}
          />
        </>
      ) : (
        open
      );
  }

  let mouth: ReactNode;
  if (pose === 'thumbs' || pose === 'cheer' || pose === 'wave') {
    mouth = (
      <>
        <path d="M88 139 q12 15 24 0 z" fill={C.ink} />
        <path d="M93 145 q7 5 14 0 q-7 -4 -14 0z" fill={C.orange} />
        <path d="M92 139.4 l2.4 4 l2.6 -3.6z" fill={C.tooth} />
      </>
    );
  } else if (worried) {
    mouth = <path d="M92 145 q8 -4 16 0" strokeWidth={3} {...stroke} />;
  } else if (closed) {
    mouth = <ellipse cx={100} cy={143} rx={3.5} ry={2.6} fill={C.ink} />;
  } else {
    mouth = (
      <>
        <path d="M93 141.2 l2.5 4.6 l2.6 -4.2z" fill={C.tooth} stroke={C.ink} strokeWidth={0.8} />
        <path d="M89 139 q11 9 22 0" strokeWidth={3} {...stroke} />
      </>
    );
  }

  return (
    <>
      {eyes}
      {worried && <path d="M72 88 l14 -4 M128 88 l-14 -4" strokeWidth={3} {...stroke} />}
      {/* Rosy cheeks with freckles. */}
      <ellipse cx={62} cy={126} rx={10} ry={6.5} fill={C.blush} opacity={0.5} />
      <ellipse cx={138} cy={126} rx={10} ry={6.5} fill={C.blush} opacity={0.5} />
      {[
        [57, 124],
        [62, 128],
        [67, 124],
        [133, 124],
        [138, 128],
        [143, 124],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} fill={C.bodyShade} opacity={0.7} />
      ))}
      {/* A round potato nose. */}
      <path
        d="M100 115 C113 115 116 124 113 130 C110 135 90 135 87 130 C84 124 87 115 100 115Z"
        fill={C.nose}
      />
      <ellipse cx={95} cy={120} rx={4.5} ry={2.6} fill="#fff" opacity={0.5} />
      <path
        d="M94 131 q2 1.5 4 0 M102 131 q2 1.5 4 0"
        stroke={C.orangeDark}
        strokeWidth={1.3}
        {...line}
        opacity={0.5}
      />
      {mouth}
    </>
  );
}

/* The clothes. Each is drawn for the same 200 × 220 box. */

function Lusekofte() {
  const diamonds = [56, 70, 84, 100, 116, 130, 144];
  const dots = Array.from({ length: 17 }, (_, i) => 52 + i * 6);
  return (
    <>
      <path
        d="M38 152 C70 144 130 144 162 152 C164 180 142 202 100 202 C58 202 36 180 38 152Z"
        fill={C.navy}
      />
      <path d="M40 154 C72 146 128 146 160 154" stroke={C.orange} strokeWidth={6} {...line} />
      {diamonds.map((x) => (
        <path key={x} d={`M${x} 170 l5 -6 l5 6 l-5 6z`} transform="translate(-5 0)" fill={C.snow} />
      ))}
      {dots.map((x) => (
        <circle key={x} cx={x} cy={184} r={1.5} fill={C.snow} />
      ))}
      <path d="M60 194 C80 200 120 200 140 194" stroke={C.orange} strokeWidth={3} {...line} />
    </>
  );
}

function Anorak() {
  return (
    <>
      <path
        d="M38 152 C70 144 130 144 162 152 C164 180 142 202 100 202 C58 202 36 180 38 152Z"
        fill={C.orange}
      />
      <path d="M40 153 C72 145 128 145 160 153" stroke={C.orangeDark} strokeWidth={5} {...line} />
      <path d="M100 150 V200" stroke={C.orangeDark} strokeWidth={2.5} {...line} />
      <path d="M100 152 v10" stroke={C.snow} strokeWidth={3} {...line} />
      <rect x={62} y={174} width={24} height={14} rx={3} fill={C.orangeDark} />
      <rect x={114} y={174} width={24} height={14} rx={3} fill={C.orangeDark} />
      <path d="M62 178 h24 M114 178 h24" stroke={C.orange} strokeWidth={1.5} />
      <path d="M44 166 h8 M148 166 h8" stroke={C.snow} strokeWidth={3} {...line} />
    </>
  );
}

function Scarf() {
  return (
    <>
      <path d="M38 146 C66 158 134 158 162 146 L163 158 C134 172 66 172 37 158Z" fill={C.orange} />
      {[54, 70, 86, 102, 118, 134, 150].map((x) => (
        <path
          key={x}
          d={`M${x} ${x < 100 ? 153 : 154} v8`}
          stroke={C.orangeDark}
          strokeWidth={2}
          {...line}
        />
      ))}
      <path d="M116 160 l14 2 l-2 30 l-14 -2z" fill={C.orange} />
      <path d="M118 172 l11 1.6 M117 181 l11 1.6" stroke={C.snow} strokeWidth={3} />
      <path
        d="M115 190 v5 M119 190.5 v5 M123 191 v5 M127 191.5 v5"
        stroke={C.orangeDark}
        strokeWidth={2}
        {...line}
      />
    </>
  );
}

function Lue() {
  return (
    <>
      <path d="M55 84 C50 32 150 32 145 84Z" fill={C.navy} />
      <path d="M60 64 C80 56 120 56 140 64" stroke={C.snow} strokeWidth={4} {...line} />
      {[76, 90, 104, 118].map((x) => (
        <circle key={x} cx={x + 3} cy={53} r={1.8} fill={C.orange} />
      ))}
      <path d="M54 76 C80 70 120 70 146 76 L146 88 C120 82 80 82 54 88Z" fill={C.orange} />
      {[62, 72, 82, 92, 102, 112, 122, 132, 140].map((x) => (
        <path key={x} d={`M${x} 77 v8`} stroke={C.orangeDark} strokeWidth={1.6} {...line} />
      ))}
      <circle cx={100} cy={36} r={11} fill={C.orange} />
      <path
        d="M94 32 l3 3 M102 30 l2 3 M98 40 l3 2 M106 37 l2 2"
        stroke={C.orangeLight}
        strokeWidth={2}
        {...line}
      />
    </>
  );
}

function Helmet() {
  const horn = { fill: C.horn, stroke: C.hornEdge, strokeWidth: 2 };
  return (
    <>
      <path d="M60 72 C42 68 32 52 36 34 C44 50 54 56 64 58Z" {...horn} />
      <path d="M140 72 C158 68 168 52 164 34 C156 50 146 56 136 58Z" {...horn} />
      <path
        d="M44 48 l6 4 M40 40 l6 3 M156 48 l-6 4 M160 40 l-6 3"
        stroke={C.hornEdge}
        strokeWidth={1.6}
        {...line}
      />
      <path d="M56 80 C58 44 142 44 144 80 Z" fill={C.steel} />
      <path d="M54 78 h92 a4.5 4.5 0 0 1 0 9 h-92 a4.5 4.5 0 0 1 0 -9z" fill={C.orange} />
      {[72, 88, 104, 120, 136].map((x) => (
        <circle key={x} cx={x - 4} cy={82.5} r={2} fill="#fff" opacity={0.8} />
      ))}
      <path d="M100 48 v30" stroke={C.steelDark} strokeWidth={5} />
      <ellipse cx={82} cy={60} rx={9} ry={5} fill="#fff" opacity={0.35} />
    </>
  );
}

function Glasses() {
  return (
    <>
      <circle
        cx={82}
        cy={104}
        r={16}
        fill="#fff"
        fillOpacity={0.12}
        stroke={C.navy}
        strokeWidth={3}
      />
      <circle
        cx={118}
        cy={104}
        r={16}
        fill="#fff"
        fillOpacity={0.12}
        stroke={C.navy}
        strokeWidth={3}
      />
      <path
        d="M97 101 q3 -4 6 0 M66 100 l-10 -4 M134 100 l10 -4"
        stroke={C.navy}
        strokeWidth={3}
        {...line}
      />
      <path d="M73 96 l5 -4 M109 96 l5 -4" stroke="#fff" strokeWidth={2} opacity={0.7} {...line} />
    </>
  );
}

function Slippers() {
  const slipper = (x: number) => (
    <g key={x}>
      <path
        d={`M${x - 22} 205 C${x - 22} 193 ${x + 22} 193 ${x + 22} 205 C${x + 22} 214 ${x - 22} 214 ${x - 22} 205Z`}
        fill={C.snow}
        stroke={C.steelDark}
        strokeWidth={1.5}
      />
      <path
        d={`M${x - 20} 203 C${x - 8} 198 ${x + 8} 198 ${x + 20} 203`}
        stroke={C.orange}
        strokeWidth={3.5}
        {...line}
      />
      <path
        d={`M${x - 14} 208 h28`}
        stroke={C.navy}
        strokeWidth={1.6}
        strokeDasharray="2 3"
        {...line}
      />
      <circle cx={x} cy={196} r={5.5} fill={C.orange} />
    </g>
  );
  return <>{[76, 124].map(slipper)}</>;
}

/** Behind the body: a navy cape lined in orange, with a few stars. */
function Cape() {
  return (
    <>
      <path
        d="M52 114 C28 148 24 186 36 204 Q100 214 164 204 C176 186 172 148 148 114Z"
        fill={C.orange}
      />
      <path
        d="M56 114 C34 148 30 184 41 200 Q100 210 159 200 C170 184 166 148 144 114Z"
        fill={C.navySoft}
      />
      {(
        [
          [42, 184],
          [46, 160],
          [160, 172],
          [156, 190],
          [164, 150],
        ] as const
      ).map(([x, y]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y - 4} l1.2 2.8 l2.8 1.2 l-2.8 1.2 l-1.2 2.8 l-1.2 -2.8 l-2.8 -1.2 l2.8 -1.2z`}
          fill={C.snow}
        />
      ))}
    </>
  );
}

/** The hand-drawn troll. It can wear every outfit item, so it stays in use while the learner
 * wears any (see {@link Tusse}). */
export function DrawnTusse({
  pose = 'rest',
  outfit = {},
  size = 96,
  rock = false,
  idle = true,
  className,
}: {
  pose?: TussePose;
  /** What it wears, one item per slot. */
  outfit?: Outfit;
  /** Width in CSS pixels. */
  size?: number;
  /** Sit it on a rock, for idle poses. */
  rock?: boolean;
  /** Small idle movements (breathing, blinking, fidgets). Off under reduced motion either way. */
  idle?: boolean;
  className?: string;
}) {
  const [hopping, setHopping] = useState(false);
  const hatted = outfit.head !== undefined;
  const figure = (
    <>
      {outfit.back === 'cape' && <Cape />}
      <g className="tusse-tail">
        <path
          d="M128 182 C158 194 190 180 184 158"
          stroke={C.bodyDark}
          strokeWidth={10}
          {...line}
        />
        <path
          d="M184 160 c-12 -4 -10 -20 0 -18 c0 -10 14 -10 13 0 c10 -2 12 12 2 15 c4 6 -4 12 -9 6 c-2 3 -6 0 -6 -3z"
          fill={C.orange}
        />
        <path
          d="M186 150 q4 2 6 -1 M184 156 q4 1 7 -2"
          stroke={C.orangeDark}
          strokeWidth={1.6}
          {...line}
        />
      </g>
      <g className="tusse-ear-l">
        <path d="M58 106 C36 102 24 86 28 72 C42 74 56 88 62 100Z" fill={C.bodyDark} />
        <path d="M52 100 C40 97 33 88 34 80 C43 82 51 90 55 97Z" fill={C.blush} opacity={0.6} />
      </g>
      <g className="tusse-ear-r">
        <path d="M142 106 C164 102 176 86 172 72 C158 74 144 88 138 100Z" fill={C.bodyDark} />
        <path
          d="M148 100 C160 97 167 88 166 80 C157 82 149 90 145 97Z"
          fill={C.blush}
          opacity={0.6}
        />
      </g>
      <ellipse cx={76} cy={202} rx={21} ry={10} fill={C.bodyDark} />
      <ellipse cx={124} cy={202} rx={21} ry={10} fill={C.bodyDark} />
      <path
        d="M66 206 v4 M76 207 v4 M86 206 v4 M114 206 v4 M124 207 v4 M134 206 v4"
        stroke={C.bodyShade}
        strokeWidth={2}
        {...line}
      />
      {/* The body, with some shading and fur. */}
      <path
        d="M100 58 C142 58 162 94 164 134 C166 176 140 202 100 202 C60 202 34 176 36 134 C38 94 58 58 100 58Z"
        fill={C.body}
      />
      <path
        d="M150 96 C164 128 164 178 118 200 C150 180 158 136 150 96Z"
        fill={C.bodyShade}
        opacity={0.3}
      />
      <ellipse
        cx={70}
        cy={80}
        rx={11}
        ry={6}
        transform="rotate(-35 70 80)"
        fill="#fff"
        opacity={0.22}
      />
      <path
        d="M46 150 q4 3 3 7 M48 164 q4 3 3 7 M154 150 q-4 3 -3 7 M152 164 q-4 3 -3 7"
        stroke={C.bodyDark}
        strokeWidth={2}
        {...line}
      />
      {outfit.body === 'sweater' ? (
        <Lusekofte />
      ) : outfit.body === 'anorak' ? (
        <Anorak />
      ) : (
        <>
          <path
            d="M62 174 c0 -10 6 -16 12 -14 c4 -8 12 -8 16 -2 c4 -6 16 -6 20 0 c4 -6 12 -6 16 2 c6 -2 12 4 12 14 C138 192 122 199 100 199 C78 199 62 192 62 174Z"
            fill={C.belly}
          />
          <path
            d="M84 176 q3 3 6 0 M106 184 q3 3 6 0 M94 190 q3 3 6 0"
            stroke={C.bellyLine}
            strokeWidth={2}
            {...line}
          />
        </>
      )}
      {outfit.feet === 'slippers' && <Slippers />}
      {/* Hair, hidden under a hat. */}
      {!hatted && (
        <>
          <path
            d="M80 66 C70 50 82 38 92 50 C90 32 112 30 110 50 C118 38 136 44 126 64 C112 56 92 56 80 66Z"
            fill={C.navy}
          />
          <path d="M110 50 c4 -10 14 -10 14 -2" stroke={C.navy} strokeWidth={4} {...line} />
          <path d="M96 52 q4 -6 8 -2" stroke={C.navySoft} strokeWidth={2.2} {...line} />
        </>
      )}
      <Face pose={pose} />
      {outfit.eyes === 'glasses' && pose !== 'sleep' && <Glasses />}
      {outfit.neck === 'scarf' && <Scarf />}
      <Arms pose={pose} />
      {outfit.head === 'helmet' && <Helmet />}
      {outfit.head === 'lue' && <Lue />}
    </>
  );

  return (
    <svg
      className={[
        'tusse',
        `tusse-${pose}`,
        idle && 'tusse-idle',
        hopping && 'tusse-hopping',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      viewBox="0 0 200 220"
      width={size}
      height={(size * 220) / 200}
      aria-hidden="true"
      focusable="false"
      // A tap is only for fun: it changes nothing, so there's no keyboard or screen reader equivalent.
      onPointerDown={idle ? () => setHopping(true) : undefined}
      onAnimationEnd={(e) => {
        if (e.animationName === 'tusse-hop') setHopping(false);
      }}
    >
      {rock && (
        <>
          <path
            d="M30 214 C26 196 46 186 70 188 C90 178 132 180 150 190 C172 188 182 204 174 214Z"
            fill={C.steelDark}
          />
          <path d="M50 196 c14 -6 30 -6 40 -2" stroke={C.steel} strokeWidth={4} {...line} />
        </>
      )}
      <g className="tusse-body">
        <g className="tusse-sway">
          <g className="tusse-breathe">
            {pose === 'cheer' ? <g transform="rotate(-6 100 140)">{figure}</g> : figure}
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Which illustrated pose each pose shows. The rest pose uses the friendly wave. */
const ART_FOR_POSE: Record<TussePose, string> = {
  rest: 'wave',
  wave: 'wave',
  thumbs: 'thumbs',
  shrug: 'shrug',
  cheer: 'cheer',
  coffee: 'coffee',
  sleep: 'sleep',
};

function artUrl(pose: TussePose): string {
  return `${import.meta.env.BASE_URL}troll/tusse-${ART_FOR_POSE[pose]}.webp`;
}

/**
 * Tusse as the learner sees it: the illustrated troll (rendered stills in public/troll/, one per
 * pose, drawn in the same 200 × 220 box), with a CSS idle bounce and a hop on tap.
 *
 * The illustrations have no outfit pieces yet, so while the learner wears any item the drawn troll
 * is shown instead and their earned clothes stay visible. The coffee pose brings its own rock.
 */
export function Tusse(props: ComponentProps<typeof DrawnTusse>) {
  const { pose = 'rest', outfit = {}, size = 96, idle = true, className } = props;
  const [hopping, setHopping] = useState(false);
  if (Object.values(outfit).some(Boolean)) return <DrawnTusse {...props} />;
  return (
    <img
      src={artUrl(pose)}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={(size * 220) / 200}
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
