import React from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';

// ─── Font size: bigger = more impact ─────────────────────────────────────────
function calcFontSize(wordCount, weight) {
  let base;
  if      (wordCount === 1) base = 220;
  else if (wordCount === 2) base = 180;
  else if (wordCount === 3) base = 148;
  else if (wordCount <= 5)  base = 118;
  else                      base = 94;
  if (weight === 3) base = Math.round(base * 1.18);
  if (weight === 1) base = Math.round(base * 0.88);
  return Math.max(base, 52);
}

// ─── Letter-by-letter for single dramatic words ───────────────────────────────
function AnimatedLetter({ char, letterIndex, localFrame, fps, textColor, accentColor, fontSize, fontWeight, totalLetters }) {
  const delay = letterIndex * 3;
  const start = Math.max(0, localFrame - delay);

  const scale = spring({ frame: start, fps, config: { stiffness: 400, damping: 12, mass: 0.6 }, from: 3.0, to: 1 });
  const opacity = interpolate(start, [0, 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const blur    = interpolate(start, [0, 6], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Last letter gets the accent glow
  const isLast    = letterIndex === totalLetters - 1;
  const glowStart = Math.max(0, localFrame - delay);
  const glow      = interpolate(glowStart, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const color     = isLast ? accentColor : textColor;
  const shadow    = isLast
    ? `0 0 ${Math.round(40 * glow)}px ${accentColor}, 0 0 ${Math.round(20 * glow)}px ${accentColor}`
    : `0 4px 32px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)`;

  return (
    <span
      style={{
        display     : 'inline-block',
        transform   : `scale(${scale})`,
        opacity,
        filter      : `blur(${blur}px)`,
        color,
        textShadow  : shadow,
        fontFamily  : '"Arial Black", "Impact", "Helvetica Neue", sans-serif',
        fontSize    : `${fontSize}px`,
        fontWeight,
        letterSpacing: '0.04em',
        lineHeight  : 1,
      }}
    >
      {char}
    </span>
  );
}

// ─── Per-word slam animation ──────────────────────────────────────────────────
function AnimatedWord({ word, wordIndex, totalWords, localFrame, fps, preset, weight, textColor, accentColor, fontSize, fontWeight }) {
  const delay = wordIndex * 6;
  const start = Math.max(0, localFrame - delay);
  const isLast = wordIndex === totalWords - 1;

  // ── lyric: clean large white text, words drop in from slightly above ────
  if (preset === 'lyric') {
    const slideY  = interpolate(start, [0, 14], [-30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const opacity = interpolate(start, [0, 8],  [0, 1],   { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const scale   = spring({ frame: start, fps, config: { stiffness: 280, damping: 18, mass: 0.7 }, from: 1.12, to: 1 });

    return (
      <span style={{
        display      : 'inline-block',
        transform    : `translateY(${slideY}px) scale(${scale})`,
        opacity,
        color        : '#ffffff',
        fontFamily   : '"Arial Black", Impact, "Helvetica Neue", sans-serif',
        fontSize     : `${fontSize}px`,
        fontWeight   : 900,
        lineHeight   : 1,
        margin       : '0 10px',
        letterSpacing: '0.03em',
        textShadow   : [
          '0 4px 40px rgba(0,0,0,0.95)',
          '0 2px 12px rgba(0,0,0,0.85)',
          '0 0 80px rgba(0,0,0,0.6)',
        ].join(', '),
      }}>
        {word.toUpperCase()}
      </span>
    );
  }

  // ── energetic: punch from huge scale, slight rotation overshoot ──────────
  if (preset === 'energetic') {
    const scale  = spring({ frame: start, fps, config: { stiffness: 500, damping:  8, mass: 0.5 }, from: 2.8, to: 1 });
    const rotate = interpolate(start, [0, 5, 8, 12], [wordIndex % 2 === 0 ? 12 : -12, 4, -2, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    const opacity = interpolate(start, [0, 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const color   = isLast ? accentColor : textColor;
    const outline = `-1px -1px 0 rgba(0,0,0,0.6), 1px -1px 0 rgba(0,0,0,0.6), -1px 1px 0 rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,0.6)`;
    const shadow  = isLast
      ? `${outline}, 0 0 30px ${accentColor}, 0 0 12px ${accentColor}`
      : outline;

    return (
      <span style={{
        display    : 'inline-block',
        transform  : `scale(${scale}) rotate(${rotate}deg)`,
        opacity,
        color,
        textShadow : shadow,
        fontFamily : '"Arial Black", Impact, sans-serif',
        fontSize   : `${fontSize}px`,
        fontWeight : 900,
        lineHeight : 1,
        margin     : '0 6px',
      }}>
        {word.toUpperCase()}
      </span>
    );
  }

  // ── minimal: slide up, alternating fill ──────────────────────────────────
  if (preset === 'minimal') {
    const slideY  = interpolate(start, [0, 16], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const opacity = interpolate(start, [0, 10], [0, 1],  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const color   = wordIndex % 2 === 0 ? textColor : accentColor;

    return (
      <span style={{
        display    : 'inline-block',
        transform  : `translateY(${slideY}px)`,
        opacity,
        color,
        fontFamily : '"Arial Black", Impact, sans-serif',
        fontSize   : `${fontSize}px`,
        fontWeight : 900,
        lineHeight : 1,
        margin     : '0 8px',
        letterSpacing: '0.06em',
        textShadow : '0 4px 20px rgba(0,0,0,0.7)',
      }}>
        {word.toUpperCase()}
      </span>
    );
  }

  // ── dramatic: letter-by-letter slam (for 1-3 word scenes) ─────────────────
  //             word-level slam for longer lines
  if (word.length <= 8 && totalWords <= 2) {
    return (
      <span style={{ display: 'inline-flex', margin: '0 6px' }}>
        {word.toUpperCase().split('').map((ch, li) => (
          <AnimatedLetter
            key={li}
            char={ch}
            letterIndex={wordIndex * word.length + li}
            localFrame={localFrame}
            fps={fps}
            textColor={textColor}
            accentColor={accentColor}
            fontSize={fontSize}
            fontWeight={fontWeight}
            totalLetters={word.length}
          />
        ))}
      </span>
    );
  }

  // dramatic word-level
  const scale   = spring({ frame: start, fps, config: { stiffness: 180, damping: 10, mass: 1.1 }, from: 2.2, to: 1 });
  const opacity = interpolate(start, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glow    = interpolate(start, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const color   = isLast ? accentColor : textColor;
  const str     = weight === 3 ? 50 : 24;
  const shadow  = [
    `0 6px 40px rgba(0,0,0,0.95)`,
    `0 0 ${Math.round(str * glow)}px ${color}88`,
  ].join(', ');

  return (
    <span style={{
      display    : 'inline-block',
      transform  : `scale(${scale})`,
      opacity,
      color,
      textShadow : shadow,
      fontFamily : '"Arial Black", Impact, sans-serif',
      fontSize   : `${fontSize}px`,
      fontWeight : 900,
      lineHeight : 1,
      margin     : '0 8px',
    }}>
      {word.toUpperCase()}
    </span>
  );
}

// ─── KineticText ──────────────────────────────────────────────────────────────
export function KineticText({ text = '', textColor = '#fff', accentColor = '#fff', localFrame = 0, fps = 30, preset = 'dramatic', weight = 2 }) {
  const words     = text.split(/\s+/).filter(Boolean);
  const fontSize  = calcFontSize(words.length, weight);
  const fontWeight = 900;

  return (
    <div style={{
      display        : 'flex',
      flexWrap       : 'wrap',
      justifyContent : 'center',
      alignItems     : 'center',
      padding        : '0 60px',
      textAlign      : 'center',
      rowGap         : '16px',
    }}>
      {words.map((word, i) => (
        <AnimatedWord
          key={i}
          word={word}
          wordIndex={i}
          totalWords={words.length}
          localFrame={localFrame}
          fps={fps}
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
