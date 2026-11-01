import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { KernelClient, defaultDataDir } from './kernel-client.js';
import { generateReply } from './model.js';
import { OneBot, classifyInbound, gatewayUrl } from './onebot.js';

const messageFactories = {
  createUserMessage: ({ content, source }) => ({ id: randomUUID(), role: 'user', content, source }),
  createAssistantMessage: ({ content, source }) => ({ id: randomUUID(), role: 'assistant', content, source: { kind: 'model', ...source } }),
};
const initialConfig = () => ({ provider: '', model: '', qq: { url: 'ws://127.0.0.1:3001', account: '', allowPrivate: [] } });

function validateSettings(input) {
  if (!input || typeof input !== 'object') throw new Error('配置格式无效');
  const provider = String(input.provider ?? '').trim(), model = String(input.model ?? '').trim();
  if (provider.length > 120 || model.length > 160) throw new Error('模型标识过长');
  const q = input.qq ?? {}, account = String(q.account ?? '').trim();
  if (account && !/^\d{1,20}$/.test(account)) throw new Error('QQ 号格式不正确');
  const allowPrivate = Array.isArray(q.allowPrivate) ? [...new Set(q.allowPrivate.map(String))] : [];
  if (allowPrivate.length > 20 || allowPrivate.some(id => !/^\d{1,20}$/.test(id))) throw new Error('私聊白名单需为 QQ 号，预览版最多 20 个');
  return { provider, model, qq: { url: gatewayUrl(q.url ?? 'ws://127.0.0.1:3001'), account, allowPrivate } };
}

export class LifeService {
  constructor({ dataDir = defaultDataDir(), python, llm, factories = messageFactories, mode = 'dsh' } = {}) {
    this.dataDir = path.resolve(dataDir); this.llm = llm; this.factories = factories; this.mode = mode;
    this.kernel = new KernelClient({ dataDir: this.dataDir, python });
    this.config = initialConfig(); this.configRevision = 0; this.token = ''; this.lastError = ''; this.stopped = false;
    this.controllers = new Set(); this.queues = new Map(); this.queued = 0;
    this.qq = new OneBot({ onEvent: event => this.onQQ(event) });
  }
  async start() {
    await mkdir(this.dataDir, { recursive: true });
    try { this.config = validateSettings(JSON.parse(await readFile(path.join(this.dataDir, 'settings.json'), 'utf8'))); }
    catch (e) { if (e.code !== 'ENOENT') { this.lastError = '已保存的组件配置无法读取，请重新核对；不会自动连接 QQ。'; } }
    try { await this.kernel.start(); } catch (e) { this.lastError = e.message; }
  }
  async state() {
    let core = { life: null, draft: { revision: 0, name: '', description: '' }, paused: true, event_count: 0, actions: [] };
    let ready = false;
    try { core = await this.kernel.call('state'); ready = true; } catch {}
    let providers = [];
    try { providers = this.llm?.listProviders?.() ?? []; } catch {}
    return { ...core, version: '0.1.0-alpha.1', mode: this.mode, kernelReady: ready,
      dataDir: this.dataDir, python: this.kernel.interpreter?.version ?? null, config: this.config,
      modelAvailable: Boolean(this.llm?.stream), providers: providers.map(p => ({ id: p.id ?? p.provider ?? '', name: p.name ?? p.displayName ?? p.id ?? '' })),
      qq: { status: this.qq.status, account: this.qq.account, tokenSet: Boolean(this.token) },
      browser: this.browser ? await this.browser.status() : { available: false },
      lastError: this.lastError, activeTurns: this.controllers.size };
  }
  async saveSettings(input) {
    if (this.settingsBusy) throw new Error('组件配置正在更新，请稍后重试');
    const next = validateSettings(input);
    if (input.qq?.token != null && (typeof input.qq.token !== 'string' || input.qq.token.length > 4096 || /[\r\n]/.test(input.qq.token))) throw new Error('令牌格式无效');
    this.settingsBusy = true;
    try {
    await this.invalidate();
    await this.qq.close();
    const file = path.join(this.dataDir, 'settings.json');
    await writeFile(file + '.tmp', JSON.stringify(next, null, 2), { mode: 0o600 });
    await rename(file + '.tmp', file);
    this.config = next;
    // v0.1 keeps the gateway secret in memory only; no accidental plaintext export.
    if (input.qq?.token != null) this.token = input.qq.token;
    return { ok: true };
    } finally { this.settingsBusy = false; }
  }
  async invalidate() {
    this.configRevision++;
    for (const controller of this.controllers) controller.abort();
    if (this.kernel.port) await this.kernel.call('invalidate');
  }
  async pause(paused) {
    if (typeof paused !== 'boolean') throw new Error('暂停状态必须是布尔值');
    this.configRevision++;
    for (const controller of this.controllers) controller.abort();
    const result = await this.kernel.call('pause', { paused });
    if (paused && this.browser) { try { await this.browser.pause(); } catch {} }
    return result;
  }
  async connectQQ() {
    if (this.settingsBusy || this.stopped) throw new Error('组件配置正在更新或插件已停止');
    if (!this.config.qq.allowPrivate.length) throw new Error('请先填写允许私聊的 QQ 白名单');
    return this.qq.connect(this.config.qq, this.token);
  }
  onQQ(event) {
    const normalized = classifyInbound(event, this.config.qq);
    if (!normalized) return;
    this.chat(normalized, true).catch(() => { this.lastError = 'QQ 回合未完成，请检查模型、暂停状态和发送回执。'; });
  }
  chat(input, fromQQ = false) {
    if (this.stopped) return Promise.reject(new Error('插件已停止'));
    if (this.settingsBusy) return Promise.reject(new Error('组件配置正在更新，请稍后重试'));
    if (!this.llm?.stream || !this.config.provider || !this.config.model) return Promise.reject(new Error('请先连接 DSH 并在组件设置中选择模型；不会生成模拟回复。'));
    if (!fromQQ && !['local', 'trial'].includes(input.scene)) return Promise.reject(new Error('管理试聊不允许冒用 QQ 身份'));
    if (this.queued >= 20) return Promise.reject(new Error('等待消息过多，请稍后重试'));
    const scene = input.scene, revision = this.configRevision;
    const previous = this.queues.get(scene) ?? Promise.resolve();
    this.queued++;
    const job = previous.catch(() => {}).then(async () => {
      if (revision !== this.configRevision || this.stopped) throw new Error('排队回合已失效');
      return this.runTurn(input, revision, fromQQ);
    });
    this.queues.set(scene, job);
    return job.finally(() => { this.queued--; if (this.queues.get(scene) === job) this.queues.delete(scene); });
  }
  async runTurn(input, revision, fromQQ) {
    if (this.controllers.size >= 2) throw new Error('模型正忙，请稍后重试');
    const controller = new AbortController();
    this.controllers.add(controller);
    let turn, checkpoint;
    try {
      turn = await this.kernel.call('turn.prepare', { scene: input.scene, text: input.text, event_id: input.event_id ?? randomUUID() });
      if (turn.duplicate) return turn;
      if (this.browser) checkpoint = await this.browser.interrupt();
      const result = await generateReply(this.llm, this.factories, { provider: this.config.provider, model: this.config.model }, turn, controller.signal);
      if (controller.signal.aborted || revision !== this.configRevision) throw new Error('回合已取消或失效');
      const committed = await this.kernel.call('turn.commit', { turn_id: turn.turn_id, ...result });
      if (fromQQ && committed.action_id) await this.sendAction(committed.action_id, revision);
      return committed;
    } catch (e) {
      if (turn?.turn_id && !turn.duplicate) { try { await this.kernel.call('turn.fail', { turn_id: turn.turn_id }); } catch {} }
      throw e;
    } finally {
      this.controllers.delete(controller);
      if (checkpoint && revision === this.configRevision && !this.stopped) await this.browser.continueAfter(checkpoint).catch(() => {});
    }
  }
  async sendAction(actionId, revision) {
    if (revision !== this.configRevision || this.qq.status !== 'online') throw new Error('发送条件已变化，动作保持待核对状态');
    const action = await this.kernel.call('action.claim', { action_id: actionId });
    const [, account, kind, target] = action.scene.split(':');
    let receipt;
    if (revision !== this.configRevision || this.stopped || account !== this.qq.account || kind !== 'private' || !this.config.qq.allowPrivate.includes(target)) {
      receipt = { status: 'failed', detail: '发送权限已失效' };
    } else {
      try {
        const response = await this.qq.call('send_private_msg', { user_id: target, message: [{ type: 'text', data: { text: action.text } }] });
        receipt = response?.message_id != null ? { status: 'succeeded', message_id: String(response.message_id) } : { status: 'unknown', detail: '平台未返回消息编号' };
      } catch (e) { receipt = { status: e.knownFailure ? 'failed' : 'unknown', detail: e.knownFailure ? '平台返回失败' : '超时或断线，禁止自动重发' }; }
    }
    await this.kernel.call('action.receipt', { action_id: actionId, ...receipt });
  }
  async stop() {
    this.stopped = true;
    this.configRevision++;
    for (const c of this.controllers) c.abort();
    await this.qq.close();
    await this.browser?.close();
    await this.kernel.stop();
  }
}
