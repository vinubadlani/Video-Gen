import React from 'react';
import {
  AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { Scene } from '../components/Scene';

function getTotalWeight(scenes) {
  return scenes.reduce((sum, s) => sum + (s.weight || 2), 0);
}

// ─── Hard-cut flash between scenes (lyric-video feel) ────────────────────────
function CutFlash({ ranges, frame, scenes }) {
  // Flash on the exact frame each scene starts
  let flashOpacity = 0;
  for (let i = 1; i < ranges.length; i++) {
    const dist = Math.abs(frame - ranges[i].startFrame);
    if (dist <= 1) {
      const sceneAccent = scenes[i]?.accent || '#fff';
      const fade = interpolate(dist, [0, 2], [0.7, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      flashOpacity = Math.max(flashOpacity, fade);
    }
  }
  if (flashOpacity <= 0) return null;
  return (
    <AbsoluteFill style={{
      background   : '#fff',
      opacity      : flashOpacity,
      zIndex       : 9995,
      pointerEvents: 'none',
    }} />
  );
}

// ─── Opening flash ────────────────────────────────────────────────────────────
function IntroFlash({ frame }) {
  const opacity = interpolate(frame, [0, 2, 6], [1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  if (opacity <= 0) return null;
  return <AbsoluteFill style={{ background: '#fff', opacity, zIndex: 10000, pointerEvents: 'none' }} />;
}

// ─── Vignette ─────────────────────────────────────────────────────────────────
function Vignette() {
  return (
    <AbsoluteFill style={{
      zIndex       : 9990,
      pointerEvents: 'none',
      background   : 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.65) 100%)',
    }} />
  );
}

export function ExplainerVideo({ scenes = [], fullScript = '', debug = false }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!scenes || scenes.length === 0) {
    return (
      <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#fff', fontSize: 48, fontFamily: 'sans-serif' }}>No scenes.</p>
      </AbsoluteFill>
    );
  }

  const INTRO_DELAY  = 5;
  const FADE_FRAMES  = 2;   // near-hard cuts = lyric video feel
  const OUTRO_FRAMES = 20;
  const usableDuration = durationInFrames - INTRO_DELAY - OUTRO_FRAMES;
  const totalWeight    = getTotalWeight(scenes);

  let cursor = INTRO_DELAY;
  const ranges = scenes.map((scene) => {
    const w          = scene.weight || 2;
    const duration   = Math.round((w / totalWeight) * usableDuration);
    const startFrame = cursor;
    const endFrame   = cursor + duration;
    cursor = endFrame;
    return { startFrame, endFrame, duration };
  });

  const globalOpacity = interpolate(
    frame,
    [durationInFrames - OUTRO_FRAMES, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Audio
        src={staticFile('audio.mp3')}
        volume={(f) => interpolate(f, [durationInFrames - OUTRO_FRAMES, durationInFrames], [1, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        })}
      />

      {/* Scene layers — hard cuts */}
      {scenes.map((scene, idx) => {
        const { startFrame, endFrame, duration } = ranges[idx];

        // Only render the active scene + a tiny overlap window
        if (frame < startFrame - FADE_FRAMES || frame > endFrame + FADE_FRAMES) return null;

        const localFrame = frame - startFrame;

        // Micro cross-dissolve (2 frames) for smooth hard cut
        const enterOpacity = interpolate(localFrame, [0, FADE_FRAMES], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const exitOpacity = interpolate(localFrame, [duration - FADE_FRAMES, duration], [1, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const sceneOpacity = Math.min(enterOpacity, exitOpacity) * globalOpacity;

        return (
          <AbsoluteFill
            key={idx}
            style={{ opacity: sceneOpacity, zIndex: idx }}
          >
            <Scene
              scene={scene}
              sceneIndex={idx}
              fps={fps}
              localFrame={localFrame}
              totalDuration={duration}
            />
          </AbsoluteFill>
        );
      })}

      <Vignette />
      <CutFlash ranges={ranges} frame={frame} scenes={scenes} />
      <IntroFlash frame={frame} />

      {debug && (
        <AbsoluteFill style={{ zIndex: 9999, pointerEvents: 'none', justifyContent: 'flex-start', alignItems: 'flex-start', padding: 24 }}>
          <div style={{ background: 'rgba(0,0,0,0.75)', color: '#0f0', fontFamily: 'monospace', fontSize: 26, padding: '8px 16px', borderRadius: 6 }}>
            {frame} / {durationInFrames}
            {ranges.map((r, i) => (
              <div key={i} style={{ fontSize: 20, color: frame >= r.startFrame && frame < r.endFrame ? '#0f0' : '#444' }}>
                [{i}] {r.startFrame}–{r.endFrame}: {scenes[i]?.text}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
