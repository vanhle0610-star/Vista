import type { components } from '@/types/api.generated';
import { api } from '@/services/api/client';
import { validCoordinate, type MapMarker } from './types';
type DestinationPage = components['schemas']['DestinationPage'];
export function destinationMarkers(items: DestinationPage['items']) {
  const markers: MapMarker[] = [];
  let rejected = 0;
  for (const item of items) {
    if (!validCoordinate(item)) {
      rejected++;
      continue;
    }
    markers.push({
      id: item.id,
      title: item.name,
      description: `${item.province} · ${item.category}`,
      latitude: item.latitude!,
      longitude: item.longitude!,
    });
  }
  return { markers, rejected };
}
export async function loadMapDestinations(signal?: AbortSignal) {
  const items: DestinationPage['items'] = [];
  const ids = new Set<string>();
  for (let page = 0; page < 100; page++) {
    const { data } = await api.get<DestinationPage>('/destinations', {
      params: { page, size: 100 },
      signal,
    });
    if (!Array.isArray(data.items) || !Number.isFinite(data.total))
      throw new Error('Phản hồi địa điểm không đúng contract.');
    let added = 0;
    for (const item of data.items)
      if (!ids.has(item.id)) {
        ids.add(item.id);
        items.push(item);
        added++;
      }
    if (ids.size >= data.total) return destinationMarkers(items);
    if (!added) throw new Error('Không thể tải đầy đủ phân trang địa điểm.');
  }
  throw new Error('Danh sách địa điểm vượt giới hạn tải của bản đồ.');
}
