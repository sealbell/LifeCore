const $ = id => document.getElementById(id);
let state, view = 'home', draftDirty = false, settingsDirty = false, initialized = false, birthRequest;
const labels = { home: '生命概览', birth: '出生与试聊', events: '经历时间线', activity: '日常活动', settings: '连接与组件' };
const qqLabels = { online: '在线 · 账号已核对', connecting: '连接中', disconnected: '未连接', error: '连接异常' };
const eventLabels = { observed: '已收到', replied: '已回复', proposed: '拟发送', unknown: '结果未知', failed: '发送失败' };
function showNotice(message, error = false) { $('notice').textContent = message; $('notice').className = error ? 'error' : ''; $('notice').hidden = false; }
async function api(path, body) {
  const res = await fetch('/lifecore/api/' + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-LifeCore': '1' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '操作失败');
  return data;
}
async function run(button, fn) {
  if (button) button.disabled = true;
  try { await fn(); await refresh(); } catch (e) { showNotice(e.message, true); }
  finally { if (button) button.disabled = false; }
}
function showView(next) {
  if (!labels[next]) return;
  view = next;
  document.querySelectorAll('[data-panel]').forEach(el => { el.hidden = el.dataset.panel !== next; });
  document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === next));
  $('page-name').textContent = labels[next];
  if (next === 'events') loadEvents().catch(e => showNotice(e.message, true));
  if (next === 'birth') loadChat().catch(e => showNotice(e.message, true));
}
document.querySelectorAll('[data-view],[data-go]').forEach(el => el.addEventListener('click', () => showView(el.dataset.view || el.dataset.go)));
function time(value) { const n = Math.floor(value || 0); return `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`; }
function render() {
  const s = state;
  $('mode').textContent = s.mode === 'dsh' ? 'DSH 宿主模式' : '独立界面预览 · 未连接 DSH';
  $('pause').textContent = s.paused ? '恢复活动' : '暂停活动';
  $('life-status').textContent = s.life ? (s.paused ? '已暂停' : '已诞生') : '尚未诞生';
  $('life-name').textContent = s.life?.name || s.draft?.name || '等待一个名字';
  $('life-description').textContent = s.life?.description || '先描述你想认识的它，再通过试聊慢慢调整。';
  $('life-id').textContent = s.life ? `LIFE ID / ${s.life.life_id}` : '正式确认后，将拥有唯一且持久的生命标识。';
  $('birth-link').textContent = s.life ? '打开本地对话 ↗' : '开始构建出生草案 ↗';
  $('kernel-status').textContent = s.kernelReady ? '运行中 · SQLite' : '未就绪';
  $('model-status').textContent = s.modelAvailable ? (s.config.model ? '已选择 · 待调用验证' : '等待选择模型') : '未连接 DSH';
  $('qq-status').textContent = qqLabels[s.qq.status] || s.qq.status;
  $('event-count').textContent = s.event_count; $('active-count').textContent = s.activeTurns;
  $('draft-revision').textContent = `版本 ${s.draft.revision}`;
  if (!draftDirty) { $('draft-name').value = s.draft.name; $('draft-description').value = s.draft.description; }
  $('draft-name').readOnly = Boolean(s.life); $('draft-description').readOnly = Boolean(s.life);
  $('draft-form').querySelector('[type=submit]').disabled = Boolean(s.life);
  $('birth-button').disabled = Boolean(s.life) || !s.draft.revision;
  $('draft-hint').textContent = s.life ? '出生档案已固定。右侧对话会进入正式的本地经历。' : '保存后可在右侧试聊。正式诞生会固定出生档案。';
  $('chat-title').textContent = s.life ? '本地对话' : '隔离试聊'; $('chat-scene').textContent = s.life ? '正式经历' : '草案环境';
  $('chat-model').textContent = s.modelAvailable && s.config.model ? s.config.model : '等待 DSH 模型配置';
  $('python-component').textContent = s.kernelReady ? s.python || '已就绪' : '内核未就绪';
  $('qq-component').textContent = qqLabels[s.qq.status] || s.qq.status;
  $('browser-component').textContent = s.browser.available ? '已安装' : '未安装 · 可选';
  $('data-dir').textContent = s.dataDir;
  $('last-error').textContent = s.lastError || '暂无运行错误。模型和 QQ 需完成实际调用后才能验证可用性。';
  if (!settingsDirty) {
    $('provider').value = s.config.provider; $('model').value = s.config.model;
    $('qq-url').value = s.config.qq.url; $('qq-account').value = s.config.qq.account; $('qq-allow').value = s.config.qq.allowPrivate.join(', ');
  }
  $('providers').replaceChildren(...s.providers.map(p => { const el = document.createElement('option'); el.value = p.id; el.label = p.name; return el; }));
  if (s.activity) {
    $('activity-title').textContent = s.activity.title;
    $('activity-status').textContent = ({ playing: '播放中', paused: '已暂停', blocked: '未发现播放器', needs_reopen: '需重新打开' })[s.activity.status] || s.activity.status;
    $('activity-position').textContent = `${time(s.activity.position)} / ${time(s.activity.duration)}`;
    $('activity-detail').textContent = s.activity.understanding;
    if (!initialized) $('video-url').value = s.activity.url || '';
  }
  initialized = true;
}
async function refresh() { state = await api('state'); render(); }
$('draft-form').addEventListener('input', () => { draftDirty = true; });
$('settings-form').addEventListener('input', () => { settingsDirty = true; });
$('draft-form').addEventListener('submit', e => { e.preventDefault(); run(e.submitter, async () => {
  await api('command', { op: 'draft.save', body: { name: $('draft-name').value, description: $('draft-description').value, expected_revision: state.draft.revision } });
  draftDirty = false; await refresh(); await loadChat(); showNotice('草案已保存。新的试聊上下文已经准备好。');
}); });
$('birth-button').addEventListener('click', () => {
  if (draftDirty) return showNotice('请先保存修改后的草案，再确认诞生。', true);
  birthRequest ||= crypto.randomUUID(); $('confirm-name').textContent = state.draft.name; $('birth-dialog').showModal();
});
$('cancel-birth').onclick = () => $('birth-dialog').close();
$('confirm-birth').onclick = e => run(e.currentTarget, async () => {
  await api('command', { op: 'birth', body: { expected_revision: state.draft.revision, request_id: birthRequest } });
  $('birth-dialog').close(); await refresh(); await loadChat(); showNotice('它已经正式诞生。身份会持续保存在本机。');
});
function messageNode(event) {
  const box = document.createElement('div'); box.className = 'message ' + (event.role === 'user' ? 'user' : 'assistant');
  const who = document.createElement('small'); who.textContent = event.role === 'user' ? '你' : state.life?.name || state.draft.name;
  box.append(who, document.createTextNode(event.text)); return box;
}
async function loadChat() {
  if (!state?.kernelReady || (!state.life && !state.draft.revision)) return;
  const data = await api('events?scene=' + (state.life ? 'local' : 'trial'));
  $('chat-messages').replaceChildren(...data.events.toReversed().map(messageNode));
  if (!data.events.length) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = '尚无对话。需要已配置的 DSH 模型。'; $('chat-messages').append(p); }
  $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
}
$('chat-form').addEventListener('submit', e => { e.preventDefault(); run(e.submitter, async () => {
  const text = $('chat-input').value.trim();
  await api('chat', { scene: state.life ? 'local' : 'trial', text, event_id: crypto.randomUUID() });
  $('chat-input').value = ''; await loadChat();
}); });
$('pause').onclick = e => run(e.currentTarget, async () => { await api('pause', { paused: !state.paused }); showNotice(state.paused ? '已恢复活动。' : '已暂停，未完成的生成回合将失效。'); });
async function loadEvents() {
  const data = await api('events');
  $('timeline').replaceChildren();
  if (!data.events.length) { const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = '尚无正式经历。故事可以慢慢开始。'; $('timeline').append(p); }
  for (const event of data.events) {
    const row = document.createElement('div'); row.className = 'event';
    const meta = document.createElement('div'); meta.className = 'event-meta';
    meta.textContent = `${new Date(event.created_at).toLocaleString()}  ·  ${event.scene}  ·  ${event.role === 'user' ? '收到消息' : '回复'}`;
    const status = document.createElement('span'); status.className = 'pill'; status.textContent = eventLabels[event.kind] || event.kind; meta.append(status);
    const content = document.createElement('p'); content.textContent = event.text; row.append(meta, content); $('timeline').append(row);
  }
}
$('refresh-events').onclick = e => run(e.currentTarget, loadEvents);
$('settings-form').addEventListener('submit', e => { e.preventDefault(); run(e.submitter, async () => {
  await api('settings', { provider: $('provider').value, model: $('model').value, qq: { url: $('qq-url').value, account: $('qq-account').value, allowPrivate: $('qq-allow').value.split(/[,，\s]+/).filter(Boolean), ...($('qq-token').value ? { token: $('qq-token').value } : {}) } });
  $('qq-token').value = ''; settingsDirty = false; showNotice('配置已保存。需要时点击“连接 QQ”，令牌不会写入磁盘。');
}); });
$('qq-connect').onclick = e => run(e.currentTarget, async () => { if (settingsDirty) throw new Error('请先保存配置'); await api('qq/connect', {}); showNotice('QQ 已连接，账号与在线状态验证通过。'); });
$('qq-disconnect').onclick = e => run(e.currentTarget, () => api('qq/disconnect', {}));
$('video-form').addEventListener('submit', e => { e.preventDefault(); run(e.submitter, () => api('browser/open', { url: $('video-url').value })); });
document.querySelectorAll('[data-video]').forEach(el => { el.onclick = () => run(el, () => api('browser/' + el.dataset.video, {})); });
$('copy-install').onclick = e => run(e.currentTarget, async () => {
  await navigator.clipboard.writeText('请为 LifeCore v0.1 检查本机组件。宿主固定 DSH 0.2.1-rc.3，Python 3.12+ 优先复用 DSH 自带环境。QQ 使用 SnowLuma 普通账号接入，不要替换为 NapCat 或 AstrBot。先核对 SnowLuma 官方发布与安装说明，提出明确版本及安装目录，不要无条件安装 latest；使用仅本机监听的 OneBot 11 正向 WebSocket，启用访问令牌。账号由我自行登录。视频组件使用 LifeCore 包内锁定的 Playwright 1.56.1，运行 npx --no-install playwright install chromium。显示每步实际结果，不读取或公开现有凭据。');
  showNotice('安装任务已复制，可以粘贴到 DSH 的新会话中。');
});
await refresh().catch(e => showNotice('无法读取状态：' + e.message, true));
setInterval(() => refresh().catch(() => {}), 5000);
