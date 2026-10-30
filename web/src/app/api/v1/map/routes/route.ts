import { handleRouteRequest } from '@/features/map-location/routing/server';

export async function POST(request: Request) {
  return handleRouteRequest(request);
}
