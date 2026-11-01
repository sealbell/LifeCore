import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { rootDir } from '../src/kernel-client.js';

const install = process.env.DSH_INSTALL_DIR || path.join(os.homedir(), 'AppData/Local/Programs/DeepSeek Harness');
const executable = path.join(install, 'DeepSeek Harness.exe');
if (!existsSync(executable)) throw new Error('未找到 Windows DSH 桌面版，请设置 DSH_INSTALL_DIR；其他系统按 quickstart 使用 dsh 命令安装。');
const cli = path.join(install, 'resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js');
const profile = 'lifecore-preview';
const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
const args = ['--expose-internals', cli];
const exec = promisify(execFile);
if (!existsSync(path.join(home, 'profiles', profile, 'package.json'))) {
  await exec(executable, [...args, profile, '--from-default-profile', 'web', '--dump-config'], { env, windowsHide: true, maxBuffer: 2000000 });
}
await exec(executable, [...args, 'plugin', '--profile', profile, 'add', rootDir], { env, windowsHide: true, timeout: 120000 });
console.log('启动 DSH LifeCore 预览配置。进入设置 → 生命核心；不会修改 desktop 配置。');
const child = spawn(executable, [...args, profile, '--port', process.env.PORT || '4317'], { env, windowsHide: true, stdio: 'inherit' });
process.on('SIGINT', () => child.kill()); process.on('SIGTERM', () => child.kill());
child.once('exit', code => { process.exitCode = code ?? 0; });
