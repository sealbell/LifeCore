import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { rootDir } from './kernel-client.js';

export function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
async function readBody(req) {
  let size = 0, chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 128000) throw new Error('请求过大');
    chunks.push(chunk);
  }
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('请求格式错误');
  return value;
}
export function createHandler(service, { authorize } = {}) {
  return async (req, res) => {
    try {
      const host = new URL(`http://${req.headers.host || 'invalid'}`);
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname)
          || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return json(res, 403, { error: '只接受本机访问' });
      if (authorize && !await authorize(req)) return json(res, 401, { error: '请先登录 DSH' });
      const url = new URL(req.url, host);
      const write = req.method !== 'GET';
      if (write && (req.method !== 'POST' || req.headers.origin !== host.origin || req.headers['x-lifecore'] !== '1'
          || !req.headers['content-type']?.startsWith('application/json'))) return json(res, 403, { error: '请求来源无效，请从 LifeCore 页面操作' });
      if (req.method === 'GET') {
        if (url.pathname === '/lifecore/api/state') return json(res, 200, await service.state());
        if (url.pathname === '/lifecore/api/events') return json(res, 200, await service.kernel.call('events', { scene: url.searchParams.get('scene') || undefined }));
        if (url.pathname === '/lifecore/api/export') {
          res.setHeader('Content-Disposition', 'attachment; filename="lifecore-export.json"');
          return json(res, 200, await service.kernel.call('export'));
        }
        const staticFiles = { '/lifecore/': ['index.html', 'text/html'], '/lifecore': ['index.html', 'text/html'], '/lifecore/app.js': ['app.js', 'text/javascript'], '/lifecore/style.css': ['style.css', 'text/css'] };
        const file = staticFiles[url.pathname];
        if (!file) return json(res, 404, { error: '页面不存在' });
        const bytes = await readFile(path.join(rootDir, 'web', file[0]));
        res.writeHead(200, { 'Content-Type': file[1] + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'" });
        return res.end(bytes);
      }
      const body = await readBody(req);
      let result;
      switch (url.pathname) {
        case '/lifecore/api/command':
          if (!['draft.save', 'birth'].includes(body.op)) throw new Error('管理页面不允许调用此内核命令');
          result = await service.kernel.call(body.op, body.body ?? {}); break;
        case '/lifecore/api/chat': result = await service.chat(body); break;
        case '/lifecore/api/settings': result = await service.saveSettings(body); break;
        case '/lifecore/api/pause': result = await service.pause(body.paused); break;
        case '/lifecore/api/qq/connect': result = await service.connectQQ(); break;
        case '/lifecore/api/qq/disconnect': await service.invalidate(); await service.qq.close(); result = { ok: true }; break;
        case '/lifecore/api/browser/open': result = await service.browser.open(body.url); break;
        case '/lifecore/api/browser/pause': result = await service.browser.pause(); break;
        case '/lifecore/api/browser/resume': result = await service.browser.resume(); break;
        case '/lifecore/api/browser/observe': result = await service.browser.serial(() => service.browser.observe()); break;
        default: return json(res, 404, { error: '接口不存在' });
      }
      json(res, 200, result ?? { ok: true });
    } catch (e) {
      if (!res.headersSent) json(res, 400, { error: e.message || '操作失败' });
      else res.end();
    }
  };
}
