import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

// Exercise the real API client with controlled HTTP responses and browser storage.
const code = ts.transpileModule(
  fs.readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;

const json = (status, body = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

function harness(respond, token = 'expired-token') {
  const storage = new Map(token ? [['vista_token', token], ['vista_user', '{"id":"user-1"}']] : []);
  const calls = [], events = [];
  const document = { cookie: '' };
  const compiled = { exports: {} };
  vm.runInNewContext(code, {
    module: compiled, exports: compiled.exports,
    process: { env: { NEXT_PUBLIC_API_URL: 'http://api.test/api/v1/' } },
    Headers, Event, document,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    window: { dispatchEvent: event => events.push(event.type) },
    fetch: async (url, init) => {
      const call = { url, ...init, headers: new Headers(init.headers) };
      calls.push(call);
      return respond(call, calls.length);
    },
  });
  return { request: compiled.exports.apiRequest, storage, calls, events, document };
}

test('expired access token refreshes with cookie and retries the exact post payload once', async () => {
  const body = JSON.stringify({ body: 'Một ngày ở Đà Nẵng', clientRequestId: 'request-1', uploadIds: ['photo-1'] });
  const h = harness((_call, index) => [json(401), json(200, { accessToken: 'new-token' }), json(201, { id: 'post-1' })][index - 1]);
  const result = await h.request('/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.equal(result.id, 'post-1');
  assert.equal(h.calls.length, 3);
  assert.equal(h.calls[0].headers.get('Authorization'), 'Bearer expired-token');
  assert.equal(h.calls[1].url, 'http://api.test/api/v1/auth/refresh');
  assert.equal(h.calls[1].method, 'POST');
  assert.equal(h.calls[1].headers.has('Authorization'), false);
  assert.equal(h.calls[2].headers.get('Authorization'), 'Bearer new-token');
  assert.equal(h.calls[2].headers.get('Content-Type'), 'application/json');
  assert.equal(h.calls[2].body, body);
  assert.ok(h.calls.every(call => call.credentials === 'include'));
  assert.equal(h.storage.get('vista_token'), 'new-token');
  assert.match(h.document.cookie, /vista_token=new-token/);
  assert.deepEqual(h.events, ['vista-auth-change']);
});

test('image upload retry preserves multipart body and browser-generated content type', async () => {
  const body = new FormData();
  body.append('file', new Blob(['image'], { type: 'image/png' }), 'photo.png');
  const h = harness((_call, index) => [json(401), json(200, { accessToken: 'new-token' }), json(201, { uploadId: 'photo-1' })][index - 1]);
  const result = await h.request('/post-uploads', { method: 'POST', body });
  assert.equal(result.uploadId, 'photo-1');
  assert.equal(h.calls[2].body, body);
  assert.equal(h.calls[2].headers.has('Content-Type'), false);
});

test('concurrent 401 responses share one refresh token rotation', async () => {
  let releaseRefresh;
  const refresh = new Promise(resolve => { releaseRefresh = resolve; });
  let refreshCount = 0;
  const h = harness(call => {
    if (call.url.endsWith('/auth/refresh')) { refreshCount++; return refresh; }
    return call.headers.get('Authorization') === 'Bearer new-token' ? json(200, { ok: true }) : json(401);
  });
  const requests = [h.request('/posts'), h.request('/post-uploads')];
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(refreshCount, 1);
  releaseRefresh(json(200, { accessToken: 'new-token' }));
  const results = await Promise.all(requests);
  assert.ok(results.every(result => result.ok));
  assert.equal(refreshCount, 1);
});

test('delayed 401 reuses the token refreshed by an earlier request', async () => {
  let releaseLate;
  const late = new Promise(resolve => { releaseLate = resolve; });
  const h = harness(call => {
    if (call.url.endsWith('/auth/refresh')) return json(200, { accessToken: 'new-token' });
    if (call.headers.get('Authorization') === 'Bearer new-token') return json(200, { ok: true });
    return call.url.endsWith('/late') ? late : json(401);
  });
  const pending = h.request('/late');
  await h.request('/posts');
  releaseLate(json(401));
  assert.equal((await pending).ok, true);
  assert.equal(h.calls.filter(call => call.url.endsWith('/auth/refresh')).length, 1);
});

test('rejected refresh clears stale login and reports readable Vietnamese without resending the post', async () => {
  const h = harness(() => json(401, { code: 'UNAUTHORIZED', detail: 'broken backend text' }));
  await assert.rejects(h.request('/posts', { method: 'POST', body: 'draft' }), error =>
    error.status === 401 && error.message.includes('Vui lòng đăng nhập lại'));
  assert.equal(h.calls.length, 2);
  assert.equal(h.storage.size, 0);
  assert.match(h.document.cookie, /max-age=0/);
  assert.deepEqual(h.events, ['vista-auth-change']);
});

test('retry still unauthorized stops after one refresh', async () => {
  const h = harness(call => call.url.endsWith('/auth/refresh') ? json(200, { accessToken: 'new-token' }) : json(401));
  await assert.rejects(h.request('/posts'), error => error.status === 401);
  assert.equal(h.calls.length, 3);
  assert.equal(h.storage.size, 0);
});

for (const failure of ['network', 'server']) {
  test(`temporary ${failure} failure during refresh keeps the login for another attempt`, async () => {
    const h = harness(call => {
      if (!call.url.endsWith('/auth/refresh')) return json(401);
      if (failure === 'network') throw new TypeError('Network unavailable');
      return json(503, { detail: 'Máy chủ tạm thời gián đoạn' });
    });
    await assert.rejects(h.request('/posts'));
    await assert.rejects(h.request('/posts'));
    assert.equal(h.storage.get('vista_token'), 'expired-token');
    assert.equal(h.calls.filter(call => call.url.endsWith('/auth/refresh')).length, 2);
    assert.equal(h.events.length, 0);
  });
}

test('logout during refresh cannot restore the old session', async () => {
  let releaseRefresh;
  const refresh = new Promise(resolve => { releaseRefresh = resolve; });
  const h = harness(call => call.url.endsWith('/auth/refresh') ? refresh : json(401));
  const pending = h.request('/posts');
  await new Promise(resolve => setImmediate(resolve));
  h.storage.clear();
  releaseRefresh(json(200, { accessToken: 'new-token' }));
  await assert.rejects(pending, error => error.status === 401);
  assert.equal(h.storage.size, 0);
  assert.equal(h.calls.length, 2);
});

test('guest requests, auth endpoints, explicit authorization and 403 never trigger refresh', async () => {
  for (const [path, init, token, status] of [
    ['/posts', {}, null, 401],
    ['/auth/login', { method: 'POST' }, 'old-token', 401],
    ['/posts', { headers: new Headers({ authorization: 'Bearer custom-token' }) }, 'old-token', 401],
    ['/posts', {}, 'old-token', 403],
  ]) {
    const h = harness(() => json(status, { detail: 'Forbidden' }), token);
    await assert.rejects(h.request(path, init), error => error.status === status);
    assert.equal(h.calls.length, 1);
    assert.equal(h.storage.get('vista_token') ?? null, token);
    if (init.headers) assert.equal(h.calls[0].headers.get('Authorization'), 'Bearer custom-token');
  }
});

test('successful delete retains 204 support', async () => {
  const h = harness(() => new Response(null, { status: 204 }));
  assert.equal(Object.keys(await h.request('/posts/post-1', { method: 'DELETE' })).length, 0);
  assert.equal(h.calls.length, 1);
});

test('protected auth profile can refresh an expired session', async () => {
  const h = harness((_call, index) => [json(401), json(200, { accessToken: 'new-token' }), json(200, { id: 'user-1' })][index - 1]);
  assert.equal((await h.request('/auth/me')).id, 'user-1');
  assert.equal(h.calls.length, 3);
});
