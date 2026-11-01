import { LifeService } from './service.js';
import { BrowserActivity } from './browser.js';
import { createHandler } from './web.js';

export const name = 'lifecore-dsh';
export const inject = ['webServer', 'connection', 'llm'];

export function apply(ctx, config = {}) {
  const service = new LifeService({ dataDir: process.env.LIFECORE_DATA_DIR || config.dataDir, python: process.env.LIFECORE_PYTHON || config.python, llm: ctx.llm });
  service.browser = new BrowserActivity({ dataDir: service.dataDir, kernel: service.kernel });
  const ready = service.start();
  const handler = createHandler(service, { authorize: req => {
    // Missing host authentication is not a reason to open the management API.
    if (typeof ctx.connection?.requestRejection !== 'function') return false;
    const rejection = ctx.connection.requestRejection(req);
    return rejection === undefined || rejection === null || rejection === false;
  } });
  const unregister = ctx.webServer.register({ kind: 'prefix', path: '/lifecore', handler: async (req, res) => { await ready; return handler(req, res); } });
  ctx.effect(() => () => { unregister(); return ready.catch(() => {}).then(() => service.stop()); });
  ctx.logger?.info?.('LifeCore v0.1 管理页：/lifecore/；QQ 需在页面显式连接。');
}

export default { name, inject, apply };
