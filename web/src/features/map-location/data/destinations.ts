import type { DestinationMarker } from '../types';

/**
 * Dữ liệu điểm đến du lịch mẫu phục vụ spike Bản đồ Tuần 1 TV5.
 * Trích xuất từ database/seed/destinations/demo_destinations_seed.csv (đã được xác minh tọa độ).
 */
export const SAMPLE_DESTINATIONS: DestinationMarker[] = [
  {
    id: 'dest-01',
    name: 'Cầu Rồng Đà Nẵng',
    province: 'Đà Nẵng',
    category: 'Cảnh quan & Văn hóa',
    latitude: 16.0611682,
    longitude: 108.2278968,
    description:
      'Biểu tượng hiện đại của Đà Nẵng với kiến trúc rồng độc đáo, nổi bật bắc qua sông Hàn.',
    thumbnailUrl:
      'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/map/dragon-bridge.jpg',
    priceMin: 0,
    priceMax: 0,
    openingHours: '00:00 - 23:59',
    sourceUrl: 'https://danangfantasticity.com/cau-rong',
  },
  {
    id: 'dest-02',
    name: 'Bà Nà Hills & Cầu Vàng',
    province: 'Đà Nẵng',
    category: 'Khu vui chơi & Nghỉ dưỡng',
    latitude: 15.9958,
    longitude: 107.9965,
    description:
      'Quần thể du lịch trên đỉnh núi Chúa nổi tiếng với Cầu Vàng và làng Pháp cổ kính.',
    thumbnailUrl:
      'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_golden_bridge.jpg',
    priceMin: 900000,
    priceMax: 1250000,
    openingHours: '07:00 - 22:00',
    sourceUrl: 'https://banahills.sunworld.vn',
  },
  {
    id: 'dest-03',
    name: 'Bán đảo Sơn Trà & Chùa Linh Ứng',
    province: 'Đà Nẵng',
    category: 'Tâm linh & Sinh thái',
    latitude: 16.1075,
    longitude: 108.2778,
    description:
      'Ngôi chùa linh thiêng với tượng Phật Bà Quan Âm cao 67m hướng ra biển Đông.',
    thumbnailUrl:
      'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_real.jpg',
    priceMin: 0,
    priceMax: 0,
    openingHours: '06:00 - 18:00',
    sourceUrl: 'https://danangfantasticity.com/chua-linh-ung',
  },
  {
    id: 'dest-04',
    name: 'Bãi biển Mỹ Khê',
    thumbnailUrl:
      'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/map/my-khe.jpg',
    province: 'Đà Nẵng',
    category: 'Biển & Thiên nhiên',
    latitude: 16.0645,
    longitude: 108.2468,
    description:
      'Một trong những bãi biển đẹp nhất hành tinh với bãi cát trắng mịn và sóng êm đềm.',
    priceMin: 0,
    priceMax: 0,
    openingHours: '00:00 - 23:59',
    sourceUrl: 'https://danangfantasticity.com/bai-bien-my-khe',
  },
  {
    id: 'dest-05',
    name: 'Danh thắng Ngũ Hành Sơn',
    province: 'Đà Nẵng',
    category: 'Di tích & Khám phá',
    latitude: 16.0048,
    longitude: 108.2618,
    description:
      'Quần thể 5 ngọn núi đá vôi kỳ vĩ cùng nhiều hang động huyền bí và chùa chiền cổ.',
    thumbnailUrl:
      'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_real.jpg',
    priceMin: 40000,
    priceMax: 100000,
    openingHours: '07:00 - 17:30',
    sourceUrl: 'https://nguhanhson.org.vn',
  },
  {
    id: 'dest-06',
    name: 'Chợ Hàn Đà Nẵng',
    thumbnailUrl:
      'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/map/han-market.jpg',
    province: 'Đà Nẵng',
    category: 'Ẩm thực & Mua sắm',
    latitude: 16.0684,
    longitude: 108.2243,
    description:
      'Khu chợ truyền thống sầm uất với các đặc sản miền Trung, đồ lưu niệm và món ăn đường phố.',
    priceMin: 0,
    priceMax: 0,
    openingHours: '06:00 - 19:00',
    sourceUrl: 'https://danangfantasticity.com/cho-han',
  },
  {
    id: 'dest-07',
    name: 'Đèo Hải Vân',
    province: 'Đà Nẵng - Huế',
    category: 'Thiên nhiên & Phượt',
    latitude: 16.1919,
    longitude: 108.1325,
    description:
      'Thiên hạ đệ nhất hùng quan với cung đường uốn lượn nhìn toàn cảnh biển mây.',
    priceMin: 0,
    priceMax: 0,
    openingHours: '00:00 - 23:59',
    sourceUrl: 'https://danangfantasticity.com/deo-hai-van',
  },
  {
    id: 'dest-08',
    name: 'Chùa Cầu & Phố Cổ Hội An',
    province: 'Quảng Nam',
    category: 'Di sản & Văn hóa',
    latitude: 15.8771,
    longitude: 108.3259,
    description:
      'Biểu tượng văn hóa của đô thị cổ Hội An, minh chứng giao thoa kiến trúc Việt - Nhật - Hoa.',
    priceMin: 120000,
    priceMax: 120000,
    openingHours: '07:00 - 21:30',
    sourceUrl: 'https://hoianworldheritage.org.vn',
  },
  {
    id: 'dest-09',
    name: 'Đại Nội Huế (Hoàng Thành)',
    province: 'Thừa Thiên Huế',
    category: 'Di tích & Lịch sử',
    latitude: 16.4699,
    longitude: 107.5786,
    description:
      'Di sản văn hóa thế giới UNESCO với kiến trúc cung đình đồ sộ của triều Nguyễn.',
    priceMin: 200000,
    priceMax: 200000,
    openingHours: '07:00 - 17:30',
    sourceUrl: 'https://hueworldheritage.org.vn',
  },
  {
    id: 'dest-10',
    name: 'Chùa Thiên Mụ & Sông Hương',
    province: 'Thừa Thiên Huế',
    category: 'Tâm linh & Cảnh quan',
    latitude: 16.4528,
    longitude: 107.5451,
    description:
      'Ngôi cổ tự hơn 400 năm tuổi soi bóng xuống dòng sông Hương thơ mộng.',
    priceMin: 0,
    priceMax: 0,
    openingHours: '07:00 - 18:00',
    sourceUrl: 'https://khamphahue.com.vn/chua-thien-mu',
  },
];

/** Tọa độ trung tâm mặc định (Đà Nẵng - Miền Trung) */
export const DEFAULT_MAP_CENTER = {
  latitude: 16.0611,
  longitude: 108.2272,
  zoom: 12,
};
