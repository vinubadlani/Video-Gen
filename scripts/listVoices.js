/**
 * listVoices.js
 *
 * Lists all available ElevenLabs voices, highlighting Indian / Hindi accent ones.
 * Run:  npm run voices
 *
 * Copy the Voice ID of your chosen voice and set it as ELEVENLABS_VOICE_ID in .env
 */

require('dotenv').config();
const axios = require('axios');

async function listVoices() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('❌  ELEVENLABS_API_KEY not set in .env');
    process.exit(1);
  }

  const { data } = await axios.get('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  });

  const voices = data.voices || [];

  // Filter and sort: Indian/Hindi accented voices first
  const indianKeywords = ['indian', 'hindi', 'india', 'south asian', 'desi'];
  const isIndian = (v) => {
    const hay = [
      v.name,
      v.labels?.accent,
      v.labels?.description,
      v.labels?.gender,
      v.category,
    ].join(' ').toLowerCase();
    return indianKeywords.some(k => hay.includes(k));
  };

  const sorted = [
    ...voices.filter(isIndian),
    ...voices.filter(v => !isIndian(v)),
  ];

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ElevenLabs Voices  (★ = Indian/South Asian accent)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  ${'Name'.padEnd(22)} ${'Voice ID'.padEnd(22)} ${'Accent'.padEnd(18)} Gender`);
  console.log('  ' + '─'.repeat(74));

  sorted.forEach(v => {
    const accent = v.labels?.accent || '—';
    const gender = v.labels?.gender || '—';
    const star   = isIndian(v) ? '★ ' : '  ';
    console.log(`${star}${v.name.padEnd(22)} ${v.voice_id.padEnd(22)} ${accent.padEnd(18)} ${gender}`);
  });

  console.log('\n  Set your chosen voice in .env:');
  console.log('  ELEVENLABS_VOICE_ID=<voice_id_from_above>\n');

  const currentId = process.env.ELEVENLABS_VOICE_ID;
  const current   = voices.find(v => v.voice_id === currentId);
  if (current) {
    console.log(`  Currently using: "${current.name}" (${currentId})`);
    if (isIndian(current)) console.log('  ✓ Already an Indian accent voice!\n');
    else console.log('  ℹ  Not an Indian accent voice. Pick a ★ voice above.\n');
  }
}

listVoices().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
