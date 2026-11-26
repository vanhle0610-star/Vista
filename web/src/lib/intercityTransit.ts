/**
 * Intercity Transit & Seasonal Dynamic Pricing Helper (VISTA Web - TV4)
 * Hỗ trợ chuẩn hóa địa danh linh hoạt (VD: "Hội An (Quảng Nam)", "Quảng Nam", "Thừa Thiên Huế"),
 * tự động tính toán cự ly thực tế theo GPS (Haversine) và định giá vé máy bay / tàu xe linh động theo khoảng cách.
 */

export interface IntercityTransitResult {
  isIntercity: boolean;
  origin: string;
  destination: string;
  normalizedOrigin: string;
  normalizedDestination: string;
  distanceKm: number;
  transportMode: string;
  transportName: string;
  baseFarePerPerson: number;
  actualFarePerPerson: number;
  seasonalFactor: number;
  seasonName: string;
  seasonBadge: string;
  peopleCount: number;
  totalTransitCostVnd: number;
  arrivalHub: string;
  summary: string;
  isAvailable: boolean;
  unavailableReason?: string;
  suggestedMode?: string;
}

export interface TransportModeOption {
  id: string;
  label: string;
  desc: string;
  available: boolean;
  unavailableReason?: string;
  isRecommended?: boolean;
}

// Bảng tọa độ trung tâm phục vụ tính cự ly địa lý chính xác (km)
export const PROVINCE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Hà Nội': { lat: 21.0285, lng: 105.8542 },
  'TP. Hồ Chí Minh': { lat: 10.7769, lng: 106.7009 },
  'Hồ Chí Minh': { lat: 10.7769, lng: 106.7009 },
  'Đà Nẵng': { lat: 16.0544, lng: 108.2022 },
  'Thừa Thiên Huế': { lat: 16.4637, lng: 107.5909 },
  'Quảng Nam': { lat: 15.8801, lng: 108.3380 },
  'Quảng Ngãi': { lat: 15.1205, lng: 108.7923 },
  'Bình Định': { lat: 13.7820, lng: 109.2194 },
  'Khánh Hòa': { lat: 12.2388, lng: 109.1967 },
  'Lâm Đồng': { lat: 11.9404, lng: 108.4583 },
  'Kiên Giang': { lat: 10.2899, lng: 103.9840 },
  'Lào Cai': { lat: 22.3364, lng: 103.8438 },
  'Hà Giang': { lat: 22.8233, lng: 104.9836 },
  'Quảng Ninh': { lat: 20.9505, lng: 107.0734 },
  'Ninh Bình': { lat: 20.2506, lng: 105.9745 },
  'Cần Thơ': { lat: 10.0452, lng: 105.7469 },
  'Hải Phòng': { lat: 20.8449, lng: 106.6881 },
  'Bà Rịa - Vũng Tàu': { lat: 10.3460, lng: 107.0843 },
  'Bình Thuận': { lat: 10.9333, lng: 108.1000 },
  'Quảng Bình': { lat: 17.5833, lng: 106.2833 },
  'Nghệ An': { lat: 18.6734, lng: 105.6813 },
  'Thanh Hóa': { lat: 19.8067, lng: 105.7852 },
  'Phú Yên': { lat: 13.0882, lng: 109.3087 },
  'Đắk Lắk': { lat: 12.6667, lng: 108.0500 },
  'Gia Lai': { lat: 13.9833, lng: 108.0000 },
  'Cà Mau': { lat: 9.1769, lng: 105.1524 },
  'Điện Biên': { lat: 21.3869, lng: 103.0233 },
};

// Các tỉnh có cảng hàng không thương mại đang khai thác
export const PROVINCES_WITH_AIRPORT: Record<string, string> = {
  'Hà Nội': 'Cảng hàng không Quốc tế Nội Bài (HAN)',
  'TP. Hồ Chí Minh': 'Cảng hàng không Quốc tế Tân Sơn Nhất (SGN)',
  'Hồ Chí Minh': 'Cảng hàng không Quốc tế Tân Sơn Nhất (SGN)',
  'Đà Nẵng': 'Cảng hàng không Quốc tế Đà Nẵng (DAD)',
  'Thừa Thiên Huế': 'Cảng hàng không Quốc tế Phú Bài (HUI)',
  'Quảng Nam': 'Cảng hàng không Chu Lai (VCL) / Sân bay Đà Nẵng kết nối Hội An',
  'Khánh Hòa': 'Cảng hàng không Quốc tế Cam Ranh (CXR)',
  'Lâm Đồng': 'Cảng hàng không Liên Khương (DLI)',
  'Kiên Giang': 'Cảng hàng không Quốc tế Phú Quốc (PQC)',
  'Hải Phòng': 'Cảng hàng không Quốc tế Cát Bi (HPH)',
  'Cần Thơ': 'Cảng hàng không Quốc tế Cần Thơ (VCA)',
  'Quảng Ninh': 'Cảng hàng không Quốc tế Vân Đồn (VDO)',
  'Quảng Bình': 'Cảng hàng không Đồng Hới (VDH)',
  'Nghệ An': 'Cảng hàng không Quốc tế Vinh (VII)',
  'Thanh Hóa': 'Cảng hàng không Thọ Xuân (THD)',
  'Bình Định': 'Cảng hàng không Phù Cát (UIH)',
  'Phú Yên': 'Cảng hàng không Tuy Hòa (TBB)',
  'Đắk Lắk': 'Cảng hàng không Buôn Ma Thuột (BMV)',
  'Gia Lai': 'Cảng hàng không Pleiku (PXU)',
  'Cà Mau': 'Cảng hàng không Cà Mau (CAH)',
  'Điện Biên': 'Cảng hàng không Điện Biên Phủ (DIN)',
  'Bà Rịa - Vũng Tàu': 'Cảng hàng không Côn Đảo (VCS)',
};

/**
 * Chuẩn hóa tên địa danh (loại bỏ tiền tố/hậu tố, trích xuất tỉnh thành chuẩn)
 * VD: "Hội An (Quảng Nam)" -> "Quảng Nam"
 *     "Đà Lạt (Lâm Đồng)" -> "Lâm Đồng"
 *     "Sa Pa (Lào Cai)" -> "Lào Cai"
 *     "TP. Hồ Chí Minh" -> "Hồ Chí Minh"
 */
export function normalizeProvinceName(rawName: string): string {
  if (!rawName) return '';
  let str = rawName.trim();

  // 1. Nếu có ngoặc đơn chứa tên tỉnh: e.g. "Hội An (Quảng Nam)" -> "Quảng Nam"
  const bracketMatch = str.match(/\(([^)]+)\)/);
  if (bracketMatch && bracketMatch[1]) {
    const inside = bracketMatch[1].trim();
    if (PROVINCE_COORDINATES[inside] || inside.includes('Quảng Nam') || inside.includes('Lâm Đồng') || inside.includes('Khánh Hòa') || inside.includes('Kiên Giang') || inside.includes('Lào Cai') || inside.includes('Bà Rịa')) {
      str = inside;
    }
  }

  // 2. Chuẩn hóa các tên thành phố/tỉnh đặc thù
  if (str.includes('Hội An') || str.includes('Quảng Nam')) return 'Quảng Nam';
  if (str.includes('Huế') || str.includes('Thừa Thiên')) return 'Thừa Thiên Huế';
  if (str.includes('Sài Gòn') || str.includes('Hồ Chí Minh')) return 'Hồ Chí Minh';
  if (str.includes('Hà Nội')) return 'Hà Nội';
  if (str.includes('Đà Nẵng')) return 'Đà Nẵng';
  if (str.includes('Sa Pa') || str.includes('Lào Cai')) return 'Lào Cai';
  if (str.includes('Đà Lạt') || str.includes('Lâm Đồng')) return 'Lâm Đồng';
  if (str.includes('Nha Trang') || str.includes('Khánh Hòa')) return 'Khánh Hòa';
  if (str.includes('Phú Quốc') || str.includes('Kiên Giang')) return 'Kiên Giang';
  if (str.includes('Hạ Long') || str.includes('Quảng Ninh')) return 'Quảng Ninh';
  if (str.includes('Vũng Tàu')) return 'Bà Rịa - Vũng Tàu';
  if (str.includes('Phan Thiết') || str.includes('Bình Thuận')) return 'Bình Thuận';
  if (str.includes('Quy Nhơn') || str.includes('Bình Định')) return 'Bình Định';
  if (str.includes('Hải Phòng')) return 'Hải Phòng';
  if (str.includes('Cần Thơ')) return 'Cần Thơ';
  if (str.includes('Ninh Bình')) return 'Ninh Bình';

  return str;
}

/**
 * Tính khoảng cách địa lý theo công thức Haversine giữa 2 tỉnh thành (km)
 */
export function calculateGeographicDistanceKm(p1: string, p2: string): number {
  const norm1 = normalizeProvinceName(p1);
  const norm2 = normalizeProvinceName(p2);

  if (norm1.toLowerCase() === norm2.toLowerCase()) return 0;

  const c1 = PROVINCE_COORDINATES[norm1];
  const c2 = PROVINCE_COORDINATES[norm2];

  if (!c1 || !c2) {
    // Ước tính khoảng cách mặc định nếu thiếu tọa độ
    return 650;
  }

  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Tính giá vé máy bay khứ hồi linh động dựa trên khoảng cách cự ly bay thực tế (km)
 * - Cự ly ngắn (< 400km): Giá sàn ngắn ~1.500.000đ - 1.800.000đ (VD: TP.HCM - Đà Lạt/Cam Ranh/Phú Quốc)
 * - Cự ly trung bình (400 - 800km): ~2.000.000đ - 2.200.000đ (VD: Hà Nội/TP.HCM - Đà Nẵng, Huế)
 * - Cự ly dài (800 - 1300km): ~2.400.000đ - 2.800.000đ (VD: Hà Nội - TP.HCM, Cần Thơ, Phú Quốc)
 */
export function calculateDynamicFlightBaseFare(distanceKm: number): number {
  if (distanceKm < 200) return 0; // Không có đường bay cự ly siêu ngắn
  if (distanceKm <= 350) return 1650000;
  if (distanceKm <= 550) return 1950000;
  if (distanceKm <= 850) return 2200000;
  if (distanceKm <= 1150) return 2550000;
  return 2850000; // Cự ly > 1150km (Hà Nội - Phú Quốc/Cà Mau)
}

// Bảng ma trận các tuyến liên tỉnh thực tế và các phương tiện khả thi
const FARE_MATRIX: Record<string, Record<string, Record<string, { base: number; hub: string; available?: boolean; unavailableReason?: string }>>> = {
  'Hà Nội': {
    'Đà Nẵng': {
      flight: { base: 2200000, hub: 'Sân bay Quốc tế Đà Nẵng' },
      train: { base: 1300000, hub: 'Ga Đà Nẵng' },
      coach: { base: 700000, hub: 'Bến xe Trung tâm Đà Nẵng' },
      car: { base: 1600000, hub: 'Cửa ngõ Đà Nẵng' },
    },
    'Thừa Thiên Huế': {
      flight: { base: 2100000, hub: 'Cảng hàng không Quốc tế Phú Bài' },
      train: { base: 1200000, hub: 'Ga Huế' },
      coach: { base: 650000, hub: 'Bến xe phía Nam Huế' },
      car: { base: 1500000, hub: 'Cửa ngõ TP. Huế' },
    },
    'Quảng Nam': {
      flight: { base: 2250000, hub: 'Sân bay Quốc tế Đà Nẵng / Chu Lai' },
      train: { base: 1300000, hub: 'Ga Đà Nẵng (kết nối ô tô về Hội An)' },
      coach: { base: 750000, hub: 'Bến xe Hội An' },
      car: { base: 1700000, hub: 'Phố cổ Hội An' },
    },
    'Lào Cai': {
      flight: { base: 0, hub: 'Không có sân bay thương mại', available: false, unavailableReason: 'Lào Cai / Sa Pa chưa có sân bay thương mại trực tiếp. Nên đi Tàu hỏa hoặc Limousine cao tốc.' },
      train: { base: 850000, hub: 'Ga Lào Cai' },
      coach: { base: 650000, hub: 'Bến xe Sa Pa (Limousine)' },
      car: { base: 900000, hub: 'Thị xã Sa Pa' },
    },
    'Hà Giang': {
      flight: { base: 0, hub: 'Không có sân bay', available: false, unavailableReason: 'Hà Giang không có sân bay thương mại. Phương tiện thuận tiện nhất là Xe Limousine hoặc Ô tô.' },
      coach: { base: 600000, hub: 'Bến xe TP. Hà Giang' },
      car: { base: 1000000, hub: 'TP. Hà Giang' },
    },
    'Khánh Hòa': {
      flight: { base: 2600000, hub: 'Cảng hàng không Quốc tế Cam Ranh' },
      train: { base: 1600000, hub: 'Ga Nha Trang' },
      coach: { base: 950000, hub: 'Bến xe phía Nam Nha Trang' },
      car: { base: 2200000, hub: 'Cửa ngõ Nha Trang' },
    },
    'Lâm Đồng': {
      flight: { base: 2500000, hub: 'Cảng hàng không Liên Khương' },
      coach: { base: 1000000, hub: 'Bến xe Liên tỉnh Đà Lạt' },
      car: { base: 2500000, hub: 'TP. Đà Lạt' },
    },
    'Kiên Giang': {
      flight: { base: 2900000, hub: 'Cảng hàng không Quốc tế Phú Quốc' },
    },
    'Hồ Chí Minh': {
      flight: { base: 2600000, hub: 'Cảng hàng không Quốc tế Tân Sơn Nhất' },
      train: { base: 1900000, hub: 'Ga Sài Gòn' },
      coach: { base: 1200000, hub: 'Bến xe Miền Đông' },
    },
    'Quảng Ninh': {
      flight: { base: 0, hub: 'Khoảng cách gần (~150km)', available: false, unavailableReason: 'Tuyến Hà Nội - Quảng Ninh khoảng cách gần (~150km), đi xe Limousine cao tốc chỉ 2-2.5h.' },
      coach: { base: 450000, hub: 'Bến xe Bãi Cháy' },
      car: { base: 600000, hub: 'TP. Hạ Long' },
    },
    'Ninh Bình': {
      flight: { base: 0, hub: 'Khoảng cách gần (~95km)', available: false, unavailableReason: 'Ninh Bình cách Hà Nội chỉ ~95km (1.5h xe chạy), không có chặng bay thương mại.' },
      coach: { base: 300000, hub: 'Bến xe Ninh Bình' },
      train: { base: 250000, hub: 'Ga Ninh Bình' },
      car: { base: 400000, hub: 'TP. Ninh Bình' },
    },
  },
  'Hồ Chí Minh': {
    'Đà Nẵng': {
      flight: { base: 2100000, hub: 'Sân bay Quốc tế Đà Nẵng' },
      train: { base: 1250000, hub: 'Ga Đà Nẵng' },
      coach: { base: 750000, hub: 'Bến xe Trung tâm Đà Nẵng' },
      car: { base: 1700000, hub: 'Cửa ngõ Đà Nẵng' },
    },
    'Thừa Thiên Huế': {
      flight: { base: 2200000, hub: 'Cảng hàng không Quốc tế Phú Bài' },
      train: { base: 1300000, hub: 'Ga Huế' },
      coach: { base: 800000, hub: 'Bến xe phía Nam Huế' },
    },
    'Quảng Nam': {
      flight: { base: 2150000, hub: 'Sân bay Chu Lai / Đà Nẵng' },
      train: { base: 1250000, hub: 'Ga Tam Kỳ / Ga Đà Nẵng' },
      coach: { base: 750000, hub: 'Bến xe Hội An' },
    },
    'Lâm Đồng': {
      flight: { base: 1800000, hub: 'Cảng hàng không Liên Khương' },
      coach: { base: 600000, hub: 'Bến xe Liên tỉnh Đà Lạt (Limousine)' },
      car: { base: 800000, hub: 'TP. Đà Lạt' },
    },
    'Khánh Hòa': {
      flight: { base: 1800000, hub: 'Cảng hàng không Quốc tế Cam Ranh' },
      train: { base: 800000, hub: 'Ga Nha Trang' },
      coach: { base: 500000, hub: 'Bến xe phía Nam Nha Trang' },
      car: { base: 900000, hub: 'TP. Nha Trang' },
    },
    'Kiên Giang': {
      flight: { base: 1900000, hub: 'Cảng hàng không Quốc tế Phú Quốc' },
      coach: { base: 650000, hub: 'Bến tàu Rạch Giá / Phú Quốc Express' },
    },
    'Hà Nội': {
      flight: { base: 2600000, hub: 'Cảng hàng không Quốc tế Nội Bài' },
      train: { base: 1900000, hub: 'Ga Hà Nội' },
      coach: { base: 1200000, hub: 'Bến xe Nước Ngầm' },
    },
    'Bà Rịa - Vũng Tàu': {
      flight: { base: 0, hub: 'Khoảng cách gần (~100km)', available: false, unavailableReason: 'TP.HCM - Vũng Tàu cách nhau ~100km (khoảng 2h đi ô tô), không có chặng bay thương mại.' },
      coach: { base: 320000, hub: 'Bến xe Vũng Tàu (Limousine VIP)' },
      car: { base: 450000, hub: 'TP. Vũng Tàu' },
    },
    'Cần Thơ': {
      flight: { base: 0, hub: 'Khoảng cách gần (~160km)', available: false, unavailableReason: 'TP.HCM - Cần Thơ chỉ cách ~160km (khoảng 2.5-3h theo cao tốc), di chuyển thuận tiện nhất bằng Limousine/Ô tô.' },
      coach: { base: 350000, hub: 'Bến xe Trung tâm Cần Thơ' },
      car: { base: 500000, hub: 'TP. Cần Thơ' },
    },
    'Bình Thuận': {
      flight: { base: 0, hub: 'Khoảng cách ~180km', available: false, unavailableReason: 'TP.HCM đi Phan Thiết/Mũi Né chỉ mất 2.5h qua cao tốc Dầu Giây - Phan Thiết, không có đường bay.' },
      train: { base: 400000, hub: 'Ga Phan Thiết' },
      coach: { base: 350000, hub: 'Bến xe Phan Thiết' },
      car: { base: 600000, hub: 'TP. Phan Thiết' },
    },
  },
  'Đà Nẵng': {
    'Hà Nội': {
      flight: { base: 2200000, hub: 'Cảng hàng không Quốc tế Nội Bài' },
      train: { base: 1300000, hub: 'Ga Hà Nội' },
      coach: { base: 700000, hub: 'Bến xe Giáp Bát' },
      car: { base: 1600000, hub: 'Hà Nội' },
    },
    'Hồ Chí Minh': {
      flight: { base: 2100000, hub: 'Cảng hàng không Quốc tế Tân Sơn Nhất' },
      train: { base: 1250000, hub: 'Ga Sài Gòn' },
      coach: { base: 750000, hub: 'Bến xe Miền Đông' },
      car: { base: 1700000, hub: 'TP. Hồ Chí Minh' },
    },
    'Thừa Thiên Huế': {
      flight: { base: 0, hub: 'Khoảng cách gần (~100km)', available: false, unavailableReason: 'Đà Nẵng và Thừa Thiên Huế giáp nhau (~100km), không có đường bay thương mại. Tuyến tàu hỏa di sản hoặc xe ô tô qua Hải Vân là lựa chọn đẹp nhất!' },
      train: { base: 200000, hub: 'Ga Huế (Tàu di sản Huế - Đà Nẵng)' },
      coach: { base: 180000, hub: 'Bến xe phía Nam Huế' },
      car: { base: 300000, hub: 'TP. Huế (qua Hầm/Đèo Hải Vân)' },
    },
    'Quảng Nam': {
      flight: { base: 0, hub: 'Tỉnh liền kề (~30km)', available: false, unavailableReason: 'Đà Nẵng đi Hội An (Quảng Nam) chỉ cách ~30km (40-45 phút đi taxi/xe bus), không có chuyến bay thương mại giữa hai địa phương liền kề.' },
      coach: { base: 100000, hub: 'Phố cổ Hội An (Xe bus / Limousine)' },
      car: { base: 150000, hub: 'Phố cổ Hội An (Taxi / Ô tô)' },
    },
    'Quảng Ngãi': {
      flight: { base: 0, hub: 'Khoảng cách gần (~140km)', available: false, unavailableReason: 'Đà Nẵng - Quảng Ngãi cách ~140km, không có đường bay thương mại trực tiếp. Đi tàu hỏa hoặc ô tô rất thuận tiện.' },
      train: { base: 180000, hub: 'Ga Quảng Ngãi' },
      coach: { base: 150000, hub: 'Bến xe Quảng Ngãi' },
      car: { base: 350000, hub: 'TP. Quảng Ngãi' },
    },
    'Bình Định': {
      flight: { base: 0, hub: 'Cự ly trung bình (~300km)', available: false, unavailableReason: 'Đà Nẵng đi Quy Nhơn không có đường bay thẳng. Nên chọn Tàu hỏa hoặc Xe khách giường nằm.' },
      train: { base: 350000, hub: 'Ga Diêu Trì / Quy Nhơn' },
      coach: { base: 300000, hub: 'Bến xe Quy Nhơn' },
    },
  },
  'Cần Thơ': {
    'Hà Nội': {
      flight: { base: 2700000, hub: 'Cảng hàng không Quốc tế Nội Bài' },
    },
    'Đà Nẵng': {
      flight: { base: 2300000, hub: 'Sân bay Quốc tế Đà Nẵng' },
    },
    'Thừa Thiên Huế': {
      flight: { base: 0, hub: 'Không có đường bay thẳng', available: false, unavailableReason: 'Cần Thơ - Huế hiện chưa có đường bay thẳng thường lệ.' },
      coach: { base: 900000, hub: 'Bến xe phía Nam Huế' },
    },
    'Quảng Nam': {
      flight: { base: 0, hub: 'Không có đường bay thẳng', available: false, unavailableReason: 'Cần Thơ - Hội An/Quảng Nam không có đường bay thẳng (cần bay đến Đà Nẵng rồi đi đường bộ).' },
      coach: { base: 900000, hub: 'Hội An' },
    },
    'Hồ Chí Minh': {
      flight: { base: 0, hub: 'Cự ly gần (~160km)', available: false, unavailableReason: 'Cần Thơ - TP.HCM cách ~160km, đi Limousine đường cao tốc chỉ mất 2.5h - 3h.' },
      coach: { base: 350000, hub: 'Bến xe Miền Tây' },
      car: { base: 500000, hub: 'TP. Hồ Chí Minh' },
    },
  },
  'Hải Phòng': {
    'Đà Nẵng': {
      flight: { base: 2100000, hub: 'Sân bay Quốc tế Đà Nẵng' },
    },
    'Hồ Chí Minh': {
      flight: { base: 2600000, hub: 'Cảng hàng không Quốc tế Tân Sơn Nhất' },
    },
    'Thừa Thiên Huế': {
      flight: { base: 0, hub: 'Không có đường bay thẳng', available: false, unavailableReason: 'Hải Phòng - Huế không có đường bay thương mại thẳng trực tiếp.' },
      train: { base: 1200000, hub: 'Ga Huế' },
      coach: { base: 700000, hub: 'Bến xe phía Nam Huế' },
    },
    'Quảng Nam': {
      flight: { base: 0, hub: 'Không có đường bay thẳng', available: false, unavailableReason: 'Hải Phòng - Hội An/Quảng Nam không có đường bay thẳng (thường bay đến Đà Nẵng).' },
      train: { base: 1300000, hub: 'Ga Đà Nẵng' },
      coach: { base: 750000, hub: 'Hội An' },
    },
    'Ninh Bình': {
      flight: { base: 0, hub: 'Cự ly gần (~120km)', available: false, unavailableReason: 'Hải Phòng - Ninh Bình cách nhau ~120km, đi ô tô chỉ mất khoảng 2h qua QL10.' },
      coach: { base: 250000, hub: 'Bến xe Ninh Bình' },
      car: { base: 400000, hub: 'TP. Ninh Bình' },
    },
    'Quảng Ninh': {
      flight: { base: 0, hub: 'Tỉnh liền kề (~50km)', available: false, unavailableReason: 'Hải Phòng giáp Quảng Ninh, đi qua cầu Bạch Đằng cao tốc chỉ 30-45 phút.' },
      coach: { base: 150000, hub: 'Bãi Cháy / Hạ Long' },
      car: { base: 250000, hub: 'TP. Hạ Long' },
    },
  },
};

// Kiểm tra danh sách các phương tiện di chuyển có sẵn giữa 2 địa phương
export function getAvailableTransportModes(
  origin: string,
  destination: string
): TransportModeOption[] {
  const normO = normalizeProvinceName(origin || 'Hà Nội');
  const normD = normalizeProvinceName(destination || 'Đà Nẵng');
  const distanceKm = calculateGeographicDistanceKm(normO, normD);

  const allModes: Array<{ id: string; label: string; defaultDesc: string; iconName: string }> = [
    { id: 'flight', label: 'Máy bay', defaultDesc: 'Nhanh nhất', iconName: 'Plane' },
    { id: 'train', label: 'Tàu hỏa', defaultDesc: 'Trải nghiệm', iconName: 'Train' },
    { id: 'coach', label: 'Xe khách / Limousine', defaultDesc: 'Tiết kiệm', iconName: 'Bus' },
    { id: 'car', label: 'Ô tô cá nhân', defaultDesc: 'Xăng dầu & BOT', iconName: 'Car' },
  ];

  // Nếu cùng tỉnh thành
  if (normO.toLowerCase() === normD.toLowerCase()) {
    return allModes.map((m) => ({
      id: m.id,
      label: m.label,
      desc: m.defaultDesc,
      available: m.id === 'car' || m.id === 'coach',
      unavailableReason: m.id === 'flight' || m.id === 'train' ? `Xuất phát tại chỗ trong ${normD}, không cần ${m.label.toLowerCase()}.` : undefined,
    }));
  }

  // Tra cứu theo ma trận
  const route = FARE_MATRIX[normO]?.[normD] || FARE_MATRIX[normD]?.[normO];

  return allModes.map((m) => {
    const modeConfig = route?.[m.id];
    let isAvailable = true;
    let unavailableReason: string | undefined = undefined;

    // 1. Kiểm tra cấu hình cụ thể trong ma trận
    if (modeConfig && modeConfig.available === false) {
      isAvailable = false;
      unavailableReason = modeConfig.unavailableReason || `Không có chuyến ${m.label.toLowerCase()} trực tiếp giữa ${normO} và ${normD}.`;
    } else if (modeConfig && modeConfig.available !== false) {
      // Có trong ma trận và khả dụng
      isAvailable = true;
      unavailableReason = undefined;
    } else if (route && !modeConfig) {
      if (m.id === 'flight') {
        isAvailable = false;
        unavailableReason = `Không có đường bay thương mại giữa ${normO} và ${normD}.`;
      } else if (m.id === 'train') {
        isAvailable = false;
        unavailableReason = `Chưa có tuyến đường sắt kết nối trực tiếp đến ${normD}.`;
      }
    } else {
      // 2. Tuyến không nằm trong ma trận: kiểm tra cự ly địa lý thực tế (distanceKm) và sự hiện diện của sân bay
      if (m.id === 'flight') {
        // Cự ly ngắn dưới 180km chắc chắn không có chuyến bay thương mại trực tiếp
        if (distanceKm < 180) {
          isAvailable = false;
          unavailableReason = `${normO} và ${normD} cự ly gần (~${distanceKm}km), không có đường bay thương mại. Vui lòng chọn Xe khách, Ô tô hoặc Tàu hỏa.`;
        } else if (!PROVINCES_WITH_AIRPORT[normD] || !PROVINCES_WITH_AIRPORT[normO]) {
          isAvailable = false;
          unavailableReason = `${normD} hoặc ${normO} không có sân bay thương mại trực tiếp.`;
        }
      }
    }

    return {
      id: m.id,
      label: m.label,
      desc: isAvailable ? m.defaultDesc : (unavailableReason || 'Không khả dụng'),
      available: isAvailable,
      unavailableReason,
    };
  });
}

export function getSeasonalMultiplier(startDateStr?: string) {
  let month = 6;
  let day = 15;
  if (startDateStr) {
    try {
      const d = new Date(startDateStr);
      if (!isNaN(d.getTime())) {
        month = d.getMonth() + 1;
        day = d.getDate();
      }
    } catch {}
  }

  // 1. Tết
  if ((month === 1 && day >= 20) || (month === 2 && day <= 15)) {
    return { factor: 1.65, name: 'Mùa Cao điểm Tết', badge: 'Cao điểm Tết (+65%)' };
  }
  // 2. Đại lễ 30/4, 2/9
  if ((month === 4 && day >= 27) || (month === 5 && day <= 3) || (month === 8 && day >= 30) || (month === 9 && day <= 4)) {
    return { factor: 1.45, name: 'Kỳ nghỉ Lễ lớn', badge: 'Kỳ nghỉ Lễ (+45%)' };
  }
  // 3. Cao điểm hè
  if ([6, 7, 8].includes(month)) {
    return { factor: 1.30, name: 'Mùa Cao điểm Hè', badge: 'Cao điểm Hè (+30%)' };
  }
  // 4. Thấp điểm
  if ([10, 11].includes(month)) {
    return { factor: 0.85, name: 'Mùa Thấp điểm', badge: 'Mùa Thấp điểm (-15%)' };
  }
  // 5. Tiêu chuẩn
  return { factor: 1.0, name: 'Mùa Tiêu chuẩn', badge: 'Tiêu chuẩn (100%)' };
}

export function calculateIntercityTransit(
  origin: string,
  destination: string,
  mode: string,
  startDate?: string,
  peopleCount: number = 2
): IntercityTransitResult {
  const rawO = (origin || 'Hà Nội').trim();
  const rawD = (destination || 'Đà Nẵng').trim();
  const normO = normalizeProvinceName(rawO);
  const normD = normalizeProvinceName(rawD);
  const m = (mode || 'flight').toLowerCase().trim();
  const p = Math.max(1, peopleCount);
  const distanceKm = calculateGeographicDistanceKm(normO, normD);

  if (normO.toLowerCase() === normD.toLowerCase()) {
    return {
      isIntercity: false,
      origin: rawO,
      destination: rawD,
      normalizedOrigin: normO,
      normalizedDestination: normD,
      distanceKm: 0,
      transportMode: 'local',
      transportName: 'Nội thành / Tự túc',
      baseFarePerPerson: 0,
      actualFarePerPerson: 0,
      seasonalFactor: 1.0,
      seasonName: 'Nội tỉnh',
      seasonBadge: 'Tại chỗ',
      peopleCount: p,
      totalTransitCostVnd: 0,
      arrivalHub: 'Điểm hẹn nội thành',
      summary: `Xuất phát tại chỗ (${rawD}), không phát sinh chi phí vé liên tỉnh.`,
      isAvailable: true,
    };
  }

  // Kiểm tra tính khả dụng của phương tiện được yêu cầu
  const availableModes = getAvailableTransportModes(rawO, rawD);
  const currentModeInfo = availableModes.find((item) => item.id === m);
  const isAvailable = currentModeInfo ? currentModeInfo.available : true;
  let suggestedFallbackMode: string | undefined = undefined;

  // Nếu không khả dụng, tìm phương tiện thay thế tối ưu
  if (!isAvailable) {
    const validFallback = availableModes.find((item) => item.available);
    suggestedFallbackMode = validFallback ? validFallback.id : 'coach';
  }

  const effectiveMode = isAvailable ? m : (suggestedFallbackMode || 'coach');
  const season = getSeasonalMultiplier(startDate);
  const routeData = FARE_MATRIX[normO]?.[normD] || FARE_MATRIX[normD]?.[normO];

  // Tính base fare linh động theo khoảng cách nếu không có số cố định trong matrix
  let baseFare = 0;
  let hubName = '';

  if (routeData?.[effectiveMode]) {
    baseFare = routeData[effectiveMode].base;
    hubName = routeData[effectiveMode].hub;
  } else {
    // Thuật toán định giá động bám sát cự ly thực tế (distanceKm)
    if (effectiveMode === 'flight') {
      baseFare = calculateDynamicFlightBaseFare(distanceKm);
      hubName = PROVINCES_WITH_AIRPORT[normD] || `Cảng hàng không ${normD}`;
    } else if (effectiveMode === 'train') {
      baseFare = Math.round(distanceKm * 1500 + 150000); // ~1.500đ / km đường sắt
      hubName = `Ga ${normD}`;
    } else if (effectiveMode === 'coach') {
      baseFare = Math.max(120000, Math.round(distanceKm * 900 + 80000)); // ~900đ / km xe khách/limousine
      hubName = `Bến xe trung tâm ${normD}`;
    } else {
      // car
      baseFare = Math.max(200000, Math.round(distanceKm * 1800 + 120000)); // ~1.800đ / km chi phí xăng dầu + trạm BOT
      hubName = `Cửa ngõ ${normD}`;
    }
  }

  const isCar = effectiveMode === 'car';
  let actualFarePerPerson = Math.round(baseFare * season.factor);
  let totalCost = 0;

  if (isCar) {
    const carsNeeded = Math.ceil(p / 4);
    totalCost = Math.round(baseFare * season.factor) * carsNeeded;
    actualFarePerPerson = Math.round(totalCost / p);
  } else {
    totalCost = actualFarePerPerson * p;
  }

  const modeNames: Record<string, string> = {
    flight: 'Máy bay khứ hồi ✈️',
    train: 'Tàu hỏa khứ hồi 🚆',
    coach: 'Xe khách / Limousine khứ hồi 🚌',
    car: 'Xe ô tô tự lái (Xăng & BOT) 🚗',
  };

  return {
    isIntercity: true,
    origin: rawO,
    destination: rawD,
    normalizedOrigin: normO,
    normalizedDestination: normD,
    distanceKm,
    transportMode: effectiveMode,
    transportName: modeNames[effectiveMode] || 'Di chuyển liên tỉnh',
    baseFarePerPerson: baseFare,
    actualFarePerPerson,
    seasonalFactor: season.factor,
    seasonName: season.name,
    seasonBadge: season.badge,
    peopleCount: p,
    totalTransitCostVnd: totalCost,
    arrivalHub: hubName,
    summary: isAvailable
      ? `Di chuyển từ ${normO} đi ${rawD} (~${distanceKm}km) bằng ${modeNames[effectiveMode] || effectiveMode}: ước tính ${actualFarePerPerson.toLocaleString('vi-VN')} đ/người (${season.badge}), tổng cộng ${totalCost.toLocaleString('vi-VN')} đ cho ${p} người.`
      : `Tuyến ${normO} đi ${rawD} (~${distanceKm}km) không có ${modeNames[m] || m} (${currentModeInfo?.unavailableReason || 'không khả thi'}). Tự động chuyển sang ${modeNames[effectiveMode]}: ~${actualFarePerPerson.toLocaleString('vi-VN')} đ/người.`,
    isAvailable,
    unavailableReason: currentModeInfo?.unavailableReason,
    suggestedMode: suggestedFallbackMode,
  };
}
