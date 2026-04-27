import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from './KineticText';

// ─── Lyric-video landscape background ────────────────────────────────────────

function LyricBackground({ localFrame }) {
  // Subtle slow Ken-Burns pan
  const scale = interpolate(localFrame, [0, 120], [1.0, 1.04], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Sunset sky gradient */}
      <div style={{
        position : 'absolute',
        inset    : 0,
        transform: `scale(${scale})`,
        background: `linear-gradient(
          to bottom,
          #091520 0%,
          #0d2e42 12%,
          #185a72 26%,
          #3a8899 38%,
          #f09840 50%,
          #d95015 60%,
          #8a2206 70%,
          #2a0e04 80%,
          #0e0604 90%,
          #080504 100%
        )`,
      }} />

      {/* Horizon glow bloom */}
      <div style={{
        position : 'absolute',
        left     : 0,
        right    : 0,
        top      : '44%',
        height   : 120,
        background: 'radial-gradient(ellipse 70% 100% at 50% 50%, rgba(255,160,40,0.55) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Far mountain range */}
      <svg
        style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '58%', pointerEvents: 'none' }}
        viewBox="0 0 1080 1000"
        preserveAspectRatio="xMidYMax slice"
      >
        <path
          d="M0,1000 L0,600 L90,470 L200,520 L320,360 L460,450 L570,280 L680,390 L800,310 L920,400 L1010,340 L1080,370 L1080,1000 Z"
          fill="#0b0818"
          opacity="0.9"
        />
        <path
          d="M0,1000 L0,730 L80,660 L190,710 L300,630 L420,690 L520,590 L650,670 L760,610 L880,670 L980,630 L1080,660 L1080,1000 Z"
          fill="#08060f"
        />
      </svg>

      {/* Dark foreground strip */}
      <div style={{
        position  : 'absolute',
        bottom    : 0,
        left      : 0,
        right     : 0,
        height    : '22%',
        background: 'linear-gradient(to top, #050304 60%, transparent 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ─── Horizontal lyric progress bar ────────────────────────────────────────────


// Horizontal lyric progress bar — glowing line that fills across the scene
function LyricBar({ localFrame, totalDuration }) {
  const width = interpolate(localFrame, [0, 8, totalDuration - 6, totalDuration], [0, 100, 100, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = interpolate(localFrame, [0, 5], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div style={{
      position : 'absolute',
      bottom   : 140,
      left     : '50%',
      transform: 'translateX(-50%)',
      width    : '68%',
      height   : 2,
      background: 'rgba(255,255,255,0.10)',
      opacity,
    }}>
      <div style={{
        height      : '100%',
        width       : `${width}%`,
        background  : 'linear-gradient(90deg, transparent, #ffffffcc, #ffffff)',
        boxShadow   : '0 0 12px rgba(255,255,255,0.8)',
        borderRadius: 2,
      }} />
    </div>
  );
}

// ─── Main Scene ────────────────────────────────────────────────────────────────
export function Scene({ scene, sceneIndex, fps, localFrame, totalDuration }) {
  const { preset = 'lyric' } = scene;

  // Scene pop-in
  const containerScale = interpolate(localFrame, [0, 8], [1.02, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      width         : '100%',
      height        : '100%',
      display       : 'flex',
      flexDirection : 'column',
      justifyContent: 'center',
      alignItems    : 'center',
      position      : 'relative',
      overflow      : 'hidden',
      transform     : `scale(${containerScale})`,
    }}>
      {/* Landscape background — shared across all scenes */}
      <LyricBackground localFrame={localFrame} />

      {/* Main kinetic text */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
        <KineticText
          text={scene.text || ''}
          textColor="#ffffff"
          accentColor="#ffffff"
          localFrame={localFrame}
          fps={fps}
          preset="lyric"
          weight={scene.weight || 2}
        />
      </div>

      {/* Lyric progress bar */}
      <LyricBar localFrame={localFrame} totalDuration={totalDuration} />
    </div>
  );
}

