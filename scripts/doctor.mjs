import { discoverPython, defaultDataDir } from '../src/kernel-client.js';
import { BrowserActivity } from '../src/browser.js';
const [major, minor] = process.versions.node.split('.').map(Number);
console.log(`Node ${process.versions.node}: ${major > 22 || major === 22 && minor >= 16 ? 'OK' : '需要 >=22.16；优先使用 DSH 自带 Node'}`);
try { const python = await discoverPython(process.env.LIFECORE_PYTHON); console.log(`Python ${python.version}: ${python.command}`); }
catch (e) { console.error(e.message); process.exitCode = 1; }
console.log('数据目录：' + (process.env.LIFECORE_DATA_DIR || defaultDataDir()));
console.log('Chromium：' + ((await new BrowserActivity({}).status()).available ? '已安装' : '未安装（可选）：npx --no-install playwright install chromium'));
console.log('SnowLuma：请在管理页填写本机 WebSocket 地址、QQ 号、令牌和私聊白名单，然后连接验证。');
console.log('DSH 基线：0.2.1-rc.3；模型可用性需在 DSH 内实际试聊验证。');
