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
      return json(res, 404, { error: '页面不存在' });
    } catch (e) {
      if (!res.headersSent) json(res, 400, { error: e.message || '操作失败' });
      else res.end();
    }
  };
}
