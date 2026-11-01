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
}
