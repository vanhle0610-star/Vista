import type { components } from '@/types/api.generated';
import type { DestinationMarker } from '../types';

type Page = components['schemas']['DestinationPage'];
import { validPoint } from '../coordinates';
export { validPoint } from '../coordinates';

// Public TV1 endpoint, independent of the protected /destinations admin page.
export async function fetchMapDestinations(signal?: AbortSignal, onPage?: (result: { destinations: DestinationMarker[]; rejected: number }) => void) {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/+$/, '');
  const destinations: DestinationMarker[] = [];
  const ids = new Set<string>();
  let rejected = 0;
  let missingIds = 0;
  for (let page = 0; page < 500; page++) {
    const timeout = AbortSignal.timeout(25000);
    const response = await fetch(`${base}/destinations?page=${page}&size=20`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Không tải được điểm đến (${response.status}). Vui lòng thử lại.`);
    const data: Page = await response.json();
    if (!data || !Array.isArray(data.items) || !Number.isInteger(data.total) || data.total < 0)
      throw new Error('Dữ liệu điểm đến không đúng định dạng.');
    let added = 0;
    for (const item of data.items) {
      if (!item || typeof item.id !== 'string' || !item.id.trim()) { rejected++; missingIds++; added++; continue; }
      if (ids.has(item.id)) continue;
      ids.add(item.id); added++;
      if (!validPoint(item) || typeof item.name !== 'string' || !item.name.trim() ||
        typeof item.province !== 'string' || typeof item.category !== 'string' || item.status !== 'PUBLISHED') { rejected++; continue; }
      destinations.push({ id: item.id, name: item.name, province: item.province,
        category: item.category, latitude: item.latitude!, longitude: item.longitude!,
        description: '', priceMin: item.priceMin, priceMax: item.priceMax });
      // imageUrl in the seed is a Storage object key, not a public URL. Do not
      // invent a host or use an unrelated image when Storage is not configured.
    }
    onPage?.({ destinations: [...destinations], rejected });
    if (ids.size + missingIds >= data.total) return { destinations, rejected };
    if (!added) throw new Error('Không tải đủ các trang điểm đến. Vui lòng thử lại.');
  }
  throw new Error('Danh sách điểm đến vượt giới hạn tải.');
}
