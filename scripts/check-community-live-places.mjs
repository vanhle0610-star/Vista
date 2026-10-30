// Read-only smoke of the actual TV1 controller/service against configured PostgreSQL.
// No migrations, no seeding, no post writes. The DB enforces read-only on every session.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'web/node_modules/.cache/community-popups');
fs.mkdirSync(output, { recursive: true });
const env = { ...process.env };
const config = Object.fromEntries(fs.readFileSync(path.join(root, 'backend/.env'), 'utf8')
  .split(/\r?\n/).filter(line => /^\s*(DB_URL|DB_USERNAME|DB_PASSWORD)\s*=/.test(line))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; }));
Object.assign(env, config, {
  SERVER_PORT: '8085', SPRING_PROFILES_ACTIVE: 'popup-readonly',
  SPRING_FLYWAY_ENABLED: 'false', SPRING_JPA_HIBERNATE_DDL_AUTO: 'none',
  LOGGING_LEVEL_ROOT: 'ERROR',
});
const databaseURL = new URL(env.DB_URL.replace(/^jdbc:/, ''));
databaseURL.searchParams.set('options', [databaseURL.searchParams.get('options'), '-c default_transaction_read_only=on'].filter(Boolean).join(' '));
env.DB_URL = 'jdbc:' + databaseURL;
const log = fs.openSync(path.join(output, 'readonly-backend.log'), 'w');
const executable = path.join(env.JAVA_HOME, 'bin/java.exe');
const server = spawn(executable, ['-Xms64m', '-Xmx256m', '-XX:ActiveProcessorCount=2', '-jar', path.join(root, 'backend/build/libs/vista-backend-0.0.1-SNAPSHOT.jar')], { cwd: root, env, windowsHide: true, stdio: ['ignore', log, log] });
let started = false;
const base = 'http://127.0.0.1:8085/api/v1/destinations';
try {
  let first;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error('Read-only backend stopped; inspect readonly-backend.log.');
    try {
      const response = await fetch('http://127.0.0.1:8085/api/v1/health', { signal: AbortSignal.timeout(3000) });
      if (response.ok) { started = true; break; }
    } catch { /* Startup can take a few seconds. */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(started, 'Actual TV1 endpoint must become available');
  const initial = await fetch(base + '?page=0&size=20', { signal: AbortSignal.timeout(60000) });
  assert.equal(initial.status, 200);
  first = await initial.json();
  assert.ok(first.items.length > 0, 'Expected published destinations in configured database');
  assert.ok(first.items.every(place => place.status === 'PUBLISHED'));
  assert.equal(first.size, 20);
  const keyword = first.items[0].name;
  const search = await fetch(base + '?keyword=' + encodeURIComponent(keyword) + '&page=0&size=20');
  assert.equal(search.status, 200);
  assert.ok((await search.json()).items.some(place => place.id === first.items[0].id));
  const next = await fetch(base + '?page=1&size=20');
  assert.equal(next.status, 200);
  assert.equal((await next.json()).page, 1);
  const feed = await fetch('http://127.0.0.1:8085/api/v1/posts?page=0&size=1');
  const posts = await feed.json();
  const evidence = { source: 'Actual TV1 HTTP controller/service + configured PostgreSQL, read-only sessions, migrations/seeder disabled', total: first.total, received: first.items.length, pageSize: first.size, publicOnly: true, searchByReturnedName: true, secondPage: true, communityFeedStatus: feed.status, communityFeedReadable: feed.ok, feelingFieldPresent: feed.ok ? !posts.items.length || Object.hasOwn(posts.items[0], 'feeling') : false };
  fs.writeFileSync(path.join(output, 'live-api-verification.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
  if (process.argv.includes('--screenshots')) {
    const { chromium } = await import('../admin/node_modules/.cache/tv5-tools/node_modules/playwright/index.mjs');
    const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      await context.addInitScript(() => {
        localStorage.setItem('vista_token', 'isolated-screenshot-account');
        localStorage.setItem('vista_user', JSON.stringify({ id: 'screenshot-user', displayName: 'Người dùng VISTA' }));
      });
      await context.route('**/api/v1/**', async route => {
        const url = new URL(route.request().url());
        const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3000', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' };
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers });
        if (url.pathname === '/api/v1/destinations') {
          const response = await fetch(base + url.search);
          return route.fulfill({ status: response.status, json: await response.json(), headers });
        }
        if (url.pathname === '/api/v1/users/me') return route.fulfill({ json: { id: 'screenshot-user', displayName: 'Người dùng VISTA', avatarUrl: null }, headers });
        return route.fulfill({ json: { items: [], page: 0, size: 20, total: 0 }, headers });
      });
      await page.goto('http://127.0.0.1:3000/community', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Gắn địa điểm', exact: true }).click();
      const picker = page.getByRole('dialog', { name: 'Gắn địa điểm', exact: true });
      await picker.getByRole('button', { name: new RegExp(first.items[0].name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).waitFor();
      await page.screenshot({ path: path.join(output, 'web-live-places.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(output, 'web-small-live-places.png') });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Cảm xúc', exact: true }).click();
      await page.screenshot({ path: path.join(output, 'web-small-live-feelings.png') });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: path.join(output, 'web-live-feelings.png') });
      console.log('Screenshots: actual TV1 places; surrounding account/feed isolated. Web viewports only.');
    } finally { await browser.close(); }
  }
  assert.equal(feed.status, 200, 'Community feed requires the existing threads/feelings migration on the configured schema');
} finally { server.kill(); fs.closeSync(log); }
