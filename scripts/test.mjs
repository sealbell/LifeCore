import { spawnSync } from 'node:child_process';
import { discoverPython, rootDir } from '../src/kernel-client.js';
const python = await discoverPython();
for (const [command, args] of [[python.command, [...python.args, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py', '-v']], [process.execPath, ['--test', 'tests/*.test.mjs']]]) {
  const r = spawnSync(command, args, { cwd: rootDir, stdio: 'inherit', windowsHide: true, env: { ...process.env, PYTHONUTF8: '1' } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
