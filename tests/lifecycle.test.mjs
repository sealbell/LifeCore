import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { apply } from '../src/index.js';

test('host disposal waits for worker release before immediate reload', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'lifecore-reload-'));
  try {
    for (let i = 0; i < 2; i++) {
      let dispose;
      const ctx = { llm: {}, connection: {}, webServer: { register: () => () => {} }, effect: fn => { dispose = fn(); } };
      apply(ctx, { dataDir });
      const stopped = dispose();
      assert.equal(typeof stopped?.then, 'function', 'disposer must expose shutdown promise to host');
      await stopped;
    }
  } finally { await rm(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 }); }
});
