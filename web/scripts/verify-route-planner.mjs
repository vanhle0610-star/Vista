// Browser acceptance tests. Destinations/routing and device fixes are controlled test data.
// This verifies the real page/MapLibre renderer; it does not prove physical GPS or live ORS.
import { chromium } from '../../admin/node_modules/.cache/tv5-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.VISTA_TEST_URL ?? 'http://localhost:3100';
const output = new URL('../../artifacts/vista-route-planner/', import.meta.url);
await mkdir(output, { recursive: true });
const checks = [], errors = [], requests = [];
const places = [
  { id: 'accept-origin', name: 'Kiểm thử xuất phát', latitude: 16.061, longitude: 108.207 },
  { id: 'accept-destination', name: 'Kiểm thử đích', latitude: 16.041, longitude: 108.237 },
  { id: 'accept-stop', name: 'Kiểm thử ghé thăm', latitude: 16.051, longitude: 108.217 },
  { id: 'accept-end', name: 'Kiểm thử đích mới có tên rất dài để kiểm tra tên địa điểm không làm lệch hàng', latitude: 16.031, longitude: 108.247 },
].map((place) => ({ ...place, province: 'Đà Nẵng', category: 'Cảnh quan', status: 'PUBLISHED', description: '' }));
const fixtureStyle = process.env.VISTA_TEST_STYLE_FIXTURE === '1';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'] });
let passed = false;
async function setup(context) {
  await context.addInitScript(() => localStorage.setItem('vista-map-location-opt-in', 'false'));
  await context.route('**/destinations?*', (route) => route.fulfill({ json: { items: places, total: places.length } }));
  if (fixtureStyle) await context.route('https://tiles.openfreemap.org/styles/liberty', (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e7edf1' } }] } }));
  await context.route('**/map/routes', async (route) => {
    const input = route.request().postDataJSON(); requests.push(input);
    const points = [input.origin, ...(input.waypoints ?? []), input.destination];
    const legs = points.slice(1).map((point, index) => ({ fromLabel: points[index].label, toLabel: point.label, distanceMeters: 1000 * (index + 1), durationMillis: 60000 * (index + 1) }));
    await route.fulfill({ json: { input, path: points.flatMap((point, index) => index ? [{ lat: points[index - 1].latitude, lng: point.longitude }, { lat: point.latitude, lng: point.longitude }] : [{ lat: point.latitude, lng: point.longitude }]), distanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0), durationMillis: legs.reduce((sum, leg) => sum + leg.durationMillis, 0), legs, warnings: ['Dữ liệu chỉ đường kiểm thử'], attribution: 'Controlled routing fixture' } });
  });
}
async function open(context, size) {
  const page = await context.newPage(); if (size) await page.setViewportSize(size);
  page.on('pageerror', (error) => errors.push(error.message)); page.setDefaultTimeout(30000);
  await page.goto(base + '/map', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /Lộ trình/ }).click();
  await page.locator('.maplibregl-canvas').waitFor();
  await page.getByText('Đang tải bản đồ…', { exact: true }).waitFor({ state: 'hidden' });
  assert.equal(await page.getByText('Chưa tải được bản đồ', { exact: true }).count(), 0, 'Map style must load; use VISTA_TEST_STYLE_FIXTURE=1 for isolated renderer tests');
  return page;
}
async function choose(page, label, name) {
  await page.getByRole('combobox', { name: label, exact: true }).fill(name);
  await page.getByRole('option', { name: name + ' Đà Nẵng · Cảnh quan', exact: true }).click();
}
async function assertRequest(page, expected) {
  await page.getByRole('region', { name: 'Kết quả lộ trình', exact: true }).waitFor();
  const input = requests.at(-1);
  assert.deepEqual([input.origin.label, ...(input.waypoints ?? []).map((point) => point.label), input.destination.label], expected);
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, geolocation: { latitude: 16.071, longitude: 108.201, accuracy: 18 }, permissions: ['geolocation'] });
  await setup(context);
  const page = await open(context);
  await choose(page, 'Điểm xuất phát', places[0].name); await choose(page, 'Điểm đến', places[1].name);
  await page.getByRole('button', { name: 'Tìm đường', exact: true }).click();
  await assertRequest(page, [places[0].name, places[1].name]);
  assert.equal(await page.locator('.maplibregl-marker[data-role="origin"]').count(), 1);
  assert.equal(await page.locator('.maplibregl-marker[data-role="destination"]').count(), 1);
  await page.locator('.maplibregl-marker[data-role="destination"]').click();
  await page.locator('.maplibregl-popup-content').filter({ hasText: 'Điểm đến: ' + places[1].name }).waitFor();
  await page.getByRole('button', { name: 'Close popup', exact: true }).click();
  checks.push('Two points: circle origin, red destination pin; request contains both selected coordinates');
  const before = await page.locator('input[role="combobox"]').evaluateAll((elements) => elements.map((element) => element.value)); const countBeforeGps = requests.length;
  await page.getByRole('button', { name: 'Hiển thị vị trí của bạn', exact: true }).click();
  await page.locator('.maplibregl-marker[aria-label="Vị trí của bạn"]').waitFor();
  assert.deepEqual(await page.locator('input[role="combobox"]').evaluateAll((elements) => elements.map((element) => element.value)), before);
  assert.equal(requests.length, countBeforeGps); assert.equal(await page.getByRole('region', { name: 'Kết quả lộ trình', exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Hiển thị vị trí của bạn', exact: true }).hover();
  await page.getByText('Hiển thị vị trí của bạn', { exact: true }).waitFor({ state: 'visible' });
  checks.push('Granted browser Geolocation recenters to supplied device fix, renders blue dot and preserves route/manual origin');
  await page.getByRole('button', { name: 'Thêm điểm đến', exact: true }).click();
  assert.equal(await page.getByRole('combobox', { name: 'Điểm đến', exact: true }).evaluate((element) => element === document.activeElement), true);
  assert.match(await page.getByRole('combobox', { name: 'Điểm dừng 1', exact: true }).inputValue(), /Kiểm thử đích/);
  await choose(page, 'Điểm đến', places[2].name);
  await assertRequest(page, [places[0].name, places[1].name, places[2].name]);
  assert.equal(await page.locator('.maplibregl-marker[data-role="waypoint"]').count(), 1);
  assert.equal(await page.locator('.maplibregl-marker[data-role="destination"]').count(), 1);
  assert.equal(await page.locator('[data-stop-id] input').count(), 3);
  assert.equal(await page.locator('.maplibregl-marker[data-role]').filter({ hasText: /^[A-Z]$/ }).count(), 0);
  checks.push('Append destination focuses new row and promotes old destination to waypoint; markers contain no letter badges');
  const stopId = await page.locator('[data-role="waypoint"]').filter({ has: page.locator('input') }).getAttribute('data-stop-id');
  await page.getByRole('button', { name: 'Di chuyển điểm dừng 1 xuống', exact: true }).click();
  await assertRequest(page, [places[0].name, places[2].name, places[1].name]);
  assert.equal(await page.getByRole('combobox', { name: 'Điểm đến', exact: true }).getAttribute('id'), stopId);
  checks.push('Reorder preserves row ID and values while updating roles, markers and request order');
  await page.getByRole('button', { name: 'Xóa điểm dừng 1', exact: true }).click();
  await assertRequest(page, [places[0].name, places[1].name]);
  assert.equal(await page.locator('input[role="combobox"]').count(), 2);
  checks.push('Deleting a waypoint preserves origin/destination and recalculates without resetting the list');
  await page.getByRole('button', { name: 'Thêm điểm đến', exact: true }).click(); await choose(page, 'Điểm đến', places[3].name);
  await assertRequest(page, [places[0].name, places[1].name, places[3].name]);
  assert.match(await page.getByRole('combobox', { name: 'Điểm đến', exact: true }).getAttribute('title'), /rất dài/);
  await page.screenshot({ path: new URL('desktop.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  for (const size of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
    await page.setViewportSize(size);
    const location = await page.getByRole('button', { name: 'Hiển thị vị trí của bạn', exact: true }).boundingBox();
    const sidebar = await page.getByRole('complementary', { name: 'Bảng điều khiển du lịch' }).boundingBox();
    assert.ok(location.width >= 44 && location.height >= 44 && location.y + location.height < sidebar.y, 'Location button must remain above sheet');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.getByRole('combobox', { name: 'Điểm đến', exact: true }).click();
    const option = page.getByRole('listbox').getByRole('option', { selected: true }); await option.waitFor();
    await page.screenshot({ path: new URL('dropdown-' + size.width + '.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
    const hit = await option.evaluate((element) => { const rect = element.getBoundingClientRect(); const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2); return { visible: element.contains(hit), rect: rect.toJSON(), hit: hit?.outerHTML.slice(0, 400) }; });
    assert.equal(hit.visible, true, 'Dropdown must be above the sidebar and map: ' + JSON.stringify(hit));
    await page.keyboard.press('Escape');
    await page.screenshot({ path: new URL('responsive-' + size.width + '.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  }
  checks.push('390px/360px responsive: no horizontal overflow, GPS target at least 44px outside sheet, portal options clickable');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('combobox', { name: 'Điểm xuất phát', exact: true }).click();
  await page.getByRole('option', { name: 'Vị trí của bạn Dùng vị trí thực của thiết bị', exact: true }).click();
  await page.getByRole('button', { name: /Tìm đường/ }).click();
  await page.getByRole('region', { name: 'Kết quả lộ trình', exact: true }).waitFor();
  assert.equal(requests.at(-1).fromGps, true); assert.equal(requests.at(-1).origin.latitude, 16.071); assert.equal(requests.at(-1).origin.longitude, 108.201);
  checks.push('Use GPS as origin: request uses exact device latitude/longitude without changing other places');
  await page.getByRole('tab', { name: /Khám phá/ }).click();
  await page.getByRole('textbox', { name: 'Tìm kiếm địa điểm', exact: true }).fill(places[2].name);
  await page.locator('[data-destination-id="' + places[2].id + '"]').getByRole('button', { name: '+ Thêm điểm dừng', exact: true }).click();
  await page.getByRole('tab', { name: /Lộ trình/ }).click();
  await assertRequest(page, ['Vị trí của bạn', places[1].name, places[2].name, places[3].name]);
  checks.push('Card action inserts the selected waypoint immediately before the existing destination');
  const handle = page.getByRole('button', { name: /Kéo điểm dừng 2/ });
  await handle.focus(); await page.keyboard.press('Alt+ArrowUp');
  await assertRequest(page, ['Vị trí của bạn', places[2].name, places[1].name, places[3].name]);
  checks.push('Keyboard reordering via Alt+ArrowUp updates the same stable rows and route order');
  await page.getByRole('button', { name: 'Thêm điểm đến', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Thêm điểm đến', exact: true }).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('input[role="combobox"]').count(), 6);
  await page.getByRole('button', { name: 'Thêm điểm đến', exact: true }).click({ force: true });
  assert.equal(await page.locator('input[role="combobox"]').count(), 6);
  await page.getByRole('status').filter({ hasText: 'Hãy xóa một điểm trước khi thêm' }).waitFor();
  checks.push('Six-point limit is visible and prevents adding a seventh row without silently dropping any selected point');
  await context.close();

  for (const scenario of ['denied', 'timeout', 'unavailable', 'prompt']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await setup(ctx);
    if (scenario === 'denied') {
      const cdpPage = await ctx.newPage(); const cdp = await ctx.newCDPSession(cdpPage);
      await cdp.send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: base }); await cdpPage.close();
    } else {
      await ctx.addInitScript((scenario) => {
        window.gpsCalls = 0;
        Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition(success, error) {
          window.gpsCalls++;
          setTimeout(() => scenario === 'prompt' ? success({ coords: { latitude: 16.071, longitude: 108.201, accuracy: 25 }, timestamp: Date.now() }) : error({ code: scenario === 'timeout' ? 3 : 2 }), 250);
        } } });
      }, scenario);
    }
    const p = await open(ctx);
    const button = p.getByRole('button', { name: 'Hiển thị vị trí của bạn', exact: true });
    await button.click();
    if (scenario === 'prompt') {
      await p.locator('.maplibregl-marker[aria-label="Vị trí của bạn"]').waitFor(); assert.equal(await p.evaluate(() => window.gpsCalls), 1);
    } else {
      await p.getByRole('alert').filter({ hasText: scenario === 'denied' ? 'bị chặn' : scenario === 'timeout' ? 'quá lâu' : 'Chưa xác định được vị trí' }).first().waitFor();
      assert.equal(await p.locator('.maplibregl-marker[aria-label="Vị trí của bạn"]').count(), 0);
    }
    checks.push('GPS ' + scenario + ': ' + (scenario === 'prompt' ? 'explicit action calls platform API; supplied fix rendered (permission dialog itself not verified)' : 'clear error, no fabricated user marker'));
    await ctx.close();
  }
  assert.deepEqual(errors, []); passed = true;
} finally {
  await writeFile(new URL('results.json', output), JSON.stringify({ passed, fixtureStyle, evidence: 'Real page and MapLibre; destination/directions API controlled; GPS supplied by browser test context or mocked callback. No physical device or live ORS claim.', checks, errors, requests }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ passed, fixtureStyle, checks, errors }, null, 2));
