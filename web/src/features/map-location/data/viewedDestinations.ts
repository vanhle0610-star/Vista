import type { components } from '@/types/api.generated';

type Detail = components['schemas']['DestinationDetail'];
// Session-memory cache for public information already viewed, never GPS or authentication data.
const viewed = new Map<string, Detail>();
export function rememberDestination(detail: Detail) {
  viewed.delete(detail.id);
  viewed.set(detail.id, detail);
  if (viewed.size > 20) viewed.delete(viewed.keys().next().value!);
}
export function viewedDestination(id: string) { return viewed.get(id) ?? null; }
