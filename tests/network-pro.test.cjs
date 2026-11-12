const { test } = require('node:test')
const assert = require('node:assert/strict')
const { summarize, interruptions, describeEvidence } = require('../monitor-metrics.js')
const ok = (at, rttMs = 22) => ({ at, ok: true, rttMs, kind: 'http' })
const fail = at => ({ at, ok: false, rttMs: null, kind: 'http' })

test('two consecutive failures show earliest observed failure, last failure and recovery', () => {
  const events = interruptions([ok(0), fail(5000), fail(10000), ok(15000)])
  assert.deepEqual(events[0], {
    firstFailureAt: 5000, lastFailureAt: 10000, lastSuccessBeforeAt: 0,
    firstSuccessAfterAt: 15000, failedRequests: 2, ongoing: false,
    observedFailureSpanMs: 5000
  })
})

test('single failed request is not an outage', () => {
  const samples = [ok(0), fail(5000), ok(10000)]
  assert.equal(interruptions(samples).length, 0)
  assert.equal(summarize(samples).failures, 1)
  assert.match(describeEvidence(summarize(samples), interruptions(samples)).title, /Isolated/)
})

test('tab hidden pauses break streak without inventing downtime', () => {
  const samples = [fail(0), { at: 5000, ok: null, kind: 'pause' }, fail(10000), ok(15000)]
  assert.equal(interruptions(samples).length, 0)
  assert.equal(summarize(samples).total, 3)
  assert.equal(summarize(samples).failures, 2)
})

test('ongoing interruption requires confirmed consecutive checks', () => {
  const events = interruptions([ok(0), fail(5000), fail(10000)])
  assert.equal(events.length, 1)
  assert.equal(events[0].ongoing, true)
  assert.equal(events[0].firstSuccessAfterAt, null)
})

test('elapsed long sleep gap does not create misleading response variation', () => {
  assert.equal(summarize([ok(0, 20), ok(90000, 100)]).variationMs, null)
})

test('visible-tab pause breaks adjacent jitter calculation', () => {
  const values = [ok(0, 20), { at: 5000, ok: null, kind: 'pause' }, ok(10000, 80)]
  assert.equal(summarize(values).variationMs, null)
})
