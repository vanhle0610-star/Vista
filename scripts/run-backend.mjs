import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..', 'backend');
const envFile = path.join(backendDir, '.env');

const env = { ...process.env };

if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  }
}

const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? (process.env.ComSpec || 'cmd.exe') : './gradlew';
const gradlewBatPath = path.join(backendDir, 'gradlew.bat');
const taskArgs = ['bootRun', ...process.argv.slice(2)];
const gradlewArgs = isWindows ? ['/c', gradlewBatPath, ...taskArgs] : taskArgs;

const proc = spawn(gradlewCmd, gradlewArgs, {
  cwd: backendDir,
  env,
  stdio: 'inherit'
});

proc.on('exit', (code) => {
  process.exit(code ?? 0);
});

proc.on('error', (err) => {
  console.error('[BACKEND ERROR]', err);
  process.exit(1);
});
