'use strict';

const TEST_ORIGIN = 'https://speed.cloudflare.com';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const average = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const jitterOf = (samples) => {
  if (samples.length < 2) return 0;
  const diffs = samples.slice(1).map((v, i) => Math.abs(v - samples[i]));
  return average(diffs);
};
const fmt = (n, d = 1) => Number.isFinite(n) ? n.toFixed(d) : '—';

let classicRunning = false;
let gameRunning = false;
let activeMode = 'classic';

const els = {
  classicPanel: $('#classicPanel'), gamePanel: $('#gamePanel'), gauge: $('#gauge'),
  gaugeLabel: $('#gaugeLabel'), gaugeValue: $('#gaugeValue'), gaugeUnit: $('#gaugeUnit'),
  startClassic: $('#startClassic'), classicStatus: $('#classicStatus'),
  ping: $('#pingValue'), jitter: $('#jitterValue'), down: $('#downValue'), up: $('#upValue'),
  progressWrap: $('#classicProgressWrap'), progressBar: $('#progressBar'), progressText: $('#progressText'), progressPercent: $('#progressPercent'),
  onlinePill: $('#onlinePill'), historyDrawer: $('#historyDrawer'), scrim: $('#scrim'), historyList: $('#historyList')
};

function setMode(mode) {
  if (classicRunning || gameRunning) return;
  activeMode = mode;
  $$('.mode-card').forEach((card) => card.classList.toggle('selected', card.dataset.mode === mode));
  els.classicPanel.hidden = mode !== 'classic';
  els.gamePanel.hidden = mode !== 'game';
}
$$('.mode-card').forEach((card) => card.addEventListener('click', () => setMode(card.dataset.mode)));

function updateOnline() {
  const online = navigator.onLine;
  els.onlinePill.classList.toggle('offline', !online);
  els.onlinePill.querySelector('span').textContent = online ? 'Online' : 'Offline';
}
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);
updateOnline();

function setGauge(label, value, unit = 'Mbps') {
  els.gaugeLabel.textContent = label;
  els.gaugeValue.textContent = typeof value === 'number' ? (value < 10 ? value.toFixed(1) : Math.round(value)) : value;
  els.gaugeUnit.textContent = unit;
}
function setProgress(percent, text) {
  const p = clamp(percent, 0, 100);
  els.progressWrap.hidden = false;
  els.progressBar.style.width = `${p}%`;
  els.progressPercent.textContent = `${Math.round(p)}%`;
  els.progressText.textContent = text;
}

async function timedFetch(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const response = await fetch(url, { cache: 'no-store', ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { response, ms: performance.now() - start };
  } finally {
    clearTimeout(id);
  }
}

async function measurePing(count = 8, onSample) {
  const values = [];
  let failures = 0;
  for (let i = 0; i < count; i++) {
    try {
      const nonce = `${Date.now()}-${Math.random()}`;
      const { response, ms } = await timedFetch(`${TEST_ORIGIN}/__down?bytes=0&n=${nonce}`, {}, 3500);
      await response.arrayBuffer();
      values.push(ms);
      onSample?.(ms, i, count);
    } catch {
      failures++;
      onSample?.(null, i, count);
    }
    await sleep(90);
  }
  return { ping: median(values), jitter: jitterOf(values), failures, samples: values };
}

async function downloadOnce(bytes, onProgress) {
  const nonce = `${Date.now()}-${Math.random()}`;
  const start = performance.now();
  const response = await fetch(`${TEST_ORIGIN}/__down?bytes=${bytes}&n=${nonce}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Download HTTP ${response.status}`);
  let received = 0;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      const seconds = (performance.now() - start) / 1000;
      const liveMbps = seconds > 0 ? (received * 8 / seconds) / 1e6 : 0;
      onProgress?.(liveMbps, received / bytes);
    }
  } else {
    const buf = await response.arrayBuffer();
    received = buf.byteLength;
  }
  const seconds = (performance.now() - start) / 1000;
  return (received * 8 / seconds) / 1e6;
}

async function uploadOnce(bytes, onProgress) {
  const data = new Uint8Array(bytes);
  for (let i = 0; i < data.length; i += 4096) data[i] = (i / 4096) % 251;
  const start = performance.now();
  const ticker = setInterval(() => {
    const elapsed = Math.max(.05, (performance.now() - start) / 1000);
    const estimated = Math.min(bytes, bytes * (elapsed / 2.4));
    onProgress?.((estimated * 8 / elapsed) / 1e6, clamp(elapsed / 2.4, 0, .95));
  }, 120);
  try {
    const response = await fetch(`${TEST_ORIGIN}/__up?n=${Date.now()}-${Math.random()}`, {
      method: 'POST', mode: 'cors', cache: 'no-store', body: data,
      headers: { 'Content-Type': 'application/octet-stream' }
    });
    if (!response.ok) throw new Error(`Upload HTTP ${response.status}`);
    await response.text().catch(() => '');
  } finally {
    clearInterval(ticker);
  }
  const seconds = (performance.now() - start) / 1000;
  const mbps = (bytes * 8 / seconds) / 1e6;
  onProgress?.(mbps, 1);
  return mbps;
}

function adaptiveBytes(mbps, targetSeconds, minBytes, maxBytes) {
  const estimated = (Math.max(1, mbps) * 1e6 / 8) * targetSeconds;
  return Math.round(clamp(estimated, minBytes, maxBytes));
}

async function runClassic() {
  if (classicRunning) return;
  if (!navigator.onLine) {
    els.classicStatus.textContent = 'You appear to be offline.';
    return;
  }
  classicRunning = true;
  els.startClassic.disabled = true;
  els.gauge.classList.add('testing');
  els.ping.textContent = els.jitter.textContent = els.down.textContent = els.up.textContent = '—';

  try {
    setProgress(4, 'Warming up connection…');
    els.classicStatus.textContent = 'Finding latency…';
    setGauge('PING', 0, 'ms');
    await measurePing(2);

    const pingResult = await measurePing(8, (ms, i, count) => {
      if (ms != null) setGauge('PING', ms, 'ms');
      setProgress(8 + ((i + 1) / count) * 18, 'Measuring ping & jitter…');
    });
    if (!pingResult.samples.length) throw new Error('Could not reach the test server.');
    els.ping.textContent = fmt(pingResult.ping, 0);
    els.jitter.textContent = fmt(pingResult.jitter, 1);

    els.classicStatus.textContent = 'Testing download…';
    setGauge('DOWNLOAD', 0, 'Mbps');
    setProgress(28, 'Starting download test…');
    const firstDown = await downloadOnce(1_000_000, (live) => setGauge('DOWNLOAD', live));
    const downBytes = adaptiveBytes(firstDown, 1.7, 2_000_000, 24_000_000);
    const downSamples = [firstDown];
    for (let i = 0; i < 2; i++) {
      const result = await downloadOnce(downBytes, (live, fraction) => {
        setGauge('DOWNLOAD', live);
        setProgress(32 + ((i + fraction) / 2) * 30, 'Measuring download speed…');
      });
      downSamples.push(result);
    }
    const down = median(downSamples.slice(1));
    els.down.textContent = fmt(down, 1);
    setGauge('DOWNLOAD', down);

    els.classicStatus.textContent = 'Testing upload…';
    setGauge('UPLOAD', 0, 'Mbps');
    setProgress(64, 'Starting upload test…');
    const probeUp = await uploadOnce(350_000, (live) => setGauge('UPLOAD', live));
    const upBytes = adaptiveBytes(probeUp, 1.6, 750_000, 8_000_000);
    const upSamples = [];
    for (let i = 0; i < 2; i++) {
      const result = await uploadOnce(upBytes, (live, fraction) => {
        setGauge('UPLOAD', live);
        setProgress(66 + ((i + fraction) / 2) * 30, 'Measuring upload speed…');
      });
      upSamples.push(result);
    }
    const up = median(upSamples);
    els.up.textContent = fmt(up, 1);
    setGauge('COMPLETE', down, 'Mbps ↓');
    setProgress(100, 'Test complete');
    els.classicStatus.textContent = qualitySentence(pingResult.ping, pingResult.jitter, down, up);
    saveHistory({ type: 'Classic', ping: pingResult.ping, jitter: pingResult.jitter, down, up, at: Date.now() });
  } catch (err) {
    console.error(err);
    setGauge('ERROR', '—', '');
    els.classicStatus.textContent = `${err?.message || 'Test failed.'} Try again.`;
    els.progressText.textContent = 'Test interrupted';
  } finally {
    classicRunning = false;
    els.startClassic.disabled = false;
    els.gauge.classList.remove('testing');
  }
}

function qualitySentence(ping, jitter, down, up) {
  if (ping < 35 && jitter < 10 && down >= 100 && up >= 15) return 'Excellent connection — strong for gaming, 4K streaming and large downloads.';
  if (ping < 60 && jitter < 20 && down >= 40 && up >= 8) return 'Good connection — suitable for gaming, HD/4K streaming and video calls.';
  if (ping < 100 && down >= 15) return 'Usable connection — fine for everyday browsing and HD streaming; gaming may vary.';
  return 'This connection may feel slow or unstable. Try moving closer to the router and test again.';
}

els.startClassic.addEventListener('click', runClassic);

const canvas = $('#gameCanvas');
const ctx = canvas.getContext('2d');
const gameEls = {
  overlay: $('#gameOverlay'), start: $('#startGame'), touch: $('#touchControls'),
  ping: $('#gamePing'), jitter: $('#gameJitter'), down: $('#gameDown'), loss: $('#gameLoss'), stutters: $('#gameStutters'), time: $('#gameTime'),
  result: $('#gameResult'), score: $('#gamingScore'), rating: $('#gamingRating'), summary: $('#gamingSummary'),
  finalPing: $('#finalGamePing'), finalJitter: $('#finalGameJitter'), finalLoss: $('#finalGameLoss')
};

let gameState = null;
let gameRAF = 0;
const keys = { left: false, right: false };

function resetGameState() {
  gameState = {
    playerX: canvas.width / 2, playerY: canvas.height - 62, playerW: 42, playerH: 26,
    obstacles: [], boosts: [], score: 0, lives: 3, startedAt: 0, lastFrame: 0, lastSpawn: 0,
    stutters: 0, pingSamples: [], requests: 0, failures: 0, downloadSamples: [], networkStop: false
  };
}
resetGameState();

function resizeGameCanvasBackingStore() {
  canvas.width = 760; canvas.height = 420;
}
resizeGameCanvasBackingStore();

function spawnObject(kind = 'obstacle') {
  const obj = {
    x: 28 + Math.random() * (canvas.width - 56), y: -30,
    r: kind === 'boost' ? 11 : 14 + Math.random() * 6,
    speed: (kind === 'boost' ? 150 : 125 + Math.random() * 105),
    drift: (Math.random() - .5) * 28
  };
  (kind === 'boost' ? gameState.boosts : gameState.obstacles).push(obj);
}

function drawGame() {
  const w = canvas.width, h = canvas.height;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#09192a'); grad.addColorStop(1, '#07101b');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(87, 191, 255, .08)'; ctx.lineWidth = 1;
  for (let y = 20; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  for (let x = 20; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }

  const glow = ctx.createRadialGradient(w/2, h*.28, 5, w/2, h*.28, 230);
  glow.addColorStop(0, 'rgba(53,230,255,.10)'); glow.addColorStop(1, 'rgba(53,230,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

  for (const o of gameState.obstacles) {
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,93,122,.88)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,201,.7)'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('DROP', o.x, o.y + 3);
  }
  for (const b of gameState.boosts) {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(85,240,165,.9)'; ctx.fill();
    ctx.shadowColor = '#55f0a5'; ctx.shadowBlur = 14; ctx.strokeStyle = '#baffd9'; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#062317'; ctx.font = 'bold 12px system-ui'; ctx.fillText('+', b.x, b.y + 4);
  }

  const x = gameState.playerX, y = gameState.playerY;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#35e6ff'; ctx.shadowColor = '#35e6ff'; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(22, 14); ctx.lineTo(7, 9); ctx.lineTo(0, 16); ctx.lineTo(-7, 9); ctx.lineTo(-22, 14); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#effcff'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill(); ctx.restore();

  ctx.textAlign = 'left'; ctx.font = '700 12px system-ui'; ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.fillText(`SCORE ${Math.round(gameState.score)}`, 16, 25);
  ctx.textAlign = 'right'; ctx.fillText(`LINK ${'●'.repeat(gameState.lives)}${'○'.repeat(Math.max(0,3-gameState.lives))}`, w - 16, 25);
}

drawGame();

function intersectsCircleRect(c, rx, ry, rw, rh) {
  const cx = clamp(c.x, rx - rw/2, rx + rw/2);
  const cy = clamp(c.y, ry - rh/2, ry + rh/2);
  const dx = c.x - cx, dy = c.y - cy;
  return dx*dx + dy*dy < c.r*c.r;
}

function gameLoop(now) {
  if (!gameRunning) return;
  const dt = Math.min(.05, Math.max(0, (now - (gameState.lastFrame || now)) / 1000));
  if (gameState.lastFrame && now - gameState.lastFrame > 85) gameState.stutters++;
  gameState.lastFrame = now;

  const elapsed = (now - gameState.startedAt) / 1000;
  const remaining = Math.max(0, 15 - elapsed);
  gameEls.time.textContent = `${remaining.toFixed(1)}s`;
  gameEls.stutters.textContent = gameState.stutters;
  if (remaining <= 0 || gameState.lives <= 0) { finishGame(); return; }

  const speed = 310;
  if (keys.left) gameState.playerX -= speed * dt;
  if (keys.right) gameState.playerX += speed * dt;
  gameState.playerX = clamp(gameState.playerX, 28, canvas.width - 28);

  if (now - gameState.lastSpawn > 510) {
    spawnObject('obstacle');
    if (Math.random() < .23) spawnObject('boost');
    gameState.lastSpawn = now;
  }

  for (const arr of [gameState.obstacles, gameState.boosts]) {
    for (const o of arr) { o.y += o.speed * dt; o.x += o.drift * dt; }
  }

  const px = gameState.playerX, py = gameState.playerY, pw = gameState.playerW, ph = gameState.playerH;
  gameState.obstacles = gameState.obstacles.filter((o) => {
    if (intersectsCircleRect(o, px, py, pw, ph)) { gameState.lives--; return false; }
    if (o.y > canvas.height + 30) { gameState.score += 7; return false; }
    return true;
  });
  gameState.boosts = gameState.boosts.filter((o) => {
    if (intersectsCircleRect(o, px, py, pw, ph)) { gameState.score += 30; return false; }
    return o.y < canvas.height + 30;
  });
  gameState.score += dt * 2;
  drawGame();
  gameRAF = requestAnimationFrame(gameLoop);
}

async function gameNetworkLoop() {
  let cycle = 0;
  while (gameRunning && !gameState.networkStop) {
    gameState.requests++;
    try {
      const nonce = `${Date.now()}-${Math.random()}`;
      const { response, ms } = await timedFetch(`${TEST_ORIGIN}/__down?bytes=0&game=1&n=${nonce}`, {}, 2400);
      await response.arrayBuffer();
      gameState.pingSamples.push(ms);
      if (gameState.pingSamples.length > 24) gameState.pingSamples.shift();
      const ping = median(gameState.pingSamples.slice(-8));
      const jitter = jitterOf(gameState.pingSamples.slice(-10));
      gameEls.ping.textContent = `${fmt(ping, 0)} ms`;
      gameEls.jitter.textContent = `${fmt(jitter, 1)} ms`;
    } catch { gameState.failures++; }
    gameEls.loss.textContent = `${fmt((gameState.failures / Math.max(1, gameState.requests)) * 100, 0)}%`;

    if (cycle % 3 === 0 && gameRunning) {
      try {
        const d = await downloadOnce(250_000);
        gameState.downloadSamples.push(d);
        gameEls.down.textContent = `${fmt(median(gameState.downloadSamples.slice(-4)), 1)} Mbps`;
      } catch { }
    }
    cycle++;
    await sleep(520);
  }
}

function calculateGamingScore(ping, jitter, loss, stutters) {
  let score = 100;
  score -= clamp((ping - 18) * .55, 0, 42);
  score -= clamp(jitter * 1.15, 0, 24);
  score -= clamp(loss * 3.8, 0, 24);
  score -= clamp(stutters * 1.2, 0, 12);
  return Math.round(clamp(score, 0, 100));
}

function ratingFor(score) {
  if (score >= 90) return ['Elite', 'Excellent for fast online games. Latency and stability look very strong.'];
  if (score >= 78) return ['Great', 'A strong gaming connection. Most multiplayer games should feel responsive.'];
  if (score >= 62) return ['Good', 'Playable for most games, with occasional delay possible in competitive matches.'];
  if (score >= 45) return ['Fair', 'Casual gaming should work, but lag spikes may be noticeable.'];
  return ['Poor', 'Gaming may feel laggy. Move closer to the router, reduce network load, or try Ethernet.'];
}

async function startGameTest() {
  if (gameRunning || !navigator.onLine) return;
  resetGameState();
  gameRunning = true;
  gameState.startedAt = performance.now();
  gameState.lastSpawn = gameState.startedAt;
  gameEls.overlay.hidden = true;
  gameEls.result.hidden = true;
  gameEls.touch.hidden = false;
  gameEls.ping.textContent = '— ms'; gameEls.jitter.textContent = '— ms'; gameEls.down.textContent = '— Mbps';
  gameEls.loss.textContent = '0%'; gameEls.stutters.textContent = '0'; gameEls.time.textContent = '15.0s';
  gameNetworkLoop();
  cancelAnimationFrame(gameRAF);
  gameRAF = requestAnimationFrame(gameLoop);
}

function finishGame() {
  if (!gameRunning) return;
  gameRunning = false;
  gameState.networkStop = true;
  cancelAnimationFrame(gameRAF);
  gameEls.touch.hidden = true;
  drawGame();

  const ping = median(gameState.pingSamples);
  const jitter = jitterOf(gameState.pingSamples);
  const loss = (gameState.failures / Math.max(1, gameState.requests)) * 100;
  const score = calculateGamingScore(ping || 999, jitter || 99, loss, gameState.stutters);
  const [rating, summary] = ratingFor(score);
  gameEls.score.textContent = score;
  gameEls.rating.textContent = rating;
  gameEls.summary.textContent = `${summary} Game score: ${Math.round(gameState.score)}.`;
  gameEls.finalPing.textContent = fmt(ping, 0);
  gameEls.finalJitter.textContent = fmt(jitter, 1);
  gameEls.finalLoss.textContent = fmt(loss, 0);
  gameEls.result.hidden = false;

  gameEls.overlay.innerHTML = `<div class="game-logo">✓</div><h3>Test complete</h3><p>Your gaming quality score is <b>${score}/100</b>. Play again to compare another spot or network.</p><button class="primary-btn" id="playAgain">PLAY AGAIN</button><small>Network score is an estimate from browser requests, not a specific game server.</small>`;
  gameEls.overlay.hidden = false;
  $('#playAgain').addEventListener('click', startGameTest, { once: true });

  saveHistory({ type: 'Game', ping, jitter, score, loss, at: Date.now() });
}

gameEls.start.addEventListener('click', startGameTest);
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft','a','A'].includes(e.key)) { keys.left = true; if (gameRunning) e.preventDefault(); }
  if (['ArrowRight','d','D'].includes(e.key)) { keys.right = true; if (gameRunning) e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  if (['ArrowLeft','a','A'].includes(e.key)) keys.left = false;
  if (['ArrowRight','d','D'].includes(e.key)) keys.right = false;
});
$$('#touchControls button').forEach((btn) => {
  const dir = btn.dataset.dir;
  const on = (e) => { e.preventDefault(); keys[dir] = true; };
  const off = (e) => { e.preventDefault(); keys[dir] = false; };
  btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off); btn.addEventListener('pointerleave', off);
});

const HISTORY_KEY = 'wifi-pulse-history-v1';
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(item) {
  const history = [item, ...getHistory()].slice(0, 12);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}
function renderHistory() {
  const items = getHistory();
  if (!items.length) {
    els.historyList.innerHTML = '<div class="history-empty">No tests yet.<br>Run a Classic or Game Test to build local history.</div>';
    return;
  }
  els.historyList.innerHTML = items.map((x) => {
    const date = new Date(x.at).toLocaleString([], { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
    if (x.type === 'Classic') {
      return `<article class="history-item"><header><span>CLASSIC</span><time>${date}</time></header><div class="history-stats"><span>DOWN<b>${fmt(x.down,1)}</b> Mbps</span><span>UP<b>${fmt(x.up,1)}</b> Mbps</span><span>PING<b>${fmt(x.ping,0)}</b> ms</span></div></article>`;
    }
    return `<article class="history-item"><header><span>GAME</span><time>${date}</time></header><div class="history-stats"><span>SCORE<b>${x.score}</b> /100</span><span>PING<b>${fmt(x.ping,0)}</b> ms</span><span>JITTER<b>${fmt(x.jitter,1)}</b> ms</span></div></article>`;
  }).join('');
}
function openHistory() { renderHistory(); els.historyDrawer.classList.add('open'); els.historyDrawer.setAttribute('aria-hidden','false'); els.scrim.hidden = false; }
function closeHistory() { els.historyDrawer.classList.remove('open'); els.historyDrawer.setAttribute('aria-hidden','true'); els.scrim.hidden = true; }
$('#historyBtn').addEventListener('click', openHistory);
$('#closeHistory').addEventListener('click', closeHistory);
els.scrim.addEventListener('click', closeHistory);
$('#clearHistory').addEventListener('click', () => { localStorage.removeItem(HISTORY_KEY); renderHistory(); });
renderHistory();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
