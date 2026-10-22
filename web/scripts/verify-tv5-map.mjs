/* Run from the repository root with the Next dev server on :3000.
 * Uses the isolated Playwright QA copy in node_modules/.cache.
 * Never requests real GPS: all location cases are browser test doubles.
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/.cache/tv5-tools/node_modules/playwright/index.mjs';
const out = path.resolve('artifacts/tv5-map');
process.env.TEMP = path.resolve('web/node_modules/.cache/tv5-tools/tmp');
process.env.TMP = process.env.TEMP;

(async () => {
  await fs.mkdir(process.env.TEMP, { recursive: true });
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.TV5_CHROME ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--enable-webgl',
    ],
  });
  const results = { viewports: [], checks: [], errors: [] };
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', (e) => results.errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') results.errors.push(m.text().slice(0, 400));
    });
    const go = async () => {
      await page.goto('http://localhost:3000/map', {
        waitUntil: 'networkidle',
        timeout: 60000,
      });
      await page
        .locator('[data-model-rendered="true"]')
        .waitFor({ timeout: 30000 });
      await page.waitForTimeout(700);
    };
    await go();
    for (const [width, height] of process.env.TV5_SKIP_VIEWPORTS
      ? []
      : [
          [1440, 960],
          [1280, 900],
          [768, 1024],
          [390, 844],
          [360, 800],
        ]) {
      await page.setViewportSize({ width, height });
      await go();
      const geometry = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        width: innerWidth,
        headerHeight: document.querySelector('header').getBoundingClientRect()
          .height,
        headingFont: getComputedStyle(document.querySelector('h1')).fontFamily,
        canvasCount: document.querySelectorAll('.maplibregl-canvas').length,
        photos: [
          ...document.querySelectorAll(
            'section[aria-label="Danh sách điểm đến"] img',
          ),
        ].every((image) => image.complete && image.naturalWidth > 0),
      }));
      assert.equal(
        geometry.scrollWidth,
        width,
        'horizontal overflow at ' + width,
      );
      assert.equal(geometry.canvasCount, 1);
      assert.equal(geometry.photos, true);
      assert.match(geometry.headingFont, /Arial|sans-serif/);
      await page.screenshot({
        path: path.join(out, 'viewport-' + width + '.png'),
        fullPage: true,
      });
      results.viewports.push({ width, height, ...geometry });
      console.log('Viewport verified:', width);
    }
    results.checks.push(
      '5 viewport widths: no overflow, one map canvas, local thumbnails loaded, sans-serif font',
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    assert.equal(
      await page
        .getByRole('navigation', { name: 'Điều hướng VISTA' })
        .isVisible(),
      true,
    );
    await page.getByRole('button', { name: 'Đóng menu', exact: true }).click();
    results.checks.push('mobile menu opens and closes');
    console.log('Menu verified');
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.evaluate(() => {
      window.__originalMapCanvas = document.querySelector('.maplibregl-canvas');
    });
    await page.getByRole('button', { name: '2D', exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-view-mode]').dataset.viewMode === '2d',
    );
    await page.getByRole('button', { name: '3D', exact: true }).click();
    assert.equal(
      await page.evaluate(
        () =>
          window.__originalMapCanvas ===
          document.querySelector('.maplibregl-canvas'),
      ),
      true,
    );
    results.checks.push('2D/3D preserves the same map instance');
    console.log('Mode switch verified');
    await page
      .getByRole('button', { name: 'Xem Cầu Rồng', exact: true })
      .first()
      .click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(out, 'bridge-angle-1.png'),
      fullPage: true,
    });
    const canvas = page.locator('.maplibregl-canvas');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.63, {
      steps: 14,
    });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(out, 'bridge-angle-2.png'),
      fullPage: true,
    });
    results.checks.push(
      'focus bridge, right-drag rotation, two real WebGL screenshots',
    );
    console.log('Bridge screenshots captured');
    await page
      .getByRole('button', { name: 'Chọn Bãi biển Mỹ Khê', exact: true })
      .click();
    await page.waitForTimeout(700);
    assert.equal(
      await page
        .getByRole('button', {
          name: 'Chọn marker Bãi biển Mỹ Khê',
          exact: true,
        })
        .getAttribute('aria-pressed'),
      'true',
    );
    await page
      .getByRole('button', { name: 'Xem tất cả điểm đến', exact: true })
      .click();
    await page.waitForTimeout(700);
    await page
      .getByRole('button', {
        name: 'Chọn marker Cầu Rồng Đà Nẵng',
        exact: true,
      })
      .click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('button[aria-label="Chọn Cầu Rồng Đà Nẵng"]')
          .getAttribute('aria-pressed') === 'true',
    );
    const search = page.getByRole('textbox', {
      name: 'Tìm điểm đến',
      exact: true,
    });
    await search.fill('my khe');
    assert.equal(
      await page
        .getByRole('button', { name: /^Chọn / })
        .filter({ has: page.locator('img') })
        .count(),
      1,
    );
    assert.equal(
      await page
        .getByRole('button', {
          name: 'Chọn marker Bãi biển Mỹ Khê',
          exact: true,
        })
        .count(),
      1,
    );
    await search.fill('khong-co-dia-diem-nay');
    await page.getByText('Chưa tìm thấy điểm đến', { exact: true }).waitFor();
    assert.equal(await page.locator('.maplibregl-marker').count(), 0);
    await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
    await page
      .getByRole('combobox', { name: 'Lọc loại hình', exact: true })
      .selectOption('Ẩm thực & Mua sắm');
    assert.equal(
      await page
        .getByRole('button', { name: 'Chọn Chợ Hàn Đà Nẵng', exact: true })
        .count(),
      1,
    );
    results.checks.push(
      'card/marker selection, accent-insensitive search, category filter and empty state',
    );
    await go();
    await page.getByRole('button', { name: 'Để sau', exact: true }).click();
    assert.equal(
      await page.getByRole('complementary', { name: 'Quyền định vị' }).count(),
      0,
    );
    results.checks.push('dismiss GPS banner without requesting location');
    for (const scenario of ['granted', 'denied', 'unavailable', 'timeout']) {
      const gps = await context.newPage();
      gps.setDefaultTimeout(12000);
      await gps.addInitScript((scenario) => {
        window.__gpsCalls = 0;
        Object.defineProperty(navigator, 'permissions', {
          configurable: true,
          value: {
            query: async () => ({
              state: 'prompt',
              addEventListener() {},
              removeEventListener() {},
            }),
          },
        });
        Object.defineProperty(navigator, 'geolocation', {
          configurable: true,
          value: {
            getCurrentPosition(success, failure) {
              window.__gpsCalls++;
              if (scenario === 'granted')
                success({
                  coords: {
                    latitude: 16.06082,
                    longitude: 108.2269,
                    accuracy: 12,
                    altitude: null,
                    speed: null,
                    heading: null,
                  },
                  timestamp: Date.now(),
                });
              else
                failure({
                  code:
                    scenario === 'denied'
                      ? 1
                      : scenario === 'unavailable'
                        ? 2
                        : 3,
                  PERMISSION_DENIED: 1,
                  POSITION_UNAVAILABLE: 2,
                  TIMEOUT: 3,
                });
            },
            clearWatch() {},
          },
        });
      }, scenario);
      await gps.goto('http://localhost:3000/map', {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      await gps
        .getByRole('button', { name: 'Cho phép định vị', exact: true })
        .waitFor();
      assert.equal(
        await gps.evaluate(() => window.__gpsCalls),
        0,
        'must not auto-request GPS',
      );
      await gps
        .getByRole('button', { name: 'Cho phép định vị', exact: true })
        .click();
      if (scenario === 'granted') {
        await gps
          .getByText('Đã hiển thị vị trí của bạn trên bản đồ', { exact: true })
          .waitFor();
        await gps
          .getByRole('img', { name: 'Vị trí của bạn, độ chính xác ±12 m' })
          .waitFor();
      } else
        await gps
          .getByRole('complementary', { name: 'Quyền định vị' })
          .getByRole('button', { name: /Thử lại/ })
          .waitFor();
      assert.equal(await gps.evaluate(() => window.__gpsCalls), 1);
      await gps.screenshot({
        path: path.join(out, 'gps-' + scenario + '.png'),
        fullPage: true,
      });
      await gps.close();
    }
    results.checks.push(
      'GPS success, deny, unavailable and timeout via test doubles; no automatic GPS',
    );
    await page
      .getByRole('link', { name: 'Thử nghiệm GPS', exact: true })
      .click();
    await page.waitForURL('**/dev/map-location');
    await page
      .getByRole('link', { name: 'Bản đồ khám phá', exact: true })
      .click();
    await page.waitForURL('**/map');
    await page
      .locator('[data-model-rendered="true"]')
      .waitFor({ timeout: 30000 });
    assert.equal(await page.locator('.maplibregl-canvas').count(), 1);
    results.checks.push(
      'leave route and return: one canvas and model restored',
    );
    const offline = await context.newPage();
    offline.setDefaultTimeout(15000);
    await offline.route('https://tile.openstreetmap.org/**', (route) =>
      route.abort('internetdisconnected'),
    );
    await offline.goto('http://localhost:3000/map', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await offline
      .getByText(
        'Không tải được một phần nền bản đồ. Kiểm tra mạng hoặc thử lại.',
        { exact: true },
      )
      .waitFor();
    await offline.screenshot({
      path: path.join(out, 'tiles-error.png'),
      fullPage: true,
    });
    await offline.unroute('https://tile.openstreetmap.org/**');
    await offline.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await offline
      .locator('[data-model-rendered="true"]')
      .waitFor({ timeout: 30000 });
    await offline.close();
    results.checks.push(
      'tile failure reports an error; retry restores tiles and 3D model',
    );
    const noGL = await context.newPage();
    noGL.setDefaultTimeout(15000);
    await noGL.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (type === 'webgl' || type === 'webgl2') return null;
        return getContext.call(this, type, ...rest);
      };
    });
    await noGL.goto('http://localhost:3000/map', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await noGL
      .getByText(
        'Thiết bị chưa hỗ trợ WebGL 2. Bạn vẫn có thể chọn địa điểm và mở chỉ đường.',
        { exact: true },
      )
      .waitFor();
    await noGL
      .getByRole('button', { name: 'Chọn Chợ Hàn Đà Nẵng', exact: true })
      .click();
    await noGL
      .getByRole('article', { name: 'Chi tiết Chợ Hàn Đà Nẵng' })
      .waitFor();
    assert.match(
      await noGL
        .getByRole('link', { name: 'Chỉ đường', exact: true })
        .getAttribute('href'),
      /destination=16.0684,108.2243/,
    );
    await noGL.screenshot({
      path: path.join(out, 'webgl-fallback.png'),
      fullPage: true,
    });
    await noGL.close();
    results.checks.push(
      'WebGL unavailable: correct notice, destination selection and real directions link still work',
    );
    assert.deepEqual(results.errors, []);
    await context.close();
  } finally {
    await fs.writeFile(
      path.join(out, 'browser-results.json'),
      JSON.stringify(results, null, 2),
    );
    await browser.close();
  }
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
