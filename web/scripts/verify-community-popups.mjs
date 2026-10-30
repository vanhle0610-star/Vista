// Browser UI validation against isolated HTTP fixtures. PostgreSQL persistence is tested separately.
import { chromium } from '../../admin/node_modules/.cache/tv5-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.TV5_WEB_URL ?? 'http://127.0.0.1:3000';
const output = new URL('../node_modules/.cache/community-popups/', import.meta.url);
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
places.forEach(p => { p.status = 'PUBLISHED'; p.category = 'Khám phá'; });
places.push({ id: 'missing-coords', name: 'Điểm chưa có tọa độ', province: 'Đà Nẵng', category: 'Khám phá', status: 'PUBLISHED', imageUrl: 'https://example.invalid/broken-place.png', latitude: null, longitude: null });
places.push(...Array.from({length: 20}, (_,i) => ({id:'extra-'+i, name:'Địa điểm mở rộng '+i, province:'Đà Nẵng', category:'Khám phá', status:'PUBLISHED', latitude:16.3+i/100, longitude:108.3})));
let failPage = -1;
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
    const n = Number(url.searchParams.get('page')), size = Number(url.searchParams.get('size'));
    if (failPage === n) { failPage = -1; return reply(503, { detail: 'Test API failure' }); }
    if (keyword === 'error') return reply(503, { detail: 'Test API failure' });
    const filtered = places.filter(place => place.name.toLowerCase().includes(keyword.toLowerCase()));
    return reply(200, { items: filtered.slice(n*size,(n+1)*size), total: filtered.length, page:n, size });
  }
  if (url.pathname === '/api/v1/post-uploads' && method === 'POST') return reply(201, {id:'fixture-upload', expiresAt:'2099-01-01T00:00:00Z'});
  if (url.pathname === '/api/v1/post-uploads/fixture-upload' && method === 'DELETE') return route.fulfill({status:204});
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
  await draft.fill('A story with feeling, photo and chosen place');
  await page.locator('input[type=file]').setInputFiles({ name:'photo.png', mimeType:'image/png', buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64') });
  await page.getByRole('button', { name:'Cảm xúc', exact:true }).click();
  const feelings = page.getByRole('dialog', {name:'Bạn đang cảm thấy thế nào?',exact:true});
  const feelingSearch = feelings.getByRole('textbox',{name:'Tìm cảm xúc'});
  await feelingSearch.fill('hao hung');
  await feelings.getByRole('button',{name:'Hào hứng',exact:true}).waitFor();
  check('Unaccented feeling search', await feelings.getByRole('button',{name:'Hào hứng'}).count() === 1);
  await feelingSearch.fill('zzzz'); await feelings.getByText(/Không tìm thấy cảm xúc phù hợp/).waitFor();
  await feelingSearch.fill('');
  await page.screenshot({path:shotPath('web-feelings.png')});
  await feelings.getByRole('button',{name:'Vui vẻ'}).click();
  await page.getByRole('button', {name:'Cảm xúc',exact:true}).click();
  check('Feeling selection retained on reopen', await feelings.getByRole('button',{name:'Vui vẻ'}).getAttribute('aria-pressed') === 'true');
  await feelings.getByRole('button',{name:'Biết ơn'}).click();
  await page.getByRole('button',{name:'Bỏ cảm xúc',exact:true}).click();
  await page.getByRole('button',{name:'Cảm xúc',exact:true}).click();
  await feelings.getByRole('button',{name:'Biết ơn'}).click();
  check('Change and remove feeling preserve draft and photo', await draft.inputValue() === 'A story with feeling, photo and chosen place' && await page.getByTitle('Xóa ảnh này').count() === 1);
  const openPlace = () => page.getByRole('button',{name:'Gắn địa điểm',exact:true}).click();
  const picker=page.getByRole('dialog',{name:'Gắn địa điểm',exact:true});
  const search=picker.getByRole('textbox',{name:'Tìm địa điểm'});
  await openPlace();
  await picker.getByRole('button',{name:/Bảo tàng GPS gần/}).waitFor();
  check('Suggestions load immediately via one TV1 page', apiCalls.filter(c=>c.path==='/api/v1/destinations' && c.method === 'GET').length === 1 && new URLSearchParams(apiCalls.find(c=>c.path==='/api/v1/destinations').search).get('size') === '20');
  check('No automatic place selection', await picker.locator('button[aria-pressed=true]').count() === 0);
  failPage=1;
  await picker.getByRole('button',{name:'Tải thêm địa điểm',exact:true}).click();
  await picker.getByRole('alert').waitFor();
  check('Load-more error preserves existing choices', await picker.getByRole('button',{name:/Bảo tàng GPS gần/}).count() === 1);
  await picker.getByRole('button',{name:'Thử lại địa điểm',exact:true}).click();
  await picker.getByRole('button',{name:/Địa điểm mở rộng 19/}).waitFor();
  check('Retry fetches the failed page', await picker.locator('ul button').count() === places.length);
  await page.evaluate(()=>{window.__gpsMode='denied';});
  await picker.getByRole('button',{name:'Dùng vị trí',exact:true}).click();
  await picker.getByText(/Quyền vị trí đang bị chặn/).waitFor();
  check('GPS denial leaves search usable and avoids repeated requests', await picker.getByRole('button',{name:'Dùng vị trí',exact:true}).isDisabled());
  await search.fill('Phố cổ'); await picker.getByRole('button',{name:/Phố cổ Hội An/}).waitFor();
  await page.keyboard.press('Escape');
  await picker.waitFor({state:'hidden'});
  check('Escape returns focus and preserves draft', await page.getByRole('button',{name:'Gắn địa điểm',exact:true}).evaluate(el=>el===document.activeElement) && await draft.inputValue() === 'A story with feeling, photo and chosen place');
  await openPlace(); await picker.getByRole('button',{name:/Bảo tàng GPS gần/}).waitFor();
  await page.evaluate(()=>{window.__gpsMode='timeout';});
  await picker.getByRole('button',{name:'Dùng vị trí',exact:true}).click();
  await picker.getByText(/Tìm vị trí quá lâu/).waitFor();
  check('GPS timeout is non-blocking');
  await page.evaluate(()=>{window.__gpsMode='off';});
  await picker.getByRole('button',{name:'Dùng vị trí',exact:true}).click();
  await picker.getByText(/Chưa xác định được vị trí/).waitFor();
  check('GPS unavailable is non-blocking');
  await page.evaluate(()=>{window.__gpsMode='coarse';});
  await picker.getByRole('button',{name:'Dùng vị trí',exact:true}).click();
  await picker.getByText(/Độ chính xác GPS thấp/).waitFor();
  const choices=picker.locator('ul button');
  check('GPS sorts only downloaded results by estimated distance', (await choices.first().innerText()).includes(place1.name));
  check('Missing coordinates stay searchable without a distance', !(await picker.getByRole('button',{name:/Điểm chưa có tọa độ/}).innerText()).includes('≈'));
  check('GPS coordinates and map opt-in are never stored', await page.evaluate(()=>!localStorage.getItem('vista-map-location-opt-in')));
  await page.screenshot({path:shotPath('web-places.png')});
  for(let i=0;i<30;i++){await page.keyboard.press('Tab');{assert.ok(await picker.evaluate(el=>el.contains(document.activeElement)), 'Focus must stay inside dialog');}}
  check('Keyboard focus stays within place dialog');
  const oldRequest=page.waitForRequest(req=>req.url().includes('keyword=old'));
  await search.fill('old'); await oldRequest;
  await search.fill('Phố cổ');
  await picker.getByRole('button',{name:/Phố cổ Hội An/}).waitFor();
  await page.waitForTimeout(850);
  check('Older request cannot overwrite newer results', await picker.locator('ul button').count()===1 && (await choices.first().innerText()).includes('Phố cổ Hội An'));
  await search.fill('error'); await picker.getByRole('alert').waitFor();
  await search.fill('zzzz'); await picker.getByText(/Không tìm thấy địa điểm phù hợp/).waitFor();
  check('API errors and empty states are explicit');
  await search.fill(''); await picker.getByRole('button',{name:/Bảo tàng GPS gần/}).click();
  const placeChip=page.getByRole('button',{name:'📍 Bảo tàng GPS gần',exact:true});
  await placeChip.click();
  check('Current location is selected on reopen', await picker.getByRole('button',{name:/Bảo tàng GPS gần/}).getAttribute('aria-pressed')==='true');
  await picker.getByRole('button',{name:/Phố cổ Hội An/}).click();
  await page.getByRole('button',{name:'Bỏ địa điểm',exact:true}).click();
  await openPlace(); await picker.getByRole('button',{name:/Bảo tàng GPS gần/}).click();
  check('Place change/remove preserves feeling and photo', await page.getByRole('button',{name:'🥰 Biết ơn',exact:true}).count()===1 && await page.getByTitle('Xóa ảnh này').count()===1);
  await page.getByRole('button',{name:'Chia sẻ',exact:true}).first().click();
  await page.getByText('A story with feeling, photo and chosen place',{exact:true}).waitFor();
  check('Stable feeling ID and chosen place ID are sent with the photo', posts[0].feeling==='GRATEFUL' && posts[0].destinationId===place1.id && posts[0].uploadIds?.[0]==='fixture-upload');
  await page.reload();
  const created=page.locator('article').filter({hasText:'A story with feeling, photo and chosen place'});
  await created.getByText('đang cảm thấy 🥰 Biết ơn',{exact:true}).waitFor();
  await created.getByRole('link',{name:/Bảo tàng GPS gần/}).waitFor();
  check('Feeling and location render after reload');
  check('Search requests contain no GPS coordinates', apiCalls.filter(c=>c.path==='/api/v1/destinations').every(c=>!/latitude|longitude|radius|coords/.test(c.search)));
  // Small viewport checks the web layout only. This is not a native application test.
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Viết bài',exact:true}).click();
  await page.getByRole('button',{name:'Cảm xúc',exact:true}).click();
  await page.screenshot({path:shotPath('web-small-feelings.png')});
  check('Small viewport dialog fits width', await feelings.evaluate(el=>el.getBoundingClientRect().width < window.innerWidth));
  await page.keyboard.press('Escape'); await openPlace();
  await picker.getByRole('button',{name:/Bảo tàng GPS gần/}).waitFor();
  await page.screenshot({path:shotPath('web-small-places.png')});
  check('Web popup has no horizontal overflow', await picker.evaluate(el=>el.scrollWidth===el.clientWidth));
  check('No uncaught browser errors',errors.length===0);
  await fs.writeFile(new URL('verification.json',output),JSON.stringify({checks,errors,mode:'Web browser with HTTP fixtures and simulated GPS. Backend PostgreSQL persistence tested separately. No mobile tests/build.'},null,2));
  console.log(JSON.stringify({checks,errors},null,2));
} finally {await browser.close();}
