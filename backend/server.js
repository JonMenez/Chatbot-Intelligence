require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { isGroqReady } = require('./src/config/groq');
const { postChat } = require('./src/controllers/chatController');
const { postRag, initRag } = require('./src/controllers/ragController');
const { uploadMiddleware, postUpload } = require('./src/controllers/uploadController');

const app = express();

// CORS configuration - Permissive for development
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000', '*'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  credentials: false
}));

// Increase payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Reuse shared Groq configuration to avoid prompt/logic duplication.
const groqReady = isGroqReady();

// Static home page — "Ethereal Intelligence" (tokens from project design reference)
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const pillClass = groqReady ? 'status-pill status-pill--ok' : 'status-pill status-pill--off';
  const pillDotClass = groqReady ? 'status-pill__dot' : 'status-pill__dot status-pill__dot--off';
  const pillLabel = groqReady ? 'Groq connected' : 'Groq not connected';

  res.send(`<!DOCTYPE html>
<html class="dark" lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chatbot AI — API</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg: #131315;
        --surface-low: #1b1b1d;
        --surface-high: #2a2a2c;
        --surface-card: rgba(32, 31, 33, 0.55);
        --primary: #59e7fc;
        --primary-dim: rgba(89, 231, 252, 0.12);
        --tertiary: #a2e2d0;
        --tertiary-muted: #87c6b5;
        --on-surface: #e5e1e4;
        --on-variant: #bac9c9;
        --outline-ghost: rgba(59, 73, 73, 0.15);
        --code: #94d3c1;
        --error: #ffb4ab;
        --error-surface: rgba(147, 0, 10, 0.2);
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        min-height: 100vh;
        font-family: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
        background-color: var(--bg);
        color: var(--on-surface);
        overflow-x: hidden;
      }
      .stage {
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(89, 231, 252, 0.07), transparent 55%),
          radial-gradient(circle at 18% 22%, rgba(52, 61, 150, 0.18), transparent 42%),
          radial-gradient(circle at 82% 78%, rgba(89, 231, 252, 0.06), transparent 45%),
          repeating-radial-gradient(circle at 50% 120%, transparent 0, transparent 48px, rgba(255,255,255,0.012) 48px, rgba(255,255,255,0.012) 49px);
      }
      .orb {
        flex-shrink: 0;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, var(--primary), transparent 70%);
        box-shadow: 0 0 14px rgba(89, 231, 252, 0.55);
      }
      nav.top {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 50;
        background: rgba(19, 19, 21, 0.82);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--outline-ghost);
      }
      .nav-inner {
        max-width: 56rem;
        margin: 0 auto;
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        min-width: 0;
      }
      .brand-mark {
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .brand-mark .brand-chatbot {
        color: var(--on-surface);
      }
      .brand-mark .brand-ai {
        color: var(--primary);
        text-shadow: 0 0 14px rgba(89, 231, 252, 0.35);
      }
      .nav-actions {
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }
      .icon-btn {
        display: flex;
        color: rgba(186, 201, 201, 0.45);
        transition: color 0.2s ease;
        cursor: default;
      }
      .icon-btn:hover { color: var(--primary); }
      main {
        position: relative;
        z-index: 1;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6.5rem 1.5rem 2.5rem;
      }
      .ambient {
        position: absolute;
        border-radius: 50%;
        filter: blur(100px);
        pointer-events: none;
        opacity: 0.9;
      }
      .ambient--a { top: 18%; left: 12%; width: min(400px, 70vw); height: min(400px, 70vw); background: rgba(89, 231, 252, 0.06); }
      .ambient--b { bottom: 16%; right: 8%; width: min(360px, 65vw); height: min(360px, 65vw); background: rgba(52, 61, 150, 0.12); }
      .glass-card {
        position: relative;
        width: 100%;
        max-width: 520px;
        padding: 2.5rem 2rem 2rem;
        border-radius: 24px;
        background: var(--surface-card);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid var(--outline-ghost);
        box-shadow:
          inset 0 0 24px rgba(89, 231, 252, 0.04),
          0 24px 48px rgba(0, 0, 0, 0.45);
        overflow: hidden;
      }
      @media (min-width: 640px) {
        .glass-card { padding: 3rem; }
      }
      .glass-card::after {
        content: "";
        position: absolute;
        width: 8rem;
        height: 8rem;
        right: -3rem;
        bottom: -3rem;
        background: rgba(89, 231, 252, 0.1);
        border-radius: 50%;
        filter: blur(40px);
        pointer-events: none;
      }
      .hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1.5rem;
      }
      .status-icon-wrap {
        position: relative;
        width: 5rem;
        height: 5rem;
      }
      .status-inner {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: rgba(162, 226, 208, 0.2);
        filter: blur(18px);
      }
      .status-ring {
        position: relative;
        width: 5rem;
        height: 5rem;
        border-radius: 50%;
        background: var(--surface-high);
        border: 1px solid rgba(162, 226, 208, 0.22);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 28px rgba(89, 231, 252, 0.15);
      }
      .status-ring svg { width: 2.25rem; height: 2.25rem; color: var(--tertiary); }
      h1 {
        font-size: clamp(1.75rem, 4vw, 2rem);
        font-weight: 800;
        letter-spacing: -0.03em;
        color: var(--on-surface);
        text-shadow: 0 0 20px rgba(89, 231, 252, 0.28);
      }
      .subtitle {
        font-family: "Inter", "Manrope", sans-serif;
        font-size: 1.05rem;
        font-weight: 500;
        line-height: 1.55;
        color: var(--on-variant);
        max-width: 28rem;
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 1rem;
        border-radius: 9999px;
        border: 1px solid rgba(162, 226, 208, 0.22);
        background: rgba(162, 226, 208, 0.06);
      }
      .status-pill--off {
        border-color: rgba(255, 180, 171, 0.35);
        background: var(--error-surface);
      }
      .status-pill__dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--tertiary);
        box-shadow: 0 0 10px rgba(162, 226, 208, 0.7);
        animation: pulse 2.4s ease-in-out infinite;
      }
      .status-pill__dot--off {
        background: var(--error);
        box-shadow: 0 0 8px rgba(255, 180, 171, 0.5);
        animation: none;
      }
      .status-pill span.label {
        font-family: "Inter", sans-serif;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--tertiary);
      }
      .status-pill--off span.label { color: var(--error); }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.75; transform: scale(0.95); }
      }
      .endpoints {
        margin-top: 2.75rem;
        display: flex;
        flex-direction: column;
        gap: 1.35rem;
      }
      .section-rule {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .section-rule::before,
      .section-rule::after {
        content: "";
        flex: 1;
        height: 1px;
        background: rgba(59, 73, 73, 0.22);
      }
      .section-rule h2 {
        font-family: "Inter", sans-serif;
        font-size: 0.625rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--on-variant);
        white-space: nowrap;
      }
      .endpoint-list { display: flex; flex-direction: column; gap: 1rem; }
      .endpoint {
        padding: 1.15rem 1.25rem;
        border-radius: 12px;
        background: rgba(27, 27, 29, 0.5);
        border: 1px solid rgba(59, 73, 73, 0.12);
        transition: border-color 0.2s ease;
      }
      .endpoint:hover { border-color: rgba(89, 231, 252, 0.22); }
      .endpoint__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }
      .endpoint__row:last-child { margin-bottom: 0; }
      .method-path {
        font-family: "Manrope", sans-serif;
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--primary);
      }
      .tag {
        font-family: "Inter", sans-serif;
        font-size: 0.625rem;
        color: rgba(186, 201, 201, 0.45);
        background: var(--surface-high);
        padding: 0.2rem 0.5rem;
        border-radius: 6px;
      }
      .endpoint-desc {
        font-family: "Inter", sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--on-variant);
        text-align: right;
      }
      .code-rows {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        font-family: "Inter", ui-monospace, monospace;
        font-size: 0.8rem;
      }
      .code-row {
        display: flex;
        gap: 0.5rem;
        align-items: baseline;
      }
      .code-row .k {
        flex: 0 0 4rem;
        color: rgba(186, 201, 201, 0.45);
        font-size: 0.78rem;
      }
      .code-row code {
        color: var(--code);
        font-size: 0.82rem;
        word-break: break-all;
      }
      .code-row code.muted { color: var(--on-variant); }
    </style>
  </head>
  <body>
    <div class="stage" aria-hidden="true"></div>
    <nav class="top">
      <div class="nav-inner">
        <div class="brand">
          <span class="orb" aria-hidden="true"></span>
          <span class="brand-mark"><span class="brand-chatbot">Chatbot</span><span class="brand-ai"> AI</span></span>
        </div>
        <div class="nav-actions">
          <span class="icon-btn" title="Settings" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
          </span>
          <span class="icon-btn" title="Account" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>
          </span>
        </div>
      </div>
    </nav>
    <main>
      <div class="ambient ambient--a" aria-hidden="true"></div>
      <div class="ambient ambient--b" aria-hidden="true"></div>
      <div class="glass-card">
        <div class="hero">
          <div class="status-icon-wrap">
            <div class="status-inner" aria-hidden="true"></div>
            <div class="status-ring" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </div>
          </div>
          <div>
            <h1>API Active</h1>
            <p class="subtitle">Chatbot AI Backend is running correctly</p>
          </div>
          <div class="${pillClass}">
            <span class="${pillDotClass}" aria-hidden="true"></span>
            <span class="label">${pillLabel}</span>
          </div>
        </div>
        <section class="endpoints" aria-label="Available endpoints">
          <div class="section-rule">
            <h2>Available endpoints</h2>
          </div>
          <div class="endpoint-list">
            <article class="endpoint">
              <div class="endpoint__row">
                <span class="method-path">POST /chat</span>
                <span class="tag">JSON</span>
              </div>
              <div class="code-rows">
                <div class="code-row"><span class="k">Send:</span><code>{"message": "your question"}</code></div>
                <div class="code-row"><span class="k">Receive:</span><code class="muted">{"reply": "response"}</code></div>
              </div>
            </article>
            <article class="endpoint">
              <div class="endpoint__row">
                <span class="method-path">POST /rag</span>
                <span class="tag">JSON</span>
              </div>
              <div class="code-rows">
                <div class="code-row"><span class="k">Send:</span><code>{"message": "question about documents"}</code></div>
                <div class="code-row"><span class="k">Receive:</span><code class="muted">{"reply": "response with context"}</code></div>
              </div>
            </article>
            <article class="endpoint">
              <div class="endpoint__row" style="margin-bottom:0">
                <span class="method-path">GET /health</span>
                <span class="endpoint-desc">Verifies server status</span>
              </div>
            </article>
            <article class="endpoint">
              <div class="endpoint__row" style="margin-bottom:0">
                <span class="method-path">GET /</span>
                <span class="endpoint-desc">This page</span>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  </body>
</html>`);
});

// Chat endpoint (single source of truth lives in chatService.js)
app.post('/chat', postChat);

// RAG endpoint
app.post('/rag', postRag);

// Document upload endpoint for RAG
app.post('/upload', uploadMiddleware, postUpload);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    server: 'running',
    groqReady: groqReady,
    apiKeyConfigured: !!process.env.GROQ_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found', 
    path: req.path,
    method: req.method,
    availableEndpoints: ['/chat (POST)', '/rag (POST)', '/health (GET)', '/ (GET)']
  });
});

initRag().catch((error) => {
  console.error('❌ RAG initialization failed during server startup:', error.message || error);
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Chatbot AI API started`);
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Frontend can connect to: http://localhost:${PORT}/chat`);
  console.log(`🔑 Groq: ${groqReady ? '✅ Connected' : '❌ NOT connected'}`);
  console.log(`🔐 CORS: Enabled for development`);
  console.log(`✨ Press Ctrl+C to stop\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});