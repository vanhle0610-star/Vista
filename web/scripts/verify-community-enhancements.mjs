// Browser UI validation against isolated HTTP fixtures. PostgreSQL persistence is tested separately.
import { chromium } from '../../admin/node_modules/.cache/tv5-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.TV5_WEB_URL ?? 'http://localhost:3000';
const output = new URL('../node_modules/.cache/community-enhancements/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const shotPath = name => new URL(name, output).pathname.replace(/^\/([A-Z]:)/, '$1');
const pid = '11111111-1111-4111-8111-111111111111';
const aid = '22222222-2222-4222-8222-222222222222';
const bid = '33333333-3333-4333-8333-333333333333';
const profiles = { [aid]: { id: aid, displayName: 'Tài khoản A', avatarUrl: null }, [bid]: { id: bid, displayName: 'Tài khoản B', avatarUrl: null } };
const place1 = { id: '44444444-4444-4444-8444-444444444441', name: 'Bảo tàng GPS gần', province: 'Đà Nẵng', latitude: 16.061, longitude: 108.221 };
const places = [
  { id: '44444444-4444-4444-8444-444444444442', name: 'Bãi biển GPS xa', province: 'Đà Nẵng', latitude: 16.09, longitude: 108.26 },
  place1,
  { id: '44444444-4444-4444-8444-444444444443', name: 'Phố cổ Hội An', province: 'Quảng Nam', latitude: 15.88, longitude: 108.327 },
];
const stamp = '2026-10-29T00:00:00Z';
let comments = Array.from({ length: 12 }, (_, n) => ({ id: `root-${n}`, postId: pid, body: `Root ${n}`, version: 0, createdAt: stamp, updatedAt: stamp, authorId: n === 0 ? bid : aid, rootId: null, replyToId: null, deleted: false }));
comments.push(...Array.from({ length: 12 }, (_, n) => ({ id: `reply-${n}`, postId: pid, body: `Earlier reply ${n}`, version: 0, createdAt: stamp, updatedAt: stamp, authorId: bid, rootId: 'root-0', replyToId: 'root-0', deleted: false })));
let posts = [{ id: pid, body: 'Bài kiểm thử cộng đồng', version: 0, createdAt: stamp, updatedAt: stamp, authorId: aid, media: [], feeling: null, destinationId: null }];
const requests = new Map();
const checks = [], errors = [], apiCalls = [];
let timeoutAfterSave = false;
const activeCount = () => comments.filter(c => !c.deleted).length;
const commentView = c => ({ ...c, body: c.deleted ? 'Bình luận đã bị xóa' : c.body, author: profiles[c.authorId], replyToAuthor: c.replyToId ? profiles[comments.find(t => t.id === c.replyToId)?.authorId] : null, replyCount: comments.filter(r => r.rootId === c.id && !r.deleted).length });
const postView = p => ({ ...p, author: profiles[p.authorId], feeling: p.feeling, commentCount: p.id === pid ? activeCount() : 0, destination: places.find(d => d.id === p.destinationId) ?? null });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage(); page.setDefaultTimeout(30000);
page.on('pageerror', error => errors.push(error.message));
await context.addInitScript(({ aid, profile }) => {
  localStorage.setItem('vista_token', aid); localStorage.setItem('vista_user', JSON.stringify(profile));
  window.__gpsMode = 'granted';
  navigator.geolocation.getCurrentPosition = (success, failure) => {
    if (window.__gpsMode === 'denied') failure({ code: 1 });
    else if (window.__gpsMode === 'timeout') failure({ code: 3 });
    else if (window.__gpsMode === 'off') failure({ code: 2 });
    else success({ coords: { latitude: window.__gpsMode === 'empty' ? 0 : 16.06, longitude: window.__gpsMode === 'empty' ? 0 : 108.22, accuracy: window.__gpsMode === 'coarse' ? 2500 : 20 }, timestamp: Date.now() });
  };
}, { aid, profile: profiles[aid] });
await context.route('**/api/v1/**', async route => {
  const req = route.request(), url = new URL(req.url()), method = req.method();
  apiCalls.push({ path: url.pathname, search: url.search, method });
  const reply = async (status, body) => {
    try { await route.fulfill({ status, json: body, headers: { 'Access-Control-Allow-Origin': new URL(origin).origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS' } }); } catch { /* The picker may intentionally abort an old request. */ }
  };
  if (method === 'OPTIONS') return reply(200, {});
  if (url.pathname === '/api/v1/users/me') return reply(200, profiles[aid]);
  if (url.pathname === '/api/v1/destinations') {
    const keyword = url.searchParams.get('keyword') ?? '';
    if (keyword === 'old') await new Promise(resolve => setTimeout(resolve, 700));
    const items = places.filter(place => place.name.toLowerCase().includes(keyword.toLowerCase()));
    return reply(200, { items, total: items.length, page: 0, size: 100 });
  }
  if (url.pathname.endsWith('/like')) return reply(200, { postId: pid, liked: false, likeCount: 0 });
  if (url.pathname === '/api/v1/posts') {
    if (method === 'POST') {
      const payload = req.postDataJSON();
      const p = { ...posts[0], ...payload, id: '55555555-5555-4555-8555-555555555555', authorId: aid };
      posts.unshift(p); return reply(201, postView(p));
    }
    return reply(200, { items: posts.map(postView), total: posts.length, page: 0, size: 10 });
  }
  if (url.pathname === `/api/v1/posts/${pid}`) return reply(200, postView(posts.find(p => p.id === pid)));
  if (url.pathname === `/api/v1/posts/${pid}/comments`) {
    if (method === 'POST') {
      const data = req.postDataJSON();
      if (requests.has(data.clientRequestId)) return reply(200, commentView(requests.get(data.clientRequestId)));
      const target = comments.find(c => c.id === data.replyToId);
      const c = { id: `created-${comments.length}`, postId: pid, body: data.body, version: 0, authorId: aid, createdAt: stamp, updatedAt: stamp, rootId: target ? target.rootId || target.id : null, replyToId: target?.id ?? null, deleted: false };
      comments.push(c); requests.set(data.clientRequestId, c);
      if (timeoutAfterSave) { timeoutAfterSave = false; return reply(503, { detail: 'Mạng gián đoạn sau khi lưu' }); }
      return reply(200, commentView(c));
    }
    const roots = comments.filter(c => !c.rootId && (!c.deleted || comments.some(r => r.rootId === c.id && !r.deleted)));
    const n = Number(url.searchParams.get('page') ?? 0), size = Number(url.searchParams.get('size') ?? 10);
    return reply(200, { items: roots.slice(n * size, (n + 1) * size).map(commentView), total: roots.length, page: n, size, commentCount: activeCount() });
  }
  const thread = url.pathname.match(/\/comments\/([^/]+)\/replies$/);
  if (thread) {
    const items = comments.filter(c => c.rootId === thread[1] && !c.deleted);
    const n = Number(url.searchParams.get('page') ?? 0), size = Number(url.searchParams.get('size') ?? 10);
    return reply(200, { items: items.slice(n * size, (n + 1) * size).map(commentView), total: items.length, page: n, size, commentCount: activeCount() });
  }
  const item = comments.find(c => url.pathname.endsWith(`/comments/${c.id}`));
  if (item && method === 'DELETE') { item.deleted = true; return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': new URL(origin).origin, 'Access-Control-Allow-Credentials': 'true' } }); }
  if (item && method === 'PATCH') { item.body = req.postDataJSON().body; item.version++; return reply(200, commentView(item)); }
  return reply(404, { detail: 'Unexpected test fixture API' });
});
const check = (name, value = true) => { assert.ok(value, name); checks.push(name); console.log(`PASS ${name}`); };
try {
  await page.goto(`${origin}/community`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const article = page.locator('article').filter({ hasText: 'Bài kiểm thử cộng đồng' });
  await article.getByRole('button', { name: '24 bình luận', exact: true }).waitFor(); check('Server total is shown before loading comments');
  await article.getByRole('button', { name: '24 bình luận', exact: true }).click();
  await article.getByText('Root 0', { exact: true }).waitFor();
  check('Root comments paginate without loading replies eagerly', !apiCalls.some(c => c.path.endsWith('/replies')) && await article.getByText('Root 11', { exact: true }).count() === 0);
  await article.getByRole('button', { name: 'Xem thêm bình luận', exact: true }).click(); await article.getByText('Root 11', { exact: true }).waitFor();
  const thread = article.locator('section').filter({ has: page.getByText('Root 0', { exact: true }) });
  await thread.getByRole('button', { name: 'Xem 12 câu trả lời', exact: true }).click(); await thread.getByText('Earlier reply 0', { exact: true }).waitFor();
  await thread.getByRole('button', { name: 'Xem thêm câu trả lời', exact: true }).click(); await thread.getByText('Earlier reply 11', { exact: true }).waitFor(); check('Root and reply pagination works');
  await thread.screenshot({ path: shotPath('web-thread.png') });
  await thread.getByRole('button', { name: 'Trả lời', exact: true }).first().click();
  await thread.getByRole('textbox', { name: 'Trả lời Tài khoản B', exact: true }).fill('New threaded reply');
  await thread.getByRole('button', { name: 'Gửi', exact: true }).click();
  await thread.getByRole('button', { name: 'Xem thêm câu trả lời', exact: true }).click(); await thread.getByText('New threaded reply', { exact: true }).waitFor();
  await article.getByRole('button', { name: '25 bình luận', exact: true }).waitFor(); check('New reply persists and server total updates');
  await thread.getByRole('button', { name: 'Trả lời', exact: true }).last().click();
  await thread.getByRole('textbox', { name: 'Trả lời Tài khoản A', exact: true }).fill('Reply to a reply');
  await thread.getByRole('button', { name: 'Gửi', exact: true }).click();
  await article.getByRole('button', { name: '26 bình luận', exact: true }).waitFor();
  check('Reply to reply retains root and explicit target', comments.at(-1).rootId === 'root-0' && comments.at(-1).replyToId.startsWith('created-'));
  await thread.getByRole('button', { name: 'Thu gọn câu trả lời', exact: true }).click(); check('Replies collapse', await thread.getByText('Reply to a reply', { exact: true }).count() === 0);
  timeoutAfterSave = true;
  await article.getByRole('textbox', { name: 'Nội dung bình luận', exact: true }).fill('Retry without duplicate');
  await article.getByRole('button', { name: 'Gửi', exact: true }).click(); await article.getByRole('alert').filter({ hasText: 'Mạng gián đoạn' }).waitFor();
  await article.getByRole('button', { name: 'Thử gửi lại', exact: true }).click(); await article.getByText('Retry without duplicate', { exact: true }).waitFor();
  check('Ambiguous comment save retries the same idempotency key', comments.filter(c => c.body === 'Retry without duplicate').length === 1);
  profiles[aid] = { ...profiles[aid], displayName: 'Tên A đã cập nhật', avatarUrl: 'https://example.invalid/avatar-a.png' };
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await article.locator('header').getByText('Tên A đã cập nhật', { exact: true }).waitFor();
  check('Existing post and comments refresh public profile without relogin', await article.getByText('Tên A đã cập nhật', { exact: true }).count() > 1);
  await page.getByRole('button', { name: 'Viết bài', exact: true }).click();
  const draft = page.getByPlaceholder('Chia sẻ trải nghiệm, mẹo nhỏ hoặc cảm xúc của bạn...');
  await draft.fill('A story with feeling and chosen place');
  await page.getByRole('button', { name: 'Cảm xúc', exact: true }).click();
  await page.getByRole('dialog', { name: 'Chọn cảm xúc' }).scrollIntoViewIfNeeded(); await page.screenshot({ path: shotPath('web-feelings.png') });
  await page.getByRole('button', { name: /Vui vẻ/ }).click();
  await page.getByRole('button', { name: 'Bỏ cảm xúc', exact: true }).click();
  await page.getByRole('button', { name: 'Cảm xúc', exact: true }).click(); await page.getByRole('button', { name: /Biết ơn/ }).click();
  check('Feeling picker supports selecting, removing and changing without losing draft', await draft.inputValue() === 'A story with feeling and chosen place');
  await page.getByRole('button', { name: 'Gắn địa điểm', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Gắn địa điểm', exact: true });
  const oldQuery = page.waitForRequest(req => req.url().includes('/destinations?') && req.url().includes('keyword=old'));
  await picker.getByRole('textbox', { name: 'Tìm địa điểm' }).fill('old'); await oldQuery; await page.keyboard.press('Escape');
  await picker.waitFor({ state: 'hidden' }); check('Closing picker cancels the old search and retains draft', await draft.inputValue() === 'A story with feeling and chosen place');
  await page.getByRole('button', { name: 'Gắn địa điểm', exact: true }).click();
  await page.evaluate(() => { window.__gpsMode = 'denied'; }); await picker.getByRole('button', { name: 'Dùng vị trí của tôi' }).click();
  await picker.getByText(/Quyền vị trí đang bị chặn/).waitFor(); check('GPS permission denied has a name search fallback');
  await page.evaluate(() => { window.__gpsMode = 'timeout'; }); await picker.getByRole('button', { name: 'Dùng vị trí của tôi' }).click();
  await picker.getByText(/Tìm vị trí quá lâu/).waitFor(); check('GPS timeout is explained');
  await page.evaluate(() => { window.__gpsMode = 'off'; }); await picker.getByRole('button', { name: 'Dùng vị trí của tôi' }).click();
  await picker.getByText(/Chưa xác định được vị trí/).waitFor(); check('GPS unavailable is explained');
  await page.evaluate(() => { window.__gpsMode = 'empty'; }); await picker.getByRole('button', { name: 'Dùng vị trí của tôi' }).click();
  await picker.getByText(/Không có địa điểm phù hợp/).waitFor(); check('No nearby data does not fabricate a place');
  await picker.getByRole('button', { name: 'Mở rộng phạm vi lên 50 km', exact: true }).click(); await picker.getByText(/Phạm vi 50 km/).waitFor();
  await page.evaluate(() => { window.__gpsMode = 'coarse'; }); await picker.getByRole('button', { name: 'Dùng vị trí của tôi' }).click(); await picker.getByText(/Vị trí chưa chính xác/).waitFor();
  check('Approximate location and expanded radius are explicit');
  await page.evaluate(() => { window.__gpsMode = 'granted'; }); await picker.getByRole('button', { name: 'Dùng vị trí của tôi' }).click();
  const choices = picker.locator('ul button'); await choices.first().waitFor();
  check('Public places are sorted by real test-coordinate distances', (await choices.first().innerText()).includes(place1.name));
  await picker.screenshot({ path: shotPath('web-places.png') });
  await picker.getByRole('textbox', { name: 'Tìm địa điểm' }).fill('old'); await picker.getByRole('textbox', { name: 'Tìm địa điểm' }).fill('Phố cổ');
  await picker.getByRole('button', { name: /Phố cổ Hội An/ }).waitFor(); check('Name search works outside nearby radius and ignores stale queries');
  await picker.getByRole('textbox', { name: 'Tìm địa điểm' }).fill(''); await picker.getByRole('button', { name: /Bảo tàng GPS gần/ }).click();
  check('Confirmed place is attached without sending GPS coordinates', apiCalls.filter(c => c.path.endsWith('/destinations')).every(c => !/latitude|longitude|coords/.test(c.search)));
  await page.getByRole('button', { name: 'Chia sẻ', exact: true }).first().click();
  await page.getByText('A story with feeling and chosen place', { exact: true }).waitFor();
  check('Post payload persists stable feeling code and selected place ID', posts[0].feeling === 'GRATEFUL' && posts[0].destinationId === place1.id);
  await page.reload();
  const created = page.locator('article').filter({ hasText: 'A story with feeling and chosen place' });
  await created.getByText('🥰 Biết ơn', { exact: true }).waitFor(); await created.getByRole('link', { name: /Bảo tàng GPS gần/ }).waitFor(); check('Feeling and place survive reload');
  await page.screenshot({ path: new URL('web-community.png', output).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: new URL('web-small-screen.png', output).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true });
  check('No uncaught browser errors', errors.length === 0);
  await fs.writeFile(new URL('verification.json', output), JSON.stringify({ checks, errors, mode: 'actual browser with isolated HTTP fixtures; persistence separately tested on PostgreSQL' }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally { await browser.close(); }
