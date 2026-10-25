// Run against the actual web/API. The second context deliberately blocks map tiles
// to verify the failure boundary; it is not evidence of full offline support.
import { chromium } from '../../admin/node_modules/.cache/tv5-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = process.env.TV5_WEB_URL ?? 'http://localhost:3000';
const api = process.env.TV5_API_URL ?? 'http://localhost:8080/api/v1';
const output = new URL('../../artifacts/tv5-week3/', import.meta.url);
await mkdir(output, { recursive: true });
const checks = [];
const errors = [];
let succeeded = false;
const browser = await chromium.launch({
  executablePath: process.env.TV5_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'],
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', (error) => errors.push(error.message));
  for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
    const response = await context.request.get(`${base}/map-assets/${file}`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], /javascript/);
  }
  checks.push('MapLibre worker and its shared module are served as JavaScript');
  for (const path of ['/', '/login', '/map']) {
    const response = await context.request.get(base + path);
    assert.equal(response.status(), 200);
    if (path !== '/map') {
      const reference = await context.newPage();
      await reference.goto(base + path, { waitUntil: 'domcontentloaded' });
      await reference.close();
    }
  }
  await page.goto(base + '/map', { waitUntil: 'domcontentloaded' });
  await page.locator('.maplibregl-canvas').waitFor();
  await page.getByText('Đang tải bản đồ…', { exact: true }).waitFor({ state: 'hidden' });
  assert.equal(await page.getByText('Chưa tải được bản đồ', { exact: true }).count(), 0);
  assert.match(await page.locator('.maplibregl-ctrl-attrib').innerText(), /OpenStreetMap/);
  checks.push('Home, login and actual OpenFreeMap street map render');
  const response = await fetch(`${api}/destinations?size=20`, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200, 'Real destination API must be running');
  const data = await response.json();
  const destination = data.items.find((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  assert.ok(destination, 'API must contain a destination with valid coordinates');
  await page.getByRole('button', { name: `Chọn ${destination.name}`, exact: true }).click();
  await page.getByRole('button', { name: destination.name, exact: true }).last().click();
  assert.ok(await page.getByRole('heading', { name: destination.name, exact: true }).count());
  checks.push('Actual destination card and marker select each other');
  await page.screenshot({ path: fileURLToPath(new URL('web-map-current.png', output)), fullPage: true });
  const deferred = await browser.newContext();
  await deferred.addInitScript(() => localStorage.setItem('vista-map-location-opt-in', 'false'));
  const deferredPage = await deferred.newPage();
  const permissions = await deferred.newCDPSession(deferredPage);
  await permissions.send('Browser.setPermission', {
    permission: { name: 'geolocation' }, setting: 'denied', origin: base,
  });
  await deferredPage.goto(`${base}/map`, { waitUntil: 'domcontentloaded' });
  await deferredPage.getByRole('button', { name: /Vị trí của tôi/ }).waitFor();
  await deferredPage.locator('.maplibregl-canvas').waitFor();
  await deferredPage.waitForFunction(() => document.readyState === 'complete');
  assert.equal(await deferredPage.getByText('Quyền vị trí đang bị chặn', { exact: true }).count(), 0);
  await deferredPage.getByRole('button', { name: /Vị trí của tôi/ }).click();
  await deferredPage.getByText('Quyền vị trí đang bị chặn', { exact: true }).waitFor();
  checks.push('Saved defer stays quiet with denied browser permission until an explicit location action');
  await deferred.close();
  const failed = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await failed.route('https://tiles.openfreemap.org/**', (route) => route.abort());
  const fallback = await failed.newPage();
  fallback.setDefaultTimeout(60000);
  await fallback.goto(`${base}/map?destinationId=${destination.id}`, { waitUntil: 'domcontentloaded' });
  await fallback.getByText('Chưa tải được bản đồ', { exact: true }).waitFor();
  await fallback.getByRole('heading', { name: destination.name, exact: true }).waitFor();
  assert.ok(await fallback.getByRole('button', { name: 'Thử lại bản đồ', exact: true }).count());
  await fallback.screenshot({ path: fileURLToPath(new URL('web-map-fallback-current.png', output)), fullPage: true });
  const overflow = await fallback.evaluate(() => Array.from(document.querySelectorAll('body *'))
    .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
    .slice(0, 12).map((element) => `${element.tagName}.${element.className}`));
  assert.deepEqual(overflow, [], 'Elements overflow the mobile viewport');
  assert.ok(await fallback.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  checks.push('Blocked map style preserves actual destination information and retry at 390px');
  assert.deepEqual(errors, []);
  succeeded = true;
} finally {
  await writeFile(new URL('map-browser-current.json', output), JSON.stringify({ status: succeeded ? 'passed' : 'failed', date: new Date().toISOString(), checks, errors }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ checks, errors }, null, 2));
