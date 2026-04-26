const axios = require('axios');
const path  = require('path');
const fs    = require('fs');
const fse   = require('fs-extra');

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// ─── Free built-in voices available on ALL ElevenLabs plans ──────────────────
// These are ElevenLabs' pre-made voices — no paid plan required.
const FREE_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (calm, American female)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi  (strong, American female)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (soft, American female)' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (well-rounded, male)' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (crisp, male)' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam  (deep, American male)' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam   (raspy, American male)' },
];

const FREE_FALLBACK_VOICE = FREE_VOICES[0]; // Rachel
const FREE_MODEL          = 'eleven_turbo_v2'; // works on free & paid plans

/**
 * Build the request body for ElevenLabs TTS.
 * Uses pronunciation-friendly SSML-style spacing and voice settings tuned
 * for clear, punchy, kinetic-typography delivery.
 */
function buildTTSBody(text, modelId) {
  // Double-space after sentence-end → ElevenLabs interprets as a natural pause.
  // Also slow down slightly by adding commas after colons / dashes.
  const formattedText = text
    .replace(/([.?!])\s+/g, '$1  ')
    .replace(/:\s+/g, ':  ')
    .trim();

  return {
    text    : formattedText,
    model_id: modelId,
    voice_settings: {
      stability        : 0.50,  // consistent, clear delivery
      similarity_boost : 0.85,  // stay close to the selected voice
      style            : 0.45,  // punchy but not over-acted
      use_speaker_boost: true,
    },
  };
}

/**
 * POST to ElevenLabs TTS endpoint. Returns raw arraybuffer or throws.
 */
async function callElevenLabs(voiceId, body, apiKey) {
  const response = await axios.post(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
    body,
    {
      headers: {
        'xi-api-key'  : apiKey,
        'Content-Type': 'application/json',
        Accept        : 'audio/mpeg',
      },
      responseType: 'arraybuffer',
      timeout     : 60_000,
    },
  );
  return response.data;
}

/**
 * Calls ElevenLabs TTS and saves the MP3 to /public/audio.mp3
 * (Remotion reads static assets from /public at render time)
 *
 * Strategy:
 *   1. Try the voice configured via ELEVENLABS_VOICE_ID.
 *   2. If it fails with HTTP 402 (paid-plan / library voice), automatically
 *      fall back to Rachel — a free built-in voice available to everyone.
 *
 * @param {string} scriptText   Full voiceover script
 * @returns {Promise<string>}   Absolute path to the saved MP3
 */
async function generateAudio(scriptText, emit = () => {}) {
  const configuredVoiceId = process.env.ELEVENLABS_VOICE_ID || FREE_FALLBACK_VOICE.id;
  const apiKey            = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set.');

  // Prefer turbo_v2_5 when available; free plan always has turbo_v2.
  const preferredModel = 'eleven_turbo_v2_5';

  emit('log', { message: `Sending text (${scriptText.length} chars) to ElevenLabs voice: ${configuredVoiceId}…` });

  const body = buildTTSBody(scriptText, preferredModel);

  let responseData;
  let usedVoiceId   = configuredVoiceId;
  let usedVoiceName = `configured (${configuredVoiceId})`;

  try {
    responseData = await callElevenLabs(configuredVoiceId, body, apiKey);
    emit('log', { message: `Using model: ${preferredModel} | voice: ${usedVoiceName}` });
  } catch (primaryErr) {
    const status = primaryErr.response?.status;

    // ── 402 = library/cloned voice not allowed on free plan ─────────────────
    if (status === 402) {
      emit('log', {
        message: `Voice ${configuredVoiceId} requires a paid plan — falling back to free voice: ${FREE_FALLBACK_VOICE.name}`,
      });

      usedVoiceId   = FREE_FALLBACK_VOICE.id;
      usedVoiceName = FREE_FALLBACK_VOICE.name;

      // Also drop to the model guaranteed on the free tier
      const fallbackBody = buildTTSBody(scriptText, FREE_MODEL);

      try {
        responseData = await callElevenLabs(usedVoiceId, fallbackBody, apiKey);
        emit('log', { message: `Using model: ${FREE_MODEL} | voice: ${usedVoiceName}` });
      } catch (fallbackErr) {
        const s2  = fallbackErr.response?.status;
        const msg = fallbackErr.response?.data
          ? Buffer.from(fallbackErr.response.data).toString('utf8')
          : fallbackErr.message;
        throw new Error(`ElevenLabs API error (${s2}): ${msg}`);
      }
    } else {
      const message = primaryErr.response?.data
        ? Buffer.from(primaryErr.response.data).toString('utf8')
        : primaryErr.message;
      throw new Error(`ElevenLabs API error (${status}): ${message}`);
    }
  }

  // Save to /public so Remotion bundler can serve it as a static asset
  const publicDir  = path.join(__dirname, '..', 'public');
  await fse.ensureDir(publicDir);

  const audioPath = path.join(publicDir, 'audio.mp3');
  fs.writeFileSync(audioPath, Buffer.from(responseData));

  const sizeKB = Math.round(Buffer.from(responseData).length / 1024);
  emit('log', { message: `Audio file saved (${sizeKB} KB)` });

  return audioPath;
}

module.exports = { generateAudio };
