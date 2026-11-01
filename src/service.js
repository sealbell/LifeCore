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
