const axios = require('axios');
const path  = require('path');
const fs    = require('fs');
const fse   = require('fs-extra');

// ─────────────────────────────────────────────────────────────────────────────
// Google Translate TTS  (free, no API key required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split text into chunks ≤ 200 chars on sentence boundaries
 * (Google Translate TTS has a ~200 char per-request limit)
 */
function splitIntoChunks(text, maxLen = 190) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    const part = s.trim();
    if (!part) continue;
    if ((current + ' ' + part).trim().length <= maxLen) {
      current = (current + ' ' + part).trim();
    } else {
      if (current) chunks.push(current);
      // If a single sentence is too long, split it by word
      if (part.length > maxLen) {
        const words = part.split(' ');
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).trim().length <= maxLen) {
            sub = (sub + ' ' + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        if (sub) current = sub;
        else current = '';
      } else {
        current = part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Fetch a single TTS chunk from Google Translate.
 * lang: 'en' = US English, 'en-IN' = Indian English (not always supported)
 */
async function fetchGoogleTTSChunk(text, lang = 'en') {
  const url = `https://translate.google.com/translate_tts` +
    `?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob&ttsspeed=0.9`;

  const response = await axios.get(url, {
    headers     : { 'User-Agent': 'Mozilla/5.0 (compatible; VideoGen/1.0)' },
    responseType: 'arraybuffer',
    timeout     : 30_000,
  });
  return Buffer.from(response.data);
}

/**
 * Generate audio via Google Translate TTS (free, no key needed).
 * Concatenates MP3 chunks for the full script.
 */
async function generateWithGoogleTTS(text, outputPath, emit) {
  emit('log', { message: 'Using Google Translate TTS (free, no key required)…' });

  const chunks  = splitIntoChunks(text);
  emit('log', { message: `Split into ${chunks.length} chunk(s)` });

  const buffers = [];
  for (const chunk of chunks) {
    const buf = await fetchGoogleTTSChunk(chunk, 'en');
    buffers.push(buf);
  }

  fs.writeFileSync(outputPath, Buffer.concat(buffers));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates voiceover audio via Google Translate TTS and saves to /public/audio.mp3.
 *
 * @param {string}   scriptText
 * @param {function} emit
 * @returns {Promise<string>} absolute path to the saved MP3
 */
async function generateAudio(scriptText, emit = () => {}) {
  const publicDir = path.join(__dirname, '..', 'public');
  await fse.ensureDir(publicDir);
  const audioPath = path.join(publicDir, 'audio.mp3');

  emit('log', { message: `Sending text (${scriptText.length} chars) to Google TTS…` });

  await generateWithGoogleTTS(scriptText, audioPath, emit);

  const sizeKB = Math.round(fs.statSync(audioPath).size / 1024);
  emit('log', { message: `Audio ready (${sizeKB} KB)` });
  return audioPath;
}

module.exports = { generateAudio };