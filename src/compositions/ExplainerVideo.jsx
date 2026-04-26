import React from 'react';
import {
  AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { Scene } from '../components/Scene';

// Total weight of all scenes
function getTotalWeight(scenes) {
  return scenes.reduce((sum, s) => sum + (s.weight || 2), 0);
}

// ─── Flash / white-cut intro (2 frames) ──────────────────────────────────────
function IntroFlash({ frame }) {
  const opacity = interpolate(frame, [0, 3, 7], [1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill
      style={{ background: '#fff', opacity, zIndex: 10000, pointerEvents: 'none' }}
    />
  );
}

// ─── Global vignette overlay ──────────────────────────────────────────────────
function Vignette() {
  return (
    <AbsoluteFill
      style={{
        zIndex        : 9990,
        pointerEvents : 'none',
        background    : 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
      }}
    />
  );
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

  const INTRO_DELAY  = 7;   // frames before first scene starts (covers intro flash)
  const FADE_FRAMES  = 8;   // per-scene cross-fade duration
  const OUTRO_FRAMES = 18;  // final cinematic fade-out
  const usableDuration = durationInFrames - INTRO_DELAY - OUTRO_FRAMES;

  const totalWeight = getTotalWeight(scenes);

  // Build frame ranges per scene
  let cursor = INTRO_DELAY;
  const ranges = scenes.map((scene) => {
    const w          = scene.weight || 2;
    const duration   = Math.round((w / totalWeight) * usableDuration);
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
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
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

      {/* Scene layers – cross-fade between scenes */}
      {scenes.map((scene, idx) => {
        const { startFrame, endFrame, duration } = ranges[idx];

        // Render within a generous window around the scene
        if (frame < startFrame - FADE_FRAMES || frame > endFrame + FADE_FRAMES) {
          return null;
        }

        const localFrame = frame - startFrame;

        // Smooth ease-in / ease-out per scene
        const enterOpacity = interpolate(
          localFrame,
          [-FADE_FRAMES, 0, FADE_FRAMES],
          [0, 0.5, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        const exitOpacity = interpolate(
          localFrame,
          [duration - FADE_FRAMES, duration, duration + FADE_FRAMES],
          [1, 0.5, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        const sceneOpacity = Math.min(enterOpacity, exitOpacity);

        // Subtle scale pulse on entry for dramatic scenes
        const sceneScale = scene.preset === 'dramatic'
          ? interpolate(localFrame, [0, 20], [1.04, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })
          : 1;

        return (
          <AbsoluteFill
            key={idx}
            style={{
              opacity  : sceneOpacity * globalOpacity,
              zIndex   : idx,
              transform: `scale(${sceneScale})`,
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

      {/* Vignette for cinematic depth */}
      <Vignette />

      {/* White-cut intro flash */}
      <IntroFlash frame={frame} />

      {/* Debug overlay */}
      {debug && (
        <AbsoluteFill
          style={{
            zIndex        : 9999,
            pointerEvents : 'none',
            justifyContent: 'flex-start',
            alignItems    : 'flex-start',
            padding       : 24,
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
              <div
                key={i}
                style={{
                  fontSize: 22,
                  color   : frame >= r.startFrame && frame < r.endFrame ? '#0f0' : '#555',
                }}
              >
                [{i}] {r.startFrame}–{r.endFrame}: {scenes[i]?.text}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}


  const totalWeight = getTotalWeight(scenes);

  // Build frame ranges per scene
  let cursor = INTRO_DELAY;
  const ranges = scenes.map((scene) => {
    const w          = scene.weight || 2;
    const duration   = Math.round((w / totalWeight) * usableDuration);
    const startFrame = cursor;
    const endFrame   = cursor + duration;
    cursor = endFrame;
    return { startFrame, endFrame, duration };
  });
