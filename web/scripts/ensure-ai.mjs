import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const aiDir = path.resolve(__dirname, '..', '..', 'ai-service');

function checkAiHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/health', { timeout: 1200 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const isHealthy = await checkAiHealth();
  if (isHealthy) {
    console.log('\x1b[32m%s\x1b[0m', '✓ [VISTA AI] Dịch vụ Python AI Microservice đã sẵn sàng trên port 8000.');
    return;
  }

  console.log('\x1b[33m%s\x1b[0m', '⚡ [VISTA AI] Port 8000 chưa chạy, đang tự động kích hoạt Python AI Service song song...');
  const isWindows = process.platform === 'win32';
  const pythonCmd = isWindows ? 'python' : 'python3';

  try {
    const child = spawn(pythonCmd, ['run.py'], {
      cwd: aiDir,
      env: process.env,
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    console.log('\x1b[32m%s\x1b[0m', '✓ [VISTA AI] Đã kích hoạt tiến trình nền Python AI Service thành công!');
  } catch (err) {
    console.warn('[VISTA AI WARN] Không thể tự động chạy python run.py:', err.message);
  }
}

main();
