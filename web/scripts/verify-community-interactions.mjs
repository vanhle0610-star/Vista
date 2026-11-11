// Real browser/React UI with an isolated HTTP fixture; never writes to the shared database.
import { chromium } from '../../admin/node_modules/.cache/tv5-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const webBase = process.env.TV5_WEB_URL ?? 'http://localhost:3000';
const postId = '11111111-1111-4111-8111-111111111111';
const userA = { id: '22222222-2222-4222-8222-222222222222', displayName: 'Tester A' };
const userB = { id: '33333333-3333-4333-8333-333333333333', displayName: 'Tester B' };
const post = {
  id: postId, body: 'Community interaction browser fixture', version: 0,
  createdAt: '2026-10-28T10:00:00Z', updatedAt: '2026-10-28T10:00:00Z',
  author: userA, media: [], destinationId: null,
};
const likes = new Set();
const comments = Array.from({ length: 12 }, (_, index) => ({
  id: `comment-${index}`, postId, body: `Earlier comment ${index}`, version: 0,
  createdAt: post.createdAt, updatedAt: post.createdAt, author: userB,
}));
const checks = [], errors = [];
let failCommentWrite = false, failCommentRead = false, failLikeWrite = false, failLikeRead = false;
let commentWrites = 0;
const createdPosts = [];
const uploadId = '44444444-4444-4444-8444-444444444444';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(30000);
page.on('pageerror', error => errors.push(error.message));
const check = (name, value) => { assert.ok(value, name); checks.push(name); };
const session = async user => {
  await page.evaluate(user => {
    if (user) {
      localStorage.setItem('vista_token', user.id);
      localStorage.setItem('vista_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('vista_token');
      localStorage.removeItem('vista_user');
    }
    window.dispatchEvent(new Event('vista-auth-change'));
  }, user);
};

await context.route('**/api/v1/**', async route => {
  const request = route.request(), url = new URL(request.url());
  const userId = request.headers().authorization?.replace('Bearer ', '');
  const reply = (status, body) => route.fulfill({
    status, json: body,
    headers: {
      'Access-Control-Allow-Origin': new URL(webBase).origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
  });
  if (request.method() === 'OPTIONS') return reply(200, {});
  if (url.pathname === '/api/v1/posts') {
    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      createdPosts.push(body);
      return reply(201, { ...post, id: '55555555-5555-4555-8555-555555555555', body: body.body });
    }
    return reply(200, { items: [post], total: 1, page: 0, size: 10 });
  }
  if (url.pathname === '/api/v1/post-uploads') return reply(201, { id: uploadId, expiresAt: '2026-10-29T10:00:00Z' });
  if (url.pathname === '/api/v1/posts/55555555-5555-4555-8555-555555555555/like') {
    return reply(200, { postId: '55555555-5555-4555-8555-555555555555', liked: false, likeCount: 0 });
  }
  if (url.pathname === `/api/v1/posts/${postId}/like`) {
    if (!userId) return reply(401, { detail: 'Login required' });
    if (request.method() === 'GET' && failLikeRead) return reply(503, { detail: 'Cannot load likes' });
    if (request.method() !== 'GET' && failLikeWrite) return reply(503, { detail: 'Cannot save like' });
    if (request.method() === 'PUT') likes.add(userId);
    if (request.method() === 'DELETE') likes.delete(userId);
    return reply(200, { postId, liked: likes.has(userId), likeCount: likes.size });
  }
  if (url.pathname === `/api/v1/posts/${postId}/comments`) {
    if (request.method() === 'POST') {
      commentWrites++;
      await new Promise(resolve => setTimeout(resolve, 150));
      if (failCommentWrite) return reply(503, { detail: 'Cannot save comment' });
      const comment = {
        id: `saved-${commentWrites}`, postId, body: request.postDataJSON().body, version: 0,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        author: userId === userA.id ? userA : userB,
      };
      comments.unshift(comment);
      return reply(200, comment);
    }
    if (failCommentRead) return reply(503, { detail: 'Cannot load comments' });
    const next = Number(url.searchParams.get('page') ?? 0), size = Number(url.searchParams.get('size') ?? 10);
    return reply(200, { items: comments.slice(next * size, (next + 1) * size), total: comments.length, page: next, size });
  }
  return reply(404, { detail: 'Unexpected fixture API path' });
});

try {
  await page.goto(`${webBase}/community`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const article = page.locator('article').filter({ hasText: post.body });
  await article.waitFor();
  check('Feed renders API posts without interactive fake articles', await page.locator('article').count() === 1);
  await article.getByRole('button', { name: 'Bình luận', exact: true }).click();
  await article.getByRole('link', { name: /Đăng nhập để gửi bình luận/ }).waitFor();
  check('Guests can read comments but are asked to sign in to comment', await article.getByText('Earlier comment 0', { exact: true }).isVisible());

  await session(userA);
  const heart = () => article.getByRole('button', { name: /^(Thích|Đã thích)/ });
  await page.waitForFunction(() => document.querySelector('article button[aria-pressed]')?.disabled === false);
  await heart().click();
  await article.getByRole('button', { name: 'Đã thích (1)', exact: true }).waitFor();
  check('Like is confirmed by the API', likes.has(userA.id));
  await page.reload();
  await article.getByRole('button', { name: 'Đã thích (1)', exact: true }).waitFor();
  check('Liked status is restored after page reload', true);

  await page.getByRole('button').filter({ hasText: 'Tester A' }).click();
  await page.getByRole('button', { name: /Đăng xuất/ }).click();
  await heart().waitFor();
  await session(userB);
  await article.getByRole('button', { name: 'Thích (1)', exact: true }).waitFor();
  check('Another account does not inherit the first account like', true);
  await heart().click();
  await article.getByRole('button', { name: 'Đã thích (2)', exact: true }).waitFor();
  await session(userA);
  await article.getByRole('button', { name: 'Đã thích (2)', exact: true }).waitFor();
  check('Signing back in restores the original account like', true);
  await heart().click();
  await article.getByRole('button', { name: 'Thích (1)', exact: true }).waitFor();
  check('Unlike affects only the current account', !likes.has(userA.id) && likes.has(userB.id));

  failLikeWrite = true;
  await heart().click();
  await article.getByRole('alert').filter({ hasText: 'Cannot save like' }).waitFor();
  check('Failed like is reported and does not appear as saved', await heart().getAttribute('aria-pressed') === 'false');
  failLikeWrite = false;

  await article.getByRole('button', { name: 'Bình luận', exact: true }).click();
  await article.getByText('Earlier comment 0', { exact: true }).waitFor();
  await article.getByRole('button', { name: 'Xem thêm bình luận', exact: true }).click();
  await article.getByText('Earlier comment 11', { exact: true }).waitFor();
  check('Comments beyond the first ten are accessible', true);

  const input = article.getByRole('textbox', { name: 'Nội dung bình luận' });
  await input.fill('My persisted comment');
  await article.getByRole('button', { name: 'Gửi', exact: true }).click();
  // A second submit while the first request is pending must be ignored.
  await input.locator('..').evaluate(form => form.requestSubmit());
  await article.getByText('My persisted comment', { exact: true }).waitFor();
  check('Comment appears immediately and duplicate submits are blocked', commentWrites === 1 && await input.inputValue() === '');
  await page.reload();
  await article.getByRole('button', { name: 'Bình luận', exact: true }).click();
  await article.getByText('My persisted comment', { exact: true }).waitFor();
  check('Reloaded comment history contains the saved comment', true);

  failCommentWrite = true;
  await input.fill('Keep this draft on error');
  await article.getByRole('button', { name: 'Gửi', exact: true }).click();
  await article.getByRole('alert').filter({ hasText: 'Cannot save comment' }).waitFor();
  check('Failed comment shows an error and keeps the draft', await input.inputValue() === 'Keep this draft on error');
  failCommentWrite = false;

  await article.getByRole('button', { name: 'Bình luận', exact: true }).click();
  failCommentRead = true;
  await article.getByRole('button', { name: 'Bình luận', exact: true }).click();
  await article.getByRole('alert').filter({ hasText: 'Cannot load comments' }).waitFor();
  failCommentRead = false;
  await article.getByRole('button', { name: 'Thử tải lại bình luận', exact: true }).click();
  await article.getByText('My persisted comment', { exact: true }).waitFor();
  check('Failed comment history can be retried', true);

  failLikeRead = true;
  await page.reload();
  await article.getByRole('alert').filter({ hasText: 'Cannot load likes' }).waitFor();
  failLikeRead = false;
  await article.getByRole('button', { name: 'Thử tải lại lượt thích', exact: true }).click();
  await article.getByRole('button', { name: 'Thích (1)', exact: true }).waitFor();
  check('Failed like history can be retried', true);

  await page.getByRole('button', { name: 'Viết bài', exact: true }).click();
  await page.getByPlaceholder('Chia sẻ trải nghiệm, mẹo nhỏ hoặc cảm xúc của bạn...').fill('Post with an uploaded image');
  await page.locator('input[type=file]').setInputFiles({
    name: 'test.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
  });
  await page.getByRole('button', { name: 'Chia sẻ', exact: true }).first().click();
  await page.getByText('Post with an uploaded image', { exact: true }).waitFor();
  check('Composer attaches the upload id returned by the API', createdPosts.length === 1 && createdPosts[0].uploadIds[0] === uploadId);
  check('No uncaught browser errors', errors.length === 0);
  const output = new URL('../node_modules/.cache/community-interactions/', import.meta.url);
  await fs.mkdir(output, { recursive: true });
  await page.screenshot({ path: new URL('community.png', output).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true });
  await fs.writeFile(new URL('verification.json', output), JSON.stringify({ checks, errors, mode: 'browser with mocked API' }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await browser.close();
}
