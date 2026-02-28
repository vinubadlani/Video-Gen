/**
 * autoGenerate.js
 *
 * Fully autonomous pipeline:
 *   1. Pick a random topic from the topic pool
 *   2. Generate script via Groq
 *   3. Generate voiceover via ElevenLabs
 *   4. Render video with Remotion
 *   5. Upload to YouTube as a Short
 *
 * Usage:
 *   node scripts/autoGenerate.js              ← random topic
 *   node scripts/autoGenerate.js "AI agents"  ← forced topic
 *
 * Runs as a GitHub Actions cron job – no server required.
 */

require('dotenv').config();

const path = require('path');
const fse  = require('fs-extra');

const { generateScript }    = require('./generateScript');
const { generateAudio }     = require('./generateAudio');
const { renderVideo }       = require('./renderVideo');
const { uploadToYoutube }   = require('./uploadToYoutube');
const { getRandomTopic }    = require('./topicPool');

// ─── Validate required env vars ───────────────────────────────────────────────
function validateEnv() {
  const required = [
    'GROQ_API_KEY',
    'ELEVENLABS_API_KEY',
    'ELEVENLABS_VOICE_ID',
    'YOUTUBE_CLIENT_ID',
    'YOUTUBE_CLIENT_SECRET',
    'YOUTUBE_REFRESH_TOKEN',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`\n❌  Missing environment variables: ${missing.join(', ')}`);
    console.error('    Set them in .env (local) or GitHub Secrets (CI).\n');
    process.exit(1);
  }
}

// ─── Simple console emitter ───────────────────────────────────────────────────
function emit(type, data) {
  if (type === 'log')              console.log(`      ${data.message}`);
  else if (type === 'render_progress' && data.progress % 20 === 0)
    console.log(`      Render: ${data.progress}%`);
  else if (type === 'youtube_progress' && data.progress % 20 === 0)
    console.log(`      Upload: ${data.progress}%`);
}

// ─── Main pipeline ────────────────────────────────────────────────────────────
async function main() {
  validateEnv();

  const topic = process.argv[2]?.trim() || getRandomTopic();

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   AUTO VIDEO GENERATOR  →  YouTube       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Topic : ${topic}`);
  console.log(`  Time  : ${new Date().toISOString()}\n`);

  await fse.ensureDir(path.join(__dirname, '..', 'output'));
  await fse.ensureDir(path.join(__dirname, '..', 'public'));

  // ── 1. Script ──────────────────────────────────────────────────────────────
  console.log('[1/4] Generating script…');
  const script = await generateScript(topic, emit);
  console.log(`      ✓ ${script.scenes.length} scenes | title: "${script.title}"\n`);

  // ── 2. Audio ───────────────────────────────────────────────────────────────
  console.log('[2/4] Generating voiceover…');
  const audioPath = await generateAudio(script.fullScript, emit);
  console.log(`      ✓ Audio ready\n`);

  // ── 3. Render ──────────────────────────────────────────────────────────────
  console.log('[3/4] Rendering video…');
  const outputPath = await renderVideo(script.scenes, audioPath, emit, topic);
  console.log(`      ✓ Video saved: ${path.relative(path.join(__dirname, '..'), outputPath)}\n`);

  // ── 4. YouTube ─────────────────────────────────────────────────────────────
  console.log('[4/4] Uploading to YouTube Shorts…');
  const youtubeUrl = await uploadToYoutube(
    outputPath,
    script.title || topic,
    `${script.title || topic} — AI-generated explainer about "${topic}"`,
    emit
  );

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   DONE ✓                                  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  YouTube : ${youtubeUrl}`);
  console.log(`  File    : output/${path.basename(outputPath)}\n`);
}

main().catch(err => {
  console.error('\n❌  FATAL:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
