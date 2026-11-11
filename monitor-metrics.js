// Pure, testable statistics for the opt-in same-origin HTTP connection monitor.
(function (root) {
  'use strict'
  function round(value, places = 1) {
    const factor = 10 ** places
    return Math.round(value * factor) / factor
  }
  function median(values) {
    if (!values.length) return null
    const ordered = [...values].sort((a, b) => a - b)
    const middle = Math.floor(ordered.length / 2)
    return ordered.length % 2
      ? ordered[middle]
      : (ordered[middle - 1] + ordered[middle]) / 2
  }
  function summarize(samples) {
    const records = Array.isArray(samples) ? samples : []
    const success = records.filter(item =>
      item && item.ok === true && Number.isFinite(item.rttMs) && item.rttMs >= 0
    )
    const failures = records.length - success.length
    const latencies = success.map(item => item.rttMs)
    const variations = []
    // A failed probe breaks continuity; never bridge the gap for variation.
    for (let i = 1; i < records.length; i += 1) {
      if (records[i - 1]?.ok && records[i]?.ok &&
        Number.isFinite(records[i - 1].rttMs) && Number.isFinite(records[i].rttMs)) {
        variations.push(Math.abs(records[i].rttMs - records[i - 1].rttMs))
      }
    }
    const latencyMs = median(latencies)
    const variationMs = median(variations)
    const successPercent = records.length ? round(success.length / records.length * 100) : null
    let health = 'Waiting for samples'
    if (records.length && !success.length) health = 'Endpoint unreachable'
    else if (failures || (latencyMs !== null && latencyMs > 200) ||
      (variationMs !== null && variationMs > 60)) health = 'Unstable or slow'
    else if (success.length >= 3) health = 'Responsive'
    else if (success.length) health = 'Collecting baseline'
    return {
      total: records.length,
      successes: success.length,
      failures,
      successPercent,
      latencyMs: latencyMs === null ? null : round(latencyMs),
      variationMs: variationMs === null ? null : round(variationMs),
      latestMs: success.length ? round(latencies[latencies.length - 1]) : null,
      health
    }
  }
  const api = { median, summarize }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.WiFiMonitorMetrics = api
})(typeof globalThis !== 'undefined' ? globalThis : this)
