// Pure statistics and interruption evidence. HTTP failures are not ICMP packet loss.
(function (root) {
  'use strict'
  const round = (n, digits = 1) => Math.round(n * 10 ** digits) / 10 ** digits
  function median(values) {
    if (!values.length) return null
    const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }
  function summarize(samples) {
    const records = Array.isArray(samples) ? samples.filter(s => s && typeof s.ok === 'boolean') : []
    const good = records.filter(s => s.ok && Number.isFinite(s.rttMs) && s.rttMs >= 0)
    const failures = records.length - good.length
    const latencies = good.map(s => s.rttMs), variations = []
    for (let i = 1; i < records.length; i++) {
      if (records[i - 1].ok && records[i].ok &&
          Number.isFinite(records[i - 1].rttMs) && Number.isFinite(records[i].rttMs) &&
          // Missing observations (tab sleeps, power management) are NOT continuous samples.
          (!Number.isFinite(records[i].at) || !Number.isFinite(records[i - 1].at) || records[i].at - records[i - 1].at <= 15000)) {
        variations.push(Math.abs(records[i].rttMs - records[i - 1].rttMs))
      }
    }
    const latency = median(latencies), jitter = median(variations)
    const successPercent = records.length ? round(good.length / records.length * 100) : null
    let health = 'Waiting for samples'
    if (records.length && !good.length) health = 'Endpoint unreachable'
    else if (failures || (latency !== null && latency > 200) || (jitter !== null && jitter > 60)) health = 'Unstable or slow'
    else if (good.length >= 3) health = 'Responsive'
    else if (good.length) health = 'Collecting baseline'
    return {
      total: records.length, successes: good.length, failures, successPercent,
      latencyMs: latency === null ? null : round(latency),
      variationMs: jitter === null ? null : round(jitter),
      latestMs: good.length ? round(good[good.length - 1].rttMs) : null, health
    }
  }
  // At least 2 sequential failed requests are needed to flag a suspected interruption.
  // The true start/recovery lie BETWEEN adjacent observations, not at precise timestamps.
  function interruptions(samples) {
    const records = Array.isArray(samples) ? samples : []
    const episodes = []
    let first = null, last = null, prevGood = null, count = 0
    const close = (recovery, open) => {
      if (count >= 2) episodes.push({
        firstFailureAt: first, lastFailureAt: last, lastSuccessBeforeAt: prevGood,
        firstSuccessAfterAt: recovery, failedRequests: count, ongoing: open,
        observedFailureSpanMs: last - first
      })
      first = last = null; count = 0
    }
    for (const s of records) {
      if (!s || !Number.isFinite(s.at)) continue
      if (s.kind === 'pause') { if (count) close(null, true); prevGood = null; continue }
      if (s.ok === false) {
        if (!count) first = s.at
        last = s.at; count++
      } else if (s.ok === true) {
        if (count) close(s.at, false)
        prevGood = s.at
      }
    }
    if (count) close(null, true)
    return episodes
  }
  function describeEvidence(stats, episodes) {
    if (!stats.total) return { title: 'Not enough evidence', detail: 'Start monitoring to collect measurements. A single HTTP target cannot locate a fault.' }
    if (episodes.some(e => e.ongoing)) return {
      title: 'Possible interruption in progress',
      detail: 'Repeated HTTP requests to this site failed. The cause could be your device, Wi-Fi/router, ISP, or the website/CDN. Run local gateway and internet probes to narrow it down.'
    }
    if (episodes.length) return {
      title: 'Intermittent interruptions observed',
      detail: 'Multiple consecutive website requests failed, then recovered. This shows an access problem to this endpoint, not proof of an ISP outage. Compare wired and Wi-Fi tests and use local gateway probes.'
    }
    if (stats.failures) return {
      title: 'Isolated request failures',
      detail: 'Some HTTP requests failed. A single failure may be transient or endpoint-related; it is not enough to diagnose the network.'
    }
    return { title: 'No failures observed', detail: 'This website was reachable during the sampled period. That does not rule out problems with other services or times.' }
  }
  const api = { median, summarize, interruptions, describeEvidence }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.WiFiMonitorMetrics = api
})(typeof globalThis !== 'undefined' ? globalThis : this)
