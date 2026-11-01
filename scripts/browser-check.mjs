import { chromium } from 'playwright';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { BrowserActivity } from '../src/browser.js';
import { KernelClient } from '../src/kernel-client.js';

// A real HTMLMediaElement plays a synthetic 30-second WAV, with no account or network media.
const samples = 8000 * 30, wav = Buffer.alloc(44 + samples * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
const directory = await mkdtemp(path.join(os.tmpdir(), 'lifecore-video-'));
const kernel = new KernelClient({ dataDir: directory });
const activity = new BrowserActivity({ dataDir: directory, kernel, headless: true });
try {
  await kernel.start();
  activity.context = await chromium.launchPersistentContext(path.join(directory, 'browser-profile'), { headless: true });
  await activity.context.route('https://www.bilibili.com/video/LIFECORE_TEST', route => route.fulfill({ contentType: 'text/html', body: `<title>本地播放器验收</title><video muted controls src="data:audio/wav;base64,${wav.toString('base64')}"></video>` }));
  await activity.open('https://www.bilibili.com/video/LIFECORE_TEST');
  await activity.page.locator('video').evaluate(async video => { await video.play(); video.currentTime = 8; });
  const before = await activity.observe(); assert.equal(before.status, 'playing');
  const first = await activity.interrupt(), second = await activity.interrupt();
  assert.equal((await activity.observe()).status, 'paused');
  await activity.continueAfter(first); assert.equal((await activity.observe()).status, 'paused');
  await activity.continueAfter(second); assert.equal((await activity.observe()).status, 'playing');
  await activity.pause(); const saved = (await kernel.call('state')).activity;
  assert.ok(saved.position >= 8 && saved.position < 11);
  await activity.open('https://www.bilibili.com/video/LIFECORE_TEST');
  assert.ok(Math.abs((await kernel.call('state')).activity.position - saved.position) < 1);
  await activity.resume(); assert.equal((await activity.observe()).status, 'playing');
  const token = await activity.interrupt(); await activity.pause(); await activity.continueAfter(token);
  assert.equal((await activity.observe()).status, 'paused');
  console.log('BROWSER PASS: real media playback, nested interruption, read-back, reopen checkpoint, resume and explicit pause. Fixture is local; this is not real-site acceptance.');
} finally { await activity.close(); await kernel.stop(); await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); }
