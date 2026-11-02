import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const modules = new Map();
function load(path) {
  if (modules.has(path)) return modules.get(path);
  const code = ts.transpileModule(fs.readFileSync(new URL('../src/features/map-location/' + path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const compiled = { exports: {} };
  vm.runInNewContext(code, {
    module: compiled, exports: compiled.exports, Request, Response, URL, AbortSignal, setTimeout, clearTimeout,
    process: { env: { NEXT_PUBLIC_API_URL: 'http://localhost:8080/api/v1' } },
    require(name) {
      if (name === '../coordinates') return load('coordinates.ts');
      if (name === './routes') return load('routing/routes.ts');
      throw new Error('Unexpected import: ' + name);
    },
  });
  modules.set(path, compiled.exports); return compiled.exports;
}
const { handleRouteRequest } = load('routing/server.ts');
const input = { origin: { latitude: 16, longitude: 108, label: 'Xuất phát' }, destination: { latitude: 16.2, longitude: 108.2, label: 'Điểm đến' }, waypoints: [{ latitude: 16.1, longitude: 108.1, label: 'Điểm dừng' }], mode: 'DRIVING', fromGps: false };
const request = (value = input) => new Request('http://localhost:3100/api/v1/map/routes', { method: 'POST', body: JSON.stringify(value) });
const realGeometryFixture = [[108, 16], [108.04, 16.08], [108.1, 16.1], [108.13, 16.18], [108.2, 16.2]];
const osrm = { code: 'Ok', waypoints: [{}, {}, {}], routes: [{ geometry: { type: 'LineString', coordinates: realGeometryFixture }, legs: [{ distance: 1000.5, duration: 50.2 }, { distance: 2000.3, duration: 100.1 }] }] };
const clone = (value) => JSON.parse(JSON.stringify(value));
let calls = [];
const walkingStarts = [];
const fallback = async (url, options) => {
  calls.push({ url: String(url), options });
  if (String(url).startsWith('http://localhost:8080')) return Response.json({ detail: 'ORS chưa cấu hình' }, { status: 503 });
  if (String(url).includes('/routed-foot/')) walkingStarts.push(Date.now());
  return Response.json(osrm);
};
let response = await handleRouteRequest(request(), fallback);
assert.equal(response.status, 200); const routed = await response.json();
assert.equal(calls.length, 2); assert.deepEqual(JSON.parse(calls[0].options.body), input);
assert.match(calls[1].url, /route\/v1\/driving\/108,16;108.1,16.1;108.2,16.2/);
assert.deepEqual(routed.path, realGeometryFixture.map(([lng, lat]) => ({ lat, lng })));
assert.equal(routed.legs.length, 2); assert.equal(routed.legs[0].toLabel, 'Điểm dừng');
assert.equal(routed.distanceMeters, 3000.8); assert.equal(routed.durationMillis, 150300);
assert.match(routed.attribution, /OSRM/); assert.match(routed.warnings[0], /dự phòng/);
assert.equal(response.headers.get('Cache-Control'), 'no-store');

calls = [];
response = await handleRouteRequest(request(), async (url, options) => { calls.push({ url, options }); return Response.json(routed); });
assert.equal(response.status, 200); assert.equal(calls.length, 1, 'healthy ORS result never calls OSRM');

calls = [];
response = await handleRouteRequest(request(), async (url) => { calls.push(String(url)); if (String(url).startsWith('http://localhost:8080')) throw new TypeError('fetch failed'); return Response.json(osrm); });
assert.equal(response.status, 200); assert.equal(calls.length, 2, 'stopped backend still permits the existing car service');

calls = [];
response = await handleRouteRequest(request({ ...input, mode: 'WALKING' }), fallback);
assert.equal(response.status, 200); assert.equal(calls.length, 2);
assert.match(calls[1].url, /^https:\/\/routing.openstreetmap.de\/routed-foot\/route\/v1\/foot\//, 'walking must use a real pedestrian graph');
assert.doesNotMatch(calls[1].url, /router.project-osrm.org/);
assert.equal(calls[1].options.headers['User-Agent'], 'VISTA-OJT/1.0 (travel route planner)');
const walked = await response.json();
assert.equal(walked.input.mode, 'WALKING'); assert.equal(walked.legs.length, 2);
assert.match(walked.attribution, /FOSSGIS/);
assert.equal(walked.durationMillis, 150300, 'walking time is taken from the pedestrian service without a speed estimate');

for (const status of [400, 401, 403, 429]) {
  let count = 0;
  response = await handleRouteRequest(request(), async () => { count++; return Response.json({ detail: 'Backend error' }, { status }); });
  assert.equal(response.status, status); assert.equal(count, 1, 'do not bypass backend rules');
}
let count = 0;
response = await handleRouteRequest(request(), async () => { count++; return Response.json(null); });
assert.equal(await response.json(), null); assert.equal(count, 1, 'no-route is not replaced with another route');

for (const invalid of [{ ...input, waypoints: Array(5).fill(input.waypoints[0]) }, { ...input, waypoints: [null] }, { ...input, waypoints: 'bad' }, { ...input, origin: null }]) {
  response = await handleRouteRequest(request(invalid), () => assert.fail('Invalid input must never call an upstream'));
  assert.equal(response.status, 400);
}
for (const bad of [
  { ...osrm, routes: [{ ...osrm.routes[0], legs: [] }] },
  { ...osrm, routes: [{ ...osrm.routes[0], geometry: { type: 'LineString', coordinates: [[108, 16], [999, 16]] } }] },
  { ...osrm, routes: [{ ...osrm.routes[0], legs: [{ distance: -10, duration: 50 }, { distance: 20, duration: 50 }] }] },
]) {
  response = await handleRouteRequest(request(), async (url) => String(url).startsWith('http://localhost:8080') ? Response.json({}, { status: 503 }) : Response.json(bad));
  assert.equal(response.status, 502, 'malformed provider responses never become invented geometry');
}
response = await handleRouteRequest(request(), async () => { throw new TypeError('offline'); });
assert.equal(response.status, 503); assert.match((await response.json()).detail, /ô tô/);
let footCalls = [];
const unavailableFoot = async (url) => { footCalls.push(String(url)); if (String(url).includes('/routed-foot/')) walkingStarts.push(Date.now()); throw new TypeError('offline'); };
response = await handleRouteRequest(request({ ...input, mode: 'WALKING' }), unavailableFoot);
assert.equal(response.status, 503); assert.match((await response.json()).detail, /đi bộ/);
assert.equal(footCalls.length, 2); assert.doesNotMatch(footCalls[1], /router.project-osrm.org/);
footCalls = [];
response = await handleRouteRequest(request({ ...input, mode: 'WALKING' }), async (url) => {
  footCalls.push(String(url));
  if (String(url).includes('/routed-foot/')) walkingStarts.push(Date.now());
  return String(url).startsWith('http://localhost:8080') ? Response.json({}, { status: 503 }) : Response.json({ code: 'NoRoute' }, { status: 400 });
});
assert.equal(await response.json(), null, 'a missing pedestrian route never falls back to the car graph');
assert.equal(footCalls.length, 2);
for (let index = 1; index < walkingStarts.length; index++) assert.ok(walkingStarts[index] - walkingStarts[index - 1] >= 1000, 'public pedestrian service receives at most one request/second');
const noRoute = clone(osrm); noRoute.code = 'NoRoute';
response = await handleRouteRequest(request(), async (url) => String(url).startsWith('http://localhost:8080') ? Response.json({}, { status: 503 }) : Response.json(noRoute, { status: 400 }));
assert.equal(await response.json(), null);
console.log('PASS: same-origin proxy, healthy ORS, separate OSRM pedestrian/car endpoints, ordered waypoints, provider geometry/time, pedestrian no-route/errors without car fallback, input/rate/access limits.');
