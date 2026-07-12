import type { FC } from 'react';

// ---------------------------------------------------------------------------
// Shared base props
// ---------------------------------------------------------------------------
type IconBaseProps = {
  className?: string;
  size?: number;
};

// ---------------------------------------------------------------------------
// 1. MascotAvatar – round avatar frame with original alien-blob silhouette
//    Approx 40×40 viewBox, subtle pulsing glow animation.
//    NOT Snoo: different antenna (curly/spiral), different expression,
//    different body shape (rounder bean/blob).
// ---------------------------------------------------------------------------
type MascotAvatarProps = IconBaseProps;

export const MascotAvatar: FC<MascotAvatarProps> = ({ className, size = 40 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Outer frame ring */}
    <circle
      cx="20" cy="20" r="19"
      stroke="currentColor" strokeWidth="1.5"
      opacity="0.3" fill="none"
    />

    {/* Animated mascot group */}
    <g className="ra-mascot">
      {/* Main body – organic bean/blob shape */}
      <path
        d="M12,24 C8,17 11,10 17,9 C23,8 29,11 30,18 C31,25 26,30 20,30 C15,30 14,28 12,24 Z"
        fill="currentColor" opacity="0.85"
      />

      {/* Left eye (translucent layers for theme adaptability) */}
      <circle cx="15" cy="16" r="2.5" fill="currentColor" opacity="0.2" />
      <circle cx="15.5" cy="16" r="1.2" fill="currentColor" opacity="0.8" />

      {/* Right eye */}
      <circle cx="24" cy="16" r="2.5" fill="currentColor" opacity="0.2" />
      <circle cx="24.5" cy="16" r="1.2" fill="currentColor" opacity="0.8" />

      {/* Smile */}
      <path
        d="M16,23 C18,25.5 22,25.5 24,23"
        stroke="currentColor" strokeWidth="1.2"
        fill="none" strokeLinecap="round" opacity="0.8"
      />

      {/* Curly/spiral antenna (distinct from Snoo's straight ones) */}
      <path
        d="M20,9 C20,5 23,3 25.5,4.5 C27,6 26,9 24,9"
        stroke="currentColor" strokeWidth="1.2"
        fill="none" strokeLinecap="round" opacity="0.8"
      />
      <circle cx="24" cy="9" r="1.5" fill="currentColor" opacity="0.85" />

      {/* Left nub arm */}
      <path
        d="M10,21 C7,20 6,22 6,23"
        stroke="currentColor" strokeWidth="1.5"
        fill="none" strokeLinecap="round" opacity="0.8"
      />

      {/* Right nub arm */}
      <path
        d="M30,21 C33,20 34,22 34,23"
        stroke="currentColor" strokeWidth="1.5"
        fill="none" strokeLinecap="round" opacity="0.8"
      />
    </g>
  </svg>
);

// ---------------------------------------------------------------------------
// 2. WigglingBug – small beetle/bug that wiggles via CSS keyframes.
//    Approx 24×24 viewBox, dark-mode friendly (light lines via currentColor).
//    Evokes old IRC reaction-gif culture.
// ---------------------------------------------------------------------------
type WigglingBugProps = IconBaseProps;

export const WigglingBug: FC<WigglingBugProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <g className="ra-bug">
      {/* Oval body */}
      <ellipse cx="12" cy="14" rx="6.5" ry="5" fill="currentColor" opacity="0.75" />

      {/* Round head */}
      <circle cx="12" cy="8" r="3.5" fill="currentColor" opacity="0.9" />

      {/* Shell center line */}
      <line x1="12" y1="9" x2="12" y2="19" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />

      {/* Shell spots */}
      <circle cx="9" cy="13" r="1.2" fill="currentColor" opacity="0.25" />
      <circle cx="15" cy="13" r="1.2" fill="currentColor" opacity="0.25" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" opacity="0.25" />

      {/* Eyes (translucent for theme adaptability) */}
      <circle cx="10.5" cy="7.5" r="1.2" fill="currentColor" opacity="0.2" />
      <circle cx="10.5" cy="7.5" r="0.6" fill="currentColor" opacity="0.85" />
      <circle cx="13.5" cy="7.5" r="1.2" fill="currentColor" opacity="0.2" />
      <circle cx="13.5" cy="7.5" r="0.6" fill="currentColor" opacity="0.85" />

      {/* Antennae */}
      <path d="M10,5 C9,3 7,3 7,4.5" stroke="currentColor" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d="M14,5 C15,3 17,3 17,4.5" stroke="currentColor" strokeWidth="0.9" fill="none" strokeLinecap="round" />

      {/* Left legs */}
      <line x1="6.5" y1="12" x2="4" y2="11" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="6.5" y1="14" x2="4" y2="14" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="6.5" y1="16" x2="4" y2="17" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />

      {/* Right legs */}
      <line x1="17.5" y1="12" x2="20" y2="11" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="17.5" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="17.5" y1="16" x2="20" y2="17" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </g>
  </svg>
);

// ---------------------------------------------------------------------------
// 3. RainbowBird – original bird that spins/rotates with rainbow feathers.
//    Approx 24×24 viewBox. Continuous CSS rotation animation.
//    Evokes party-hyped culture (think party parrot spirit, new art).
// ---------------------------------------------------------------------------
type RainbowBirdProps = IconBaseProps;

export const RainbowBird: FC<RainbowBirdProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <g className="ra-bird">
      {/* Body */}
      <ellipse cx="10" cy="12" rx="4.5" ry="5.5" fill="currentColor" opacity="0.85" />

      {/* Head */}
      <circle cx="10" cy="6" r="3" fill="currentColor" />

      {/* Beak */}
      <polygon points="13,5.5 17,6.5 13,7.5" fill="#f59e0b" />

      {/* Eye */}
      <circle cx="11.5" cy="5.5" r="1" fill="currentColor" opacity="0.2" />
      <circle cx="11.5" cy="5.5" r="0.5" fill="currentColor" opacity="0.85" />

      {/* Wing */}
      <path
        d="M6,11 C4,9.5 3,11.5 4,14 C5,16 7,16.5 8,14 Z"
        fill="currentColor" opacity="0.55"
      />

      {/* Rainbow tail feathers – each a distinct colour */}
      <path d="M12,17 C14,19.5 12,23 15,24" stroke="#ef4444" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M13,16.5 C15,19 13.5,22 16.5,23" stroke="#f59e0b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M14,16 C16,18 14.5,21 17.5,22" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M11,17.5 C12,19.5 10.5,22 13,23" stroke="#a855f7" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>
  </svg>
);

// ---------------------------------------------------------------------------
// 4. KarmaBar – segmented progress bar (9 segments) with retro amber/gold.
//    Approx 200×16 viewBox. Each segment animates in sequence.
// ---------------------------------------------------------------------------
type KarmaBarProps = IconBaseProps & {
  value: number;
  max: number;
  filledColor?: string;
  emptyColor?: string;
};

const SEGMENTS = 9;
const SEG_W = 20;
const GAP = 2;
const TOTAL_W = SEGMENTS * SEG_W + (SEGMENTS - 1) * GAP; // 196
const OFFSET = (200 - TOTAL_W) / 2; // 2

export const KarmaBar: FC<KarmaBarProps> = ({
  className,
  size = 16,
  value,
  max,
  filledColor = '#f59e0b',
  emptyColor = '#d1d5db',
}) => {
  const fraction = max > 0 ? Math.min(value / max, 1) : 0;
  const filled = Math.round(fraction * SEGMENTS);

  return (
    <svg
      width={200}
      height={size}
      viewBox="0 0 200 16"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background (empty) segments */}
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <rect
          key={`e-${i}`}
          x={OFFSET + i * (SEG_W + GAP)}
          y={2}
          width={SEG_W}
          height={12}
          rx={2}
          fill={emptyColor}
        />
      ))}

      {/* Filled segments with staggered animation */}
      {Array.from({ length: filled }, (_, i) => (
        <rect
          key={`f-${i}`}
          x={OFFSET + i * (SEG_W + GAP)}
          y={2}
          width={SEG_W}
          height={12}
          rx={2}
          fill={filledColor}
          className="ra-karma"
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// 5. RetroBadge – ribbon/badge shape with text inside.
//    Approx 60×24 viewBox. Evokes old Reddit flair/trophy aesthetics.
// ---------------------------------------------------------------------------
type RetroBadgeProps = IconBaseProps & {
  text: string;
  color?: string;
};

export const RetroBadge: FC<RetroBadgeProps> = ({
  className,
  size = 24,
  text,
  color,
}) => (
  <svg
    width={60}
    height={size}
    viewBox="0 0 60 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Main ribbon body */}
    <path
      d="M8,4 L52,4 L56,12 L52,20 L8,20 L4,12 Z"
      fill={color ?? 'currentColor'}
    />

    {/* Left fold shadow */}
    <path d="M4,12 L8,16 L8,20 Z" fill="rgba(0,0,0,0.15)" />
    {/* Right fold shadow */}
    <path d="M56,12 L52,16 L52,20 Z" fill="rgba(0,0,0,0.15)" />
    {/* Left top-fold highlight */}
    <path d="M8,4 L4,12 L8,12 Z" fill="rgba(255,255,255,0.2)" />
    {/* Right top-fold highlight */}
    <path d="M52,4 L56,12 L52,12 Z" fill="rgba(255,255,255,0.2)" />

    {/* Badge text */}
    <text
      x="30" y="15"
      textAnchor="middle"
      fill="white"
      fontSize="8"
      fontWeight="bold"
      fontFamily="monospace"
    >
      {text}
    </text>
  </svg>
);

// ---------------------------------------------------------------------------
// 6. PixelDivider – horizontal dotted divider with pixel-style squares.
//    Approx 200×4 viewBox. Evokes terminal / pixel-aesthetic.
// ---------------------------------------------------------------------------
type PixelDividerProps = IconBaseProps;

const DOT_COUNT = 33; // one dot every 6 px across 200

export const PixelDivider: FC<PixelDividerProps> = ({ className, size = 4 }) => (
  <svg
    width={200}
    height={size}
    viewBox="0 0 200 4"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {Array.from({ length: DOT_COUNT }, (_, i) => (
      <rect
        key={i}
        x={2 + i * 6}
        y={1}
        width={2}
        height={2}
        fill="currentColor"
        opacity="0.45"
      />
    ))}
  </svg>
);
