import React from 'react';
import { interpolate, useVideoConfig } from 'remotion';
import { KineticText } from './KineticText';

// ─── Gradient overlays per preset ────────────────────────────────────────────
function getBgStyle(preset, bg, accent) {
  if (preset === 'dramatic') {
    return {
      background: `radial-gradient(ellipse at 50% 40%, ${accent}22 0%, ${bg} 70%)`,
    };
  }
  if (preset === 'energetic') {
    return {
      background: `linear-gradient(135deg, ${bg} 0%, ${accent}33 100%)`,
    };
  }
  // minimal
  return { background: bg };
}

// ─── Scene progress bar ───────────────────────────────────────────────────────
function ProgressBar({ localFrame, totalDuration, accent }) {
  const pct = Math.min(1, localFrame / Math.max(totalDuration - 1, 1));
  return (
    <div
      style={{
        position       : 'absolute',
        bottom         : 0,
        left           : 0,
        width          : '100%',
        height         : 4,
        background     : 'rgba(255,255,255,0.12)',
      }}
    >
      <div
        style={{
          height        : '100%',
          width         : `${Math.round(pct * 100)}%`,
          background    : accent,
          borderRadius  : '0 2px 2px 0',
          transition    : 'width 0.05s linear',
        }}
      />
    </div>
  );
}

// ─── Corner decoration dots ───────────────────────────────────────────────────
function CornerDots({ accent, localFrame }) {
  const scale = interpolate(localFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const dotStyle = (top, left, right, bottom) => ({
    position    : 'absolute',
    top, left, right, bottom,
    width       : 14,
    height      : 14,
    borderRadius: '50%',
    background  : accent,
    opacity     : 0.45,
    transform   : `scale(${scale})`,
  });
  return (
    <>
      <div style={dotStyle(36, 36, undefined, undefined)} />
      <div style={dotStyle(36, undefined, 36, undefined)} />
      <div style={dotStyle(undefined, 36, undefined, 36)} />
      <div style={dotStyle(undefined, undefined, 36, 36)} />
    </>
  );
}

export function Scene({ scene, sceneIndex, fps, localFrame, totalDuration }) {
  const { bg = '#000', textColor = '#fff', accent = '#fff', preset = 'dramatic' } = scene;
  const bgStyle = getBgStyle(preset, bg, accent);

  // Accent bar pulse
  const barWidth = interpolate(
    localFrame,
    [0, 12, totalDuration - 6, totalDuration],
    [0, 90, 90, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <div
      style={{
        width          : '100%',
        height         : '100%',
        display        : 'flex',
        flexDirection  : 'column',
        justifyContent : 'center',
        alignItems     : 'center',
        position       : 'relative',
        overflow       : 'hidden',
        ...bgStyle,
      }}
    >
      {/* Corner decoration */}
      <CornerDots accent={accent} localFrame={localFrame} />

      {/* Scene number badge */}
      <div
        style={{
          position       : 'absolute',
          top            : 48,
          right          : 48,
          width          : 48,
          height         : 48,
          borderRadius   : '50%',
          border         : `3px solid ${accent}`,
          display        : 'flex',
          alignItems     : 'center',
          justifyContent : 'center',
          color          : accent,
          fontFamily     : '"Arial Black", Impact, sans-serif',
          fontWeight     : 900,
          fontSize       : 22,
          opacity        : 0.6,
        }}
      >
        {sceneIndex + 1}
      </div>

      {/* Main kinetic text */}
      <KineticText
        text={scene.text || ''}
        textColor={textColor}
        accentColor={accent}
        localFrame={localFrame}
        fps={fps}
        preset={preset}
        weight={scene.weight || 2}
      />

      {/* Animated accent bar */}
      <div
        style={{
          position        : 'absolute',
          bottom          : 80,
          left            : '50%',
          transform       : 'translateX(-50%)',
          width           : barWidth,
          height          : 5,
          borderRadius    : 3,
          background      : accent,
          boxShadow       : `0 0 12px ${accent}88`,
        }}
      />

      {/* Scene progress bar */}
      <ProgressBar localFrame={localFrame} totalDuration={totalDuration} accent={accent} />
    </div>
  );
}
