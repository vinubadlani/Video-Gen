import React from 'react';
import {
  AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { Scene } from '../components/Scene';

// Total weight of all scenes
function getTotalWeight(scenes) {
  return scenes.reduce((sum, s) => sum + (s.weight || 2), 0);
}

export function ExplainerVideo({ scenes = [], fullScript = '', debug = false }) {
  const frame  = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!scenes || scenes.length === 0) {
    return (
      <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#fff', fontSize: 48, fontFamily: 'sans-serif' }}>
          Script generation failed – no scenes.
        </p>
      </AbsoluteFill>
    );
  }

  const INTRO_DELAY    = 5;                      // frames before first scene starts
  const FADE_FRAMES    = 6;                      // per-scene fade in / out
  const OUTRO_FRAMES   = 15;                     // final cinematic fade-out
  const usableDuration = durationInFrames - INTRO_DELAY - OUTRO_FRAMES;

  const totalWeight = getTotalWeight(scenes);

  // Build frame ranges per scene
  let cursor = INTRO_DELAY;
  const ranges = scenes.map((scene) => {
    const w        = scene.weight || 2;
    const duration = Math.round((w / totalWeight) * usableDuration);
    const startFrame = cursor;
    const endFrame   = cursor + duration;
    cursor = endFrame;
    return { startFrame, endFrame, duration };
  });

  // Global cinematic fade-out
  const globalOpacity = interpolate(
    frame,
    [durationInFrames - OUTRO_FRAMES, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* Main audio – fades out with the cinematic outro */}
      <Audio
        src={staticFile('audio.mp3')}
        volume={(f) =>
          interpolate(f, [durationInFrames - OUTRO_FRAMES, durationInFrames], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />

      {/* Scene layers – all rendered simultaneously, each at its own zIndex */}
      {scenes.map((scene, idx) => {
        const { startFrame, endFrame, duration } = ranges[idx];

        // Visibility window
        if (frame < startFrame - FADE_FRAMES || frame > endFrame + FADE_FRAMES) {
          return null; // outside render window
        }

        const localFrame = frame - startFrame;

        const enterOpacity = interpolate(
          localFrame,
          [0, FADE_FRAMES],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const exitOpacity = interpolate(
          localFrame,
          [duration - FADE_FRAMES, duration],
          [1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const sceneOpacity = Math.min(enterOpacity, exitOpacity);

        return (
          <AbsoluteFill
            key={idx}
            style={{
              opacity : sceneOpacity * globalOpacity,
              zIndex  : idx,
            }}
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

      {/* Debug overlay */}
      {debug && (
        <AbsoluteFill
          style={{
            zIndex       : 9999,
            pointerEvents: 'none',
            justifyContent: 'flex-start',
            alignItems   : 'flex-start',
            padding      : 24,
          }}
        >
          <div
            style={{
              background  : 'rgba(0,0,0,0.7)',
              color       : '#0f0',
              fontFamily  : 'monospace',
              fontSize    : 28,
              padding     : '8px 16px',
              borderRadius: 6,
            }}
          >
            frame: {frame} / {durationInFrames}
            {ranges.map((r, i) => (
              <div key={i} style={{ fontSize: 22, color: frame >= r.startFrame && frame < r.endFrame ? '#0f0' : '#555' }}>
                [{i}] {r.startFrame}-{r.endFrame}: {scenes[i]?.text}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
