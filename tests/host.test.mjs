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

