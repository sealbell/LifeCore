import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let KernelClient, generateReply, classifyInbound;
try { ({ KernelClient } = await import('../src/kernel-client.js')); } catch {}
try { ({ generateReply } = await import('../src/model.js')); } catch {}
try { ({ classifyInbound } = await import('../src/onebot.js')); } catch {}

test('real worker persists a draft across process restarts', async () => {
  assert.ok(KernelClient, 'KernelClient must exist');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'lifecore-test-'));
  let client;
  try {
    client = new KernelClient({ dataDir: dir });
    await client.start();
    await client.call('draft.save', { name: '合成角色', description: '测试设定', expected_revision: 0 });
    await client.stop();
    client = new KernelClient({ dataDir: dir });
    await client.start();
    assert.equal((await client.call('state')).draft.name, '合成角色');
  } finally { await client?.stop(); await rm(dir, { recursive: true, force: true }); }
});

test('model streaming uses final blocks once, rejects failed finishes', async () => {
  assert.ok(generateReply, 'Model bridge must exist');
  const request = { profile: { name: '测试', description: '好奇' }, messages: [{ role: 'user', text: '你好' }] };
  const seen = [];
  const llm = { async *stream(input) { seen.push(input); yield { type: 'text-delta', text: '你好' }; yield { type: 'block-end', block: { type: 'text', text: '你好' } }; yield { type: 'finish', reason: { kind: 'stop' } }; } };
  const factories = { createUserMessage: x => ({ ...x, role: 'user' }), createAssistantMessage: x => ({ ...x, role: 'assistant' }) };
  const reply = await generateReply(llm, factories, { provider: 'test-provider', model: 'test-model' }, request);
  assert.equal(reply.text, '你好');
  assert.equal(seen[0].provider, 'test-provider');
  assert.equal(seen[0].model, 'test-model');
  assert.deepEqual(seen[0].tools, []);
  const failing = { async *stream() { yield { type: 'text-delta', text: '未完成' }; yield { type: 'finish', reason: { kind: 'error' } }; } };
  await assert.rejects(generateReply(failing, factories, { provider: 'p', model: 'm' }, request), /未完成|失败/);
});

