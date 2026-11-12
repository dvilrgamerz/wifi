// Opt-in browser HTTP monitoring. Diagnoses only reachability of this website, not LAN or ISP cause.
(function () {
  'use strict'
  const metrics = window.WiFiMonitorMetrics
  const el = id => document.getElementById(id)
  const startBtn = el('monitorStart')
  if (!metrics || !startBtn) return
  const stopBtn = el('monitorStop'), csvBtn = el('monitorExport'), reportBtn = el('monitorReport')
  const chart = el('monitorChart'), ctx = chart.getContext('2d')
  const target = new URL('./monitor-probe.txt', document.baseURI)
  const INTERVAL = 5000, TIMEOUT = 3500, LIMIT = 2160
  let running = false, generation = 0, timer = null, controller = null, started = 0, ended = null, samples = []
  const time = ms => ms == null ? 'Not observed' : new Date(ms).toLocaleString()
  const label = n => n == null ? '—' : String(n)
  const download = (filename, mime, body) => {
    const url = URL.createObjectURL(new Blob([body], { type: mime }))
    const a = document.createElement('a')
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
  }
  function schedule(token) {
    if (running && generation === token) timer = setTimeout(() => probe(token), INTERVAL)
  }
  function append(sample) {
    samples.push(sample)
    if (samples.length > LIMIT) samples.shift()
  }
  function draw() {
    if (!ctx) return
    const w = chart.width, h = chart.height
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = '#31516a'; ctx.lineWidth = 1
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(0, h * i / 4); ctx.lineTo(w, h * i / 4); ctx.stroke()
    }
    const list = samples.slice(-75)
    if (!list.length) return
    const maximum = Math.max(100, ...list.filter(s => s.ok && Number.isFinite(s.rttMs)).map(s => s.rttMs)) * 1.1
    let previous = null
    list.forEach((s, i) => {
      const x = 7 + i * (w - 14) / Math.max(1, list.length - 1)
      if (s.ok === false) {
        ctx.fillStyle = '#ff8b79'; ctx.fillRect(x - 2, h - 12, 4, 7); previous = null; return
      }
      if (s.ok !== true || !Number.isFinite(s.rttMs)) { previous = null; return }
      const y = Math.max(7, h - 15 - s.rttMs / maximum * (h - 27))
      if (previous) {
        ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(x, y)
        ctx.strokeStyle = '#5edcc9'; ctx.lineWidth = 2; ctx.stroke()
      }
      ctx.fillStyle = '#5edcc9'; ctx.fillRect(x - 2, y - 2, 4, 4)
      previous = { x, y }
    })
  }
  function render(note) {
    const stats = metrics.summarize(samples), events = metrics.interruptions(samples)
    const diagnosis = metrics.describeEvidence(stats, events)
    el('monitorLatency').textContent = stats.latencyMs == null ? '—' : \`\${stats.latencyMs} ms\`
    el('monitorVariation').textContent = stats.variationMs == null ? '—' : \`\${stats.variationMs} ms\`
    el('monitorSuccess').textContent = stats.successPercent == null ? '—' : \`\${stats.successPercent}%\`
    el('monitorFailures').textContent = String(stats.failures)
    el('monitorSampleCount').textContent = String(stats.total)
    el('monitorElapsed').textContent = started ? \`\${Math.floor(((ended || Date.now()) - started) / 1000)}s\` : '0s'
    el('monitorOutages').textContent = String(events.length)
    el('monitorFaultHeading').textContent = diagnosis.title
    el('monitorFaultDetails').textContent = diagnosis.detail
    el('monitorStatus').textContent = note || (running ? stats.health : 'Stopped — export your evidence')
    startBtn.disabled = running; stopBtn.disabled = !running
    csvBtn.disabled = !stats.total; reportBtn.disabled = !stats.total
    const list = el('monitorEventList'); list.replaceChildren()
    for (const event of events.slice(-6).reverse()) {
      const li = document.createElement('li')
      const heading = document.createElement('strong'); heading.textContent = event.ongoing ? 'Suspected interruption / not confirmed recovered' : 'Suspected interruption / recovered'
      const detail = document.createElement('span')
      detail.textContent = \`First failure: \${time(event.firstFailureAt)} · \${event.failedRequests} failed checks · \${event.ongoing ? 'Last failure: ' + time(event.lastFailureAt) : 'Next successful check: ' + time(event.firstSuccessAfterAt)}\`
      li.append(heading, detail); list.appendChild(li)
    }
    el('monitorNoEvents').hidden = events.length > 0
    draw()
  }
  async function probe(token) {
    if (!running || token !== generation) return
    if (document.hidden) { render('Paused while this tab is hidden'); return }
    if (!navigator.onLine) {
      append({ at: Date.now(), ok: false, rttMs: null, kind: 'browser-offline' })
      render('Your browser reports offline; cause not verified')
      schedule(token); return
    }
    const active = new AbortController(); controller = active
    const timeout = setTimeout(() => active.abort(), TIMEOUT)
    const t0 = performance.now()
    let sample
    try {
      const url = new URL(target)
      url.searchParams.set('probe', \`\${Date.now()}-\${Math.random().toString(36).slice(2)}\`)
      const response = await fetch(url.href, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: active.signal })
      if (!response.ok || (await response.text()).trim() !== 'WIFI_PULSE_MONITOR_OK') throw new Error('Unexpected website response')
      sample = { at: Date.now(), ok: true, rttMs: Math.round(performance.now() - t0), kind: 'http' }
    } catch {
      sample = { at: Date.now(), ok: false, rttMs: null, kind: 'http' }
    } finally {
      clearTimeout(timeout)
      if (controller === active) controller = null
    }
    if (!running || token !== generation || document.hidden) return
    append(sample); render(); schedule(token)
  }
  function changeState() {
    if (!running) return
    clearTimeout(timer); generation++
    if (controller) controller.abort()
    append({ at: Date.now(), ok: null, rttMs: null, kind: 'pause' })
    if (document.hidden) render('Paused while tab is hidden; no outage assumed')
    else probe(generation)
  }
  function start() {
    if (running) return
    running = true; generation++; started = Date.now(); ended = null; samples = []
    render('Starting website connectivity checks…'); probe(generation)
  }
  function stop() {
    if (!running) return
    running = false; generation++; ended = Date.now(); clearTimeout(timer)
    if (controller) controller.abort()
    render('Stopped — results available for export')
  }
  function exportCsv() {
    const lines = ['timestamp_utc,kind,http_response_ms,request_success']
    for (const s of samples) lines.push([new Date(s.at).toISOString(), s.kind,
      s.ok ? s.rttMs : '', s.ok == null ? '' : s.ok].join(','))
    download('wifi-pulse-pro-samples.csv', 'text/csv;charset=utf-8', lines.join('\n') + '\n')
  }
  function exportReport() {
    const stats = metrics.summarize(samples), events = metrics.interruptions(samples)
    const diagnosis = metrics.describeEvidence(stats, events)
    const lines = [
      'WIFI PULSE PRO — CONNECTION EVIDENCE REPORT',
      'Created: ' + new Date().toISOString(),
      'Monitoring period: ' + time(started) + ' to ' + time(ended || Date.now()),
      'Measurement: opt-in HTTP GET to ' + target.origin + target.pathname,
      'Approximate interval: 5 seconds while tab is visible',
      'Completed checks: ' + stats.total, 'Successful requests: ' + stats.successes,
      'Failed requests: ' + stats.failures, 'Success rate: ' + label(stats.successPercent) + '%',
      'Median HTTP response time: ' + label(stats.latencyMs) + ' ms',
      'Median adjacent response-time variation: ' + label(stats.variationMs) + ' ms',
      'Suspected multi-check interruptions: ' + events.length, '',
      'EVIDENCE SUMMARY', diagnosis.title, diagnosis.detail, '', 'INTERRUPTION LOG'
    ]
    if (!events.length) lines.push('No multi-check interruption observed.')
    events.forEach((e, i) => lines.push(
      \`\${i + 1}. First failed check: \${time(e.firstFailureAt)} | Last failed check: \${time(e.lastFailureAt)} | Failed checks: \${e.failedRequests}\`,
      \`   Prior success: \${time(e.lastSuccessBeforeAt)} | Next success: \${time(e.firstSuccessAfterAt)} | \${e.ongoing ? 'Recovery not observed' : 'Recovery observed'}\`
    ))
    lines.push('', 'INTERPRETATION & LIMITATIONS',
      '- Failure timestamps are check times, NOT the exact moment connectivity stopped.',
      '- The start of interruption is bounded by prior success and first failed check when available.',
      '- A failed HTTP request is not ICMP packet loss or direct evidence of ISP fault.',
      '- Website/CDN, browser, VPN, device, Wi-Fi, router and upstream networks are all possible causes.',
      '- Hidden tabs, sleeping devices and browser throttling are not continuously monitored.',
      '- For local-vs-upstream evidence, run the optional local diagnostic agent and compare Ethernet with Wi-Fi.',
      '- Report is produced locally; no telemetry is uploaded by WiFi Pulse.',
      '', 'Supporting sample-level evidence: export CSV separately.')
    download('wifi-pulse-pro-isp-report.txt', 'text/plain;charset=utf-8', lines.join('\n') + '\n')
  }
  startBtn.addEventListener('click', start)
  stopBtn.addEventListener('click', stop)
  csvBtn.addEventListener('click', exportCsv)
  reportBtn.addEventListener('click', exportReport)
  document.addEventListener('visibilitychange', changeState)
  window.addEventListener('offline', changeState)
  window.addEventListener('online', changeState)
  window.addEventListener('pagehide', stop)
  render('Not started — no requests sent')
})()
