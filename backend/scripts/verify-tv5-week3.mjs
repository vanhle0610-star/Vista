import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
const base = process.env.TV5_API_URL ?? 'http://localhost:8080/api/v1';
const checks = [];
async function call(path, method = 'GET', body, token) {
  const response = await fetch(base + path, { method, headers: { ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data };
}
function check(name, actual, expected) { assert.equal(actual, expected, `${name}: expected ${expected}, got ${actual}`); checks.push({ name, status: 'passed' }); }
const users = [];
let savedUsers = [];
try { savedUsers = JSON.parse(await fs.readFile('mobile/node_modules/.cache/tv5-week3-session.json','utf8')); } catch { /* First run creates dedicated QA users. */ }
const created = [];
try {
  check('guest public feed', (await call('/posts')).status, 200);
  check('guest cannot create post', (await call('/posts', 'POST', { body: 'unauthorized' })).status, 401);
  for (let i = 0; i < 2; i++) {
    const previous = savedUsers[i];
    const account = previous?.email && previous?.password ? { email: previous.email, password: previous.password } : { email: `tv5.qa.${randomUUID()}@example.com`, password: `VistaQa!${randomUUID()}`, displayName: `TV5 QA ${i + 1}` };
    const result = await call(previous ? '/auth/login' : '/auth/register', 'POST', account);
    check(`authenticate QA account ${i + 1}`, result.status, previous ? 200 : 201); users.push({ ...result.data, password: account.password });
  }
  const [a,b] = users;
  check('reject blank body', (await call('/posts','POST',{ body: ' ', clientRequestId: randomUUID() }, a.accessToken)).status, 400);
  const payload = { body: 'TV5 week-3 integration verification — temporary post', clientRequestId: randomUUID(), uploadIds: [], authorId: b.id };
  const [first, retry] = await Promise.all([call('/posts','POST',payload,a.accessToken),call('/posts','POST',payload,a.accessToken)]);
  check('create persisted post',first.status,201); check('retry same request',retry.status,201); check('no duplicate on concurrent retry',first.data.id,retry.data.id);
  const post = first.data; created.push({ id: post.id, token: a.accessToken });
  check('server-derived author ignores spoofed authorId',post.author.id,a.id);
  check('public persisted detail',(await call(`/posts/${post.id}`)).data.body,payload.body);
  check('second user cannot edit post',(await call(`/posts/${post.id}`,'PATCH',{body:'forbidden',version:0},b.accessToken)).status,403);
  check('second user cannot delete post',(await call(`/posts/${post.id}`,'DELETE',undefined,b.accessToken)).status,403);
  check('guest cannot delete post',(await call(`/posts/${post.id}`,'DELETE')).status,401);
  check('missing post version rejected',(await call(`/posts/${post.id}`,'PATCH',{body:'missing version'},a.accessToken)).status,400);
  check('reused request with changed body rejected',(await call('/posts','POST',{...payload,body:'changed'},a.accessToken)).status,409);
  check('author edits post',(await call(`/posts/${post.id}`,'PATCH',{body:'Edited QA post',version:0},a.accessToken)).status,200);
  check('stale version rejected',(await call(`/posts/${post.id}`,'PATCH',{body:'stale',version:0},a.accessToken)).status,409);
  check('guest cannot comment',(await call(`/posts/${post.id}/comments`,'POST',{body:'unauthorized'})).status,401);
  const comment = await call(`/posts/${post.id}/comments`,'POST',{body:'Temporary QA comment'},b.accessToken);
  check('create comment',comment.status,200);
  check('public comment list',(await call(`/posts/${post.id}/comments`)).data.items.some((c)=>c.id===comment.data.id),true);
  check('other author cannot edit comment',(await call(`/posts/${post.id}/comments/${comment.data.id}`,'PATCH',{body:'forbidden',version:0},a.accessToken)).status,403);
  check('other author cannot delete comment',(await call(`/posts/${post.id}/comments/${comment.data.id}`,'DELETE',undefined,a.accessToken)).status,403);
  check('missing comment version rejected',(await call(`/posts/${post.id}/comments/${comment.data.id}`,'PATCH',{body:'missing version'},b.accessToken)).status,400);
  check('comment author edits',(await call(`/posts/${post.id}/comments/${comment.data.id}`,'PATCH',{body:'Edited comment',version:0},b.accessToken)).status,200);
  check('comment author deletes',(await call(`/posts/${post.id}/comments/${comment.data.id}`,'DELETE',undefined,b.accessToken)).status,204);
  const invalid = new FormData(); invalid.append('file',new Blob(['not an image'],{type:'image/png'}),'fake.png');
  check('reject fake image bytes',(await call('/post-uploads','POST',invalid,a.accessToken)).status,415);
  check('guest upload rejected',(await call('/post-uploads','POST',invalid)).status,401);
  const oversized = new FormData(); oversized.append('file',new Blob([new Uint8Array(5242881)],{type:'image/png'}),'large.png');
  check('reject oversized image',(await call('/post-uploads','POST',oversized,a.accessToken)).status,413);
  const missing = randomUUID();
  check('missing parent comments hidden',(await call(`/posts/${missing}/comments`)).status,404);
  check('missing parent comment write rejected',(await call(`/posts/${missing}/comments`,'POST',{body:'no parent'},a.accessToken)).status,404);
  check('author deletes post',(await call(`/posts/${post.id}`,'DELETE',undefined,a.accessToken)).status,204);
  check('deleted post is not public',(await call(`/posts/${post.id}`)).status,404);
  check('deleted parent comments inaccessible',(await call(`/posts/${post.id}/comments`)).status,404);
  const route = await call('/map/routes','POST',{origin:{latitude:16.061168,longitude:108.227897,label:'Cầu Rồng'},destination:{latitude:16.0676,longitude:108.2253,label:'Chợ Hàn'},mode:'DRIVING',fromGps:false});
  check('missing ORS key returns explicit unavailable',route.status,503); check('missing ORS key has correct code',route.data.code,'ROUTING_UNCONFIGURED');
  check('invalid route rejected',(await call('/map/routes','POST',{origin:{latitude:91,longitude:0,label:'invalid'},destination:{latitude:0,longitude:0,label:'x'},mode:'DRIVING'})).status,400);
  await fs.mkdir('mobile/node_modules/.cache',{recursive:true});
  await fs.writeFile('mobile/node_modules/.cache/tv5-week3-session.json',JSON.stringify(users));
} finally {
  for (const post of created) await call(`/posts/${post.id}`,'DELETE',undefined,post.token).catch(()=>{});
  await fs.mkdir('artifacts/tv5-week3',{recursive:true});
  await fs.writeFile('artifacts/tv5-week3/api-verification.json',JSON.stringify({ date:new Date().toISOString(), base, checks, storageLive:'Not verified; requires private bucket configuration',realDevice:'Not verified' },null,2));
  console.log(JSON.stringify({ passed:checks.length, checks },null,2));
}
