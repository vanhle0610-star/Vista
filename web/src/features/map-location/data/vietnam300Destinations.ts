// Tự động đồng bộ từ kho dữ liệu chuẩn hóa 1.000 địa điểm Việt Nam
// Giữ nguyên tương thích ngược cho toàn bộ codebase hiện có

import { VIETNAM_1000_DESTINATIONS } from './vietnam1000Destinations';
import type { DestinationMarker } from '../types';

export const VIETNAM_300_DESTINATIONS: DestinationMarker[] = VIETNAM_1000_DESTINATIONS;
export default VIETNAM_300_DESTINATIONS;
