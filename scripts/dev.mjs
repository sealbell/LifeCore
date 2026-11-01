import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { LifeService } from '../src/service.js';
import { BrowserActivity } from '../src/browser.js';
import { createHandler } from '../src/web.js';

const dataDir = process.env.LIFECORE_DATA_DIR || path.join(os.homedir(), '.lifecore', 'preview');
const service = new LifeService({ dataDir, mode: 'preview' });
service.browser = new BrowserActivity({ dataDir, kernel: service.kernel });
await service.start();
const server = http.createServer(createHandler(service));
server.requestTimeout = 120000;
server.listen(Number(process.env.PORT || 4317), '127.0.0.1', () => console.log(`LifeCore 预览：http://127.0.0.1:${server.address().port}/lifecore/\n独立数据目录：${dataDir}\n此模式没有连接 DSH 模型，不生成模拟回答。`));
let stopping = false;
async function stop() { if (stopping) return; stopping = true; server.close(); await service.stop(); process.exit(0); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
