// Inspects by default. --apply is only for the exact migration approved by the user.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
for (const line of fs.readFileSync(path.join(root, 'backend/.env'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*(DB_URL|DB_USERNAME|DB_PASSWORD)\s*=\s*(.*?)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}
const work = path.join(root, 'backend/build/popup-migration-only');
const logging = path.join(root, 'backend/build/popup-migration-logback.xml');
fs.writeFileSync(logging, '<configuration><root level="OFF"/></configuration>');
const args = ['-Xms32m', '-Xmx128m', '-XX:ActiveProcessorCount=2', `-Dlogback.configurationFile=${logging}`, '--class-path', path.join(root, 'backend/build/popup-migration-libs/*'), path.join(root, 'backend/scripts/ApplyPopupPrerequisite.java'), path.join(root, 'backend/src/main/resources/db/migration/V202611131200__community_threads_feelings.sql'), work];
if (process.argv.includes('--apply')) args.push('--apply');
const child = spawn(path.join(env.JAVA_HOME, 'bin/java.exe'), args, { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', chunk => { output += chunk; process.stdout.write(chunk); });
child.stderr.on('data', chunk => process.stderr.write(chunk));
child.on('error', () => { console.error('Unable to start migration inspector.'); process.exitCode = 1; });
child.on('exit', code => {
  if (code === 0) {
    const phases = output.split(/\r?\n/).filter(line => line.startsWith('{')).map(line => JSON.parse(line));
    fs.writeFileSync(path.join(root, 'artifacts/tv5-location-feeling-popups/migration-verification.json'), JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply-user-approved' : 'inspect-only', phases }, null, 2));
  }
  process.exitCode = code ?? 1;
});
