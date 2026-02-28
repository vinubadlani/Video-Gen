const axios = require('axios');
const path  = require('path');
const fs    = require('fs');
const fse   = require('fs-extra');

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Calls ElevenLabs TTS and saves the MP3 to /public/audio.mp3
 * (Remotion reads static assets from /public at render time)
 *
 * @param {string} scriptText   Full voiceover script
 * @returns {Promise<string>}   Absolute path to the saved MP3
 */
async function generateAudio(scriptText, emit = () => {}) {
  const voiceId  = process.env.ELEVENLABS_VOICE_ID;
  const apiKey   = process.env.ELEVENLABS_API_KEY;
  const url      = `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`;

  emit('log', { message: `Sending text (${scriptText.length} chars) to ElevenLabs voice: ${voiceId}…` });
  emit('log', { message: `Using model: eleven_turbo_v2_5 (Indian English accent)` });

  // Add a natural pause after each sentence so the audio has clear breathing room
  // between scenes — helps the on-screen text keep up with the spoken words.
  const formattedText = scriptText
    .replace(/([.?!])\s+/g, '$1  ') // double space after sentence-end punctuation → ElevenLabs treats as pause
    .trim();

  const body = {
    text          : formattedText,
    model_id      : 'eleven_turbo_v2_5',  // supports Indian English accent well
    voice_settings: {
      stability        : 0.48,   // consistent Indian accent delivery
      similarity_boost : 0.90,   // stay close to the voice's natural accent
      style            : 0.55,   // energetic but clear
      use_speaker_boost: true,
    },
  };

  let responseData;
  try {
    const response = await axios.post(url, body, {
      headers: {
        'xi-api-key'  : apiKey,
        'Content-Type': 'application/json',
        Accept        : 'audio/mpeg',
      },
      responseType: 'arraybuffer',
      timeout     : 60000,
    });
    responseData = response.data;
  } catch (err) {
    const status  = err.response?.status;
    const message = err.response?.data
      ? Buffer.from(err.response.data).toString('utf8')
      : err.message;
    throw new Error(`ElevenLabs API error (${status}): ${message}`);
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
