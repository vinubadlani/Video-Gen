# AI Vertical Video Generator

A CLI tool that generates a 20-second vertical explainer video (1080×1920) from a
single keyword or topic using Groq, ElevenLabs, and Remotion — no GUI required.

---

## How It Works

```
User CLI input
    │
    ▼
Groq API  ──────►  Script + scene breakdown (JSON)
    │
    ▼
ElevenLabs API ─►  Voiceover MP3  (public/audio.mp3)
    │
    ▼
Remotion ──────►   Kinetic typography animation
    │                  • 1080×1920 vertical
    │                  • Word-by-word reveal
    │                  • Scale-pop spring animation
    │                  • Multi-colour scene backgrounds
    │                  • Auto-synced to audio duration
    ▼
output/final.mp4
```

---

## Folder Structure

```
video-gen/
├── index.js                   Main CLI entry point
├── package.json
├── remotion.config.js
├── .env.example               Copy → .env and fill in keys
├── .gitignore
│
├── public/
│   └── audio.mp3              Generated at runtime (gitignored)
│
├── src/
│   ├── index.jsx              Remotion entry — calls registerRoot()
│   ├── Root.jsx               Registers the composition
│   │
│   ├── compositions/
│   │   └── ExplainerVideo.jsx Main video composition
│   │
│   └── components/
│       ├── Scene.jsx          Single scene layout + entrance animation
│       └── KineticText.jsx    Word-by-word kinetic typography
│
├── scripts/
│   ├── generateScript.js      Groq API – script + scene JSON
│   ├── generateAudio.js       ElevenLabs API – voiceover MP3
│   └── renderVideo.js         Bundles & renders via @remotion/renderer
│
└── output/
    └── final.mp4              Generated output (gitignored)
```

---

## Prerequisites

| Tool       | Version   |
|------------|-----------|
| Node.js    | ≥ 18.x    |
| npm        | ≥ 9.x     |
| ffmpeg     | any       |

> **ffmpeg** must be on your PATH. Remotion's renderer requires it.
> Download: https://ffmpeg.org/download.html

---

## Setup

### 1. Install dependencies

```bash
cd video-gen
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

| Key                  | Where to get it                                      |
|----------------------|------------------------------------------------------|
| `GROQ_API_KEY`       | https://console.groq.com → API Keys                  |
| `ELEVENLABS_API_KEY` | https://elevenlabs.io → Profile → API Key            |
| `ELEVENLABS_VOICE_ID`| https://api.elevenlabs.io/v1/voices (default: Rachel)|

---

## Usage

```bash
node index.js "How to use sauf powder"
```

Replace the quoted string with any topic you like:

```bash
node index.js "Benefits of drinking green tea"
node index.js "How to do a proper squat"
node index.js "Why you need sunscreen daily"
```

### Output

```
output/final.mp4
```

---

## What Gets Generated

1. **Groq** generates a 15–20 second script broken into 5–7 punchy scenes.
2. **ElevenLabs** converts the full script to a high-energy MP3 voiceover.
3. **Remotion** renders a 1080×1920 vertical video where:
   - Each scene has a unique vibrant background colour
   - Words enter one-by-one with spring scale-pop animations
   - Accent colour highlights the final word
   - A progress bar tracks total video duration
   - Audio is baked into the final MP4

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ffmpeg not found` | Install ffmpeg and ensure it is on PATH |
| `ElevenLabs 401` | Check your API key and voice ID in `.env` |
| `Groq 400` | Check GROQ_API_KEY; the model name may have changed — update `generateScript.js` |
| Blank video | Audio file may be missing; check `public/audio.mp3` exists after step 2 |
| Render hangs | Run with `DEBUG=1 node index.js "topic"` for verbose logs |

---

## Customisation

### Change the voice
Set `ELEVENLABS_VOICE_ID` in `.env` to any voice ID from:
```
GET https://api.elevenlabs.io/v1/voices
```

### Change the colour palette
Edit the `PALETTE` array in `scripts/generateScript.js`.

### Change animation style
Edit `src/components/KineticText.jsx` — tweak `spring` config `stiffness` / `damping`.

### Change video resolution
Change `width` and `height` in `src/Root.jsx` (default: 1080×1920 vertical).
