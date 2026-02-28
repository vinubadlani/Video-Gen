require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');

const { generateScript }          = require('./scripts/generateScript');
const { generateAudio }           = require('./scripts/generateAudio');
const { renderVideo }             = require('./scripts/renderVideo');
const { uploadToYoutube }         = require('./scripts/uploadToYoutube');
const { getRandomTopic, TOPICS }  = require('./scripts/topicPool');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve the React dashboard build
const DASHBOARD_BUILD = path.join(__dirname, 'dashboard', 'dist');
if (fs.existsSync(DASHBOARD_BUILD)) {
  app.use(express.static(DASHBOARD_BUILD));
}

// ─── In-memory job store ──────────────────────────────────────────────────────
// jobId → { clients: [res, ...], events: [{type, data}], status, output }
const jobs = new Map();

function createJob(jobId) {
  jobs.set(jobId, { clients: [], events: [], status: 'running', output: null });
}

function emitToJob(jobId, type, data) {
  const job = jobs.get(jobId);
  if (!job) return;

  const event = { type, data, ts: Date.now() };
  job.events.push(event);

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  job.clients.forEach(client => {
    try { client.write(payload); } catch {}
  });
}

// ─── SSE endpoint ─────────────────────────────────────────────────────────────
app.get('/api/progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  // Replay past events for late-joining clients
  if (job) {
    job.events.forEach(evt => {
      res.write(`data: ${JSON.stringify(evt)}\n\n`);
    });
    job.clients.push(res);
  } else {
    res.write(`data: ${JSON.stringify({ type: 'error', data: { message: 'Job not found' } })}\n\n`);
  }

  req.on('close', () => {
    if (job) job.clients = job.clients.filter(c => c !== res);
  });
});

// ─── Start generation endpoint ────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { topic } = req.body;
  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: 'topic is required' });
  }

  const jobId = uuidv4();
  createJob(jobId);
  res.json({ jobId });

  // Run pipeline asynchronously
  runPipeline(jobId, topic.trim()).catch(err => {
    emitToJob(jobId, 'error', { message: err.message });
    const job = jobs.get(jobId);
    if (job) job.status = 'error';
  });
});

// ─── Download final.mp4 ───────────────────────────────────────────────────────
app.get('/api/download/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  const outputPath = (job && job.output) || path.join(__dirname, 'output', 'final.mp4');
  if (!fs.existsSync(outputPath)) {
    return res.status(404).json({ error: 'Video not ready yet' });
  }
  res.download(outputPath);
});

// ─── Video preview (inline stream, no download header) ──────────────────────
app.get('/api/preview/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  const outputPath = job?.output;
  if (!outputPath || !fs.existsSync(outputPath)) {
    return res.status(404).json({ error: 'Video not ready yet' });
  }
  const stat = fs.statSync(outputPath);
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Accept-Ranges', 'bytes');
  fs.createReadStream(outputPath).pipe(res);
});

// ─── Random topic ───────────────────────────────────────────────────────────────
app.get('/api/random-topic', (req, res) => {
  res.json({ topic: getRandomTopic() });
});

app.get('/api/topics', (req, res) => {
  res.json({ topics: TOPICS });
});

// ─── Stream audio preview ──────────────────────────────────────────────────────
app.get('/api/audio', (req, res) => {
  const audioPath = path.join(__dirname, 'public', 'audio.mp3');
  if (!fs.existsSync(audioPath)) return res.status(404).end();
  res.setHeader('Content-Type', 'audio/mpeg');
  fs.createReadStream(audioPath).pipe(res);
});

// ─── SPA fallback ────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  const indexPath = path.join(DASHBOARD_BUILD, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h2>Dashboard not built yet. Run: npm run build:dashboard</h2>');
  }
});

// ─── Pipeline ────────────────────────────────────────────────────────────────
async function runPipeline(jobId, topic) {
  const emit = (type, data) => emitToJob(jobId, type, data);

  emit('start', { topic, message: `Starting video generation for: "${topic}"` });

  // ── Step 1: Script ─────────────────────────────────────────────────────────
  emit('step', { step: 1, status: 'active', label: 'Generating Script', message: 'Calling Groq API (llama3-70b)…' });

  const script = await generateScript(topic, emit);

  emit('step', {
    step   : 1,
    status : 'done',
    label  : 'Script Generated',
    message: `${script.scenes.length} scenes created – title: "${script.title}"`,
    payload: { scenes: script.scenes, fullScript: script.fullScript, title: script.title },
  });

  // ── Step 2: Audio ─────────────────────────────────────────────────────────
  emit('step', { step: 2, status: 'active', label: 'Generating Voiceover', message: 'Calling ElevenLabs TTS API…' });

  const audioPath = await generateAudio(script.fullScript, emit);

  emit('step', {
    step   : 2,
    status : 'done',
    label  : 'Voiceover Ready',
    message: 'Audio saved to public/audio.mp3',
    payload: { audioUrl: '/api/audio' },
  });

  // ── Step 3: Render ─────────────────────────────────────────────────────────
  emit('step', { step: 3, status: 'active', label: 'Rendering Video', message: 'Bundling Remotion project…' });

  const outputPath = await renderVideo(script.scenes, audioPath, emit, topic);
  const job = jobs.get(jobId);
  if (job) job.output = outputPath;

  emit('step', {
    step   : 3,
    status : 'done',
    label  : 'Video Rendered',
    message: 'output/final.mp4 is ready',
    payload: { downloadUrl: `/api/download/${jobId}` },
  });

  const slug = path.basename(outputPath, '.mp4');

  // ── Step 4: YouTube upload (optional – requires YOUTUBE_* env vars) ────────
  let youtubeUrl = null;
  if (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_REFRESH_TOKEN) {
    emit('step', { step: 4, status: 'active', label: 'Uploading to YouTube', message: 'Uploading video as a YouTube Short…' });
    try {
      youtubeUrl = await uploadToYoutube(
        outputPath,
        script.title || topic,
        `${script.title || topic} — AI-generated explainer about "${topic}"`,
        emit
      );
      if (job) job.youtubeUrl = youtubeUrl;
      emit('step', {
        step   : 4,
        status : 'done',
        label  : 'Published to YouTube',
        message: 'Video is live as a YouTube Short!',
        payload: { youtubeUrl },
      });
    } catch (ytErr) {
      emit('step', {
        step   : 4,
        status : 'error',
        label  : 'YouTube Upload Failed',
        message: ytErr.message,
      });
      console.error('[YouTube] Upload failed:', ytErr.message);
    }
  }

  emit('complete', {
    message    : 'Video generation complete!',
    downloadUrl: `/api/download/${jobId}`,
    previewUrl : `/api/preview/${jobId}`,
    filename   : `${slug}.mp4`,
    youtubeUrl,
  });

  if (job) job.status = 'complete';
}

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Video Gen Server running at http://localhost:${PORT}`);
  console.log(`  Open the dashboard in your browser\n`);
});
