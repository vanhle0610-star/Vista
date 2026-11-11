import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
for (const line of fs.readFileSync(path.join(root, 'backend/.env'), 'utf8').split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  const match = line.match(/^\s*([^=]+?)\s*=\s*(.*?)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const cache = path.join(env.GRADLE_USER_HOME ?? path.join(os.homedir(), '.gradle'),
  'caches/modules-2/files-2.1/org.postgresql/postgresql');
let driver;
if (fs.existsSync(cache)) {
  for (const version of fs.readdirSync(cache).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))) {
    for (const hash of fs.readdirSync(path.join(cache, version))) {
      const directory = path.join(cache, version, hash);
      if (!fs.statSync(directory).isDirectory()) continue;
      const jar = fs.readdirSync(directory).find(name => /^postgresql-[\d.]+\.jar$/.test(name));
      if (jar) { driver = path.join(directory, jar); break; }
    }
    if (driver) break;
  }
}
if (!driver) throw new Error('PostgreSQL JDBC driver not cached. Build the backend once before seeding.');
const java = env.JAVA_HOME ? path.join(env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
const processHandle = spawn(java, [
  '-Xms32m', '-Xmx128m', '-XX:TieredStopAtLevel=1', '-XX:ActiveProcessorCount=2',
  '--class-path', driver, path.join(root, 'backend/scripts/SeedCommunityDemo.java'),
  path.join(root, 'database/seed/community_demo.sql'),
], { cwd: root, env, stdio: 'inherit', windowsHide: true });
processHandle.on('error', () => { console.error('Could not start Java for the demo seed.'); process.exitCode = 1; });
processHandle.on('exit', code => { process.exitCode = code ?? 1; });
