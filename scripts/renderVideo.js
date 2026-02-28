const path = require('path');
const fse  = require('fs-extra');

// music-metadata v10 is ESM-only; use a dynamic import wrapper
async function getAudioDuration(filePath) {
  const mm       = await import('music-metadata');
  const metadata = await mm.parseFile(filePath);
  return metadata.format.duration; // seconds (float)
}

/**
 * Bundles the Remotion project and renders the final MP4.
 *
 * @param {Array}  scenes      Scene objects from Groq (text, bg, text colour …)
 * @param {string} audioPath   Absolute path to the generated audio MP3
 * @returns {Promise<string>}  Absolute path to output/final.mp4
 */
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function renderVideo(scenes, audioPath, emit = () => {}, topic = 'video', debug = false) {
  // Dynamically import ESM-friendly Remotion packages
  const { bundle }                          = require('@remotion/bundler');
  const { renderMedia, selectComposition }  = require('@remotion/renderer');

  // ── 1. Measure audio duration ──────────────────────────────────
  const audioDurationSecs = await getAudioDuration(audioPath);
  const FPS               = 30;
  const durationFrames    = Math.ceil(audioDurationSecs * FPS) + 15; // +15 frame tail

  emit('log', { message: `Audio duration: ${audioDurationSecs.toFixed(2)}s → ${durationFrames} frames @ ${FPS} fps` });
  emit('render_info', { audioDurationSecs, durationFrames, fps: FPS });

  // ── 2. Bundle the Remotion entry point ───────────────────────────────────
  const entryPoint = path.join(__dirname, '..', 'src', 'index.jsx');

  process.stdout.write('      Bundling Remotion project...');
  const serveUrl = await bundle({
    entryPoint,
    // Pass the public dir so static files (audio.mp3) are served correctly
    publicDir: path.join(__dirname, '..', 'public'),
    onProgress: (p) => {
      emit('log', { message: `Bundling… ${Math.round(p * 100)}%` });
    },
  });
  console.log(' done');
  emit('log', { message: 'Remotion bundle ready' });

  // ── 3. Select composition ────────────────────────────────────────────────
  const inputProps = {
    scenes,
    audioDurationSecs,
    durationFrames,
    debug: debug || process.env.DEBUG === 'true',
  };

  const composition = await selectComposition({
    serveUrl,
    id         : 'ExplainerVideo',
    inputProps,
  });

  // Override frames to match actual audio length
  composition.durationInFrames = durationFrames;
  composition.fps               = FPS;

  // ── 4. Render ────────────────────────────────────────────────────────────
  const slug = slugify(topic || 'video');
  const outputPath = path.join(__dirname, '..', 'output', `${slug}.mp4`);
  await fse.ensureDir(path.dirname(outputPath));

  let lastProgress = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec          : 'h264',
    outputLocation : outputPath,
    inputProps,
    fps            : FPS,
    onProgress({ progress }) {
      const pct = Math.floor(progress * 100);
      if (pct !== lastProgress && pct % 5 === 0) {
        process.stdout.write(`\r      Rendering... ${pct}%  `);
        emit('render_progress', { progress: pct });
        lastProgress = pct;
      }
    },
    browserExecutable: process.env.REMOTION_CHROME_EXECUTABLE || undefined,
    logLevel          : 'error',
  });

  process.stdout.write('\r      Rendering... 100% done\n');
  emit('render_progress', { progress: 100 });
  emit('log', { message: `Video saved to output/${slug}.mp4` });

  return outputPath;
}

module.exports = { renderVideo };
