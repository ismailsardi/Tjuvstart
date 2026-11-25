import { useState, type ReactNode } from 'react';

/**
 * Tusse, the app's troll. Purely decorative: it reacts to answers and gains gear as the
 * learner's level goes up, but never carries information the text doesn't already give.
 *
 * Between reactions it idles: it breathes, sways, blinks, looks around, twitches its ears and swishes
 * its tail, each on its own loop so the mix rarely repeats. A tap makes it hop. All of this is CSS
 * and switches off under prefers-reduced-motion.
 */
export type TussePose = 'rest' | 'coffee' | 'thumbs' | 'shrug' | 'cheer' | 'wave' | 'sleep';

export interface TusseGear {
  /** Horned helmet, from A2. */
  helmet?: boolean;
  /** Lusekofte, from B1. */
  sweater?: boolean;
}

const C = {
  navy: '#0f2440',
  orange: '#e4572e',
  orangeDark: '#c8431f',
  snow: '#f4f6fa',
  body: '#7f9cc4',
  bodyDark: '#5f7fab',
  belly: '#c6d4ea',
  nose: '#f2a07b',
  ink: '#14213d',
  steel: '#b8c3d3',
  steelDark: '#9aa8bc',
  horn: '#f3e6cf',
  hornEdge: '#d9c6a4',
};

const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Arm({ d }: { d: string }) {
  return <path d={d} stroke={C.bodyDark} strokeWidth={14} {...line} />;
}

function Hand({ x, y, r = 9 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill={C.bodyDark} />;
}

const LEFT_REST = 'M48 140 C38 152 40 164 50 170';
const RIGHT_REST = 'M152 140 C162 152 160 164 150 170';

function Arms({ pose }: { pose: TussePose }) {
  switch (pose) {
    case 'thumbs':
      return (
        <>
          <Arm d={LEFT_REST} />
          <Arm d="M152 138 C168 130 174 116 172 104" />
          <Hand x={172} y={100} r={11} />
          <rect x={166} y={78} width={10} height={22} rx={5} fill={C.bodyDark} />
          <path d="M163 100 h14 M163 106 h12" stroke={C.body} strokeWidth={2} {...line} />
        </>
      );
    case 'shrug':
      return (
        <>
          <Arm d="M48 138 C32 132 26 118 30 106" />
          <Hand x={30} y={104} />
          <Arm d="M152 138 C168 132 174 118 170 106" />
          <Hand x={170} y={104} />
        </>
      );
    case 'cheer':
      return (
        <>
          <Arm d="M50 128 C36 112 34 92 40 78" />
          <Hand x={40} y={74} />
          <Arm d="M150 128 C164 112 166 92 160 78" />
          <Hand x={160} y={74} />
        </>
      );
    case 'wave':
      return (
        <>
          <Arm d={LEFT_REST} />
          <g className="tusse-wave">
            <Arm d="M152 136 C168 124 172 106 168 90" />
            <Hand x={168} y={84} r={11} />
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
            <path
              className="tusse-steam"
              d="M94 150 c-3 -4 3 -6 0 -9 M106 150 c-3 -4 3 -6 0 -9"
              stroke={C.snow}
              strokeWidth={2.5}
              opacity={0.9}
              {...line}
            />
            <Hand x={76} y={168} />
            <Hand x={124} y={168} />
          </g>
        </>
      );
    default:
      return (
        <>
          <Arm d={LEFT_REST} />
          <Arm d={RIGHT_REST} />
        </>
      );
  }
}

function Face({ pose }: { pose: TussePose }) {
  const happy = pose === 'thumbs' || pose === 'cheer';
  const closed = pose === 'sleep';
  const worried = pose === 'shrug';
  const stroke = { stroke: C.ink, ...line };

  let eyes: ReactNode;
  if (closed) {
    eyes = <path d="M78 102 q8 7 16 0 M106 102 q8 7 16 0" strokeWidth={3.2} {...stroke} />;
  } else if (happy) {
    eyes = <path d="M78 104 q8 -9 16 0 M106 104 q8 -9 16 0" strokeWidth={3.4} {...stroke} />;
  } else {
    const open = (
      <g className="tusse-look">
        <g className="tusse-eyes">
          <ellipse cx={86} cy={101} rx={6.5} ry={8} fill={C.ink} />
          <ellipse cx={114} cy={101} rx={6.5} ry={8} fill={C.ink} />
          <circle cx={88.5} cy={97.5} r={2.4} fill="#fff" />
          <circle cx={116.5} cy={97.5} r={2.4} fill="#fff" />
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
            d="M78 104 q8 -9 16 0 M106 104 q8 -9 16 0"
            strokeWidth={3.4}
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
        <path d="M92 147 q8 11 16 0 z" fill={C.ink} />
        <path d="M95 151 q5 4 10 0" fill={C.orange} />
      </>
    );
  } else if (worried) {
    mouth = <path d="M93 149 q7 -3 14 0" strokeWidth={3} {...stroke} />;
  } else if (closed) {
    mouth = <ellipse cx={100} cy={149} rx={3.5} ry={2.6} fill={C.ink} />;
  } else {
    mouth = <path d="M92 146 q8 7 16 0" strokeWidth={3} {...stroke} />;
  }

  return (
    <>
      {eyes}
      {worried && <path d="M78 87 l14 -4 M122 87 l-14 -4" strokeWidth={3} {...stroke} />}
      <ellipse cx={70} cy={122} rx={9} ry={5.5} fill={C.nose} opacity={0.55} />
      <ellipse cx={130} cy={122} rx={9} ry={5.5} fill={C.nose} opacity={0.55} />
      <path
        d="M100 100 C120 100 126 128 112 138 C106 142 94 142 88 138 C74 128 80 100 100 100Z"
        fill={C.nose}
      />
      <ellipse cx={93} cy={112} rx={5} ry={3.5} fill="#fff" opacity={0.45} />
      {mouth}
    </>
  );
}

function Sweater() {
  const diamonds = [78, 89, 100, 111, 122];
  const dots = Array.from({ length: 9 }, (_, i) => 74 + i * 6);
  return (
    <>
      <path
        d="M66 156 C70 150 130 150 134 156 C138 176 128 194 100 196 C72 194 62 176 66 156Z"
        fill={C.navy}
      />
      <path d="M70 158 C80 152 120 152 130 158" stroke={C.orange} strokeWidth={5} {...line} />
      {diamonds.map((x) => (
        <path key={x} d={`M${x} 172 l4 -5 l4 5 l-4 5z`} fill={C.snow} />
      ))}
      {dots.map((x) => (
        <circle key={x} cx={x} cy={184} r={1.4} fill={C.snow} />
      ))}
    </>
  );
}

function Helmet() {
  const horn = { fill: C.horn, stroke: C.hornEdge, strokeWidth: 2 };
  return (
    <>
      <path d="M62 76 C44 72 34 56 38 38 C46 54 56 60 66 62Z" {...horn} />
      <path d="M138 76 C156 72 166 56 162 38 C154 54 144 60 134 62Z" {...horn} />
      <path d="M58 84 C60 50 140 50 142 84 Z" fill={C.steel} />
      <path d="M56 84 h88 a4 4 0 0 1 0 8 h-88 a4 4 0 0 1 0 -8z" fill={C.orange} />
      {[80, 100, 120].map((x) => (
        <circle key={x} cx={x} cy={88} r={2} fill="#fff" opacity={0.8} />
      ))}
      <path d="M100 54 v30" stroke={C.steelDark} strokeWidth={5} />
      <ellipse cx={86} cy={66} rx={8} ry={5} fill="#fff" opacity={0.35} />
    </>
  );
}

export function Tusse({
  pose = 'rest',
  gear = {},
  size = 96,
  rock = false,
  idle = true,
  className,
}: {
  pose?: TussePose;
  gear?: TusseGear;
  /** Width in CSS pixels. */
  size?: number;
  /** Sit it on a rock, for idle poses. */
  rock?: boolean;
  /** Small idle movements (breathing, blinking, fidgets). Off under reduced motion either way. */
  idle?: boolean;
  className?: string;
}) {
  const [hopping, setHopping] = useState(false);
  const figure = (
    <>
      <g className="tusse-tail">
        <path
          d="M128 182 C158 194 190 180 184 158"
          stroke={C.bodyDark}
          strokeWidth={10}
          {...line}
        />
        <path
          d="M184 158 c-10 -6 -6 -20 4 -18 c2 -9 15 -6 12 4 c9 2 6 15 -4 14 c-2 3 -8 3 -12 0z"
          fill={C.orange}
        />
      </g>
      <path
        className="tusse-ear-l"
        d="M52 104 C36 96 34 84 40 80 C48 82 56 92 60 100Z"
        fill={C.bodyDark}
      />
      <path
        className="tusse-ear-r"
        d="M148 104 C164 96 166 84 160 80 C152 82 144 92 140 100Z"
        fill={C.bodyDark}
      />
      <ellipse cx={78} cy={200} rx={20} ry={10} fill={C.bodyDark} />
      <ellipse cx={122} cy={200} rx={20} ry={10} fill={C.bodyDark} />
      <path
        d="M100 62 C140 62 158 96 160 132 C162 172 138 198 100 198 C62 198 38 172 40 132 C42 96 60 62 100 62Z"
        fill={C.body}
      />
      {gear.sweater ? <Sweater /> : <ellipse cx={100} cy={174} rx={34} ry={22} fill={C.belly} />}
      <path
        d="M86 68 C80 52 90 44 96 54 C96 40 110 38 108 54 C116 44 126 52 116 66 C106 60 96 60 86 68Z"
        fill={C.navy}
      />
      <Face pose={pose} />
      <Arms pose={pose} />
      {gear.helmet && <Helmet />}
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
