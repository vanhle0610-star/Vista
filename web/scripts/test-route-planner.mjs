import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';

let fetcher;
const modules = new Map();
function load(relative) {
  if (modules.has(relative)) return modules.get(relative);
  const file = new URL('../src/features/map-location/' + relative, import.meta.url);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const compiled = { exports: {} };
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports, crypto: { randomUUID }, process: { env: {} }, AbortSignal,
    fetch: (...args) => fetcher(...args), require: (name) => {
      if (name === '../coordinates') return load('coordinates.ts');
      if (name === './routes') return load('routing/routes.ts');
      throw new Error('Unexpected import: ' + name);
    } });
  modules.set(relative, compiled.exports); return compiled.exports;
}
const { initialStops, createStop, stopRole, moveStop, resolveStops } = load('routing/stops.ts');
const { validateRouteInput, computeVistaRoute, LatestRouteRequest } = load('routing/routes.ts');
const { accuracyRing } = load('coordinates.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
const origin = { latitude: 16, longitude: 108, label: 'Xuất phát' }, end = { latitude: 16.1, longitude: 108.1, label: 'Điểm đến' };
const waypoint = { latitude: 16.05, longitude: 108.05, label: 'Điểm dừng' };
const input = { origin, destination: end, waypoints: [waypoint], mode: 'DRIVING', fromGps: false };

const rows = initialStops(); rows[0].placeId = 'first'; rows[1].placeId = 'last';
assert.deepEqual(plain(rows.map((_, index) => stopRole(index, rows.length))), ['Điểm xuất phát', 'Điểm đến']);
const next = [...rows, createStop('new-last')];
assert.deepEqual(plain(next.map((_, index) => stopRole(index, next.length))), ['Điểm xuất phát', 'Điểm dừng 1', 'Điểm đến']);
assert.notEqual(next[1].id, next[2].id);
const reordered = moveStop(next, next[1].id, 2);
assert.equal(reordered[2].id, next[1].id); assert.equal(reordered[2].placeId, 'last');
assert.equal(moveStop(next, next[0].id, 2), next, 'origin stays first');
assert.throws(() => resolveStops([{ id: 'empty', placeId: '' }, ...rows], [], null), /điểm xuất phát/);
const duplicates = [createStop('same-place'), createStop('same-place')];
assert.notEqual(duplicates[0].id, duplicates[1].id, 'place ID is not used as row ID');
validateRouteInput(input);
assert.throws(() => validateRouteInput({ ...input, waypoints: Array(5).fill(waypoint) }), /6 điểm/);
assert.throws(() => validateRouteInput({ ...input, waypoints: [{ latitude: 100, longitude: 108 }] }), /hợp lệ/);
assert.throws(() => validateRouteInput({ ...input, waypoints: [origin] }), /liên tiếp/);
validateRouteInput({ ...input, destination: origin }); // round trip with a real intermediate point

let calls = 0;
fetcher = async (url, options) => { calls++; assert.equal(url, '/api/v1/map/routes', 'routing uses the web origin instead of browser localhost'); assert.deepEqual(JSON.parse(options.body), input); return new Response(JSON.stringify({ detail: 'Chưa cấu hình chỉ đường' }), { status: 503 }); };
await assert.rejects(computeVistaRoute(input), /Chưa cấu hình/);
assert.equal(calls, 1, 'the browser makes one same-origin request and never invents a path');
const result = { path: [{ lat: 16, lng: 108 }, { lat: 16.07, lng: 108.02 }, { lat: 16.1, lng: 108.1 }], distanceMeters: 2000, durationMillis: 120000, legs: [{ fromLabel: 'Xuất phát', toLabel: 'Điểm dừng', distanceMeters: 800, durationMillis: 50000 }, { fromLabel: 'Điểm dừng', toLabel: 'Điểm đến', distanceMeters: 1200, durationMillis: 70000 }], warnings: [], attribution: 'fixture' };
fetcher = async () => new Response(JSON.stringify(result));
const route = await computeVistaRoute(input);
assert.deepEqual(plain(route.path), result.path, 'provider geometry is preserved exactly');
assert.equal(route.distanceMeters, 2000); assert.equal(route.durationMillis, 120000);
fetcher = async () => new Response(JSON.stringify({ ...result, legs: [] }));
await assert.rejects(computeVistaRoute(input), /đủ các chặng/);

let resolveOld, resolveNew; const accepted = [];
const requests = new LatestRouteRequest();
const old = requests.run(() => new Promise((resolve) => { resolveOld = resolve; }), (value) => accepted.push(value), assert.fail);
const current = requests.run(() => new Promise((resolve) => { resolveNew = resolve; }), (value) => accepted.push(value), assert.fail);
resolveNew('current'); await current; resolveOld('stale'); await old;
assert.deepEqual(accepted, ['current']);
const invalidated = requests.run(() => new Promise((resolve) => { resolveOld = resolve; }), (value) => accepted.push(value), assert.fail);
requests.invalidate(); resolveOld('after edit'); await invalidated; assert.deepEqual(accepted, ['current']);

const ring = accuracyRing(16, 108, 25);
assert.equal(ring.length, 65);
const radians = Math.PI / 180;
for (const [lng, lat] of ring) {
  const a = Math.sin((lat - 16) * radians / 2) ** 2 + Math.cos(16 * radians) * Math.cos(lat * radians) * Math.sin((lng - 108) * radians / 2) ** 2;
  const meters = 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  assert.ok(Math.abs(meters - 25) < 0.001, 'accuracy ring uses meters');
}
console.log('PASS: stable stop IDs, role changes, ordering, complete input validation, exact API geometry/metrics, no invented fallback, stale response rejection, accuracy radius in meters.');
