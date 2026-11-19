import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const aiDir = path.resolve(__dirname, '..', 'ai-service');

const isWindows = process.platform === 'win32';
const pythonCmd = isWindows ? 'python' : 'python3';

console.log('[AI RUNNER] Đang khởi chạy VISTA Python AI Service từ:', aiDir);

const proc = spawn(pythonCmd, ['run.py'], {
  cwd: aiDir,
  env: process.env,
  stdio: 'inherit'
});

proc.on('exit', (code) => {
  console.log(`[AI RUNNER] AI Service exited with code ${code}`);
  process.exit(code ?? 0);
});

proc.on('error', (err) => {
  console.error('[AI SERVICE ERROR] Không thể khởi chạy python run.py:', err);
  process.exit(1);
});
