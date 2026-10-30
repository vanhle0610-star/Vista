// No destination, routing or map fixtures. Browser Geolocation is supplied a known test fix.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../admin/node_modules/.cache/tv5-tools/node_modules/playwright/index.mjs';

const base = process.env.VISTA_TEST_URL ?? 'http://localhost:3100';
const output = new URL('../../artifacts/vista-route-planner/live-routing/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'] });
const results = { passed: false, evidence: 'Live web endpoint and live OSRM; no routing/place/map fixture. GPS is a supplied browser test fix, not physical device evidence.', routes: [], errors: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 960 }, permissions: ['geolocation'], geolocation: { latitude: 16.05, longitude: 108.21, accuracy: 20 } });
  const page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', (error) => results.errors.push(error.message));
  await page.goto(base + '/map', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /Lộ trình/ }).click();
  await page.getByRole('combobox', { name: 'Điểm xuất phát', exact: true }).click();
  await page.getByRole('option', { name: 'Vị trí của bạn Dùng vị trí thực của thiết bị', exact: true }).click();
  await page.getByRole('combobox', { name: 'Điểm đến', exact: true }).fill('Cầu Rồng Đà Nẵng');
  await page.getByRole('option', { name: /^Cầu Rồng Đà Nẵng / }).click();
  const first = page.waitForResponse((response) => response.url() === base + '/api/v1/map/routes' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Tìm đường', exact: true }).click();
  const firstResponse = await first; assert.equal(firstResponse.status(), 200);
  const firstRoute = await firstResponse.json(); assert.equal(firstRoute.legs.length, 1); results.routes.push(firstRoute);
  await page.getByRole('region', { name: 'Kết quả lộ trình', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Thêm điểm đến', exact: true }).click();
  await page.getByRole('combobox', { name: 'Điểm đến', exact: true }).fill('Chợ Hàn Đà Nẵng');
  const second = page.waitForResponse((response) => response.url() === base + '/api/v1/map/routes' && response.request().method() === 'POST');
  await page.getByRole('option', { name: /^Chợ Hàn Đà Nẵng / }).click();
  const secondResponse = await second; assert.equal(secondResponse.status(), 200);
  const route = await secondResponse.json(); assert.equal(route.legs.length, 2); assert.ok(route.path.length > 3);
  assert.equal(route.input.waypoints[0].label, 'Cầu Rồng Đà Nẵng'); assert.equal(route.input.destination.label, 'Chợ Hàn Đà Nẵng');
  assert.equal(route.distanceMeters, route.legs.reduce((sum, leg) => sum + leg.distanceMeters, 0));
  assert.equal(route.durationMillis, route.legs.reduce((sum, leg) => sum + leg.durationMillis, 0));
  assert.match(route.attribution, /OSRM/); results.routes.push(route);
  await page.getByRole('region', { name: 'Kết quả lộ trình', exact: true }).waitFor();
  assert.equal(await page.getByRole('alert').filter({ hasText: 'Không lấy được tuyến đường' }).count(), 0);
  await page.screenshot({ path: fileURLToPath(new URL('desktop.png', output)), fullPage: true });
  await page.setViewportSize({ width: 495, height: 820 });
  await page.screenshot({ path: fileURLToPath(new URL('responsive.png', output)), fullPage: true });
  results.mapReady = await page.getByText('Chưa tải được bản đồ', { exact: true }).count() === 0;
  assert.deepEqual(results.errors, []); results.passed = true;
} finally {
  await writeFile(new URL('results.json', output), JSON.stringify(results, null, 2)); await browser.close();
}
console.log(JSON.stringify({ passed: results.passed, mapReady: results.mapReady, routes: results.routes.map((route) => ({ legs: route.legs.length, pathPoints: route.path.length, distanceMeters: route.distanceMeters, durationMillis: route.durationMillis, attribution: route.attribution })) }, null, 2));
