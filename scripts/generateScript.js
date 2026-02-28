require('dotenv').config();
const axios = require('axios');

// ─── Preset palette pools per animation style ────────────────────────────────
const PRESET_STYLES = {
  minimal  : [
    { bg: '#FFFFFF', textColor: '#000000', accent: '#000000' },
    { bg: '#F5F5F5', textColor: '#111111', accent: '#333333' },
  ],
  energetic: [
    { bg: '#FF2D00', textColor: '#FFFFFF', accent: '#FFE600' },
    { bg: '#00C853', textColor: '#000000', accent: '#FFFFFF' },
    { bg: '#FFE600', textColor: '#000000', accent: '#FF2D00' },
    { bg: '#7B00FF', textColor: '#FFFFFF', accent: '#00FFE5' },
    { bg: '#0066FF', textColor: '#FFFFFF', accent: '#FFE600' },
  ],
  dramatic : [
    { bg: '#000000', textColor: '#FFFFFF', accent: '#FFFFFF' },
    { bg: '#0A0A0A', textColor: '#FFFFFF', accent: '#FF2D00' },
    { bg: '#0D0D0D', textColor: '#FFFFFF', accent: '#FFE600' },
    { bg: '#1A0533', textColor: '#FFFFFF', accent: '#FF2EF7' },
  ],
};

const PRESET_ORDER  = ['dramatic', 'minimal', 'energetic', 'dramatic', 'minimal', 'energetic'];
const PRESET_COUNTERS = { minimal: 0, energetic: 0, dramatic: 0 };

function getPresetStyle(preset) {
  const key  = ['minimal','energetic','dramatic'].includes(preset) ? preset : 'dramatic';
  const pool = PRESET_STYLES[key];
  const idx  = PRESET_COUNTERS[key] % pool.length;
  PRESET_COUNTERS[key]++;
  return { ...pool[idx] };
}

// ─── Build the plain-text system prompt ──────────────────────────────────────
function buildSystemPrompt(topic) {
  return `TOPIC: ${topic}

You are writing a short high-impact explainer script for a 15–20 second vertical YouTube Shorts video.

Start directly with the topic. Produce a punchy, fast-paced, kinetic-typography friendly script that can be placed on-screen word-for-word while the audio reads it naturally.

Rules:
1. Start with a strong hook using the topic (Line 1).
2. Use short lines only.
3. Maximum 1–6 words per line.
4. No long paragraphs or narration blocks.
5. Each line must work as bold on-screen text for kinetic animation.
6. Use natural pause rhythm suited to speech.
7. Add emphasis words when useful (e.g., NOW, FAST, STOP).
8. Tone: confident, clear, slightly dramatic, viral.
9. No emojis, no hashtags.
10. No background explanation or extra context.
11. No narration labels or stage directions.
12. Only return the script text lines (plain text).

Structure:
- Line 1: Strong hook (use the topic).
- Lines 2–N: Step-based or benefit-based explanation (one idea per line).
- Last line: Clear call to action.

Output format (strictly follow):
- Return ONLY plain text.
- Each line separated by a newline.
- No numbering, no quotes, no JSON, no extra commentary.
- Do NOT include any intro like "Here is the script" or "Script:".
- Total: 8–13 lines.`;
}

// ─── Parse plain-text lines into scene objects ───────────────────────────────
function linesToScenes(lines) {
  // Auto-assign preset cycling and weight
  const presetCycle = ['dramatic', 'minimal', 'energetic', 'dramatic', 'minimal', 'energetic', 'dramatic', 'dramatic', 'energetic', 'minimal', 'dramatic', 'energetic', 'minimal'];
  const last = lines.length - 1;

  return lines.map((text, i) => {
    let weight;
    if (i === 0)    weight = 3;        // title line
    else if (i === last) weight = 3;   // CTA line
    else if (i <= 2)     weight = 2;   // hook lines
    else weight = (i % 2 === 0) ? 2 : 1;

    const preset = presetCycle[i % presetCycle.length];

    return { id: i + 1, text, weight, preset };
  });
}

// ─── Main generator ───────────────────────────────────────────────────────────
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function generateScript(topic, emit = () => {}) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  emit('log', { message: `Groq request for topic: "${topic}"` });

  const body = {
    model      : GROQ_MODEL,
    messages   : [
      { role: 'system', content: buildSystemPrompt(topic) },
      { role: 'user',   content: `Write the kinetic-typography explainer script for: "${topic}". Follow all rules. Return ONLY plain text lines, nothing else.` },
    ],
    temperature: 0.75,
    max_tokens : 600,
  };

  let response;
  try {
    response = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`Groq API error (HTTP ${status}): ${detail}`);
  }

  const raw = (response.data.choices[0].message.content || '').trim();
  emit('log', { message: `Groq responded: ${raw.length} chars` });

  // Parse plain-text lines
  const lines = raw
    .split('\n')
    .map(l => l.replace(/^[-–•*\d.)\s]+/, '').trim())   // strip any stray list markers
    .filter(l => l.length > 0 && l.length < 80)         // drop blank or absurdly long lines
    .slice(0, 13);

  if (lines.length < 2) {
    throw new Error(`Groq returned too few lines (${lines.length}). Raw: ${raw.substring(0, 200)}`);
  }

  // Reset palette counters
  PRESET_COUNTERS.minimal   = 0;
  PRESET_COUNTERS.energetic = 0;
  PRESET_COUNTERS.dramatic  = 0;

  const rawScenes = linesToScenes(lines);

  // Attach visual styles – Scene 0 is always white bg / black text (title card)
  const scenes = rawScenes.map((scene, idx) => {
    if (idx === 0) {
      return {
        ...scene,
        bg       : '#FFFFFF',
        textColor: '#000000',
        accent   : '#000000',
      };
    }
    return {
      ...scene,
      ...getPresetStyle(scene.preset),
    };
  });

  const fullScript = lines.join(' ');

  emit('log', { message: `Script ready: ${scenes.length} scenes | "${fullScript.substring(0, 80)}..."` });

  return { fullScript, scenes };
}

module.exports = { generateScript };
