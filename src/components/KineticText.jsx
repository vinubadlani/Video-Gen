import React from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';

// ─── Preset spring configs ────────────────────────────────────────────────────
const SPRING_CONFIGS = {
  minimal  : { stiffness: 140, damping: 20, mass: 1 },
  energetic: { stiffness: 260, damping:  8, mass: 0.8 },
  dramatic : { stiffness:  70, damping: 10, mass: 1.2 },
};

// ─── Font size from word count + weight ──────────────────────────────────────
function calcFontSize(wordCount, weight) {
  let base;
  if      (wordCount === 1) base = 190;
  else if (wordCount === 2) base = 158;
  else if (wordCount === 3) base = 128;
  else if (wordCount <= 5)  base = 100;
  else                      base = 82;

  if      (weight === 3) base = Math.round(base * 1.22);
  else if (weight === 1) base = Math.round(base * 0.88);

  return Math.max(base, 44);
}

// ─── Per-word animated component ─────────────────────────────────────────────
function AnimatedWord({
  word, wordIndex, localFrame, preset, weight,
  textColor, accentColor, fontSize, fontWeight,
}) {
  const { fps } = useVideoConfig();
  const cfg     = SPRING_CONFIGS[preset] || SPRING_CONFIGS.dramatic;
  const delay   = wordIndex * 5;
  const start   = Math.max(0, localFrame - delay);

  const scale = spring({ frame: start, fps, config: cfg, from: 0.3, to: 1 });
  const opacity = interpolate(start, [0, 7], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  let transform = `scale(${scale})`;
  let textShadow = 'none';
  let color = textColor;

  // ── Preset-specific motion & look ──────────────────────────────────────────
  if (preset === 'minimal') {
    // Slide up + fade in — clean, editorial feel
    const slideY = interpolate(start, [0, 14], [28, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    transform = `scale(${scale}) translateY(${slideY}px)`;
    // Alternate accent colour on even words for bold minimal look
    color = wordIndex % 2 === 0 ? textColor : accentColor;
  }

  if (preset === 'energetic') {
    // Slight overshoot rotation — pops and bounces
    const rotate = interpolate(start, [0, 6, 10], [wordIndex % 2 === 0 ? 8 : -8, -3, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    transform = `scale(${scale}) rotate(${rotate}deg)`;
    // Bold outline for pop
    textShadow = `2px 2px 0 ${accentColor}, -1px -1px 0 ${accentColor}`;
  }

  if (preset === 'dramatic') {
    // Cinematic glow that builds in
    const glow     = interpolate(start, [0, 12], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    const strength = weight === 3 ? 40 : 20;
    textShadow = [
      `0 0 ${Math.round(strength * glow)}px ${textColor}`,
      `0 0 ${Math.round(strength * 0.4 * glow)}px ${accentColor}`,
      `0 4px 24px rgba(0,0,0,0.8)`,
    ].join(', ');
  }

  return (
    <span
      style={{
        display    : 'inline-block',
        transform,
        opacity,
        textShadow,
        color,
        margin     : '0 10px',
        lineHeight : 1.05,
        fontSize   : `${fontSize}px`,
        fontWeight,
        fontFamily : '"Arial Black", "Impact", "Helvetica Neue", sans-serif',
        letterSpacing: preset === 'minimal' ? '0.04em' : preset === 'dramatic' ? '0.02em' : '0',
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
  const fontWeight = weight === 3 ? 900 : weight === 1 ? 600 : 800;

  // Container slide-in for dramatic preset
  const containerY = preset === 'dramatic'
    ? interpolate(localFrame, [0, 18], [40, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : 0;

  return (
    <div
      style={{
        display       : 'flex',
        flexWrap      : 'wrap',
        justifyContent: 'center',
        alignItems    : 'center',
        padding       : '0 56px',
        textAlign     : 'center',
        transform     : `translateY(${containerY}px)`,
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
          accentColor={accentColor}
          fontSize={fontSize}
          fontWeight={fontWeight}
        />
      ))}
    </div>
  );
}
