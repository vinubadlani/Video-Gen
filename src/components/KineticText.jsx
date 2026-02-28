import React from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';

// ─── Preset spring configs ────────────────────────────────────────────────────
const SPRING_CONFIGS = {
  minimal  : { stiffness: 120, damping: 18, mass: 1 },
  energetic: { stiffness: 220, damping:  9, mass: 1 },
  dramatic : { stiffness:  80, damping: 12, mass: 1 },
};

// ─── Font size from word count + weight ─────────────────────────────────────
function calcFontSize(wordCount, weight) {
  let base;
  if      (wordCount === 1) base = 180;
  else if (wordCount === 2) base = 150;
  else if (wordCount === 3) base = 120;
  else                      base = 96;

  if      (weight === 3) base = Math.round(base * 1.2);
  else if (weight === 1) base = Math.round(base * 0.9);

  return Math.max(base, 40);
}

// ─── Per-word animated component ─────────────────────────────────────────────
function AnimatedWord({
  word, wordIndex, localFrame, preset, weight,
  textColor, fontSize, fontWeight,
}) {
  const { fps } = useVideoConfig();
  const cfg   = SPRING_CONFIGS[preset] || SPRING_CONFIGS.dramatic;
  const delay = wordIndex * 6;
  const start = Math.max(0, localFrame - delay);

  const scale = spring({ frame: start, fps, config: cfg, from: 0.4, to: 1 });
  const opacity = interpolate(start, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  let rotate     = 0;
  let textShadow = 'none';

  if (preset === 'energetic') {
    rotate = interpolate(start, [0, 5], [wordIndex % 2 === 0 ? 3 : -3, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
  }
  if (preset === 'dramatic') {
    const glow     = interpolate(start, [0, 10], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    const strength = weight === 3 ? 30 : 16;
    textShadow     = `0 0 ${Math.round(strength * glow)}px ${textColor}, 0 0 ${Math.round(strength * 0.5 * glow)}px ${textColor}`;
  }

  return (
    <span
      style={{
        display    : 'inline-block',
        transform  : `scale(${scale}) rotate(${rotate}deg)`,
        opacity,
        textShadow,
        margin     : '0 12px',
        lineHeight : 1.1,
        color      : textColor,
        fontSize   : `${fontSize}px`,
        fontWeight,
        fontFamily : '"Arial Black", "Impact", sans-serif',
      }}
    >
      {word}
    </span>
  );
}

// ─── KineticText ──────────────────────────────────────────────────────────────
export function KineticText({
  text        = '',
  textColor   = '#fff',
  accentColor = '#fff',
  localFrame  = 0,
  fps         = 30,
  preset      = 'dramatic',
  weight      = 2,
}) {
  const words      = text.split(/\s+/).filter(Boolean);
  const wordCount  = words.length;
  const fontSize   = calcFontSize(wordCount, weight);
  const fontWeight = weight === 3 ? 900 : weight === 1 ? 400 : 800;

  return (
    <div
      style={{
        display        : 'flex',
        flexWrap       : 'wrap',
        justifyContent : 'center',
        alignItems     : 'center',
        padding        : '0 48px',
        textAlign      : 'center',
      }}
    >
      {words.map((word, i) => (
        <AnimatedWord
          key={i}
          word={word}
          wordIndex={i}
          localFrame={localFrame}
          preset={preset}
          weight={weight}
          textColor={textColor}
          fontSize={fontSize}
          fontWeight={fontWeight}
        />
      ))}
    </div>
  );
}
