import { NextResponse } from 'next/server';

type CoordPoint = { lat: number; lng: number };
export type RoadLegSummary = { distanceKm: number; durationMin: number };

interface CachedRoadRoute {
  path: CoordPoint[];
  distanceMeters: number;
  durationMillis: number;
  legs: RoadLegSummary[];
  source: string;
  expiresAt: number;
}

const ROUTE_CACHE = new Map<string, CachedRoadRoute>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 300;

function haversineMeters(a: CoordPoint, b: CoordPoint): number {
  const R = 6371e3;
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dp = ((b.lat - a.lat) * Math.PI) / 180;
  const dl = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function buildFallbackRoute(points: CoordPoint[], mode: 'DRIVING' | 'WALKING'): CachedRoadRoute {
  const path: CoordPoint[] = [];
  const legs: RoadLegSummary[] = [];
  const speedKmh = mode === 'WALKING' ? 4.5 : 32;
  let totalDist = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const m = Math.round(haversineMeters(start, end) * 1.28); // Road detour factor
    totalDist += m;
    const durMin = Math.max(2, Math.round((m / 1000 / speedKmh) * 60));
    legs.push({ distanceKm: Number((m / 1000).toFixed(1)), durationMin: durMin });

    const steps = 12;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      path.push({
        lat: start.lat + (end.lat - start.lat) * t,
        lng: start.lng + (end.lng - start.lng) * t,
      });
    }
  }
  path.push(points[points.length - 1]);

  return {
    path,
    distanceMeters: totalDist,
    durationMillis: Math.round((totalDist / (speedKmh * 1000)) * 3600 * 1000),
    legs,
    source: 'geodesic-fallback',
    expiresAt: Date.now() + 2 * 60 * 1000,
  };
}

function makeCacheKey(points: CoordPoint[], mode: string): string {
  return `${mode}:${points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';')}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mode: 'DRIVING' | 'WALKING' = body?.mode === 'WALKING' ? 'WALKING' : 'DRIVING';
    const rawPoints: Array<Record<string, unknown>> = Array.isArray(body?.points) ? body.points : [];

    const points: CoordPoint[] = rawPoints
      .map((p) => ({
        lat: Number(p?.lat ?? p?.latitude),
        lng: Number(p?.lng ?? p?.longitude),
      }))
      .filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng) &&
          Math.abs(p.lat) <= 90 &&
          Math.abs(p.lng) <= 180
      );

    if (points.length < 2) {
      return NextResponse.json({ error: 'At least 2 valid coordinate points required' }, { status: 400 });
    }

    const cacheKey = makeCacheKey(points, mode);
    const cached = ROUTE_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        path: cached.path,
        distanceMeters: cached.distanceMeters,
        durationMillis: cached.durationMillis,
        legs: cached.legs,
        source: 'osrm-cached',
      });
    }

    const coordsStr = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const osrmProfile = mode === 'WALKING' ? 'foot' : 'driving';
    const fossgisProfile = mode === 'WALKING' ? 'routed-foot' : 'routed-car';

    const mirrors = [
      {
        name: 'osrm-primary',
        url: `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordsStr}?overview=full&geometries=geojson`,
      },
      {
        name: 'osrm-fossgis',
        url: `https://routing.openstreetmap.de/${fossgisProfile}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`,
      },
    ];

    for (const mirror of mirrors) {
      try {
        const res = await fetch(mirror.url, {
          headers: { 'User-Agent': 'VISTA-SmartTravel/2.0 (https://vista-travel.vn)' },
          signal: AbortSignal.timeout(6500),
        });
        if (!res.ok) continue;
        const json = await res.json();
        if (json?.code === 'Ok' && Array.isArray(json.routes) && json.routes.length > 0) {
          const route = json.routes[0];
          const rawCoords: [number, number][] = route.geometry?.coordinates || [];
          const path: CoordPoint[] = rawCoords.map(([lng, lat]) => ({ lat, lng }));
          const legs: RoadLegSummary[] = Array.isArray(route.legs)
            ? route.legs.map((lg: any) => ({
                distanceKm: Number(((Number(lg?.distance) || 0) / 1000).toFixed(1)),
                durationMin: Math.max(1, Math.round((Number(lg?.duration) || 0) / 60)),
              }))
            : [];

          if (path.length >= 2) {
            if (ROUTE_CACHE.size >= MAX_CACHE_SIZE) {
              const firstKey = ROUTE_CACHE.keys().next().value;
              if (firstKey) ROUTE_CACHE.delete(firstKey);
            }
            const entry: CachedRoadRoute = {
              path,
              distanceMeters: Math.round(Number(route.distance) || 0),
              durationMillis: Math.round((Number(route.duration) || 0) * 1000),
              legs,
              source: mirror.name,
              expiresAt: Date.now() + CACHE_TTL_MS,
            };
            ROUTE_CACHE.set(cacheKey, entry);

            return NextResponse.json({
              path: entry.path,
              distanceMeters: entry.distanceMeters,
              durationMillis: entry.durationMillis,
              legs: entry.legs,
              source: entry.source,
            });
          }
        }
      } catch {
        // Try next mirror
      }
    }

    const fb = buildFallbackRoute(points, mode);
    return NextResponse.json({
      path: fb.path,
      distanceMeters: fb.distanceMeters,
      durationMillis: fb.durationMillis,
      legs: fb.legs,
      source: fb.source,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Routing error' }, { status: 500 });
  }
}

