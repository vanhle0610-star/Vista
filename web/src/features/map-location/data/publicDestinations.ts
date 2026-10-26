import type { components } from '@/types/api.generated';
import type { DestinationMarker } from '../types';
import { validPoint } from '../coordinates';
import { VIETNAM_300_DESTINATIONS } from './vietnam300Destinations';

export { validPoint } from '../coordinates';

type Page = components['schemas']['DestinationPage'];

/**
 * Tải danh sách điểm đến hiển thị trên bản đồ VISTA:
 * - Khởi tạo ngay lập tức với kho 300+ địa điểm chuẩn hóa khắp 63 tỉnh thành Việt Nam (0ms chờ).
 * - Cố gắng kết nối backend để tải thêm các địa điểm mới do người dùng tạo (nếu có).
 */
export async function fetchMapDestinations(
  signal?: AbortSignal,
  onPage?: (result: { destinations: DestinationMarker[]; rejected: number }) => void
) {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/+$/, '');

  // 1. Nạp sẵn 300+ địa điểm chuẩn hóa toàn quốc kèm ảnh và tọa độ thực tế
  const destinations: DestinationMarker[] = VIETNAM_300_DESTINATIONS.map((d: any) => ({
    ...d,
    thumbnailUrl: d.thumbnailUrl || d.imageUrl || '',
  }));
  const ids = new Set<string>(destinations.map((d) => d.id));
  let rejected = 0;
  let missingIds = 0;

  // Phát tín hiệu trang đầu tiên ngay lập tức để giao diện hiển thị 300 điểm không cần đợi
  onPage?.({ destinations: [...destinations], rejected: 0 });

  // 2. Tải thêm từ backend API nếu máy chủ đang chạy
  try {
    for (let page = 0; page < 20; page++) {
      const timeout = AbortSignal.timeout(5000);
      const response = await fetch(`${base}/destinations?page=${page}&size=20`, {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        // Backend không có thêm dữ liệu hoặc trả về lỗi, dừng lặp và giữ nguyên 300 điểm
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

        if (ids.has(item.id)) continue;
        ids.add(item.id);

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
        });
        added++;
      }

      if (added > 0) {
        onPage?.({ destinations: [...destinations], rejected });
      }

      if (ids.size + missingIds >= data.total) {
        break;
      }
    }
  } catch {
    // Không có mạng hoặc backend offline: Giữ nguyên 300 địa điểm đã nạp
  }

  return { destinations, rejected };
}
