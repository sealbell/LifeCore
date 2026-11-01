import test from 'node:test';
import assert from 'node:assert/strict';
let validateVideoUrl, BrowserActivity;
try { ({ validateVideoUrl, BrowserActivity } = await import('../src/browser.js')); } catch {}
test('browser activity only accepts approved video sites and isolates URL credentials', () => {
  assert.ok(validateVideoUrl, 'Browser URL validation must exist');
  assert.match(validateVideoUrl('https://www.bilibili.com/video/BV1234567890'), /bilibili/);
  for (const url of ['file:///C:/secret', 'https://bilibili.com.evil.test/', 'https://user:pass@www.bilibili.com/', 'http://127.0.0.1:9999/']) assert.throws(() => validateVideoUrl(url));
});

test('concurrent interruptions resume only after the final conversation ends', async () => {
  const browser = new BrowserActivity({ dataDir: '.', kernel: {} });
  browser.page = { isClosed: () => false };
  let paused = false, resumed = 0;
  browser.observe = async () => ({ status: paused ? 'paused' : 'playing', position: 12 });
  browser.pauseInternal = async () => { paused = true; return { position: 12 }; };
  browser.resumeInternal = async () => { resumed++; paused = false; };
  const first = await browser.interrupt();
  const second = await browser.interrupt();
  await browser.continueAfter(first);
  assert.equal(resumed, 0);
  await browser.continueAfter(second);
  assert.equal(resumed, 1);
});
