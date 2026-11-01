import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
let createHandler;
try { ({ createHandler } = await import('../src/web.js')); } catch {}

test('management rejects foreign origins and unapproved kernel commands', async () => {
  assert.ok(createHandler, 'Web handler must exist');
  const service = { state: async () => ({ kernelReady: false }), kernel: { call: () => { throw new Error('must not call'); } } };
  const server = http.createServer(createHandler(service));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base + '/lifecore/api/state')).status, 200);
    const headers = { 'Content-Type': 'application/json', 'X-LifeCore': '1', Origin: 'https://evil.example' };
    assert.equal((await fetch(base + '/lifecore/api/command', { method: 'POST', headers, body: JSON.stringify({ op: 'birth' }) })).status, 403);
    headers.Origin = base;
    assert.equal((await fetch(base + '/lifecore/api/command', { method: 'POST', headers, body: JSON.stringify({ op: 'action.claim' }) })).status, 400);
    const hostileStatus = await new Promise((resolve, reject) => {
      http.get(base + '/lifecore/api/state', { headers: { Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); }).on('error', reject);
    });
    assert.equal(hostileStatus, 403);
  } finally { await new Promise(r => server.close(r)); }
});
