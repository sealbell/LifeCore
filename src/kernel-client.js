import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const exec = promisify(execFile);
export const rootDir = fileURLToPath(new URL('../', import.meta.url));
export const defaultDataDir = () => path.join(os.homedir(), '.lifecore', 'v0.1');

export async function discoverPython(explicit) {
  const bundled = process.resourcesPath && path.join(process.resourcesPath, 'runtime', 'primary-runtime', 'dependencies', 'python', 'python.exe');
  const installed = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'DeepSeek Harness', 'resources', 'runtime', 'primary-runtime', 'dependencies', 'python', 'python.exe');
  const candidates = explicit ? [[explicit, []]] : [bundled, installed].filter(p => p && existsSync(p)).map(p => [p, []]);
  if (!explicit) candidates.push(...(process.platform === 'win32' ? [['py', ['-3.12']]] : []), ['python3', []], ['python', []]);
  for (const [command, args] of candidates) {
    try {
      const { stdout } = await exec(command, [...args, '-c', 'import sys,sqlite3; print(str(sys.version_info.major)+"."+str(sys.version_info.minor))'], { windowsHide: true, timeout: 6000 });
      const [major, minor] = stdout.trim().split('.').map(Number);
      if (major === 3 && minor >= 12) return { command, args, version: stdout.trim() };
    } catch {}
  }
  throw new Error('未找到可用的 Python 3.12+。请安装 Python，或通过 LIFECORE_PYTHON 指定解释器路径后重启。');
}

export class KernelClient {
  constructor({ dataDir = defaultDataDir(), python } = {}) {
    this.dataDir = path.resolve(dataDir);
    this.python = python;
    this.child = null;
    this.port = null;
    this.error = null;
  }
  async start() {
    if (this.child) throw new Error('内核已经启动');
    this.interpreter = await discoverPython(this.python);
    this.token = randomBytes(32).toString('hex');
    const child = spawn(this.interpreter.command, [...this.interpreter.args, '-u', '-m', 'lifecore', '--data-dir', this.dataDir], {
      cwd: path.join(rootDir, 'kernel'), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', LIFECORE_KERNEL_TOKEN: this.token },
    });
    this.child = child;
    this.exited = new Promise(resolve => child.once('exit', resolve));
    child.on('exit', () => { this.port = null; this.child = null; });
    child.stderr.on('data', chunk => { this.error = String(chunk).slice(-2000); });
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('内核启动超时')), 15000);
        let buffer = '';
        const fail = () => { clearTimeout(timer); reject(new Error('内核启动失败；请检查数据目录、Python 和是否已有实例。')); };
        child.once('error', fail);
        child.once('exit', fail);
        child.stdout.on('data', chunk => {
          buffer += String(chunk);
          if (!buffer.includes('\n')) return;
          try {
            const ready = JSON.parse(buffer.split('\n')[0]);
            if (ready.protocol !== 1 || !Number.isInteger(ready.port)) return fail();
            this.port = ready.port;
            clearTimeout(timer);
            child.removeListener('exit', fail);
            resolve();
          } catch { fail(); }
        });
      });
      await this.call('state');
    } catch (e) { await this.stop(); throw e; }
  }
  async call(op, body = {}) {
    if (!this.port || !this.child) throw new Error('生命内核未就绪');
    const response = await fetch(`http://127.0.0.1:${this.port}/command`, {
      method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, body }), signal: AbortSignal.timeout(15000),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || '内核请求失败');
    return value;
  }
  async stop() {
    const child = this.child;
    this.port = null;
    if (!child) return;
    child.stdin.end();
    const timer = setTimeout(() => child.kill(), 3000);
    await this.exited;
    clearTimeout(timer);
    this.child = null;
  }
}
