import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';

export function classifyInbound(event, config) {
  if (event?.post_type !== 'message' || event.message_type !== 'private' || String(event.self_id) !== config.account) return null;
  const sender = String(event.user_id);
  if (sender === config.account || !config.allowPrivate.includes(sender) || event.message_id == null) return null;
  if (!Array.isArray(event.message) || event.message.some(s => !s || s.type !== 'text' || typeof s.data?.text !== 'string')) return null;
  const text = event.message.map(s => s.data?.text ?? '').join('').trim();
  if (!text || text.length > 8000) return null;
  return { scene: `qq:${config.account}:private:${sender}`, text, event_id: String(event.message_id), sender };
}

export function gatewayUrl(value) {
  const url = new URL(value);
  if (!['ws:', 'wss:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || url.username || url.password || url.search || url.hash) throw new Error('v0.1 只支持本机 SnowLuma WebSocket 地址；令牌请填入独立字段。');
  return url.href;
}

export class OneBot {
  constructor({ onEvent = () => {}, onStatus = () => {}, timeout = 12000 } = {}) {
    this.onEvent = onEvent; this.onStatus = onStatus; this.timeout = timeout;
    this.pending = new Map(); this.status = 'disconnected'; this.account = null;
  }
  setStatus(status) { this.status = status; this.onStatus(status); }
  async connect(config, token) {
    // close is synchronous: publish the new socket without an interleaving gap.
    this.close();
    const url = gatewayUrl(config.url);
    if (!/^\d{1,20}$/.test(config.account)) throw new Error('请填写大肥鱼使用的普通 QQ 号');
    this.setStatus('connecting');
    const socket = new WebSocket(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, maxPayload: 256000, handshakeTimeout: this.timeout });
    this.socket = socket;
    socket.on('message', raw => {
      if (this.socket !== socket) return;
      let data;
      try { data = JSON.parse(String(raw)); } catch { return; }
      if (!data || typeof data !== 'object' || Array.isArray(data)) return;
      if (data.echo && this.pending.has(data.echo)) {
        const p = this.pending.get(data.echo); clearTimeout(p.timer); this.pending.delete(data.echo);
        if (data.status === 'ok' && data.retcode === 0) p.resolve(data.data);
        else p.reject(Object.assign(new Error('SnowLuma 返回动作失败'), { knownFailure: true }));
      } else if (this.status === 'online') {
        try { Promise.resolve(this.onEvent(data)).catch(() => {}); } catch {}
      }
    });
    socket.on('error', () => { if (this.socket === socket) this.setStatus('error'); });
    socket.on('close', () => {
      if (this.socket !== socket) return;
      for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('SnowLuma 连接中断，动作结果未知')); }
      this.pending.clear();
      if (this.socket === socket) { this.account = null; this.setStatus('disconnected'); }
    });
    try {
      await new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', () => reject(new Error('无法连接 SnowLuma，请核对地址、令牌和运行状态')));
        socket.once('close', () => reject(new Error('连接已取消')));
      });
      if (this.socket !== socket) throw new Error('连接已被替换');
      const login = await this.call('get_login_info', {});
      if (this.socket !== socket) throw new Error('连接已被替换');
      if (String(login?.user_id) !== config.account) throw new Error('连接账号与绑定 QQ 不一致，已停止接入');
      const health = await this.call('get_status', {});
      if (this.socket !== socket) throw new Error('连接已被替换');
      if (health?.online !== true) throw new Error('SnowLuma 已连接，但 QQ 尚未在线');
      this.account = config.account;
      this.setStatus('online');
      return { account: this.account, nickname: String(login.nickname ?? '') };
    } catch (e) { if (this.socket === socket) this.close(); throw e; }
  }
  call(action, params) {
    if (this.socket?.readyState !== WebSocket.OPEN) return Promise.reject(new Error('SnowLuma 未连接'));
    const echo = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(echo); reject(new Error('SnowLuma 请求超时，动作结果未知')); }, this.timeout);
      this.pending.set(echo, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ action, params, echo }), error => {
        if (error && this.pending.has(echo)) { clearTimeout(timer); this.pending.delete(echo); reject(new Error('SnowLuma 发送中断，动作结果未知')); }
      });
    });
  }
  close() {
    const socket = this.socket;
    this.socket = null; this.account = null;
    if (socket) {
      for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('连接已关闭，动作结果未知')); }
      this.pending.clear();
      socket.terminate();
    }
    this.setStatus('disconnected');
  }
}
