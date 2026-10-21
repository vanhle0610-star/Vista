'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { Navbar } from '@/components/common/Navbar';
import styles from './home.module.css';
import {
  fetchAllRegionsWeather,
  fetchAllDestinationsWeather,
  RealtimeWeather,
} from '../services/weatherService';

// ─── TYPES & DATA DEFINITIONS ────────────────────────────────────────────────
type LangType = 'vi' | 'en';
type RegionKey = 'all' | 'north' | 'central' | 'south' | 'highlands';
type CategoryKey = 'all' | 'beach' | 'culture' | 'nature' | 'resort' | 'food';

interface DestinationItem {
  id: string;
  nameVi: string;
  nameEn: string;
  provinceVi: string;
  provinceEn: string;
  region: 'north' | 'central' | 'south' | 'highlands';
  category: 'beach' | 'culture' | 'nature' | 'resort' | 'food';
  rating: number;
  reviewCount: string;
  image: string;
  seasonVi: string;
  seasonEn: string;
  pricePerDayVi: string;
  pricePerDayEn: string;
  tagsVi: string[];
  tagsEn: string[];
  highlightsVi: string[];
  highlightsEn: string[];
  descriptionVi: string;
  descriptionEn: string;
  temp: string;
  weatherVi: string;
  weatherEn: string;
}

const DESTINATIONS: DestinationItem[] = [
  {
    id: 'halong',
    nameVi: 'Vịnh Hạ Long',
    nameEn: 'Ha Long Bay',
    provinceVi: 'Quảng Ninh',
    provinceEn: 'Quang Ninh',
    region: 'north',
    category: 'beach',
    rating: 4.9,
    reviewCount: '2.8k',
    image: '/images/halong_hanoi_day.jpg',
    seasonVi: 'Tháng 10 – Tháng 4',
    seasonEn: 'Oct – Apr',
    pricePerDayVi: '1.200.000đ/ngày',
    pricePerDayEn: '~$50/day',
    tagsVi: ['Di sản UNESCO', 'Du thuyền 5★', 'Kayaking'],
    tagsEn: ['UNESCO Heritage', '5★ Cruise', 'Kayaking'],
    highlightsVi: [
      'Chèo thuyền kayak luồn qua hang Luồn và vịnh Lan Hạ',
      'Nghỉ dưỡng đêm trên du thuyền sang trọng giữa biển ngọc',
      'Ngắm hoàng hôn tráng lệ từ đỉnh núi Ti Tốp',
    ],
    highlightsEn: [
      'Kayaking through Luon Cave and Lan Ha Bay',
      'Overnight luxury cruise surrounded by limestone karsts',
      'Catching panoramic sunset atop Ti Top Island',
    ],
    descriptionVi:
      'Kỳ quan thiên nhiên thế giới với hàng nghìn hòn đảo đá vôi kỳ vĩ vươn lên giữa làn nước xanh ngọc lục bảo.',
    descriptionEn:
      'World Natural Heritage featuring thousands of towering limestone islands rising from emerald waters.',
    temp: '25°C',
    weatherVi: 'Trời thu trong lành, sóng êm',
    weatherEn: 'Pleasant autumn, calm sea',
  },
  {
    id: 'hoian',
    nameVi: 'Phố Cổ Hội An',
    nameEn: 'Hoi An Ancient Town',
    provinceVi: 'Quảng Nam',
    provinceEn: 'Quang Nam',
    region: 'central',
    category: 'culture',
    rating: 4.9,
    reviewCount: '3.4k',
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
    seasonVi: 'Tháng 2 – Tháng 8',
    seasonEn: 'Feb – Aug',
    pricePerDayVi: '750.000đ/ngày',
    pricePerDayEn: '~$30/day',
    tagsVi: ['Di sản phố cổ', 'Đèn lồng', 'Ẩm thực'],
    tagsEn: ['Ancient Town', 'Lanterns', 'Cuisine'],
    highlightsVi: [
      'Thả hoa đăng ước nguyện trên sông Hoài đêm rằm',
      'Thưởng thức Cao Lầu, Mì Quảng và Bánh mì Phượng lừng danh',
      'Đạp xe thong thả ngắm hoàng hôn đồng quê Cẩm Châu',
    ],
    highlightsEn: [
      'Floating candlelit lanterns along the romantic Hoai River',
      'Indulging in authentic Cao Lau, Quang Noodles & banh mi',
      'Cycling through scenic rice paddies of Cam Chau',
    ],
    descriptionVi:
      'Đô thị cổ trầm mặc nép mình bên dòng sông Hoài, lung linh sắc hoa đăng và những bức tường vàng rêu phong.',
    descriptionEn:
      'A charming historic port town decorated with glowing lanterns, yellow French-colonial walls, and timeless alleys.',
    temp: '27°C',
    weatherVi: 'Nắng ấm dịu dàng, gió nhẹ',
    weatherEn: 'Gentle warm sunshine & light breeze',
  },
  {
    id: 'danang',
    nameVi: 'Đà Nẵng & Bà Nà',
    nameEn: 'Da Nang & Ba Na Hills',
    provinceVi: 'Đà Nẵng',
    provinceEn: 'Da Nang',
    region: 'central',
    category: 'resort',
    rating: 4.8,
    reviewCount: '2.5k',
    image: '/images/danang_bana_day.jpg',
    seasonVi: 'Tháng 3 – Tháng 9',
    seasonEn: 'Mar – Sep',
    pricePerDayVi: '1.100.000đ/ngày',
    pricePerDayEn: '~$45/day',
    tagsVi: ['Cầu Vàng', 'Biển Mỹ Khê', 'Check-in'],
    tagsEn: ['Golden Bridge', 'My Khe Beach', 'Check-in'],
    highlightsVi: [
      'Dạo bước giữa mây ngàn trên Cầu Vàng Bàn Tay Khổng Lồ',
      'Tắm biển Mỹ Khê – một trong những bãi biển quyến rũ nhất hành tinh',
      'Xem Cầu Rồng phun lửa và nước vào mỗi cuối tuần',
    ],
    highlightsEn: [
      'Walking among mist on the world-famous Golden Bridge',
      'Sunbathing on My Khe Beach sandy coast',
      'Watching the Dragon Bridge breathe fire & water on weekends',
    ],
    descriptionVi:
      'Thành phố đáng sống bậc nhất với sự hòa quyện giữa biển xanh mát lành, bán đảo Sơn Trà và núi non Bà Nà kỳ vĩ.',
    descriptionEn:
      'Vietnams most livable coastal metropolis blending modern bridges, beaches, and high-altitude mist.',
    temp: '28°C',
    weatherVi: 'Trời nắng đẹp, biển êm',
    weatherEn: 'Sunny skies & turquoise waters',
  },
  {
    id: 'ninhbinh',
    nameVi: 'Tràng An – Tam Cốc',
    nameEn: 'Trang An & Tam Coc',
    provinceVi: 'Ninh Bình',
    provinceEn: 'Ninh Binh',
    region: 'north',
    category: 'culture',
    rating: 4.8,
    reviewCount: '2.1k',
    image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
    seasonVi: 'Tháng 1 – Tháng 5',
    seasonEn: 'Jan – May',
    pricePerDayVi: '800.000đ/ngày',
    pricePerDayEn: '~$32/day',
    tagsVi: ['Hạ Long cạn', 'Hang động', 'Tâm linh'],
    tagsEn: ['Inland Ha Long', 'Caves', 'Spiritual'],
    highlightsVi: [
      'Ngồi thuyền nan len lỏi qua quần thể hang động xuyên thủy',
      'Leo 500 bậc đá Hang Múa ngắm trọn thung lũng Tam Cốc',
      'Chiêm bái Bái Đính – quần thể chùa lớn nhất Đông Nam Á',
    ],
    highlightsEn: [
      'Tranquil sampan boat ride through limestone water caves',
      'Hike 500 stone stairs up Hang Mua peak for 360° views',
      'Visit Bai Dinh spiritual sanctuary complex',
    ],
    descriptionVi:
      'Di sản hỗn hợp thế giới kết hợp giữa danh thắng thiên nhiên kỳ thú và di tích cố đô Hoa Lư lịch sử.',
    descriptionEn:
      'UNESCO dual heritage renowned for dramatic karst peaks rising above serene river valleys.',
    temp: '24°C',
    weatherVi: 'Mát mẻ dễ chịu, sương nhẹ',
    weatherEn: 'Cool crisp air, gentle morning mist',
  },
  {
    id: 'phuquoc',
    nameVi: 'Đảo Ngọc Phú Quốc',
    nameEn: 'Phu Quoc Pearl Island',
    provinceVi: 'Kiên Giang',
    provinceEn: 'Kien Giang',
    region: 'south',
    category: 'beach',
    rating: 4.7,
    reviewCount: '2.9k',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    seasonVi: 'Tháng 11 – Tháng 4',
    seasonEn: 'Nov – Apr',
    pricePerDayVi: '1.600.000đ/ngày',
    pricePerDayEn: '~$65/day',
    tagsVi: ['Thiên đường biển', 'San hô', 'Resort 5★'],
    tagsEn: ['Island Paradise', 'Coral Reef', '5★ Resort'],
    highlightsVi: [
      'Đi cáp treo Hòn Thơm vượt biển dài nhất thế giới',
      'Lặn ngắm san hô tại quần đảo An Thới hoang sơ',
      'Chiêm ngưỡng hoàng hôn rực lửa tại Bãi Sao & Sunset Town',
    ],
    highlightsEn: [
      'Ride the worlds longest sea-crossing cable car to Hon Thom',
      'Snorkeling untouched colorful coral reefs in An Thoi',
      'Marvel at fiery tropical sunsets at Sunset Town',
    ],
    descriptionVi:
      'Hòn đảo lớn nhất Việt Nam sở hữu bãi cát trắng mịn, nước trong vắt như pha lê và các khu nghỉ dưỡng sang trọng.',
    descriptionEn:
      'Vietnam’s premier island escape with powdery white sands, crystal-clear sea, and luxury beach clubs.',
    temp: '29°C',
    weatherVi: 'Nắng vàng ấm áp, gió biển',
    weatherEn: 'Sunny tropical warmth & sea breeze',
  },
  {
    id: 'hagiang',
    nameVi: 'Cao Nguyên Đá Hà Giang',
    nameEn: 'Ha Giang Geo-Park Loop',
    provinceVi: 'Hà Giang',
    provinceEn: 'Ha Giang',
    region: 'north',
    category: 'nature',
    rating: 4.9,
    reviewCount: '1.9k',
    image: 'https://images.unsplash.com/photo-1570789210967-2cac24afeb00?auto=format&fit=crop&w=800&q=80',
    seasonVi: 'Tháng 9 – Tháng 12',
    seasonEn: 'Sep – Dec',
    pricePerDayVi: '850.000đ/ngày',
    pricePerDayEn: '~$35/day',
    tagsVi: ['Mã Pí Lèng', 'Sông Nho Quế', 'Phượt xe máy'],
    tagsEn: ['Ma Pi Leng', 'Nho Que River', 'Motorbike Loop'],
    highlightsVi: [
      'Chinh phục đệ nhất hùng quan đèo Mã Pí Lèng cheo leo',
      'Đi thuyền ngắm hẻm vực Tu Sản sâu nhất Đông Nam Á',
      'Chiêm ngưỡng cánh đồng hoa tam giác mạch hồng phớt rực rỡ',
    ],
    highlightsEn: [
      'Conquering the legendary Ma Pi Leng mountain pass',
      'Boat cruise down emerald Nho Que river canyon',
      'Admiring pink buckwheat flowers blooming on karst slopes',
    ],
    descriptionVi:
      'Hành trình phượt ngoạn mục nhất Đông Nam Á với cung đường đèo hiểm trở và sắc màu văn hóa vùng cao.',
    descriptionEn:
      'The ultimate motorcycle expedition traversing dramatic limestone canyons and ethnic mountain villages.',
    temp: '18°C',
    weatherVi: 'Trời se lạnh, lãng đãng mây bay',
    weatherEn: 'Crisp mountain air, sea of clouds',
  },
  {
    id: 'saigon',
    nameVi: 'TP. Hồ Chí Minh & Miền Tây',
    nameEn: 'Ho Chi Minh City & Delta',
    provinceVi: 'TP. Hồ Chí Minh',
    provinceEn: 'Ho Chi Minh City',
    region: 'south',
    category: 'food',
    rating: 4.7,
    reviewCount: '3.1k',
    image: '/images/saigon_south_day.jpg',
    seasonVi: 'Tháng 12 – Tháng 4',
    seasonEn: 'Dec – Apr',
    pricePerDayVi: '900.000đ/ngày',
    pricePerDayEn: '~$38/day',
    tagsVi: ['Đô thị năng động', 'Cà phê vợt', 'Chợ nổi'],
    tagsEn: ['Dynamic Metro', 'Street Cafe', 'Floating Market'],
    highlightsVi: [
      'Du thuyền trên sông Sài Gòn ngắm tháp Landmark 81 rực rỡ',
      'Khám phá thiên đường ẩm thực đường phố tại chợ Bến Thành và Quận 4',
      'Thăm chợ nổi Cái Răng & vườn trái cây trĩu quả đồng bằng',
    ],
    highlightsEn: [
      'Saigon river evening cruise gazing at sparkling skyscrapers',
      'Street food safari across bustling markets and alleyways',
      'Exploring Cai Rang floating market in Mekong Delta',
    ],
    descriptionVi:
      'Trái tim kinh tế sôi động không ngủ của Việt Nam, nơi giao thoa giữa nhịp sống hiện đại và văn hóa sông nước Nam Bộ.',
    descriptionEn:
      'Vietnam’s electric urban heart teeming with rich food scenes, French landmarks, and river delta charm.',
    temp: '31°C',
    weatherVi: 'Nắng ấm quanh năm, gió mát chiều tối',
    weatherEn: 'Warm sunshine with breezy tropical evenings',
  },
  {
    id: 'dalat',
    nameVi: 'Đà Lạt Mộng Mơ',
    nameEn: 'Da Lat Pine City',
    provinceVi: 'Lâm Đồng',
    provinceEn: 'Lam Dong',
    region: 'highlands',
    category: 'nature',
    rating: 4.8,
    reviewCount: '2.7k',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    seasonVi: 'Tháng 11 – Tháng 3',
    seasonEn: 'Nov – Mar',
    pricePerDayVi: '800.000đ/ngày',
    pricePerDayEn: '~$34/day',
    tagsVi: ['Săn mây', 'Đồi thông', 'Hoa dã quỳ'],
    tagsEn: ['Cloud Hunting', 'Pine Forests', 'Wild Sunflowers'],
    highlightsVi: [
      'Săn biển mây bồng bềnh tại đồi chè Cầu Đất lúc bình minh',
      'Thưởng thức cà phê ngắm thung lũng đèn lồng rực sáng trong sương',
      'Chèo thuyền SUP thư giãn trên mặt hồ Tuyền Lâm tĩnh lặng',
    ],
    highlightsEn: [
      'Sunrise cloud-hunting at high-altitude Cau Dat tea hills',
      'Cozy mountain cafe sessions looking over glowing night greenhouses',
      'Morning SUP paddling on serene Tuyen Lam Lake',
    ],
    descriptionVi:
      'Thành phố ngàn hoa với khí hậu ôn đới quanh năm, những đồi thông thơ mộng và những quán cà phê ẩn mình trong sương.',
    descriptionEn:
      'Mist-shrouded mountain retreat filled with pine forests, vintage villas, blooming flowers, and cozy cafes.',
    temp: '19°C',
    weatherVi: 'Se lạnh dễ chịu, sương mù lãng đãng',
    weatherEn: 'Chilly autumn climate, poetic mist',
  },
];

// ─── 4 CULTURAL REGIONS DATA ────────────────────────────────────────────────
interface CulturalRegionItem {
  id: 'north' | 'central' | 'south' | 'highlands';
  nameVi: string;
  nameEn: string;
  badgeVi: string;
  badgeEn: string;
  taglineVi: string;
  taglineEn: string;
  descVi: string;
  descEn: string;
  landmarksVi: string[];
  landmarksEn: string[];
  icon: string;
  image: string;
  themeColor: string;
  themeBg: string;
  themeGlow: string;
}

const CULTURAL_REGIONS: CulturalRegionItem[] = [
  {
    id: 'north',
    nameVi: 'Miền Bắc',
    nameEn: 'North Vietnam',
    badgeVi: 'Đông & Tây Bắc',
    badgeEn: 'North & Highlands',
    taglineVi: 'Núi non hùng vĩ & Ngàn năm văn hiến',
    taglineEn: 'High peaks & Millennium heritage',
    descVi: 'Cội nguồn văn hóa nghìn năm với di sản vịnh đá vôi kỳ vĩ và những dãy núi trùng điệp ngút ngàn.',
    descEn: 'Cradle of ancient dynasties, emerald bays, and breathtaking jagged limestone mountain passes.',
    landmarksVi: ['Vịnh Hạ Long', 'Tràng An', 'Hà Giang'],
    landmarksEn: ['Ha Long Bay', 'Trang An', 'Ha Giang'],
    icon: '🏯',
    image: '/images/halong_hanoi_day.jpg',
    themeColor: '#0284c7',
    themeBg: '#e0f2fe',
    themeGlow: 'rgba(2, 132, 199, 0.22)',
  },
  {
    id: 'central',
    nameVi: 'Miền Trung',
    nameEn: 'Central Vietnam',
    badgeVi: 'Duyên Hải & Cố Đô',
    badgeEn: 'Coast & Heritage',
    taglineVi: 'Miền di sản thế giới & Bờ biển ngọc',
    taglineEn: 'UNESCO heritage & Coastal sapphire',
    descVi: 'Trái tim di sản với cố đô trầm mặc, phố cổ đèn lồng hoa đăng và những cung đường biển ngọc.',
    descEn: 'The cultural soul of Vietnam featuring imperial citadels, romantic lantern towns, and sapphire bays.',
    landmarksVi: ['Bà Nà Hills', 'Hội An', 'Cố Đô Huế'],
    landmarksEn: ['Ba Na Hills', 'Hoi An Town', 'Hue Citadel'],
    icon: '🏮',
    image: '/images/danang_bana_day.jpg',
    themeColor: '#d97706',
    themeBg: '#fef3c7',
    themeGlow: 'rgba(217, 119, 6, 0.22)',
  },
  {
    id: 'south',
    nameVi: 'Miền Nam',
    nameEn: 'South Vietnam',
    badgeVi: 'Nam Bộ & Đảo Ngọc',
    badgeEn: 'Delta & Tropical Islands',
    taglineVi: 'Sông nước miệt vườn & Đô thị phồn hoa',
    taglineEn: 'Tropical delta & Vibrant cities',
    descVi: 'Vùng đất phóng khoáng nồng hậu với nhịp sống đô thị không ngủ, sông nước trù phú và đảo ngọc thiên đường.',
    descEn: 'Generous waterways, vibrant cosmopolitan nightlife, floating fruit markets, and tropical paradise islands.',
    landmarksVi: ['TP. Hồ Chí Minh', 'Phú Quốc', 'Chợ Nổi'],
    landmarksEn: ['Ho Chi Minh City', 'Phu Quoc', 'Floating Market'],
    icon: '🛶',
    image: '/images/saigon_south_day.jpg',
    themeColor: '#0284c7',
    themeBg: '#e0f2fe',
    themeGlow: 'rgba(2, 132, 199, 0.22)',
  },
  {
    id: 'highlands',
    nameVi: 'Tây Nguyên',
    nameEn: 'Central Highlands',
    badgeVi: 'Đại Ngàn & Cà Phê',
    badgeEn: 'Highlands & Coffee',
    taglineVi: 'Đại ngàn hùng vĩ & Hương sắc cà phê',
    taglineEn: 'Pine ridges & Coffee culture',
    descVi: 'Không gian văn hóa cồng chiêng huyền thoại, rừng thông ngút ngàn, thác nước trắng xóa và thủ phủ cà phê.',
    descEn: 'Legendary gong culture, mist-covered pine valleys, roaring waterfalls, and rolling fragrant coffee plantations.',
    landmarksVi: ['Đà Lạt', 'Buôn Ma Thuột', 'Thác Dray Nur'],
    landmarksEn: ['Da Lat', 'Buon Ma Thuot', 'Dray Nur Falls'],
    icon: '☕',
    image: '/images/tay_nguyen_highlands.jpg',
    themeColor: '#b45309',
    themeBg: '#fef3c7',
    themeGlow: 'rgba(180, 83, 9, 0.22)',
  },
];

// Weather guide data by region
const REGION_WEATHER_GUIDE = {
  north: {
    titleVi: 'Miền Bắc (Hà Nội, Hạ Long, Ninh Bình, Sapa)',
    titleEn: 'Northern Vietnam (Hanoi, Ha Long, Ninh Binh, Sapa)',
    temp: '22°C - 26°C',
    icon: '🌤️',
    statusVi: 'Mùa thu vàng - Tiết trời đẹp nhất năm',
    statusEn: 'Golden Autumn - Best weather of the year',
    humidity: '68%',
    wind: '12 km/h',
    rainChance: '10%',
    adviceVi:
      'Thời điểm lý tưởng nhất để du lịch miền Bắc! Trời se lạnh buổi sớm, nắng vàng như rót mật vào ban ngày. Vịnh Hạ Long biển êm, ruộng bậc thang Tây Bắc ngát hương lúa chín.',
    adviceEn:
      'The absolute prime time to visit Northern Vietnam! Crisp cool mornings, dry sunny days, calm seas in Ha Long Bay, and golden harvest in the highlands.',
    packingVi: ['Áo khoác gió nhẹ', 'Kem chống nắng', 'Giày đi bộ êm chân', 'Máy ảnh góc rộng'],
    packingEn: ['Light windbreaker jacket', 'Sunscreen', 'Walking sneakers', 'Wide-angle camera'],
  },
  central: {
    titleVi: 'Miền Trung (Đà Nẵng, Hội An, Huế, Nha Trang)',
    titleEn: 'Central Vietnam (Da Nang, Hoi An, Hue, Nha Trang)',
    temp: '26°C - 29°C',
    icon: '☀️',
    statusVi: 'Nắng ấm chan hòa, biển trong xanh',
    statusEn: 'Warm sunny weather, clear ocean',
    humidity: '74%',
    wind: '14 km/h',
    rainChance: '25%',
    adviceVi:
      'Biển Mỹ Khê và An Bàng có sóng vừa phải, thích hợp tắm biển và chơi thể thao nước. Đêm phố cổ Hội An mát rượi, lý tưởng để dạo bộ thưởng ngoạn hoa đăng.',
    adviceEn:
      'Beaches in Da Nang and Hoi An are gorgeous for swimming and surfing. Pleasant evening temperatures make strolling Hoi An lantern streets unforgettable.',
    packingVi: ['Đồ bơi & kính lặn', 'Mũ cói / nón lá', 'Sandals chống nước', 'Quạt mini cầm tay'],
    packingEn: ['Swimwear & goggles', 'Straw hat / conical hat', 'Water-resistant sandals', 'Portable fan'],
  },
  south: {
    titleVi: 'Miền Nam (TP. Hồ Chí Minh, Phú Quốc, Cần Thơ)',
    titleEn: 'Southern Vietnam (Saigon, Phu Quoc, Can Tho)',
    temp: '30°C - 32°C',
    icon: '🌊',
    statusVi: 'Bắt đầu mùa khô, biển Phú Quốc đẹp như ngọc',
    statusEn: 'Dry season begins, Phu Quoc waters are crystal clear',
    humidity: '72%',
    wind: '10 km/h',
    rainChance: '15%',
    adviceVi:
      'Phú Quốc bước vào mùa đẹp nhất với biển lặng sóng, cát trắng không rác và nắng chan hòa. Miền Tây trĩu quả, chợ nổi nhộn nhịp tấp nập buổi sớm.',
    adviceEn:
      'Phu Quoc enters its dry paradise season with mirror-calm turquoise waters. Mekong fruit orchards and floating markets are bustling at sunrise.',
    packingVi: ['Trang phục mỏng nhẹ thoáng khí', 'Kính râm chống tia UV', 'Bình nước du lịch', 'Xịt chống muỗi'],
    packingEn: ['Breathable cotton clothes', 'UV sunglasses', 'Water bottle', 'Insect repellent spray'],
  },
  highlands: {
    titleVi: 'Tây Nguyên (Đà Lạt, Buôn Ma Thuột, Pleiku)',
    titleEn: 'Central Highlands (Da Lat, Buon Ma Thuot, Pleiku)',
    temp: '18°C - 23°C',
    icon: '☕',
    statusVi: 'Mùa hoa dã quỳ & Mùa hái cà phê chín',
    statusEn: 'Wild sunflower season & Coffee harvest time',
    humidity: '80%',
    wind: '8 km/h',
    rainChance: '20%',
    adviceVi:
      'Đà Lạt và các đồi cao nguyên rực rỡ sắc vàng của hoa dã quỳ ven đường. Buổi sớm sương bảng lảng thích hợp săn mây Cầu Đất, tối se lạnh quây quần bên bếp nướng.',
    adviceEn:
      'Highland trails burst with yellow wild sunflowers. Early morning mists are ideal for cloud-hunting, followed by hot drip coffee and BBQ by firelight.',
    packingVi: ['Áo ấm / khăn len', 'Áo giữ nhiệt', 'Giày bám đường tốt', 'Bình giữ nhiệt nhỏ'],
    packingEn: ['Warm sweater / scarf', 'Thermal layer', 'Trekking shoes', 'Thermal tumbler'],
  },
};

export default function HomePage() {
  // ─── STATE MANAGEMENT ──────────────────────────────────────────────────────
  const [lang, setLang] = useState<LangType>('vi');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegionKey>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all');
  const [activeWeatherTab, setActiveWeatherTab] = useState<'north' | 'central' | 'south' | 'highlands'>('north');

  // Realtime Weather State (Open-Meteo)
  const [regionsWeather, setRegionsWeather] = useState<Record<string, RealtimeWeather>>({});
  const [destinationsWeather, setDestinationsWeather] = useState<Record<string, RealtimeWeather>>({});
  const [weatherLive, setWeatherLive] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadRealtimeWeather() {
      try {
        const [regData, destData] = await Promise.all([
          fetchAllRegionsWeather(),
          fetchAllDestinationsWeather(),
        ]);
        if (isMounted) {
          setRegionsWeather(regData);
          setDestinationsWeather(destData);
          setWeatherLive(true);
        }
      } catch (err) {
        console.warn('Realtime weather fetch failed:', err);
      }
    }
    loadRealtimeWeather();
    return () => {
      isMounted = false;
    };
  }, []);

  // Preview Modal State
  const [modalItem, setModalItem] = useState<DestinationItem | null>(null);

  // Favorites state (persisted in memory)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    halong: true,
    hoian: true,
    danang: false,
    ninhbinh: false,
    phuquoc: true,
    hagiang: true,
    saigon: false,
    dalat: false,
  });

  // Story Likes & Bookmarks State
  const [storyLikes, setStoryLikes] = useState<Record<string, { count: number; userLiked: boolean }>>({
    taxua: { count: 1240, userLiked: false },
    hoianNight: { count: 856, userLiked: true },
    phuquoc4d: { count: 1520, userLiked: false },
    bmtCoffee: { count: 924, userLiked: false },
  });

  const [storyBookmarks, setStoryBookmarks] = useState<Record<string, boolean>>({
    taxua: false,
    hoianNight: true,
    phuquoc4d: false,
    bmtCoffee: false,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Trip Planner Interactive State
  const [aiDestination, setAiDestination] = useState('Đà Nẵng & Hội An');
  const [aiDuration, setAiDuration] = useState('3N2Đ');
  const [aiBudgetMillion, setAiBudgetMillion] = useState(6.5);
  const [aiGroupType, setAiGroupType] = useState('Nhóm bạn (3-4 người)');

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const nextState = !prev[id];
      showToast(nextState ? (lang === 'vi' ? 'Đã thêm vào danh sách yêu thích!' : 'Added to favorites!') : (lang === 'vi' ? 'Đã xóa khỏi yêu thích' : 'Removed from favorites'));
      return { ...prev, [id]: nextState };
    });
  };

  const toggleStoryLike = (storyId: string) => {
    setStoryLikes((prev) => {
      const current = prev[storyId] || { count: 100, userLiked: false };
      const nextLiked = !current.userLiked;
      return {
        ...prev,
        [storyId]: {
          count: nextLiked ? current.count + 1 : current.count - 1,
          userLiked: nextLiked,
        },
      };
    });
  };

  const toggleStoryBookmark = (storyId: string) => {
    setStoryBookmarks((prev) => {
      const next = !prev[storyId];
      showToast(next ? (lang === 'vi' ? 'Đã lưu bài viết vào danh sách của bạn' : 'Article bookmarked!') : (lang === 'vi' ? 'Đã bỏ lưu bài viết' : 'Bookmark removed'));
      return { ...prev, [storyId]: next };
    });
  };

  const handleLanguageToggle = () => {
    setLang((prev) => (prev === 'vi' ? 'en' : 'vi'));
  };

  // ─── FILTERED DESTINATIONS COMPUTATION ─────────────────────────────────────
  const filteredDestinations = useMemo(() => {
    return DESTINATIONS.filter((item) => {
      // 1. Region filter
      if (selectedRegion !== 'all' && item.region !== selectedRegion) {
        return false;
      }
      // 2. Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNameVi = item.nameVi.toLowerCase().includes(q);
        const matchNameEn = item.nameEn.toLowerCase().includes(q);
        const matchProvVi = item.provinceVi.toLowerCase().includes(q);
        const matchProvEn = item.provinceEn.toLowerCase().includes(q);
        const matchTag = item.tagsVi.some((t) => t.toLowerCase().includes(q)) || item.tagsEn.some((t) => t.toLowerCase().includes(q));
        if (!matchNameVi && !matchNameEn && !matchProvVi && !matchProvEn && !matchTag) {
          return false;
        }
      }
      return true;
    });
  }, [selectedRegion, selectedCategory, searchQuery]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      all: DESTINATIONS.length,
      beach: DESTINATIONS.filter((d) => d.category === 'beach').length,
      culture: DESTINATIONS.filter((d) => d.category === 'culture').length,
      nature: DESTINATIONS.filter((d) => d.category === 'nature').length,
      resort: DESTINATIONS.filter((d) => d.category === 'resort').length,
      food: DESTINATIONS.filter((d) => d.category === 'food').length,
    };
    return counts;
  }, []);

  // Budget label feedback
  const budgetTier = useMemo(() => {
    if (aiBudgetMillion < 4) return lang === 'vi' ? '🎒 Tiết kiệm & Phượt tự túc' : '🎒 Budget & Backpacker';
    if (aiBudgetMillion < 10) return lang === 'vi' ? '⛵ Tiêu chuẩn thoải mái & Tiện nghi' : '⛵ Standard & Comfortable';
    return lang === 'vi' ? '👑 Nghỉ dưỡng cao cấp & 5 sao' : '👑 Luxury Resort & 5-Star';
  }, [aiBudgetMillion, lang]);

  return (
    <div className={styles.landingRoot}>
      {/* ─── 0. LIVE WEATHER TICKER BANNER ──────────────────────────────── */}
      <div className={styles.weatherTickerBanner}>
        <div className={styles.weatherTickerContainer}>
          <div className={styles.weatherTickerLabel}>
            <span className={styles.weatherTickerLiveDot} />
            <span>
              {lang === 'vi'
                ? (weatherLive ? 'THỜI TIẾT REALTIME TRỰC TIẾP' : 'THỜI TIẾT 4 MIỀN')
                : (weatherLive ? 'LIVE REALTIME WEATHER' : 'VIETNAM WEATHER')}
            </span>
          </div>
          <div className={styles.weatherTickerItems}>
            <div className={styles.weatherTickerItem} onClick={() => setActiveWeatherTab('north')}>
              <span className={styles.tickerCity}>Hà Nội</span>
              <span className={styles.tickerTemp}>{regionsWeather.north?.tempFormatted ?? '26°C'}</span>
              <span>{regionsWeather.north ? `${regionsWeather.north.icon} ${regionsWeather.north.statusVi}` : '🌤️ Thu mát'}</span>
            </div>
            <div className={styles.weatherTickerItem} onClick={() => setActiveWeatherTab('north')}>
              <span className={styles.tickerCity}>Hạ Long</span>
              <span className={styles.tickerTemp}>{destinationsWeather.halong?.tempFormatted ?? '25°C'}</span>
              <span>{destinationsWeather.halong ? `${destinationsWeather.halong.icon} ${destinationsWeather.halong.statusVi}` : '🌊 Biển êm'}</span>
            </div>
            <div className={styles.weatherTickerItem} onClick={() => setActiveWeatherTab('central')}>
              <span className={styles.tickerCity}>Đà Nẵng</span>
              <span className={styles.tickerTemp}>{regionsWeather.central?.tempFormatted ?? '28°C'}</span>
              <span>{regionsWeather.central ? `${regionsWeather.central.icon} ${regionsWeather.central.statusVi}` : '☀️ Nắng ấm'}</span>
            </div>
            <div className={styles.weatherTickerItem} onClick={() => setActiveWeatherTab('central')}>
              <span className={styles.tickerCity}>Hội An</span>
              <span className={styles.tickerTemp}>{destinationsWeather.hoian?.tempFormatted ?? '27°C'}</span>
              <span>{destinationsWeather.hoian ? `${destinationsWeather.hoian.icon} ${destinationsWeather.hoian.statusVi}` : '🏮 Dịu mát'}</span>
            </div>
            <div className={styles.weatherTickerItem} onClick={() => setActiveWeatherTab('highlands')}>
              <span className={styles.tickerCity}>Đà Lạt</span>
              <span className={styles.tickerTemp}>{regionsWeather.highlands?.tempFormatted ?? '20°C'}</span>
              <span>{regionsWeather.highlands ? `${regionsWeather.highlands.icon} ${regionsWeather.highlands.statusVi}` : '🌫️ Săn mây'}</span>
            </div>
            <div className={styles.weatherTickerItem} onClick={() => setActiveWeatherTab('south')}>
              <span className={styles.tickerCity}>TP. Hồ Chí Minh</span>
              <span className={styles.tickerTemp}>{regionsWeather.south?.tempFormatted ?? '31°C'}</span>
              <span>{regionsWeather.south ? `${regionsWeather.south.icon} ${regionsWeather.south.statusVi}` : '⛅ Nắng ấm'}</span>
            </div>
            <div className={styles.weatherTickerItem} onClick={() => setActiveWeatherTab('south')}>
              <span className={styles.tickerCity}>Phú Quốc</span>
              <span className={styles.tickerTemp}>{destinationsWeather.phuquoc?.tempFormatted ?? '29°C'}</span>
              <span>{destinationsWeather.phuquoc ? `${destinationsWeather.phuquoc.icon} ${destinationsWeather.phuquoc.statusVi}` : '🏝️ Biển ngọc'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 1. TOP GLOBAL NAVBAR (5 FUNCTIONAL PILLARS) ────────────────── */}
      <Navbar
        activeModule="explore"
        lang={lang}
        onLangChange={(nextLang) => setLang(nextLang)}
      />

      {/* ─── 2. HERO SECTION WITH REALISTIC ATMOSPHERE ─────────────────── */}
      <div className={styles.heroWrapper}>
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <span>✨</span>
              <span>{lang === 'vi' ? 'NỀN TẢNG DU LỊCH THÔNG MINH VIỆT NAM' : 'SMART TRAVEL PLATFORM FOR VIETNAM'}</span>
              <span>✨</span>
            </div>

            <h1 className={styles.heroTitle}>
              {lang === 'vi' ? (
                <>
                  Việt Nam qua lăng kính mới,
                  <span className={styles.heroHighlight}>kết nối trọn vẹn hành trình.</span>
                </>
              ) : (
                <>
                  Experience Vietnam authentically,
                  <span className={styles.heroHighlight}>crafted with smart AI.</span>
                </>
              )}
            </h1>

            <p className={styles.heroSubtitle}>
              {lang === 'vi'
                ? 'Khám phá 250+ điểm đến di sản, thiết kế lịch trình cá nhân hóa trong 30 giây bằng AI, quản lý ngân sách nhóm minh bạch và lưu giữ từng khoảnh khắc đáng nhớ.'
                : 'Discover 250+ certified destinations, generate personalized itineraries in 30 seconds with AI, split group expenses fairly in VND, and cherish every memory.'}
            </p>

            <div className={styles.heroButtons}>
              <Link href="/planner" className={styles.btnHeroPrimary}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>{lang === 'vi' ? 'Lên lịch trình cùng AI' : 'Plan with AI'}</span>
              </Link>

              <a href="#destinations" className={styles.btnHeroSecondary}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
                <span>{lang === 'vi' ? 'Khám phá điểm đến' : 'Explore Places'}</span>
              </a>
            </div>

            {/* Interactive Real-Time Search Bar */}
            <div className={styles.heroSearchBar}>
              <span className={styles.heroSearchIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <input
                type="text"
                placeholder={lang === 'vi' ? 'Bạn muốn đi đâu? (Hạ Long, Hội An, Phú Quốc, Hà Giang...)' : 'Where do you want to go? (Ha Long, Hoi An...)'}
                className={styles.heroSearchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 6px' }}
                  title={lang === 'vi' ? 'Xóa tìm kiếm' : 'Clear'}
                >
                  ✕
                </button>
              )}
              <a href="#destinations" className={styles.heroSearchBtn} aria-label="Tìm kiếm ngay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>

            {/* Quick Filter Tags */}
            <div className={styles.quickTagsRow}>
              <span>{lang === 'vi' ? 'Gợi ý hot:' : 'Trending:'}</span>
              {['Vịnh Hạ Long', 'Hội An', 'Phú Quốc', 'Hà Giang Loop', 'Bà Nà Hills'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={styles.quickTagChip}
                  onClick={() => {
                    setSearchQuery(chip);
                    const el = document.getElementById('destinations');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Hero Visual Column: Realistic Panoramic Landscape + Floating Live Badges */}
          <div className={styles.heroVisualCol}>
            <div className={styles.dioramaRealisticWrapper}>
              <div className={styles.heroMainPhotoCard}>
                <img
                  src="/images/vietnam_panoramic_day.jpg"
                  alt="Việt Nam hùng vĩ từ non cao đến biển ngọc"
                  className={styles.heroPhotoImg}
                />
                <div className={styles.heroPhotoGradientOverlay}>
                  <h3 className={styles.heroOverlayTitle}>
                    {lang === 'vi' ? 'Việt Nam – Non Sông Gấm Vóc' : 'Vietnam – The Land of Wonders'}
                  </h3>
                  <p className={styles.heroOverlaySub}>
                    {lang === 'vi' ? 'Hạ Long • Tràng An • Hội An • Đà Lạt • Phú Quốc' : 'Ha Long • Trang An • Hoi An • Da Lat • Phu Quoc'}
                  </p>
                </div>
              </div>

              {/* Floating Interactive Live Badges */}
              <div className={styles.badgeWeatherLive}>
                <span>🌤️</span>
                <span>{lang === 'vi' ? 'Hạ Long • 25°C Biển êm' : 'Ha Long • 25°C Calm Sea'}</span>
              </div>

              <div className={styles.badgeSuitcase3D}>
                <span>🧳</span>
                <span>{lang === 'vi' ? '45.200+ Lịch trình đã tạo' : '45.200+ Trips Created'}</span>
              </div>

              <div className={styles.badgeCultureHat}>
                <span>🏮</span>
                <span>{lang === 'vi' ? 'Hội An • Đêm rằm hoa đăng' : 'Hoi An • Lantern Festival'}</span>
              </div>

              <div className={styles.floatingTagline}>
                Vietnam is always<br />a good idea! ✨
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ─── 2.5 SOCIAL PROOF & CAPABILITIES STRIP ──────────────────────── */}
      <div className={styles.socialProofStrip}>
        <div className={styles.proofItem}>
          <div className={styles.proofIcon}>🗺️</div>
          <div>
            <div className={styles.proofTitle}>250+ {lang === 'vi' ? 'Điểm Đến Di Sản' : 'Certified Destinations'}</div>
            <div className={styles.proofDesc}>{lang === 'vi' ? 'Khảo sát thực tế & cập nhật 2025' : 'Verified & updated for 2025'}</div>
          </div>
        </div>

        <div className={styles.proofItem}>
          <div className={styles.proofIcon}>🤖</div>
          <div>
            <div className={styles.proofTitle}>AI Planner 30s</div>
            <div className={styles.proofDesc}>{lang === 'vi' ? 'Tối ưu lộ trình theo ngân sách' : 'Optimized route & budget'}</div>
          </div>
        </div>

        <div className={styles.proofItem}>
          <div className={styles.proofIcon}>💰</div>
          <div>
            <div className={styles.proofTitle}>{lang === 'vi' ? 'Quản Lý Quỹ Nhóm' : 'Group Smart Split'}</div>
            <div className={styles.proofDesc}>{lang === 'vi' ? 'Chia tiền VND chính xác, minh bạch' : 'Accurate VND split per member'}</div>
          </div>
        </div>

        <div className={styles.proofItem}>
          <div className={styles.proofIcon}>👥</div>
          <div>
            <div className={styles.proofTitle}>120k+ {lang === 'vi' ? 'Cộng Đồng Xê Dịch' : 'Travelers'}</div>
            <div className={styles.proofDesc}>{lang === 'vi' ? 'Chia sẻ trải nghiệm & review thật' : 'Honest reviews & genuine stories'}</div>
          </div>
        </div>
      </div>

      {/* ─── 3. SECTION: 4 VÙNG VĂN HÓA ─────────────────────────────────── */}
      <section className={styles.regionSectionWrapper} id="regions">
        <div className={styles.regionSectionGlow} />

        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderLeft}>
            <div className={styles.regionEyebrow}>
              <span>✨</span>
              <span>{lang === 'vi' ? 'Bản sắc & Văn hóa 4 vùng miền' : 'Cultural Heritage & Regions'}</span>
            </div>
            <div className={styles.sectionTitleRow}>
              <div className={styles.sectionIconBadge} style={{ background: 'linear-gradient(135deg, #0284c7 0%, #245477 100%)', color: '#ffffff', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}>
                🗺️
              </div>
              <h2 className={styles.sectionTitle}>
                {lang === 'vi' ? 'Khám phá Việt Nam qua 4 vùng văn hóa' : 'Explore Vietnam across 4 Cultural Regions'}
              </h2>
            </div>
            <p className={styles.sectionSubtitle}>
              {lang === 'vi'
                ? 'Nhấp vào từng vùng miền để lọc nhanh các danh lam thắng cảnh tiêu biểu tương ứng.'
                : 'Click any region to filter featured highlights instantly.'}
            </p>
          </div>
          {selectedRegion !== 'all' && (
            <button className={styles.btnClearFilter} onClick={() => setSelectedRegion('all')}>
              {lang === 'vi' ? '✕ Xem tất cả các vùng' : '✕ Show all regions'}
            </button>
          )}
        </div>

        {/* Quick Filter Tabs */}
        <div className={styles.regionFilterTabsRow}>
          <button
            type="button"
            className={`${styles.regionFilterTab} ${selectedRegion === 'all' ? styles.regionFilterTabActive : ''}`}
            onClick={() => setSelectedRegion('all')}
          >
            <span>🌏</span>
            <span>{lang === 'vi' ? 'Tất cả các vùng' : 'All Regions'}</span>
            <span className={styles.regionTabCount}>{DESTINATIONS.length}</span>
          </button>
          {CULTURAL_REGIONS.map((r) => {
            const count = DESTINATIONS.filter((d) => d.region === r.id).length;
            const isActive = selectedRegion === r.id;
            return (
              <button
                key={r.id}
                type="button"
                className={`${styles.regionFilterTab} ${isActive ? styles.regionFilterTabActive : ''}`}
                onClick={() => {
                  setSelectedRegion((prev) => (prev === r.id ? 'all' : r.id));
                  const el = document.getElementById('destinations');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>{r.icon}</span>
                <span>{lang === 'vi' ? r.nameVi : r.nameEn}</span>
                <span className={styles.regionTabCount}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* 4 Regions Grid */}
        <div className={styles.regionGrid}>
          {CULTURAL_REGIONS.map((r) => {
            const count = DESTINATIONS.filter((d) => d.region === r.id).length;
            const isActive = selectedRegion === r.id;
            return (
              <div
                key={r.id}
                className={`${styles.regionCard} ${isActive ? styles.regionCardActive : ''}`}
                style={{
                  borderColor: isActive ? r.themeColor : undefined,
                }}
                onClick={() => {
                  setSelectedRegion((prev) => (prev === r.id ? 'all' : r.id));
                  const el = document.getElementById('destinations');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div className={styles.regionImageWrapper}>
                  <img
                    src={r.image}
                    alt={lang === 'vi' ? r.nameVi : r.nameEn}
                    className={styles.regionImage}
                  />
                  <div className={styles.regionImageOverlay} />

                  {/* Top Left Cultural Badge */}
                  <span className={styles.regionPillBadge}>
                    <span>{r.icon}</span>
                    <span>{lang === 'vi' ? r.nameVi : r.nameEn}</span>
                  </span>

                  {/* Top Right Destination Counter */}
                  <span className={styles.regionCountBadge}>
                    <span>📍</span>
                    <span>{count} {lang === 'vi' ? 'điểm đến' : 'spots'}</span>
                  </span>

                  {/* Active Indicator on Image */}
                  {isActive && (
                    <div className={styles.regionActiveIndicator}>
                      <span>✓</span>
                      <span>{lang === 'vi' ? 'ĐANG CHỌN ĐỂ LỌC' : 'ACTIVE FILTER'}</span>
                    </div>
                  )}
                </div>

                <div className={styles.regionCardBody}>
                  <div className={styles.regionCardHeader}>
                    <h3 className={styles.regionName}>{lang === 'vi' ? r.nameVi : r.nameEn}</h3>
                    <div
                      className={styles.regionIconBubble}
                      style={{ background: r.themeBg, color: r.themeColor }}
                    >
                      {r.icon}
                    </div>
                  </div>

                  <div className={styles.regionTagline} style={{ color: r.themeColor }}>
                    <span>✦</span>
                    <span>{lang === 'vi' ? r.taglineVi : r.taglineEn}</span>
                  </div>

                  <p className={styles.regionDesc}>
                    {lang === 'vi' ? r.descVi : r.descEn}
                  </p>

                  {/* Signature Landmark Pills */}
                  <div className={styles.regionLandmarkPills}>
                    {(lang === 'vi' ? r.landmarksVi : r.landmarksEn).map((tag, idx) => (
                      <span key={idx} className={styles.regionLandmarkTag}>
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className={styles.regionActionRow}>
                    <span
                      className={styles.regionActionText}
                      style={{ color: isActive ? r.themeColor : '#0284c7' }}
                    >
                      {isActive
                        ? (lang === 'vi' ? 'Đang lọc điểm đến ✓' : 'Filtering spots ✓')
                        : (lang === 'vi' ? 'Xem các điểm đến' : 'Explore highlights')}
                    </span>
                    <div
                      className={styles.regionArrowBtn}
                      style={{
                        background: isActive ? r.themeColor : undefined,
                        color: isActive ? '#ffffff' : undefined,
                        borderColor: isActive ? r.themeColor : undefined,
                      }}
                    >
                      →
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 4. SECTION: NHỮNG ĐIỂM ĐẾN ĐƯỢC YÊU THÍCH (INTERACTIVE) ───── */}
      <section className={styles.sectionBlock} id="destinations">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderLeft}>
            <div className={styles.sectionTitleRow}>
              <div className={styles.sectionIconBadge} style={{ background: '#fef3c7', color: '#d97706' }}>
                ⭐
              </div>
              <h2 className={styles.sectionTitle}>
                {lang === 'vi' ? 'Những điểm đến được yêu thích nhất' : 'Most Beloved Destinations'}
              </h2>
            </div>
            <p className={styles.sectionSubtitle}>
              {lang === 'vi'
                ? 'Lọc theo thể loại trải nghiệm, tìm kiếm địa danh và nhấp vào ảnh để xem chi tiết.'
                : 'Filter by travel style, search places, and click to view full details.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              {lang === 'vi' ? 'Hiển thị' : 'Showing'} <strong>{filteredDestinations.length}</strong> {lang === 'vi' ? 'điểm đến' : 'destinations'}
            </span>
          </div>
        </div>

        {/* Category Pills & Filter Controls */}
        <div className={styles.filterSectionWrapper}>
          <div className={styles.categoryPillRow}>
            <button
              type="button"
              className={`${styles.categoryPill} ${selectedCategory === 'all' ? styles.categoryPillActive : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <span>🌟</span>
              <span>{lang === 'vi' ? 'Tất cả' : 'All'}</span>
              <span className={styles.categoryCount}>{categoryCounts.all}</span>
            </button>

            <button
              type="button"
              className={`${styles.categoryPill} ${selectedCategory === 'beach' ? styles.categoryPillActive : ''}`}
              onClick={() => setSelectedCategory('beach')}
            >
              <span>🏖️</span>
              <span>{lang === 'vi' ? 'Biển đảo & Lặn ngắm san hô' : 'Islands & Beach'}</span>
              <span className={styles.categoryCount}>{categoryCounts.beach}</span>
            </button>

            <button
              type="button"
              className={`${styles.categoryPill} ${selectedCategory === 'culture' ? styles.categoryPillActive : ''}`}
              onClick={() => setSelectedCategory('culture')}
            >
              <span>🏮</span>
              <span>{lang === 'vi' ? 'Di sản & Văn hóa' : 'Culture & Heritage'}</span>
              <span className={styles.categoryCount}>{categoryCounts.culture}</span>
            </button>

            <button
              type="button"
              className={`${styles.categoryPill} ${selectedCategory === 'nature' ? styles.categoryPillActive : ''}`}
              onClick={() => setSelectedCategory('nature')}
            >
              <span>⛰️</span>
              <span>{lang === 'vi' ? 'Núi non & Trekking' : 'Mountains & Trekking'}</span>
              <span className={styles.categoryCount}>{categoryCounts.nature}</span>
            </button>

            <button
              type="button"
              className={`${styles.categoryPill} ${selectedCategory === 'resort' ? styles.categoryPillActive : ''}`}
              onClick={() => setSelectedCategory('resort')}
            >
              <span>🏨</span>
              <span>{lang === 'vi' ? 'Nghỉ dưỡng & Check-in' : 'Resort & Check-in'}</span>
              <span className={styles.categoryCount}>{categoryCounts.resort}</span>
            </button>

            <button
              type="button"
              className={`${styles.categoryPill} ${selectedCategory === 'food' ? styles.categoryPillActive : ''}`}
              onClick={() => setSelectedCategory('food')}
            >
              <span>🍜</span>
              <span>{lang === 'vi' ? 'Ẩm thực & Phố cổ' : 'Food & Night Market'}</span>
              <span className={styles.categoryCount}>{categoryCounts.food}</span>
            </button>
          </div>

          {/* Active Filter Indicators & Reset Action */}
          {(selectedCategory !== 'all' || selectedRegion !== 'all' || searchQuery.trim()) && (
            <div className={styles.filterStatusRow}>
              <div className={styles.filterResultsCount}>
                <span>{lang === 'vi' ? 'Đang lọc:' : 'Active filters:'}</span>
                {selectedRegion !== 'all' && <strong>[{lang === 'vi' ? 'Vùng: ' : 'Region: '}{selectedRegion}]</strong>}
                {selectedCategory !== 'all' && <strong>[{lang === 'vi' ? 'Thể loại: ' : 'Category: '}{selectedCategory}]</strong>}
                {searchQuery.trim() && <strong>[{lang === 'vi' ? 'Tìm: ' : 'Query: '}&quot;{searchQuery}&quot;]</strong>}
              </div>
              <button
                type="button"
                className={styles.btnClearFilter}
                onClick={() => {
                  setSelectedRegion('all');
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
              >
                {lang === 'vi' ? '✕ Xóa tất cả bộ lọc' : '✕ Reset all filters'}
              </button>
            </div>
          )}
        </div>

        {/* Destinations Grid */}
        <div className={styles.destinationsGrid}>
          {filteredDestinations.length > 0 ? (
            filteredDestinations.map((item) => (
              <div
                key={item.id}
                className={styles.destinationCard}
                onClick={() => setModalItem(item)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.destinationMediaWrapper}>
                  <img src={item.image} alt={lang === 'vi' ? item.nameVi : item.nameEn} className={styles.destinationMedia} />

                  {/* Season Badge */}
                  <span className={styles.destCardSeasonBadge}>
                    📅 {lang === 'vi' ? item.seasonVi : item.seasonEn}
                  </span>

                  {/* Realtime Weather Badge */}
                  <span className={styles.destCardWeatherBadge}>
                    {destinationsWeather[item.id]?.icon ?? '🌤️'}{' '}
                    {destinationsWeather[item.id]?.tempFormatted ?? item.temp}
                  </span>

                  {/* Interactive Heart Button */}
                  <button
                    className={styles.destHeartBtn}
                    onClick={(e) => toggleFavorite(item.id, e)}
                    aria-label="Yêu thích"
                    title={favorites[item.id] ? (lang === 'vi' ? 'Bỏ yêu thích' : 'Unlike') : (lang === 'vi' ? 'Thêm vào yêu thích' : 'Like')}
                  >
                    {favorites[item.id] ? '❤️' : '🤍'}
                  </button>

                  {/* Overlay Info */}
                  <div className={styles.destinationOverlay}>
                    <h3 className={styles.destName}>{lang === 'vi' ? item.nameVi : item.nameEn}</h3>
                    <div className={styles.destLocationRow}>
                      <span className={styles.destLocation}>📍 {lang === 'vi' ? item.provinceVi : item.provinceEn}</span>
                      <span className={styles.destRating}>⭐ {item.rating} ({item.reviewCount})</span>
                    </div>

                    <div className={styles.destTagsRow}>
                      {(lang === 'vi' ? item.tagsVi : item.tagsEn).slice(0, 2).map((tag) => (
                        <span key={tag} className={styles.destTag}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Bottom Meta & Quick View Trigger */}
                    <div className={styles.destBottomMeta}>
                      <div className={styles.destPriceEstimate}>
                        <span>{lang === 'vi' ? 'Dự kiến: ' : 'From: '}</span>
                        <strong>{lang === 'vi' ? item.pricePerDayVi : item.pricePerDayEn}</strong>
                      </div>
                      <button
                        type="button"
                        className={styles.destQuickViewBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalItem(item);
                        }}
                      >
                        <span>{lang === 'vi' ? 'Xem nhanh' : 'Details'}</span>
                        <span>🔍</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyDestState}>
              <div className={styles.emptyStateIcon}>🔍</div>
              <h4 className={styles.emptyStateTitle}>
                {lang === 'vi' ? 'Không tìm thấy điểm đến phù hợp' : 'No matching destinations found'}
              </h4>
              <p className={styles.emptyStateDesc}>
                {lang === 'vi'
                  ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm nút bên dưới để xem toàn bộ danh sách.'
                  : 'Try adjusting your search query or reset filters to see all destinations.'}
              </p>
              <button
                type="button"
                className={styles.btnHeroPrimary}
                onClick={() => {
                  setSelectedRegion('all');
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
              >
                {lang === 'vi' ? 'Xem toàn bộ 8 điểm đến' : 'View all 8 destinations'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── 5. SECTION: AI TRIP PLANNER (INTERACTIVE STUDIO) ──────────── */}
      <section className={styles.sectionBlock} id="ai-planner">
        <div className={styles.aiBanner}>
          <div className={styles.aiBannerLeft}>
            <div className={styles.aiBadge}>
              <span>🤖</span> {lang === 'vi' ? 'VISTA SMART AI PLANNER' : 'VISTA SMART AI PLANNER'}
            </div>

            <h2 className={styles.aiTitle}>
              {lang === 'vi'
                ? 'Chuyến đi hoàn hảo bắt đầu từ vài lựa chọn thông minh.'
                : 'Your ideal itinerary starts with simple smart choices.'}
            </h2>

            <p className={styles.aiSubtitle}>
              {lang === 'vi'
                ? 'Tự động tính toán điểm tham quan hợp lý, phân bổ thời gian di chuyển và dự trù chi tiêu VND minh bạch cho từng thành viên trong nhóm.'
                : 'Automatically orchestrates sightseeing spots, optimizes transit routes, and calculates accurate VND expenses for everyone.'}
            </p>

            {/* Interactive Planner Grid */}
            <div className={styles.aiFormGrid}>
              {/* 1. Điểm đến */}
              <div className={styles.aiSelectCard}>
                <div className={styles.aiInputLabelRow}>
                  <span>📍</span> {lang === 'vi' ? 'Điểm đến mục tiêu' : 'Destination'}
                </div>
                <div className={styles.aiChipOptionRow}>
                  {['Đà Nẵng & Hội An', 'Hà Giang Loop', 'Hạ Long & Ninh Bình', 'Phú Quốc', 'Đà Lạt'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`${styles.aiOptionChip} ${aiDestination === d ? styles.aiOptionChipActive : ''}`}
                      onClick={() => setAiDestination(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Thời gian đi */}
              <div className={styles.aiSelectCard}>
                <div className={styles.aiInputLabelRow}>
                  <span>📅</span> {lang === 'vi' ? 'Thời lượng chuyến đi' : 'Duration'}
                </div>
                <div className={styles.aiChipOptionRow}>
                  {['2N1Đ', '3N2Đ', '4N3Đ', '5N4Đ'].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      className={`${styles.aiOptionChip} ${aiDuration === dur ? styles.aiOptionChipActive : ''}`}
                      onClick={() => setAiDuration(dur)}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Ngân sách dự kiến (Slider) */}
              <div className={styles.aiSelectCard} style={{ gridColumn: '1 / -1' }}>
                <div className={styles.sliderContainer}>
                  <div className={styles.sliderHeaderRow}>
                    <div className={styles.aiInputLabelRow}>
                      <span>💳</span> {lang === 'vi' ? 'Ngân sách bình quân / người:' : 'Estimated budget / person:'}
                      <strong style={{ color: '#0284c7', fontSize: 14, marginLeft: 4 }}>
                        {aiBudgetMillion.toLocaleString('vi-VN')} {lang === 'vi' ? 'triệu VNĐ' : 'M VND'}
                      </strong>
                    </div>
                    <span className={styles.budgetFeedbackBadge}>{budgetTier}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    step="0.5"
                    value={aiBudgetMillion}
                    onChange={(e) => setAiBudgetMillion(parseFloat(e.target.value))}
                    className={styles.styledRangeInput}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                    <span>2.000.000đ (Phượt tiết kiệm)</span>
                    <span>10.000.000đ (Tiêu chuẩn)</span>
                    <span>20.000.000đ+ (Sang trọng)</span>
                  </div>
                </div>
              </div>

              {/* 4. Bạn đồng hành */}
              <div className={styles.aiSelectCard} style={{ gridColumn: '1 / -1' }}>
                <div className={styles.aiInputLabelRow}>
                  <span>👥</span> {lang === 'vi' ? 'Bạn đồng hành' : 'Companion type'}
                </div>
                <div className={styles.aiChipOptionRow}>
                  {['1 mình (Solo)', 'Cặp đôi', 'Nhóm bạn (3-4 người)', 'Gia đình có trẻ em'].map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      className={`${styles.aiOptionChip} ${aiGroupType === grp ? styles.aiOptionChipActive : ''}`}
                      onClick={() => setAiGroupType(grp)}
                    >
                      {grp}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className={styles.btnAiSubmitRow}>
              <Link
                href={`/planner?dest=${encodeURIComponent(aiDestination)}&duration=${aiDuration}&budget=${aiBudgetMillion}`}
                className={styles.btnAiSubmit}
              >
                <span>{lang === 'vi' ? 'Xem chi tiết lịch trình AI' : 'Open Full AI Plan'}</span>
                <span>→</span>
              </Link>
              <span className={styles.aiHintText}>
                ⚡ {lang === 'vi' ? 'Xử lý hoàn toàn tự động chỉ trong 30 giây' : 'Instant smart scheduling in 30s'}
              </span>
            </div>
          </div>

          {/* AI Live Preview Card (Right Column - Dynamic Response) */}
          <div className={styles.aiBannerRight}>
            <div className={styles.aiLivePreviewCard}>
              <div className={styles.previewHeader}>
                <div>
                  <h4 className={styles.previewTitle}>
                    📍 {aiDestination} • {aiDuration}
                  </h4>
                  <span style={{ fontSize: 11.5, opacity: 0.9 }}>
                    👥 {aiGroupType}
                  </span>
                </div>
                <span className={styles.previewTag}>✨ AI Suggested</span>
              </div>

              <div className={styles.previewBody}>
                {/* Day 1 */}
                <div className={styles.previewTimelineItem}>
                  <div className={styles.timelineDayBadge}>NGÀY 1</div>
                  <div className={styles.timelineDetails}>
                    <div className={styles.timelinePlace}>
                      {aiDestination.includes('Hội An')
                        ? 'Check-in Đà Nẵng, tắm biển Mỹ Khê & Bánh tráng cuốn thịt heo'
                        : aiDestination.includes('Hà Giang')
                        ? 'Khởi hành từ TP. Hà Giang, check-in Km0 & Dốc Bắc Sum'
                        : aiDestination.includes('Hạ Long')
                        ? 'Đến cảng Tuần Châu, nhận phòng du thuyền 5 sao vịnh Bái Tử Long'
                        : 'Đáp máy bay, nhận phòng resort & ngắm hoàng hôn bãi biển'}
                    </div>
                    <div className={styles.timelineDesc}>
                      {lang === 'vi' ? 'Buổi tối: Thưởng thức ẩm thực địa phương & dạo phố' : 'Evening: Local culinary & promenade walk'}
                    </div>
                  </div>
                </div>

                {/* Day 2 */}
                <div className={styles.previewTimelineItem}>
                  <div className={styles.timelineDayBadge}>NGÀY 2</div>
                  <div className={styles.timelineDetails}>
                    <div className={styles.timelinePlace}>
                      {aiDestination.includes('Hội An')
                        ? 'Check-in Cầu Vàng Bà Nà Hills, chiều về dạo phố cổ Hội An thả đèn hoa đăng'
                        : aiDestination.includes('Hà Giang')
                        ? 'Chinh phục đèo Mã Pí Lèng, chèo thuyền sông Nho Quế hẻm Tu Sản'
                        : aiDestination.includes('Hạ Long')
                        ? 'Khám phá Hang Sửng Sốt, chèo kayak hang Luồn & tiệc hoàng hôn trên boong'
                        : 'Tour cano 4 đảo, lặn ngắm san hô & cáp treo vượt biển Hòn Thơm'}
                    </div>
                    <div className={styles.timelineDesc}>
                      {lang === 'vi' ? 'Thời gian vàng: 15:30 – 18:00 ngắm cảnh tuyệt đẹp' : 'Golden hour: 15:30 – 18:00 prime photo time'}
                    </div>
                  </div>
                </div>

                {/* Day 3 */}
                <div className={styles.previewTimelineItem}>
                  <div className={styles.timelineDayBadge}>NGÀY 3</div>
                  <div className={styles.timelineDetails}>
                    <div className={styles.timelinePlace}>
                      {aiDestination.includes('Hội An')
                        ? 'Đạp xe làng rau Trà Quế, mua đặc sản phố Hội & tiễn sân bay'
                        : aiDestination.includes('Hà Giang')
                        ? 'Thăm dinh thự họ Vương, chợ phiên Đồng Văn & cung đường chữ M'
                        : aiDestination.includes('Hạ Long')
                        ? 'Tập Taichi sáng sớm trên boong tàu, ngắm hang Đầu Gỗ & trở về bờ'
                        : 'Check-in Sunset Sanato, mua ngọc trai & nước mắm truyền thống'}
                    </div>
                    <div className={styles.timelineDesc}>
                      {lang === 'vi' ? 'Tổng kết quỹ nhóm & chia sẻ album ảnh du lịch' : 'Group expense settlement & photo album sync'}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.previewFooter}>
                <span style={{ color: '#475569' }}>
                  {lang === 'vi' ? 'Dự kiến chi tiêu / người:' : 'Est. total / person:'}
                </span>
                <span className={styles.previewBudget}>
                  ~{(aiBudgetMillion * 1000000).toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. SECTION: CẨM NANG THỜI TIẾT 4 MÙA (INTERACTIVE) ─────────── */}
      <section className={styles.sectionBlock} id="weather-guide">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderLeft}>
            <div className={styles.sectionTitleRow}>
              <div className={styles.sectionIconBadge} style={{ background: '#EAF6FF', color: '#0284c7' }}>
                🌤️
              </div>
              <h2 className={styles.sectionTitle}>
                {lang === 'vi' ? 'Cẩm nang du lịch & Thời tiết 4 mùa' : 'Vietnam Seasonal Weather & Packing Guide'}
              </h2>
            </div>
            <p className={styles.sectionSubtitle}>
              {lang === 'vi'
                ? 'Việt Nam mỗi vùng một vẻ. Xem ngay tình hình thời tiết và lời khuyên chuẩn bị hành lý chuẩn xác nhất.'
                : 'Plan your trip perfectly with regional climates, optimal travel seasons, and smart packing tips.'}
            </p>
          </div>
        </div>

        <div className={styles.weatherGuideSection}>
          {/* Region Tabs */}
          <div className={styles.weatherTabsRow}>
            {(['north', 'central', 'south', 'highlands'] as const).map((rKey) => (
              <button
                key={rKey}
                type="button"
                className={`${styles.weatherTabBtn} ${activeWeatherTab === rKey ? styles.weatherTabBtnActive : ''}`}
                onClick={() => setActiveWeatherTab(rKey)}
              >
                <span>{REGION_WEATHER_GUIDE[rKey].icon}</span>
                <span>{rKey === 'north' ? (lang === 'vi' ? 'Miền Bắc' : 'Northern') : rKey === 'central' ? (lang === 'vi' ? 'Miền Trung' : 'Central') : rKey === 'south' ? (lang === 'vi' ? 'Miền Nam' : 'Southern') : (lang === 'vi' ? 'Tây Nguyên' : 'Highlands')}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Grid */}
          <div className={styles.weatherContentGrid}>
            {(() => {
              const currentRw = regionsWeather[activeWeatherTab];
              const displayIcon = currentRw?.icon ?? REGION_WEATHER_GUIDE[activeWeatherTab].icon;
              const displayTemp = currentRw?.tempFormatted ?? REGION_WEATHER_GUIDE[activeWeatherTab].temp;
              const displayStatus = currentRw
                ? (lang === 'vi' ? currentRw.statusVi : currentRw.statusEn)
                : (lang === 'vi' ? REGION_WEATHER_GUIDE[activeWeatherTab].statusVi : REGION_WEATHER_GUIDE[activeWeatherTab].statusEn);
              const displayHumidity = currentRw ? `${currentRw.humidity}%` : REGION_WEATHER_GUIDE[activeWeatherTab].humidity;
              const displayWind = currentRw ? `${currentRw.windSpeed} km/h` : REGION_WEATHER_GUIDE[activeWeatherTab].wind;
              const displayRain = currentRw ? `${currentRw.precipitation} mm` : REGION_WEATHER_GUIDE[activeWeatherTab].rainChance;
              const displayAdvice = currentRw
                ? (lang === 'vi' ? currentRw.adviceVi : currentRw.adviceEn)
                : (lang === 'vi' ? REGION_WEATHER_GUIDE[activeWeatherTab].adviceVi : REGION_WEATHER_GUIDE[activeWeatherTab].adviceEn);

              return (
                <>
                  {/* Left Big Card */}
                  <div className={styles.weatherSummaryCard}>
                    <div className={styles.weatherSummaryHeader}>
                      <h3 className={styles.weatherRegionTitle}>
                        {lang === 'vi' ? REGION_WEATHER_GUIDE[activeWeatherTab].titleVi : REGION_WEATHER_GUIDE[activeWeatherTab].titleEn}
                      </h3>
                      <span className={styles.weatherLiveBadge}>
                        {currentRw?.isLive ? '🔴 Live Open-Meteo' : '● Live Forecast'}
                      </span>
                    </div>

                    <div className={styles.weatherBigStatRow}>
                      <span className={styles.weatherIconBig}>{displayIcon}</span>
                      <div>
                        <div className={styles.weatherDegreeBig}>{displayTemp}</div>
                        <div className={styles.weatherStatusText}>{displayStatus}</div>
                        {currentRw?.apparentTemp !== undefined && (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                            {lang === 'vi'
                              ? `Cảm nhận như ${currentRw.apparentTemp}°C • Cập nhật lúc ${currentRw.updatedTime}`
                              : `Feels like ${currentRw.apparentTemp}°C • Updated ${currentRw.updatedTime}`}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.weatherMetricsRow}>
                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>{lang === 'vi' ? 'Độ ẩm' : 'Humidity'}</span>
                        <span className={styles.metricValue}>{displayHumidity}</span>
                      </div>
                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>{lang === 'vi' ? 'Sức gió' : 'Wind'}</span>
                        <span className={styles.metricValue}>{displayWind}</span>
                      </div>
                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>
                          {currentRw?.isLive ? (lang === 'vi' ? 'Lượng mưa' : 'Rain') : (lang === 'vi' ? 'Xác suất mưa' : 'Rain Chance')}
                        </span>
                        <span className={styles.metricValue}>{displayRain}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Advice & Packing Checklist */}
                  <div className={styles.weatherAdviceCard}>
                    <h4 className={styles.adviceTitle}>
                      {lang === 'vi' ? 'Lời khuyên từ chuyên gia du lịch VISTA' : 'VISTA Travel Specialist Advice'}
                    </h4>
                    <p className={styles.adviceDesc}>{displayAdvice}</p>

                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
                        🎒 {lang === 'vi' ? 'Hành trang khuyến nghị nên mang theo:' : 'Recommended packing essentials:'}
                      </span>
                      <div className={styles.packingChipsRow}>
                        {(lang === 'vi' ? REGION_WEATHER_GUIDE[activeWeatherTab].packingVi : REGION_WEATHER_GUIDE[activeWeatherTab].packingEn).map((item) => (
                          <span key={item} className={styles.packingChip}>
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ─── 7. SECTION: CÂU CHUYỆN TỪ NHỮNG CHUYẾN ĐI (COMMUNITY) ──────── */}
      <section className={styles.sectionBlock} id="community">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderLeft}>
            <div className={styles.sectionTitleRow}>
              <div className={styles.sectionIconBadge} style={{ background: '#EAF6FF', color: '#0284c7' }}>
                👥
              </div>
              <h2 className={styles.sectionTitle}>
                {lang === 'vi' ? 'Câu chuyện từ những chuyến đi thực tế' : 'Stories from Real Explorers'}
              </h2>
            </div>
            <p className={styles.sectionSubtitle}>
              {lang === 'vi'
                ? 'Kinh nghiệm xương máu, lịch trình chi tiết và mẹo hay chia sẻ từ các thành viên cộng đồng VISTA.'
                : 'Genuine travel itineraries, cost-saving hacks, and breathtaking photography from our community.'}
            </p>
          </div>
        </div>

        <div className={styles.communityGrid}>
          {/* Post 1: Tà Xùa */}
          <div className={styles.communityCard}>
            <div className={styles.communityMediaWrapper}>
              <img
                src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80"
                alt="Săn mây Tà Xùa"
                className={styles.communityMedia}
              />
              <span className={styles.communityBadge}>🏔️ Tây Bắc</span>
            </div>
            <div className={styles.communityCardBody}>
              <h4 className={styles.communityPostTitle}>
                {lang === 'vi'
                  ? 'Săn mây Tà Xùa đỉnh Gió – Lịch trình 2N1Đ cực chill chỉ 1.200k/người'
                  : 'Hunting clouds atop Ta Xua – 2D1N weekend budget guide'}
              </h4>
              <div className={styles.communityCardFooter}>
                <div className={styles.communityAuthor}>
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                    alt="Nguyễn Minh Anh"
                    className={styles.communityAvatar}
                  />
                  <span className={styles.communityAuthorName}>Minh Anh</span>
                </div>
                <div className={styles.communityStats}>
                  <button
                    type="button"
                    className={`${styles.btnStoryAction} ${storyLikes.taxua?.userLiked ? styles.btnStoryLiked : ''}`}
                    onClick={() => toggleStoryLike('taxua')}
                  >
                    <span>{storyLikes.taxua?.userLiked ? '❤️' : '🤍'}</span>
                    <span>{storyLikes.taxua?.count}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnStoryAction} ${storyBookmarks.taxua ? styles.btnStoryBookmarked : ''}`}
                    onClick={() => toggleStoryBookmark('taxua')}
                    title={lang === 'vi' ? 'Lưu bài viết' : 'Bookmark'}
                  >
                    <span>{storyBookmarks.taxua ? '🔖' : '📑'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Post 2: Hội An */}
          <div className={styles.communityCard}>
            <div className={styles.communityMediaWrapper}>
              <img
                src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=700&q=80"
                alt="Hội An về đêm"
                className={styles.communityMedia}
              />
              <span className={styles.communityBadge}>🏮 Miền Trung</span>
            </div>
            <div className={styles.communityCardBody}>
              <h4 className={styles.communityPostTitle}>
                {lang === 'vi'
                  ? 'Hội An về đêm – Bí quyết chụp ảnh hoa đăng lung linh không dính người'
                  : 'Hoi An at night – Photography hacks for serene lantern photos'}
              </h4>
              <div className={styles.communityCardFooter}>
                <div className={styles.communityAuthor}>
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                    alt="Trần Hoàng Nam"
                    className={styles.communityAvatar}
                  />
                  <span className={styles.communityAuthorName}>Hoàng Nam</span>
                </div>
                <div className={styles.communityStats}>
                  <button
                    type="button"
                    className={`${styles.btnStoryAction} ${storyLikes.hoianNight?.userLiked ? styles.btnStoryLiked : ''}`}
                    onClick={() => toggleStoryLike('hoianNight')}
                  >
                    <span>{storyLikes.hoianNight?.userLiked ? '❤️' : '🤍'}</span>
                    <span>{storyLikes.hoianNight?.count}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnStoryAction} ${storyBookmarks.hoianNight ? styles.btnStoryBookmarked : ''}`}
                    onClick={() => toggleStoryBookmark('hoianNight')}
                  >
                    <span>{storyBookmarks.hoianNight ? '🔖' : '📑'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Post 3: Phú Quốc */}
          <div className={styles.communityCard}>
            <div className={styles.communityMediaWrapper}>
              <img
                src="https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=700&q=80"
                alt="Phú Quốc 4N3Đ"
                className={styles.communityMedia}
              />
              <span className={styles.communityBadge}>🏖️ Miền Nam</span>
            </div>
            <div className={styles.communityCardBody}>
              <h4 className={styles.communityPostTitle}>
                {lang === 'vi'
                  ? 'Phú Quốc 4N3Đ tự túc: Tour cano 4 đảo & review các quán hải sản rẻ'
                  : 'Phu Quoc 4D3N complete review: 4-island speedboat tour'}
              </h4>
              <div className={styles.communityCardFooter}>
                <div className={styles.communityAuthor}>
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
                    alt="Lê Thị Thu"
                    className={styles.communityAvatar}
                  />
                  <span className={styles.communityAuthorName}>Lê Thu</span>
                </div>
                <div className={styles.communityStats}>
                  <button
                    type="button"
                    className={`${styles.btnStoryAction} ${storyLikes.phuquoc4d?.userLiked ? styles.btnStoryLiked : ''}`}
                    onClick={() => toggleStoryLike('phuquoc4d')}
                  >
                    <span>{storyLikes.phuquoc4d?.userLiked ? '❤️' : '🤍'}</span>
                    <span>{storyLikes.phuquoc4d?.count}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnStoryAction} ${storyBookmarks.phuquoc4d ? styles.btnStoryBookmarked : ''}`}
                    onClick={() => toggleStoryBookmark('phuquoc4d')}
                  >
                    <span>{storyBookmarks.phuquoc4d ? '🔖' : '📑'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Post 4: Buôn Ma Thuột */}
          <div className={styles.communityCard}>
            <div className={styles.communityMediaWrapper}>
              <img
                src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=700&q=80"
                alt="Buôn Ma Thuột"
                className={styles.communityMedia}
              />
              <span className={styles.communityBadge}>☕ Tây Nguyên</span>
            </div>
            <div className={styles.communityCardBody}>
              <h4 className={styles.communityPostTitle}>
                {lang === 'vi'
                  ? 'Buôn Ma Thuột – Trải nghiệm hái cà phê chín & cưỡi voi thân thiện Bản Đôn'
                  : 'Buon Ma Thuot – Coffee harvest and humane elephant experience'}
              </h4>
              <div className={styles.communityCardFooter}>
                <div className={styles.communityAuthor}>
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
                    alt="Đỗ Quốc Huy"
                    className={styles.communityAvatar}
                  />
                  <span className={styles.communityAuthorName}>Quốc Huy</span>
                </div>
                <div className={styles.communityStats}>
                  <button
                    type="button"
                    className={`${styles.btnStoryAction} ${storyLikes.bmtCoffee?.userLiked ? styles.btnStoryLiked : ''}`}
                    onClick={() => toggleStoryLike('bmtCoffee')}
                  >
                    <span>{storyLikes.bmtCoffee?.userLiked ? '❤️' : '🤍'}</span>
                    <span>{storyLikes.bmtCoffee?.count}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnStoryAction} ${storyBookmarks.bmtCoffee ? styles.btnStoryBookmarked : ''}`}
                    onClick={() => toggleStoryBookmark('bmtCoffee')}
                  >
                    <span>{storyBookmarks.bmtCoffee ? '🔖' : '📑'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. FINAL CTA BANNER ───────────────────────────────────────── */}
      <section className={styles.sectionBlock}>
        <div className={styles.footerCtaCard}>
          <div className={styles.footerCtaLeft}>
            <img
              src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=300&q=80"
              alt="Traveler"
              className={styles.footerTravelerImg}
            />
            <div className={styles.footerCtaText}>
              <h3 className={styles.footerCtaTitle}>
                {lang === 'vi'
                  ? 'Hành trình đáng nhớ tiếp theo bắt đầu từ hôm nay.'
                  : 'Your next unforgettable journey begins today.'}
              </h3>
              <p className={styles.footerCtaSubtitle}>
                {lang === 'vi'
                  ? 'Cùng VISTA khám phá Việt Nam trọn vẹn, tiết kiệm và ngập tràn niềm vui!'
                  : 'Join VISTA to discover Vietnam seamlessly, sustainably, and joyfully!'}
              </p>
              <Link href="/trips/new" className={styles.btnCtaDiscover}>
                <span>{lang === 'vi' ? 'Bắt đầu lên hành trình' : 'Start Planning Free'}</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          <div className={styles.footerCtaRight}>
            <div className={styles.goodVibesText}>
              Good<br />Vibes<br />Only ♡
            </div>
            <img
              src="/images/halong_hanoi_day.jpg"
              alt="Vietnam scenic"
              className={styles.footerIslandThumbnail}
            />
          </div>
        </div>
      </section>

      {/* ─── 9. MAIN FOOTER ────────────────────────────────────────────── */}
      <footer className={styles.mainFooter}>
        <div className={styles.footerTopRow}>
          <div className={styles.footerBrandCol}>
            <Link href="/" className={styles.brandLogo}>
              <div className={styles.brandIconWrapper} style={{ width: 34, height: 34 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="12 3 15 12 21 12 16 16 18 21 12 17 6 21 8 16 3 12 9 12" fill="white" />
                </svg>
              </div>
              <div className={styles.brandText}>
                <span className={styles.brandName} style={{ fontSize: 17 }}>VISTA</span>
                <span className={styles.brandSub} style={{ fontSize: 8 }}>Vietnam Smart Travel</span>
              </div>
            </Link>
            <div className={styles.footerSlogan}>
              {lang === 'vi'
                ? 'Khám phá Việt Nam • Gắn kết bạn bè • Lưu giữ từng khoảnh khắc diệu kỳ'
                : 'Explore Vietnam • Connect with Friends • Cherish Every Magic Moment'}
            </div>
          </div>

          <div className={styles.footerNavLinks}>
            <Link href="/" className={styles.footerNavLink}>{lang === 'vi' ? 'Khám phá điểm đến' : 'Explore'}</Link>
            <Link href="/planner" className={styles.footerNavLink}>{lang === 'vi' ? 'AI Lập lịch trình' : 'AI Planner'}</Link>
            <Link href="/trips" className={styles.footerNavLink}>{lang === 'vi' ? 'Tổ chức chuyến đi' : 'Group Trips'}</Link>
            <Link href="/trips/demo-danang-2026/treasury" className={styles.footerNavLink}>{lang === 'vi' ? 'Thủ quỹ & Chia tiền' : 'Treasury & Split'}</Link>
            <Link href="#community" className={styles.footerNavLink}>{lang === 'vi' ? 'Cộng đồng & An toàn' : 'Community & Safety'}</Link>
          </div>

          <div className={styles.footerSocials}>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className={styles.socialIconBtn} aria-label="Facebook">
              f
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className={styles.socialIconBtn} aria-label="Instagram">
              📷
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className={styles.socialIconBtn} aria-label="YouTube">
              ▶
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" className={styles.socialIconBtn} aria-label="TikTok">
              ♪
            </a>
          </div>
        </div>

        <div className={styles.footerBottomRow}>
          <div>© 2025 VISTA Travel Technology. All rights reserved.</div>
          <div>Việt Nam – Đi để cảm nhận & yêu thương ❤️</div>
        </div>
      </footer>

      {/* ─── 10. QUICK PREVIEW MODAL ────────────────────────────────────── */}
      {modalItem && (
        <div className={styles.modalBackdrop} onClick={() => setModalItem(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            {/* Modal Image Header */}
            <div className={styles.modalMediaHeader}>
              <img src={modalItem.image} alt={lang === 'vi' ? modalItem.nameVi : modalItem.nameEn} className={styles.modalMediaImg} />
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setModalItem(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
              <div className={styles.modalMediaOverlay}>
                <h3 className={styles.modalDestTitle}>{lang === 'vi' ? modalItem.nameVi : modalItem.nameEn}</h3>
                <div className={styles.modalDestLocationRow}>
                  <span>📍 {lang === 'vi' ? modalItem.provinceVi : modalItem.provinceEn}</span>
                  <span>⭐ {modalItem.rating} ({modalItem.reviewCount} {lang === 'vi' ? 'đánh giá' : 'reviews'})</span>
                  <span>
                    {destinationsWeather[modalItem.id]?.icon ?? '🌤️'}{' '}
                    {destinationsWeather[modalItem.id]?.tempFormatted ?? modalItem.temp} -{' '}
                    {destinationsWeather[modalItem.id]
                      ? (lang === 'vi' ? destinationsWeather[modalItem.id].statusVi : destinationsWeather[modalItem.id].statusEn)
                      : (lang === 'vi' ? modalItem.weatherVi : modalItem.weatherEn)}
                    {destinationsWeather[modalItem.id]?.isLive && (
                      <span style={{ marginLeft: 6, fontSize: 10, background: '#ef4444', color: '#fff', padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>
                        LIVE
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              {/* Highlight Grid */}
              <div className={styles.modalHighlightGrid}>
                <div className={styles.modalHighlightItem}>
                  <span className={styles.modalHighlightLabel}>{lang === 'vi' ? 'Mùa đẹp nhất' : 'Best Season'}</span>
                  <span className={styles.modalHighlightValue}>{lang === 'vi' ? modalItem.seasonVi : modalItem.seasonEn}</span>
                </div>
                <div className={styles.modalHighlightItem}>
                  <span className={styles.modalHighlightLabel}>{lang === 'vi' ? 'Chi phí dự kiến' : 'Estimated Cost'}</span>
                  <span className={styles.modalHighlightValue}>{lang === 'vi' ? modalItem.pricePerDayVi : modalItem.pricePerDayEn}</span>
                </div>
                <div className={styles.modalHighlightItem}>
                  <span className={styles.modalHighlightLabel}>{lang === 'vi' ? 'Đặc trưng' : 'Vibe'}</span>
                  <span className={styles.modalHighlightValue}>{(lang === 'vi' ? modalItem.tagsVi : modalItem.tagsEn)[0]}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className={styles.modalSectionTitle}>{lang === 'vi' ? 'Giới thiệu tổng quan' : 'Overview'}</h4>
                <p className={styles.modalDescText}>{lang === 'vi' ? modalItem.descriptionVi : modalItem.descriptionEn}</p>
              </div>

              {/* Top 3 Highlights */}
              <div>
                <h4 className={styles.modalSectionTitle}>
                  {lang === 'vi' ? '3 Trải nghiệm không thể bỏ lỡ' : 'Top 3 Signature Experiences'}
                </h4>
                <div className={styles.modalHighlightsList}>
                  {(lang === 'vi' ? modalItem.highlightsVi : modalItem.highlightsEn).map((hl, idx) => (
                    <div key={idx} className={styles.modalHighlightPoint}>
                      <span>#{idx + 1}</span>
                      <div>{hl}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <div className={styles.modalPricePreview}>
                <span className={styles.modalPricePreviewLabel}>{lang === 'vi' ? 'Chi phí tham khảo' : 'Starting from'}</span>
                <span className={styles.modalPricePreviewVal}>{lang === 'vi' ? modalItem.pricePerDayVi : modalItem.pricePerDayEn}</span>
              </div>
              <div className={styles.modalActionButtons}>
                <button
                  type="button"
                  className={styles.btnStoryAction}
                  onClick={(e) => toggleFavorite(modalItem.id, e)}
                  style={{ border: '1px solid #e2e8f0', padding: '9px 14px', borderRadius: 999 }}
                >
                  <span>{favorites[modalItem.id] ? '❤️' : '🤍'}</span>
                  <span>{favorites[modalItem.id] ? (lang === 'vi' ? 'Đã yêu thích' : 'Liked') : (lang === 'vi' ? 'Lưu lại' : 'Save')}</span>
                </button>
                <Link
                  href={`/trips/new?dest=${encodeURIComponent(lang === 'vi' ? modalItem.nameVi : modalItem.nameEn)}`}
                  className={styles.btnModalPlan}
                  onClick={() => setModalItem(null)}
                >
                  <span>{lang === 'vi' ? 'Lên lịch trình tới đây' : 'Plan Trip Here'}</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 11. TOAST NOTIFICATION ────────────────────────────────────── */}
      {toastMessage && (
        <div className={styles.toastNotification}>
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
