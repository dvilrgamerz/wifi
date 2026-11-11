// Opt-in browser HTTP monitor. No port scans, LAN discovery, background telemetry or ICMP claims.
(function () {
  'use strict'
  const metric = window.WiFiMonitorMetrics
  const byId = id => document.getElementById(id)
  const startButton = byId('monitorStart')
  if (!metric || !startButton) return
  const stopButton = byId('monitorStop')
  const exportButton = byId('monitorExport')
  const statusText = byId('monitorStatus')
  const elapsedText = byId('monitorElapsed')
  const latencyText = byId('monitorLatency')
  const variationText = byId('monitorVariation')
  const successText = byId('monitorSuccess')
  const failuresText = byId('monitorFailures')
  const sampleCount = byId('monitorSampleCount')
  const chart = byId('monitorChart')
  const ctx = chart.getContext('2d')
  const TARGET = new URL('./monitor-probe.txt', document.baseURI)
  const INTERVAL_MS = 5000
  const TIMEOUT_MS = 3500
  const MAX_SAMPLES = 120
  let running = false
  let generation = 0
  let startedAt = 0
  let timer = null
  let controller = null
  let samples = []

  function schedule(token) {
    if (running && generation === token) timer = setTimeout(() => probe(token), INTERVAL_MS)
  }
  function printNumber(value, suffix) {
    return value === null ? '—' : String(value) + suffix
  }
  function draw() {
    if (!ctx) return
    const width = chart.width, height = chart.height
    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = '#29465d'
    ctx.lineWidth = 1
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * height / 4)
      ctx.lineTo(width, i * height / 4); ctx.stroke()
    }
    const list = samples.slice(-50)
    const successful = list.filter(x => x.ok && Number.isFinite(x.rttMs))
    if (list.length < 2 || !successful.length) return
    const max = Math.max(100, ...successful.map(x => x.rttMs)) * 1.15
    ctx.strokeStyle = '#5edcc9'
    ctx.lineWidth = 2.5
    let connected = false
    for (let i = 0; i < list.length; i++) {
      const sample = list[i]
      if (!sample.ok || !Number.isFinite(sample.rttMs)) {
        connected = false
        continue
      }
      const x = (i / Math.max(1, list.length - 1)) * (width - 12) + 6
      const y = height - 8 - (sample.rttMs / max) * (height - 16)
      if (!connected) { ctx.beginPath(); ctx.moveTo(x, y) }
      else ctx.lineTo(x, y)
      // Isolated samples get a visible point too.
      ctx.stroke()
      ctx.fillStyle = '#5edcc9'
      ctx.fillRect(x - 2, y - 2, 4, 4)
      connected = true
    }
  }
  function render(note) {
    const stats = metric.summarize(samples)
    latencyText.textContent = printNumber(stats.latencyMs, ' ms')
    variationText.textContent = printNumber(stats.variationMs, ' ms')
    successText.textContent = printNumber(stats.successPercent, '%')
    failuresText.textContent = String(stats.failures)
    sampleCount.textContent = String(stats.total)
    elapsedText.textContent = startedAt ? Math.floor((Date.now() - startedAt) / 1000) + 's' : '0s'
    statusText.textContent = note || (running ? stats.health : 'Stopped — start to measure')
    startButton.disabled = running
    stopButton.disabled = !running
    exportButton.disabled = !samples.length
    draw()
  }
  async function probe(token) {
    if (!running || token !== generation) return
    if (document.hidden) { render('Paused while tab is hidden'); return }
    if (!navigator.onLine) { render('Browser reports offline — waiting to resume'); return }
    controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const started = performance.now()
    let sample
    try {
      // A unique query string avoids normal browser caches and service-worker shell caching.
      const url = new URL(TARGET)
      url.searchParams.set('probe', Date.now().toString(36) + '-' + Math.random().toString(36).slice(2))
      const response = await fetch(url.href, {
        method: 'GET', credentials: 'omit', cache: 'no-store',
        redirect: 'error', signal: controller.signal
      })
      if (!response.ok || (await response.text()).trim() !== 'WIFI_PULSE_MONITOR_OK') {
        throw new Error('Unexpected monitor response')
      }
      sample = { at: Date.now(), ok: true, rttMs: Math.round(performance.now() - started) }
    } catch {
      sample = { at: Date.now(), ok: false, rttMs: null }
    } finally {
      clearTimeout(timeout)
      controller = null
    }
    if (!running || token !== generation || document.hidden) return
    samples.push(sample)
    if (samples.length > MAX_SAMPLES) samples.shift()
    render()
    schedule(token)
  }
  function start() {
    if (running) return
    generation += 1
    running = true
    startedAt = Date.now()
    samples = []
    render('Measuring same-origin HTTP response times…')
    probe(generation)
  }
  function stop() {
    running = false
    generation += 1
    clearTimeout(timer)
    if (controller) controller.abort()
    render('Stopped — samples kept only in this tab')
  }
  function downloadCsv() {
    if (!samples.length) return
    const lines = ['timestamp_utc,http_response_ms,request_success']
    for (const item of samples) {
      lines.push([new Date(item.at).toISOString(),
        item.ok ? String(item.rttMs) : '',
        item.ok ? 'true' : 'false'].join(','))
    }
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'wifi-pulse-http-monitor-' + new Date().toISOString().slice(0, 10) + '.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  startButton.addEventListener('click', start)
  stopButton.addEventListener('click', stop)
  exportButton.addEventListener('click', downloadCsv)
  window.addEventListener('offline', () => {
    if (!running) return
    clearTimeout(timer)
    if (controller) controller.abort()
    statusText.textContent = 'Browser reports offline — waiting to resume'
  })
  window.addEventListener('online', () => {
    if (!running || document.hidden) return
    clearTimeout(timer)
    probe(generation)
  })
  document.addEventListener('visibilitychange', () => {
    if (!running) return
    clearTimeout(timer)
    if (document.hidden) {
      if (controller) controller.abort()
      statusText.textContent = 'Paused while tab is hidden'
    } else if (navigator.onLine) probe(generation)
  })
  window.addEventListener('pagehide', stop)
  render('Not started — no requests sent')
})()
