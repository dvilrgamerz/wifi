const test = require('node:test')
const assert = require('node:assert/strict')
const { median, summarize } = require('../monitor-metrics.js')

test('median is stable for unsorted input and empty samples', () => {
  assert.equal(median([]), null)
  assert.equal(median([60, 20, 10, 40]), 30)
  assert.equal(median([4, 9, 1]), 4)
})

test('successful HTTP samples compute median latency and variation', () => {
  const stats = summarize([
    { ok: true, rttMs: 20 },
    { ok: true, rttMs: 40 },
    { ok: true, rttMs: 30 }
  ])
  assert.equal(stats.latencyMs, 30)
  assert.equal(stats.variationMs, 15)
  assert.equal(stats.successPercent, 100)
  assert.equal(stats.health, 'Responsive')
})

test('failures break continuity and are never mislabeled as packet loss', () => {
  const stats = summarize([
    { ok: true, rttMs: 20 },
    { ok: false, rttMs: null },
    { ok: true, rttMs: 90 }
  ])
  assert.equal(stats.failures, 1)
  assert.equal(stats.successPercent, 66.7)
  assert.equal(stats.variationMs, null)
  assert.equal(stats.health, 'Unstable or slow')
})

test('missing data is not treated as zero-latency success', () => {
  assert.equal(summarize([]).latencyMs, null)
  assert.equal(summarize([{ ok: false, rttMs: null }]).health, 'Endpoint unreachable')
  assert.equal(summarize([{ ok: true, rttMs: Infinity }]).successes, 0)
})
