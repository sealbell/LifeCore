import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { rootDir } from '../src/kernel-client.js';

const install = process.env.DSH_INSTALL_DIR || path.join(os.homedir(), 'AppData/Local/Programs/DeepSeek Harness');
const executable = path.join(install, 'DeepSeek Harness.exe');
const cli = path.join(install, 'resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js');
if (!existsSync(executable)) throw new Error('此脚本验证 Windows DSH 桌面版；可通过 DSH_INSTALL_DIR 指定安装目录。');
const directory = await mkdtemp(path.join(os.tmpdir(), 'lifecore-dsh-'));
const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', DSH_HOME: path.join(directory, 'dsh'), LIFECORE_DATA_DIR: path.join(directory, 'life'), DSH_TELEMETRY_MODE: 'DISABLED' };
const args = ['--expose-internals', cli];
const exec = promisify(execFile);
let child, browser;
try {
  await exec(executable, [...args, 'lifecore-test', '--from-default-profile', 'web', '--dump-config'], { env, windowsHide: true, maxBuffer: 2000000 });
  await exec(executable, [...args, 'plugin', '--profile', 'lifecore-test', 'add', process.env.LIFECORE_PACKAGE || rootDir], { env, windowsHide: true, timeout: 120000 });
  child = spawn(executable, [...args, 'lifecore-test', '--no-open', '--port', '0'], { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let errors = '';
  child.stderr.on('data', b => { errors += b.toString(); });
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DSH 启动超时')), 30000);
    let output = '';
    child.stdout.on('data', b => {
      output += b.toString(); const match = output.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('DSH 在验证前退出')); });
  });
  const base = new URL(url).origin;
  assert.equal((await fetch(base + '/lifecore/api/state')).status, 401);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = []; page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(async () => (await fetch('/lifecore/api/state')).ok, { timeout: 20000 });
  const state = await page.evaluate(async () => (await fetch('/lifecore/api/state')).json());
  assert.equal(state.mode, 'dsh'); assert.equal(state.kernelReady, true); assert.equal(state.modelAvailable, true);
  const welcome = page.getByRole('button', { name: '继续', exact: true });
  await welcome.waitFor(); await welcome.click();
  await welcome.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '添加 API Key', exact: true }).click();
  await page.getByRole('button', { name: '稍后配置', exact: true }).click();
  await page.getByRole('button', { name: '账号菜单', exact: true }).click();
  await page.getByRole('menuitem', { name: /设置/ }).click();
  await page.getByText('生命核心', { exact: true }).click();
  const embedded = page.frameLocator('iframe[title="LifeCore 生命核心"]');
  await embedded.getByText('运行中 · SQLite', { exact: true }).waitFor();
  const output = path.join(rootDir, '.superpowers/verification'); await mkdir(output, { recursive: true });
  await page.screenshot({ path: path.join(output, 'dsh-settings.png'), fullPage: true });
  const client = await page.request.get(base + '/lifecore/app.js'); assert.equal(client.status(), 200);
  await page.goto(base + '/lifecore/');
  await page.getByText('DSH 宿主模式', { exact: true }).waitFor();
  await page.getByText('运行中 · SQLite', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, 'dsh-host.png'), fullPage: true });
  assert.equal(errors.includes('lifecore-dsh):'), false, 'LifeCore activation error');
  assert.deepEqual(pageErrors, []);
  console.log('DSH HOST PASS: isolated profile installation, plugin activation, authenticated management, real Python worker, llm service injection.');
  console.log('DSH settings entry and embedded LifeCore page passed. No model API request or real QQ message was sent.');
} finally {
  await browser?.close();
  if (child && child.exitCode === null) {
    const exited = new Promise(r => child.once('exit', r)); child.kill(); await exited;
    // The worker observes stdin EOF after the host exits.
    await new Promise(r => setTimeout(r, 1000));
  }
  await rm(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 500 });
}
