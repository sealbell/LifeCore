import { existsSync } from 'node:fs';
import path from 'node:path';

const domains = ['bilibili.com', 'douyin.com'];
export function validateVideoUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || !domains.some(d => url.hostname === d || url.hostname.endsWith('.' + d))) {
    throw new Error('只允许 HTTPS 的 B站、抖音地址，不接受本地文件或带凭据的链接');
  }
  return url.href;
}

export class BrowserActivity {
  constructor({ dataDir, kernel, headless = false }) {
    this.dataDir = dataDir; this.kernel = kernel; this.headless = headless;
    this.context = null; this.page = null; this.generation = 0; this.queue = Promise.resolve();
    this.interruptions = new Set(); this.interrupted = null;
  }
  async status() {
    try {
      const { chromium } = await import('playwright');
      return { available: existsSync(chromium.executablePath()), opened: Boolean(this.page && !this.page.isClosed()) };
    } catch { return { available: false, opened: false }; }
  }
  serial(fn) {
    const task = this.queue.catch(() => {}).then(fn);
    this.queue = task;
    return task;
  }
  open(value) {
    const url = validateVideoUrl(value);
    this.generation++;
    return this.serial(async () => {
      const saved = (await this.kernel.call('state')).activity;
      const { chromium } = await import('playwright');
      if (!existsSync(chromium.executablePath())) throw new Error('浏览器尚未安装，请先在组件页查看安装命令');
      if (!this.context) {
        this.context = await chromium.launchPersistentContext(path.join(this.dataDir, 'browser-profile'), { headless: this.headless, viewport: { width: 1200, height: 800 }, acceptDownloads: false });
        this.context.on('close', () => { this.context = null; this.page = null; });
        await this.context.route('**/*', async route => {
          const request = route.request();
          if (request.isNavigationRequest() && request.frame() === request.frame().page().mainFrame()) {
            try { validateVideoUrl(request.url()); } catch { return route.abort(); }
          }
          return route.continue();
        });
      }
      if (!this.page || this.page.isClosed()) this.page = this.context.pages()[0] ?? await this.context.newPage();
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      try { await this.page.waitForSelector('video', { timeout: 12000 }); } catch {}
      const observed = await this.observe();
      if (saved?.video_id === observed.video_id && new URL(saved.url).hostname === new URL(observed.url).hostname) {
        await this.page.evaluate(position => { const video = document.querySelector('video'); if (video) { video.pause(); video.currentTime = position; } }, saved.position);
        const restored = await this.observe();
        if (restored.status === 'blocked') await this.kernel.call('activity.save', { activity: { ...saved, status: 'needs_reopen' } });
        return restored;
      }
      return observed;
    });
  }
  async observe() {
    if (!this.page || this.page.isClosed()) throw new Error('视频窗口未打开');
    validateVideoUrl(this.page.url());
    const snapshot = await this.page.evaluate(() => {
      const video = document.querySelector('video');
      const url = new URL(location.href);
      const videoId = url.pathname + (url.searchParams.get('p') ? '?p=' + url.searchParams.get('p') : '') + (url.searchParams.get('modal_id') ? '?modal_id=' + url.searchParams.get('modal_id') : '');
      return { url: url.href, video_id: videoId, title: document.title,
        position: video && Number.isFinite(video.currentTime) ? video.currentTime : 0,
        duration: video && Number.isFinite(video.duration) ? video.duration : 0,
        status: video ? (video.paused ? 'paused' : 'playing') : 'blocked',
        observed_at: new Date().toISOString(), understanding: '仅观察页面标题与播放器状态，尚未采集字幕、音频或画面内容。' };
    });
    await this.kernel.call('activity.save', { activity: snapshot });
    return snapshot;
  }
  pause() {
    this.generation++;
    return this.serial(() => this.pauseInternal());
  }
  async pauseInternal() {
    if (!this.page || this.page.isClosed()) return null;
    await this.page.evaluate(() => { document.querySelector('video')?.pause(); });
    const state = await this.observe();
    if (state.status !== 'paused') throw new Error('未确认播放器已经暂停');
    return state;
  }
  resume() {
    this.generation++;
    return this.serial(async () => {
      const saved = (await this.kernel.call('state')).activity;
      return this.resumeInternal(saved);
    });
  }
  async resumeInternal(saved) {
    if (!saved || !this.page || this.page.isClosed()) throw new Error('请先重新打开原视频，再恢复保存的进度');
    const current = await this.page.evaluate(() => {
      const u = new URL(location.href);
      return u.pathname + (u.searchParams.get('p') ? '?p=' + u.searchParams.get('p') : '') + (u.searchParams.get('modal_id') ? '?modal_id=' + u.searchParams.get('modal_id') : '');
    });
    if (current !== saved.video_id || new URL(this.page.url()).hostname !== new URL(saved.url).hostname) throw new Error('当前视频已变化，未恢复旧活动');
    await this.page.evaluate(async position => {
      const video = document.querySelector('video');
      if (!video) throw new Error('没有可控制的播放器');
      video.currentTime = position;
      await video.play();
    }, saved.position);
    const observed = await this.observe();
    if (observed.status !== 'playing' || Math.abs(observed.position - saved.position) > 3) throw new Error('播放器未确认恢复到保存位置');
    return observed;
  }
  interrupt() {
    return this.serial(async () => {
      if (!this.page || this.page.isClosed()) return null;
      if (this.interrupted?.generation === this.generation) {
        const token = {}; this.interruptions.add(token); return token;
      }
      const before = await this.observe();
      if (before.status !== 'playing') return null;
      const checkpoint = await this.pauseInternal();
      this.interruptions.clear();
      this.interrupted = { checkpoint, generation: this.generation };
      const token = {}; this.interruptions.add(token); return token;
    });
  }
  continueAfter(token) {
    return this.serial(async () => {
      if (!this.interruptions.delete(token) || this.interruptions.size) return;
      const saved = this.interrupted; this.interrupted = null;
      if (saved?.generation !== this.generation) return;
      return this.resumeInternal(saved.checkpoint);
    });
  }
  async close() {
    this.generation++;
    if (this.context) await this.context.close();
    this.context = null; this.page = null;
  }
}
