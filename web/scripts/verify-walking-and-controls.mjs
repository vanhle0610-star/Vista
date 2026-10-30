// Live endpoint, real car/pedestrian services and map; no route or place fixtures.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../admin/node_modules/.cache/tv5-tools/node_modules/playwright/index.mjs';
import sharp from 'sharp';

const base = process.env.VISTA_TEST_URL ?? 'http://localhost:3100';
const output = new URL('../../artifacts/vista-route-planner/walking-controls/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'] });
const results = { passed: false, checks: [], routes: [], errors: [], controls: {} };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', (error) => results.errors.push(error.message));
  await page.goto(base + '/map', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /Lộ trình/ }).click();
  const choose = async (label, name) => {
    await page.getByRole('combobox', { name: label, exact: true }).fill(name);
    await page.getByRole('option', { name: new RegExp('^' + name + ' ') }).click();
  };
  const nextRoute = async (action) => {
    const pending = page.waitForResponse((response) => response.url() === base + '/api/v1/map/routes' && response.request().method() === 'POST');
    await action(); const response = await pending;
    assert.equal(response.status(), 200, 'live walking route must succeed');
    const route = await response.json(); assert.equal(route.input.mode, 'WALKING');
    assert.match(route.attribution, /FOSSGIS/); assert.ok(route.path.length > 2);
    assert.equal(route.distanceMeters, route.legs.reduce((sum, leg) => sum + leg.distanceMeters, 0));
    assert.equal(route.durationMillis, route.legs.reduce((sum, leg) => sum + leg.durationMillis, 0));
    await page.getByRole('region', { name: 'Kết quả lộ trình', exact: true }).waitFor();
    let routePixels = 0;
    for (let attempt = 0; attempt < 12 && routePixels < 20; attempt++) {
      const screenshot = await page.locator('.maplibregl-canvas').screenshot();
      const { data, info } = await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      routePixels = 0;
      for (let index = 0; index < data.length; index += info.channels) {
        if (Math.abs(data[index] - 98) < 15 && Math.abs(data[index + 1] - 80) < 15 && Math.abs(data[index + 2] - 238) < 15) routePixels++;
      }
      if (routePixels < 20) await page.waitForTimeout(250);
    }
    assert.ok(routePixels >= 20, 'the real pedestrian route must be painted on the map canvas');
    route.renderedPurplePixels = routePixels;
    results.routes.push(route); return route;
  };
  await choose('Điểm xuất phát', 'Cầu Rồng Đà Nẵng'); await choose('Điểm đến', 'Bà Nà Hills');
  await page.getByRole('button', { name: 'Đi bộ', exact: true }).click();
  await nextRoute(() => page.getByRole('button', { name: 'Tìm đường', exact: true }).click());
  results.checks.push('Exact screenshot case: walking from Cầu Rồng to Bà Nà succeeds with real pedestrian geometry and time');
  await page.screenshot({ path: fileURLToPath(new URL('walking-ba-na.png', output)), fullPage: true });
  const short = await nextRoute(() => choose('Điểm đến', 'Chợ Hàn Đà Nẵng'));
  const carResponse = await context.request.post(base + '/api/v1/map/routes', { data: { ...short.input, mode: 'DRIVING' } });
  assert.equal(carResponse.status(), 200); const car = await carResponse.json();
  assert.ok(short.durationMillis > car.durationMillis * 2, 'pedestrian data must differ from car routing');
  results.carComparison = { durationMillis: car.durationMillis, distanceMeters: car.distanceMeters };
  results.checks.push('Cầu Rồng → Chợ Hàn walking uses a different graph/time than the car service');
  await page.getByRole('button', { name: 'Thêm điểm đến', exact: true }).click();
  const multi = await nextRoute(() => choose('Điểm đến', 'Bà Nà Hills'));
  assert.equal(multi.legs.length, 2); assert.equal(multi.input.waypoints[0].label, 'Chợ Hàn Đà Nẵng');
  results.checks.push('Three walking points retain their selected order and sum both real legs');
  await page.screenshot({ path: fileURLToPath(new URL('walking-multiple.png', output)), fullPage: true });

  await page.getByRole('tab', { name: /Khám phá/ }).click();
  await page.getByRole('textbox', { name: 'Tìm kiếm địa điểm', exact: true }).fill('Cầu Rồng');
  const card = page.getByRole('button', { name: 'Chọn Cầu Rồng Đà Nẵng', exact: true }); await card.click();
  const measure = async (locator) => locator.evaluate((button) => {
    const rect = button.getBoundingClientRect(), svg = button.querySelector('svg')?.getBoundingClientRect(), style = getComputedStyle(button);
    return { width: rect.width, height: rect.height, svgWidth: svg?.width, svgHeight: svg?.height, padding: style.padding, borderStyle: style.borderStyle, background: style.backgroundColor };
  });
  const close = page.getByRole('button', { name: 'Đóng chi tiết', exact: true });
  await close.hover();
  results.controls.popupClose = await measure(close);
  results.controls.filterReset = await measure(page.getByRole('button', { name: 'Đặt lại bộ lọc', exact: true }));
  results.controls.favorite = await measure(card.getByRole('button', { name: 'Yêu thích', exact: true }));
  for (const control of Object.values(results.controls)) {
    assert.ok(Math.abs(control.width - control.height) < 0.5, 'icon buttons must remain round/square instead of stretching into ellipses');
    assert.equal(control.padding, '0px'); assert.ok(control.svgWidth >= 10 && control.svgHeight >= 10, 'SVG cannot collapse to zero width');
  }
  assert.equal(Math.round(results.controls.popupClose.width), 32); assert.equal(results.controls.filterReset.borderStyle, 'solid');
  const heart = card.getByRole('button', { name: 'Yêu thích', exact: true }); await heart.click();
  assert.equal(await heart.getAttribute('title'), 'Bỏ lưu yêu thích');
  await page.screenshot({ path: fileURLToPath(new URL('refined-controls.png', output)), fullPage: true });
  await close.click(); assert.equal(await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Tìm kiếm địa điểm', exact: true }).inputValue(), '');
  await page.getByRole('button', { name: 'Đặt lại bộ lọc', exact: true }).click();
  assert.equal(await page.getByRole('combobox', { name: 'Khoanh vùng theo thành phố', exact: true }).inputValue(), 'all');
  results.checks.push('Popup X, search X, filter reset and favorite icons have fixed dimensions, visible SVGs, accessible labels and working actions');
  await page.getByRole('tab', { name: /Lộ trình/ }).click();
  await nextRoute(() => page.getByRole('button', { name: 'Xóa điểm dừng 1', exact: true }).click());
  results.checks.push('Refined remove X still removes the intended waypoint and recalculates the pedestrian route');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: fileURLToPath(new URL('responsive-390.png', output)), fullPage: true });
  assert.deepEqual(results.errors, []); results.passed = true;
} finally {
  await writeFile(new URL('results.json', output), JSON.stringify(results, null, 2)); await browser.close();
}
console.log(JSON.stringify({ passed: results.passed, checks: results.checks, controls: results.controls, routes: results.routes.map((route) => ({ labels: [route.input.origin.label, ...(route.input.waypoints ?? []).map((point) => point.label), route.input.destination.label], distanceMeters: route.distanceMeters, durationMillis: route.durationMillis, legs: route.legs.length, geometryPoints: route.path.length })) }, null, 2));
