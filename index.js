require('dotenv').config();

const path    = require('path');
const fse     = require('fs-extra');

const { generateScript } = require('./scripts/generateScript');
const { generateAudio }  = require('./scripts/generateAudio');
const { renderVideo }    = require('./scripts/renderVideo');

// ─── Validate ENV ────────────────────────────────────────────────────────────
function validateEnv() {
  const required = ['GROQ_API_KEY', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`\n[ERROR] Missing environment variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in your keys.\n');
    process.exit(1);
  }
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────
async function main() {
  const topic = process.argv[2];

  if (!topic) {
    console.error('\nUsage:  node index.js "Your topic here"');
    console.error('Example: node index.js "How to use sauf powder"\n');
    process.exit(1);
  }

  validateEnv();

  console.log('\n================================================');
  console.log('  AI VERTICAL VIDEO GENERATOR');
  console.log('================================================');
  console.log(`  Topic : ${topic}`);
  console.log('================================================\n');

  // Ensure output directories exist
  await fse.ensureDir(path.join(__dirname, 'output'));
  await fse.ensureDir(path.join(__dirname, 'public'));

  // ── Step 1 : Generate script ───────────────────────────────────────────────
  console.log('[1/3] Generating script via Groq...');
  const script = await generateScript(topic);
  console.log(`      ✓ ${script.scenes.length} scenes created`);
  console.log(`      ✓ Full script: "${script.fullScript.substring(0, 80)}..."\n`);

  // ── Step 2 : Generate voiceover ────────────────────────────────────────────
  console.log('[2/3] Generating voiceover via ElevenLabs...');
  const audioPath = await generateAudio(script.fullScript);
  console.log(`      ✓ Audio saved to: ${path.relative(__dirname, audioPath)}\n`);

  // ── Step 3 : Render video ──────────────────────────────────────────────────
  console.log('[3/3] Rendering video with Remotion...');
  const outputPath = await renderVideo(script.scenes, audioPath, () => {}, topic);

  console.log('\n================================================');
  console.log('  VIDEO READY');
  console.log(`  File : ${path.relative(__dirname, outputPath)}`);
  console.log('================================================\n');
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
