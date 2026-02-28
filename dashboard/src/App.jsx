import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, key: 'script', label: 'Generate Script',    icon: '✦', desc: 'Groq AI · llama3-70b' },
  { id: 2, key: 'audio',  label: 'Generate Voiceover', icon: '♪', desc: 'ElevenLabs TTS'       },
  { id: 3, key: 'render', label: 'Render Video',       icon: '▶', desc: 'Remotion · h264'      },
];

export default function App() {
  const [topic,       setTopic]       = useState('');
  const [jobId,       setJobId]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [events,      setEvents]      = useState([]);   // raw SSE events
  const [logs,        setLogs]        = useState([]);   // log lines
  const [stepStatus,  setStepStatus]  = useState({1:'idle',2:'idle',3:'idle'});
  const [stepData,    setStepData]    = useState({});   // payload per step
  const [renderPct,   setRenderPct]   = useState(0);
  const [renderInfo,  setRenderInfo]  = useState(null);
  const [overall,     setOverall]     = useState('idle'); // idle|running|done|error
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [previewUrl,  setPreviewUrl]  = useState(null);
  const [filename,    setFilename]    = useState('final.mp4');
  const [errorMsg,    setErrorMsg]    = useState('');

  const esRef      = useRef(null);
  const logBodyRef = useRef(null);

  // ── Auto-scroll terminal ──────────────────────────────────────────────────
  useEffect(() => {
    if (logBodyRef.current) {
      logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
    }
  }, [logs]);

  // ── SSE handler ───────────────────────────────────────────────────────────
  const connectSSE = useCallback((id) => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(`/api/progress/${id}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const evt = JSON.parse(e.data);
      setEvents(prev => [...prev, evt]);

      const ts = new Date(evt.ts || Date.now())
        .toLocaleTimeString('en-US', { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' });

      switch (evt.type) {
        case 'start':
          addLog(ts, evt.data.message, 'info');
          setOverall('running');
          break;

        case 'step': {
          const { step, status, label, message, payload } = evt.data;
          setStepStatus(s => ({ ...s, [step]: status }));
          addLog(ts, `[Step ${step}] ${label}: ${message}`);
          if (payload) setStepData(s => ({ ...s, [step]: payload }));
          break;
        }

        case 'render_progress':
          setRenderPct(evt.data.progress);
          break;

        case 'render_info':
          setRenderInfo(evt.data);
          break;

        case 'log':
          addLog(ts, evt.data.message);
          break;

        case 'complete':
          setOverall('done');
          setDownloadUrl(evt.data.downloadUrl);
          setPreviewUrl(evt.data.previewUrl || null);
          setFilename(evt.data.filename || 'final.mp4');
          addLog(ts, evt.data.message, 'info');
          setLoading(false);
          es.close();
          break;

        case 'error':
          setOverall('error');
          setErrorMsg(evt.data.message);
          addLog(ts, `ERROR: ${evt.data.message}`, 'error');
          setLoading(false);
          es.close();
          break;

        default: break;
      }
    };

    es.onerror = () => {
      if (overall !== 'done') {
        addLog('--:--:--', 'SSE connection lost', 'error');
      }
    };
  }, [overall]);

  function addLog(ts, msg, type = 'default') {
    setLogs(prev => [...prev.slice(-200), { ts, msg, type }]);
  }

  // ── Random topic ───────────────────────────────────────────────────────────
  const [randomLoading, setRandomLoading] = useState(false);

  async function handleRandomTopic() {
    if (loading || randomLoading) return;
    setRandomLoading(true);
    try {
      const res  = await fetch('/api/random-topic');
      const json = await res.json();
      setTopic(json.topic);
      setRandomLoading(false);
      // Auto-start generation with the random topic
      await startGenerate(json.topic);
    } catch {
      setRandomLoading(false);
    }
  }

  // ── Shared pipeline starter ────────────────────────────────────────────────
  async function startGenerate(topicStr) {
    const t = (topicStr || topic || '').trim();
    if (!t || loading) return;

    setLoading(true);
    setEvents([]);
    setLogs([]);
    setStepStatus({ 1: 'idle', 2: 'idle', 3: 'idle' });
    setStepData({});
    setRenderPct(0);
    setRenderInfo(null);
    setOverall('idle');
    setDownloadUrl(null);
    setPreviewUrl(null);
    setFilename('final.mp4');
    setErrorMsg('');

    try {
      const res  = await fetch('/api/generate', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ topic: t }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Server error');
      setJobId(json.jobId);
      connectSSE(json.jobId);
    } catch (err) {
      setLoading(false);
      setOverall('error');
      setErrorMsg(err.message);
    }
  }

  // ── Generate (manual) ────────────────────────────────────────────────────
  async function handleGenerate() {
    await startGenerate(topic);
  }

  // ── Key handler ───────────────────────────────────────────────────────────
  function handleKey(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
  }

  const activeStep = Object.entries(stepStatus).find(([,v]) => v === 'active')?.[0];

  return (
    <div className="layout">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-logo">🎬</div>
        <span className="header-title">AI Video Generator</span>
        <span className="header-badge">Groq × ElevenLabs × Remotion</span>
      </header>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Input */}
        <div className="input-card">
          <label>Topic / Keyword</label>
          <textarea
            className="topic-input"
            placeholder={'e.g. "How to use sauf powder"\nor "Benefits of green tea"'}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button
            className="random-btn"
            onClick={handleRandomTopic}
            disabled={loading || randomLoading}
            title="Pick a random Ayurveda / herbs / home remedy topic"
          >
            {randomLoading ? '⏳ Picking…' : '🎲 Random Topic'}
          </button>
          <button className="generate-btn" onClick={handleGenerate} disabled={loading || !topic.trim()}>
            {loading && <span className="btn-spinner" />}
            {loading ? 'Generating…' : '⚡ Generate Video'}
          </button>
          {!loading && (
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
              Ctrl+Enter to generate
            </p>
          )}
        </div>

        {/* Pipeline steps */}
        <div className="pipeline-steps">
          <div className="pipeline-label">Pipeline</div>
          {STEPS.map(s => {
            const st = stepStatus[s.id];
            return (
              <div key={s.id} className={`step-item ${st === 'idle' ? '' : st}`}>
                <div className={`step-icon ${st === 'idle' ? '' : st}`}>
                  {st === 'active'
                    ? <span className="spin">◌</span>
                    : st === 'done'
                    ? '✓'
                    : st === 'error'
                    ? '✕'
                    : s.id}
                </div>
                <div className="step-text">
                  <strong>{s.label}</strong>
                  <span>{s.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats if render info available */}
        {renderInfo && (
          <div>
            <div className="pipeline-label">Render Info</div>
            <div className="stat-row">
              <div className="stat-chip"><span className="label">FPS</span><span className="value">{renderInfo.fps}</span></div>
              <div className="stat-chip"><span className="label">Duration</span><span className="value">{renderInfo.audioDurationSecs?.toFixed(1)}s</span></div>
              <div className="stat-chip"><span className="label">Frames</span><span className="value">{renderInfo.durationFrames}</span></div>
              <div className="stat-chip"><span className="label">Resolution</span><span className="value">1080×1920</span></div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="main">
        {overall === 'idle' && !loading ? (
          <EmptyState />
        ) : (
          <>
            {/* Status banner */}
            {overall !== 'idle' && (
              <div className={`status-banner ${overall === 'running' ? 'running' : overall === 'done' ? 'done' : 'error'}`}>
                {overall === 'running' && <span style={{ animation: 'spin 0.8s linear infinite', display:'inline-block' }}>◌</span>}
                {overall === 'done'    && '✓'}
                {overall === 'error'   && '✕'}
                <span>
                  {overall === 'running' && `Generating video for "${topic}"…`}
                  {overall === 'done'    && 'Video generated successfully!'}
                  {overall === 'error'   && `Error: ${errorMsg}`}
                </span>
              </div>
            )}

            {/* Step cards grid */}
            <div className="cards-grid">
              <ScriptCard  status={stepStatus[1]} data={stepData[1]} />
              <AudioCard   status={stepStatus[2]} data={stepData[2]} />
              <RenderCard  status={stepStatus[3]} data={stepData[3]} pct={renderPct} />
            </div>

            {/* Download card */}
            {overall === 'done' && downloadUrl && (
              <DownloadCard url={downloadUrl} previewUrl={previewUrl} filename={filename} topic={topic} />
            )}

            {/* Terminal */}
            {logs.length > 0 && <TerminalLog logs={logs} bodyRef={logBodyRef} />}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">🎬</div>
      <h2>Ready to generate</h2>
      <p>Enter a topic in the sidebar and hit Generate Video to start.</p>
    </div>
  );
}

// ─── Script Card ──────────────────────────────────────────────────────────────
function ScriptCard({ status, data }) {
  const st = status === 'idle' ? '' : status;
  return (
    <div className={`detail-card ${st}`}>
      <div className="card-header">
        <div className={`card-num ${st}`}>01</div>
        <span className="card-title">Script Generation</span>
        <div className={`card-status-dot ${st}`} />
      </div>
      <div className="card-body">
        {status === 'idle' && <Placeholder text="Waiting for pipeline to start…" />}
        {status === 'active' && <Thinking text="Calling Groq API (llama3-70b-8192)…" />}
        {(status === 'done' || status === 'error') && data && (
          <>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
              <strong style={{ color: 'var(--text)' }}>{data.scenes?.length} scenes</strong> generated
            </p>

            {/* Scene colour grid */}
            {data.scenes && (
              <div className="scenes-grid">
                {data.scenes.map((scene, i) => (
                  <div
                    key={i}
                    className="scene-card"
                    style={{
                      backgroundColor: scene.bg || '#000',
                      color          : scene.textColor || '#fff',
                      borderColor    : scene.accent || 'transparent',
                    }}
                  >
                    <span className="scene-num" style={{ color: scene.accent || scene.textColor }}>{i + 1}</span>
                    <span className="scene-text">{scene.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Full script */}
            {data.fullScript && (
              <div className="script-bubble" style={{ marginTop: 14 }}>
                "{data.fullScript}"
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Audio Card ───────────────────────────────────────────────────────────────
function AudioCard({ status, data }) {
  const st = status === 'idle' ? '' : status;
  return (
    <div className={`detail-card ${st}`}>
      <div className="card-header">
        <div className={`card-num ${st}`}>02</div>
        <span className="card-title">Voiceover Generation</span>
        <div className={`card-status-dot ${st}`} />
      </div>
      <div className="card-body">
        {status === 'idle'   && <Placeholder text="Waiting for script…" />}
        {status === 'active' && (
          <>
            <Thinking text="ElevenLabs TTS is synthesising audio…" />
            <div className="waveform" style={{ marginTop: 16, justifyContent:'center' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="wave-bar" />
              ))}
            </div>
          </>
        )}
        {(status === 'done' || status === 'error') && data && (
          <div className="audio-player">
            <span className="audio-label">🎙 Preview</span>
            <audio controls src={data.audioUrl} preload="none" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Render Card ──────────────────────────────────────────────────────────────
function RenderCard({ status, data, pct }) {
  const st = status === 'idle' ? '' : status;
  return (
    <div className={`detail-card ${st}`}>
      <div className="card-header">
        <div className={`card-num ${st}`}>03</div>
        <span className="card-title">Video Rendering</span>
        <div className={`card-status-dot ${st}`} />
      </div>
      <div className="card-body">
        {status === 'idle'   && <Placeholder text="Waiting for audio…" />}
        {(status === 'active' || (status === 'done' && pct < 100 && pct > 0)) && (
          <>
            <div className="render-pct">{pct}%</div>
            <div className="render-meta">Remotion headless render in progress…</div>
            <div className="render-progress-bar">
              <div className="render-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
        {status === 'done' && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop: 4 }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Render Complete</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>output/final.mp4 is ready</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Download Card ────────────────────────────────────────────────────────────
function DownloadCard({ url, previewUrl, filename, topic }) {
  return (
    <div className="download-card">
      <h3>🎬 Your Video is Ready!</h3>
      <p style={{ marginBottom: previewUrl ? 14 : 0 }}>20-second vertical explainer · 1080×1920 · MP4</p>

      {/* Inline video preview */}
      {previewUrl && (
        <video
          controls
          autoPlay
          loop
          playsInline
          style={{
            width       : '100%',
            maxWidth    : 260,
            borderRadius: 12,
            display     : 'block',
            margin      : '0 auto 16px',
            background  : '#000',
          }}
        >
          <source src={previewUrl} type="video/mp4" />
        </video>
      )}

      <a className="download-btn" href={url} download={filename}>
        ⬇ Download {filename}
      </a>
    </div>
  );
}

// ─── Terminal Log ─────────────────────────────────────────────────────────────
function TerminalLog({ logs, bodyRef }) {
  return (
    <div className="terminal">
      <div className="terminal-header">
        <div className="terminal-dot" style={{ background: '#ff5f56' }} />
        <div className="terminal-dot" style={{ background: '#ffbd2e', marginLeft:4 }} />
        <div className="terminal-dot" style={{ background: '#27c93f', marginLeft:4 }} />
        <span className="terminal-title">pipeline.log</span>
      </div>
      <div className="terminal-body" ref={bodyRef}>
        {logs.map((l, i) => (
          <div key={i} className="log-line">
            <span className="log-ts">[{l.ts}]</span>
            <span className={`log-msg ${l.type !== 'default' ? l.type : ''}`}>{l.msg}</span>
          </div>
        ))}
        <div className="log-line">
          <span className="log-ts">{'       '}</span>
          <span className="log-msg" style={{ animation: 'pulse 1s ease infinite' }}>▋</span>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Placeholder = ({ text }) => (
  <p style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>{text}</p>
);

const Thinking = ({ text }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
    <span style={{ animation:'spin 0.8s linear infinite', display:'inline-block', fontSize:16 }}>◌</span>
    <span style={{ fontSize:13, color:'var(--muted)' }}>{text}</span>
  </div>
);
