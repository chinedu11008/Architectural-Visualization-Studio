import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(backendDir, '..');
const python = process.platform === 'win32'
  ? join(rootDir, '.venv', 'Scripts', 'python.exe')
  : join(rootDir, '.venv', 'bin', 'python');

if (!existsSync(python)) {
  console.error('Local Python environment is missing. Run: py -m venv .venv, then install backend/requirements.txt.');
  process.exit(1);
}

const server = spawn(python, ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000'], {
  cwd: rootDir,
  stdio: 'inherit',
});

server.on('error', (error) => {
  console.error(`Could not start the local API: ${error.message}`);
  process.exit(1);
});
server.on('exit', (code) => {
  process.exitCode = code ?? 1;
});