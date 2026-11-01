import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
let LifeService;
try { ({ LifeService } = await import('../src/service.js')); } catch {}

test('service saves settings without exposing or persisting a QQ token', async () => {
  assert.ok(LifeService, 'LifeService must exist');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lifecore-service-'));
  const service = new LifeService({ dataDir: directory });
  try {
    await service.start();
    await service.saveSettings({ provider: 'p', model: 'm', qq: { url: 'ws://127.0.0.1:3001', account: '42', allowPrivate: ['7'], token: 'synthetic-secret' } });
    const state = await service.state();
    assert.equal(state.config.qq.account, '42');
    assert.equal(JSON.stringify(state).includes('synthetic-secret'), false);
    await assert.rejects(service.saveSettings({ provider: 'p', model: 'm', qq: { url: 'ws://example.com', account: '42', allowPrivate: ['7'] } }), /本机/);
    await assert.rejects(service.chat({ scene: 'local', text: 'hello', event_id: '1' }), /模型|DSH/);
  } finally { await service.stop(); await rm(directory, { recursive: true, force: true }); }
});

test('late model output cannot commit after the administrator pauses', async () => {
  assert.ok(LifeService, 'LifeService must exist');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lifecore-pause-'));
  let release, entered;
  const enteredPromise = new Promise(r => { entered = r; });
  const gate = new Promise(r => { release = r; });
  const llm = { async *stream() { entered(); await gate; yield { type: 'block-end', block: { type: 'text', text: '迟到回复' } }; yield { type: 'finish', reason: { kind: 'stop' } }; } };
  const service = new LifeService({ dataDir: directory, llm });
  try {
    await service.start();
    await service.saveSettings({ provider: 'p', model: 'm', qq: { url: 'ws://127.0.0.1:3001', account: '', allowPrivate: [] } });
    await service.kernel.call('draft.save', { name: '测试', description: '测试', expected_revision: 0 });
    const pending = service.chat({ scene: 'trial', text: '你好', event_id: '1' });
    await enteredPromise;
    await service.pause(true);
    release();
    await assert.rejects(pending, /失效|取消|abort/i);
    assert.equal((await service.kernel.call('events', { scene: 'trial' })).events.length, 1);
  } finally { release?.(); await service.stop(); await rm(directory, { recursive: true, force: true }); }
});
test('settings transition rejects new turns until the new config is published', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lifecore-config-'));
  const service = new LifeService({ dataDir: directory, llm: { stream() {} } });
  let release, entered;
  const gate = new Promise(r => { release = r; });
  const reached = new Promise(r => { entered = r; });
  const config = { provider: 'old', model: 'old', qq: { url: 'ws://127.0.0.1:3001', account: '', allowPrivate: [] } };
  try {
    await service.start(); await service.saveSettings(config);
    service.qq.close = async () => { entered(); await gate; };
    const saving = service.saveSettings({ ...config, provider: 'new', model: 'new' });
    await reached;
    await assert.rejects(service.chat({ scene: 'trial', text: 'during update' }), /配置.*更新/);
    release(); await saving;
    assert.equal(service.config.provider, 'new');
  } finally { release(); await service.stop(); await rm(directory, { recursive: true, force: true }); }
});
