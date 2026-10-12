const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const src = fs.readFileSync(require('node:path').join(__dirname, '..', 'sw.js'), 'utf8');

function worker() {
  const listeners = {};
  const deleted = [];
  const cache = {addAll: async () => {}, match: async () => ({cached:true}), put: async () => {}};
  const caches = {
    open: async () => cache,
    keys: async () => ['wifi-pulse-v2','wifi-pulse-v3.4','wifi-pulse-v3.5','brainforge-v2'],
    delete: async key => {deleted.push(key); return true;},
  };
  const self = {
    location: {origin:'https://wifi.test', href:'https://wifi.test/sw.js'},
    addEventListener: (name, fn) => {listeners[name]=fn;},
    skipWaiting: async () => {},
    clients: {claim:async () => {}},
  };
  vm.runInNewContext(src,{self,caches,URL,Promise,Set,Response:{error:()=>null},fetch:async()=>({ok:true,clone(){return this;}})});
  const fire = url => {
    const event = {request:{method:'GET',mode:'cors',url},respondWith(value){this.response=value;}};
    listeners.fetch(event);
    return event;
  };
  return {listeners,fire,deleted};
}
test('does not intercept speed tests, health, or cross-origin traffic', () => {
  const {fire}=worker();
  assert.equal(fire('https://wifi.test/api/download?bytes=400000').response,undefined);
  assert.equal(fire('https://wifi.test/api/health').response,undefined);
  assert.equal(fire('https://wifi.test/.netlify/functions/network').response,undefined);
  assert.equal(fire('https://speed.cloudflare.com/__down?bytes=400000').response,undefined);
  assert.equal(fire('https://wifi.test/unknown').response,undefined);
});
test('keeps other applications caches when activating', async () => {
  const {listeners,deleted}=worker();
  const event={waitUntil(promise){this.wait=promise;}};
  listeners.activate(event);
  await event.wait;
  assert.deepEqual(deleted,['wifi-pulse-v2','wifi-pulse-v3.4']);
});
test('intercepts same-origin static assets only', async () => {
  const {fire}=worker();
  const event=fire('https://wifi.test/app.js');
  assert.ok(event.response);
  assert.deepEqual(await event.response,{cached:true});
});
