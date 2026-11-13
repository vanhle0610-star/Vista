import type { components } from '@/types/api.generated';
import type { DestinationMarker } from '../types';
import { validPoint } from '../coordinates';
import { VIETNAM_1000_DESTINATIONS } from './vietnam1000Destinations';

export { validPoint } from '../coordinates';
export { VIETNAM_1000_DESTINATIONS };

type Page = components['schemas']['DestinationPage'];

/**
 * Tải danh sách điểm đến hiển thị trên bản đồ VISTA:
 * - Khởi tạo ngay lập tức với kho 1.000 địa điểm chuẩn hóa khắp 63 tỉnh thành Việt Nam (0ms chờ).
 * - Cố gắng kết nối backend để tải thêm các địa điểm mới do người dùng tạo (nếu có).
 */
export async function fetchMapDestinations(
  signal?: AbortSignal,
  onPage?: (result: { destinations: DestinationMarker[]; rejected: number }) => void
) {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/+$/, '');

  // 1. Nạp sẵn 1.000 địa điểm chuẩn hóa toàn quốc kèm ảnh và tọa độ thực tế
  const destinations: DestinationMarker[] = VIETNAM_1000_DESTINATIONS.map((d: any) => ({
    ...d,
    imageUrl: d.imageUrl || d.thumbnailUrl || '',
    thumbnailUrl: d.thumbnailUrl || d.imageUrl || '',
  }));
  const backendIds = new Set<string>();
  let rejected = 0;
  let missingIds = 0;

  // Phát tín hiệu trang đầu tiên ngay lập tức để giao diện hiển thị 1.000 điểm không cần đợi
  onPage?.({ destinations: [...destinations], rejected: 0 });

  // 2. Tải toàn bộ các trang từ backend API (hỗ trợ đầy đủ 669+ địa điểm thực tế trong DB)
  try {
    for (let page = 0; page < 15; page++) {
      const timeout = AbortSignal.timeout(6000);
      const response = await fetch(`${base}/destinations?page=${page}&size=100`, {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        break;
      }

      const data: Page = await response.json();
      if (!data || !Array.isArray(data.items) || data.items.length === 0) {
        break;
      }

      let added = 0;
      for (const item of data.items) {
        if (!item || typeof item.id !== 'string' || !item.id.trim()) {
          rejected++;
          missingIds++;
          continue;
        }

        backendIds.add(item.id);
        const normItemName = (item.name || '').trim().toLowerCase();
        const existingByIdOrName = destinations.find(
          (d) => d.id === item.id || (normItemName && d.name.trim().toLowerCase() === normItemName)
        );
        if (existingByIdOrName) {
          existingByIdOrName.id = item.id;
          if (item.province) existingByIdOrName.province = item.province;
          if (item.category) existingByIdOrName.category = item.category;
          if (validPoint(item)) {
            existingByIdOrName.latitude = item.latitude!;
            existingByIdOrName.longitude = item.longitude!;
          }
          if (typeof item.priceMin === 'number') existingByIdOrName.priceMin = item.priceMin;
          if (typeof item.priceMax === 'number') existingByIdOrName.priceMax = item.priceMax;
          if (
            item.imageUrl &&
            (item.imageUrl.startsWith('http://') ||
              item.imageUrl.startsWith('https://') ||
              item.imageUrl.startsWith('/images/'))
          ) {
            existingByIdOrName.imageUrl = item.imageUrl;
            existingByIdOrName.thumbnailUrl = item.imageUrl;
          }
          added++;
          continue;
        }

        if (
          !validPoint(item) ||
          typeof item.name !== 'string' ||
          !item.name.trim() ||
          typeof item.province !== 'string' ||
          typeof item.category !== 'string' ||
          item.status !== 'PUBLISHED'
        ) {
          rejected++;
          continue;
        }

        const rawImg = item.imageUrl || (item as any).thumbnailUrl || '';
        const imgUrl =
          rawImg.startsWith('http://') ||
          rawImg.startsWith('https://') ||
          rawImg.startsWith('/images/')
            ? rawImg
            : '';
        destinations.push({
          id: item.id,
          name: item.name,
          province: item.province,
          category: item.category,
          latitude: item.latitude!,
          longitude: item.longitude!,
          description: (item as any).description || '',
          priceMin: item.priceMin,
          priceMax: item.priceMax,
          imageUrl: imgUrl,
          thumbnailUrl: imgUrl,
          rating: (item as any).rating ?? null,
          reviewCount: (item as any).reviewCount ?? 0,
        });
        added++;
      }

      if (added > 0) {
        onPage?.({ destinations: [...destinations], rejected });
      }

      if (backendIds.size + missingIds >= data.total || data.items.length < 100) {
        break;
      }
    }
  } catch {
    // Không có mạng hoặc backend offline: Giữ nguyên danh sách địa điểm đã nạp
  }

  return { destinations, rejected };
}
