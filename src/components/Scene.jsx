import React from 'react';
import { KineticText } from './KineticText';

export function Scene({ scene, sceneIndex, fps, localFrame, totalDuration }) {
  const { bg = '#000', textColor = '#fff', accent = '#fff' } = scene;

  return (
    <div
      style={{
        width          : '100%',
        height         : '100%',
        background     : bg,
        display        : 'flex',
        flexDirection  : 'column',
        justifyContent : 'center',
        alignItems     : 'center',
        position       : 'relative',
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          position        : 'absolute',
          bottom          : 120,
          left            : '50%',
          transform       : 'translateX(-50%)',
          width           : 80,
          height          : 6,
          borderRadius    : 3,
          background      : accent,
        }}
      />

      {/* Main kinetic text */}
      <KineticText
        text={scene.text || ''}
        textColor={textColor}
        accentColor={accent}
        localFrame={localFrame}
        fps={fps}
        preset={scene.preset || 'dramatic'}
        weight={scene.weight || 2}
      />
    </div>
  );
}
