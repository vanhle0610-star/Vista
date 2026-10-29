'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/common/Navbar';
import {
  CompassIcon,
  MapPinIcon,
  CalendarIcon,
  SparklesIcon,
  WalletIcon,
  UsersIcon,
  ShieldCheckIcon,
  SearchIcon,
  HeartIcon,
  StarIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  MountainIcon,
  WavesIcon,
  CoffeeIcon,
  LandmarkIcon,
  NavigationIcon,
  SunIcon,
  CloudSunIcon,
  CloudRainIcon,
  WindIcon,
  DropletsIcon,
  ThermometerIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@/components/common/Icons';
import {
  LuxeHeartIcon,
  CompassPinIcon,
  SparkleStarIcon,
} from '@/components/common/LuxeIcons';
import {
  fetchAllDestinationsWeather,
  RealtimeWeather,
  VISTA_DESTINATIONS_COORD,
  FALLBACK_DESTINATIONS_WEATHER,
} from '@/services/weatherService';
import { VIETNAM_REAL_MAP_PATH, VIETNAM_MAP_PINS, MapPin } from './vietnamMapData';
import { SkeletonWeatherBar } from '@/components/common/Skeleton';
import styles from './home.module.css';

// ─── DATA DEFINITIONS ────────────────────────────────────────────────────────
type RegionKey = 'all' | 'north' | 'central' | 'south' | 'highlands';

interface CulturalRegion {
  id: RegionKey;
  name: string;
  subtitle: string;
  description: string;
  highlights: string[];
  image: string;
  count: number;
}

const CULTURAL_REGIONS: CulturalRegion[] = [
  {
    id: 'north',
    name: 'Miền Bắc',
    subtitle: 'Ngàn năm văn hiến & Non nước trùng điệp',
    description: 'Nôi văn hóa dân tộc với Thủ đô cổ kính, vịnh đảo đá vôi kỳ vĩ và những dãy núi hùng vĩ mây ngút ngàn.',
    highlights: ['Vịnh Hạ Long', 'Tràng An Ninh Bình', 'Phố cổ Hà Nội', 'Kỳ vĩ Hà Giang'],
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_bay.jpg',
    count: 142,
  },
  {
    id: 'central',
    name: 'Miền Trung',
    subtitle: 'Vệt nắng bờ biển ngọc & Trầm tích Cố Đô',
    description: 'Trái tim di sản văn hóa thế giới với kinh thành thâm nghiêm, phố cổ rực rỡ và những bãi biển cát trắng mịn màng.',
    highlights: ['Cố đô Huế', 'Phố cổ Hội An', 'Cầu Rồng Đà Nẵng', 'Vịnh Nha Trang'],
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_golden_bridge.jpg',
    count: 98,
  },
  {
    id: 'south',
    name: 'Miền Nam',
    subtitle: 'Phù sa sông nước & Đô hội phồn hoa',
    description: 'Vùng đất phóng khoáng hào sảng, nhịp sống đô thị năng động bậc nhất hòa quyện cùng miệt vườn trù phú và biển đảo ngọc.',
    highlights: ['TP. Hồ Chí Minh', 'Đảo ngọc Phú Quốc', 'Chợ nổi Cần Thơ', 'Côn Đảo'],
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_skyline.jpg',
    count: 64,
  },
  {
    id: 'highlands',
    name: 'Tây Nguyên',
    subtitle: 'Đại ngàn huyền thoại & Hương sắc hoa rừng',
    description: 'Không gian văn hóa cồng chiêng bất hủ, rừng thông bạt ngàn, thác nước trắng xóa và những đồi cà phê bạt ngàn đất đỏ.',
    highlights: ['Đà Lạt sương mờ', 'Buôn Ma Thuột', 'Hồ T’Nưng Pleiku', 'Thác Dray Nur'],
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/dalat_pongour.jpg',
    count: 46,
  },
];

interface DestinationShowcase {
  id: string;
  name: string;
  province: string;
  category: string;
  rating: number;
  reviews: string;
  priceEstimate: string;
  season: string;
  image: string;
  description: string;
}

const SHOWCASE_DESTINATIONS: DestinationShowcase[] = [
  {
    id: 'halong',
    name: 'Vịnh Hạ Long',
    province: 'Quảng Ninh',
    category: 'Kỳ quan thiên nhiên',
    rating: 4.9,
    reviews: '3.2k',
    priceEstimate: '1.200.000đ / người',
    season: 'Tháng 10 – Tháng 4',
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_bay.jpg',
    description: 'Di sản thiên nhiên thế giới UNESCO với hàng nghìn đảo đá vôi kỳ vĩ vươn lên giữa làn nước xanh ngọc lục bảo.',
  },
  {
    id: 'hue',
    name: 'Đại Nội & Cố Đô Huế',
    province: 'Thừa Thiên Huế',
    category: 'Di tích & Di sản',
    rating: 4.9,
    reviews: '2.8k',
    priceEstimate: '650.000đ / người',
    season: 'Tháng 1 – Tháng 8',
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hue_citadel.jpg',
    description: 'Trung tâm quyền lực triều Nguyễn với quần thể lăng tẩm hoàng gia và dòng sông Hương thơ mộng êm đềm.',
  },
  {
    id: 'danang',
    name: 'Bà Nà Hills & Cầu Vàng',
    province: 'Đà Nẵng',
    category: 'Nghỉ dưỡng & Giải trí',
    rating: 4.8,
    reviews: '4.1k',
    priceEstimate: '950.000đ / người',
    season: 'Quanh năm',
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_golden_bridge.jpg',
    description: 'Biểu tượng du lịch hiện đại trên đỉnh núi Chúa với Cầu Vàng trứ danh vươn ra giữa biển mây bồng bềnh.',
  },
  {
    id: 'hoian',
    name: 'Phố Cổ Hội An',
    province: 'Quảng Nam',
    category: 'Di sản văn hóa',
    rating: 4.9,
    reviews: '3.8k',
    priceEstimate: '500.000đ / người',
    season: 'Tháng 2 – Tháng 8',
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hoian_ancient_town.jpg',
    description: 'Thương cảng cổ phồn hoa từ thế kỷ 16 với những mái ngói rêu phong, đèn lồng lung linh và ẩm thực đặc sắc.',
  },
  {
    id: 'phuquoc',
    name: 'Quần Đảo Phú Quốc',
    province: 'Kiên Giang',
    category: 'Biển đảo & Nghỉ dưỡng',
    rating: 4.8,
    reviews: '3.5k',
    priceEstimate: '1.400.000đ / người',
    season: 'Tháng 11 – Tháng 4',
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/phuquoc_beach.jpg',
    description: 'Thiên đường biển nhiệt đới với Bãi Sao cát trắng mịn, hoàng hôn rực rỡ và hệ sinh thái san hô trù phú.',
  },
  {
    id: 'dalat',
    name: 'Cao Nguyên Đà Lạt',
    province: 'Lâm Đồng',
    category: 'Sinh thái & Nghỉ dưỡng',
    rating: 4.8,
    reviews: '2.9k',
    priceEstimate: '600.000đ / người',
    season: 'Quanh năm',
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/dalat_pongour.jpg',
    description: 'Thành phố sương mù ngát hương thông reo, ngàn hoa khoe sắc và những đồi chè, đồi cà phê ngút ngàn.',
  },
];

interface DestinationOption {
  id: string;
  nameVi: string;
  region: 'Miền Trung' | 'Miền Bắc' | 'Tây Nguyên' | 'Miền Nam';
  tagline: string;
  badge: string;
  popular?: boolean;
}

const FEATURED_DESTINATIONS: DestinationOption[] = [
  { id: 'danang', nameVi: 'Đà Nẵng', region: 'Miền Trung', tagline: 'Cầu Rồng, Bà Nà Hills, Biển Mỹ Khê', badge: 'Thịnh hành', popular: true },
  { id: 'hue', nameVi: 'Thừa Thiên Huế', region: 'Miền Trung', tagline: 'Cố đô di sản, Đại Nội, Sông Hương', badge: 'Di sản UNESCO', popular: true },
  { id: 'hoian', nameVi: 'Phố Cổ Hội An', region: 'Miền Trung', tagline: 'Đèn lồng lung linh, Chùa Cầu, Rừng dừa', badge: 'Top yêu thích', popular: true },
  { id: 'dalat', nameVi: 'Đà Lạt', region: 'Tây Nguyên', tagline: 'Thành phố ngàn hoa, sương mờ, đồi thông', badge: 'Nghỉ dưỡng', popular: true },
  { id: 'phuquoc', nameVi: 'Đảo Ngọc Phú Quốc', region: 'Miền Nam', tagline: 'Hoàng hôn bãi Sao, Sunset Town', badge: 'Biển đảo', popular: true },
  { id: 'hanoi', nameVi: 'Hà Nội', region: 'Miền Bắc', tagline: 'Thủ đô ngàn năm, 36 phố phường, Hồ Gươm', badge: 'Văn hóa cổ kính', popular: true },
  { id: 'halong', nameVi: 'Vịnh Hạ Long', region: 'Miền Bắc', tagline: 'Kỳ quan thế giới, du thuyền trên vịnh', badge: 'Kỳ quan TG', popular: true },
  { id: 'sapa', nameVi: 'Sa Pa', region: 'Miền Bắc', tagline: 'Đỉnh Fansipan, săn mây, ruộng bậc thang', badge: 'Săn mây', popular: true },
  { id: 'ninhbinh', nameVi: 'Ninh Bình', region: 'Miền Bắc', tagline: 'Tràng An, Hang Múa, Tam Cốc Bích Động', badge: 'Non nước kỳ vĩ', popular: false },
  { id: 'nhatrang', nameVi: 'Nha Trang', region: 'Miền Trung', tagline: 'Vịnh biển sôi động, VinWonders, lặn biển', badge: 'Vịnh biển đẹp', popular: false },
  { id: 'saigon', nameVi: 'TP. Hồ Chí Minh', region: 'Miền Nam', tagline: 'Đô thị phồn hoa, ẩm thực đường phố sôi động', badge: 'Sôi động', popular: false },
];

const DURATION_OPTIONS = [
  { value: '1day', label: '1 Ngày', desc: 'Đi về trong ngày' },
  { value: '2n1d', label: '2 Ngày 1 Đêm', desc: 'Cuối tuần thư giãn' },
  { value: '3n2d', label: '3 Ngày 2 Đêm', desc: 'Tiêu chuẩn vàng AI khuyên dùng', recommended: true },
  { value: '4n3d', label: '4 Ngày 3 Đêm', desc: 'Khám phá sâu & trải nghiệm' },
  { value: '5n4d', label: '5 Ngày 4 Đêm', desc: 'Trọn vẹn từng khoảnh khắc' },
];

const BUDGET_OPTIONS = [
  { value: 'economy', label: 'Tiết kiệm & Phượt', desc: '~500k – 1.000k / ngày', badge: 'Bình dân' },
  { value: 'standard', label: 'Tiêu chuẩn & Tiện nghi', desc: '~1.500k – 2.500k / ngày', badge: 'Phổ biến', recommended: true },
  { value: 'luxury', label: 'Cao cấp & Nghỉ dưỡng', desc: '~3.500k+ / ngày resort', badge: 'Cao cấp' },
];

export interface SampleItinerary {
  id: string;
  dest: string;
  duration: string;
  title: string;
  cost: string;
  badge: string;
  image: string;
  highlights: string[];
  days: {
    dayNum: string;
    desc: string;
  }[];
}

export const SAMPLE_ITINERARIES: SampleItinerary[] = [
  {
    id: 'it-hue',
    dest: 'Thừa Thiên Huế',
    duration: '3n2d',
    title: 'Dấu ấn Cố Đô & Trầm tích Sông Hương',
    cost: '~1.850.000đ / người',
    badge: 'Di sản & Thơ mộng',
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hue_real.jpg',
    highlights: ['Đại Nội Hoàng Thành', 'Lăng Khải Định', 'Đồi Vọng Cảnh', 'Ca Huế Sông Hương'],
    days: [
      { dayNum: 'Ngày 1', desc: 'Đón sân bay Phú Bài -> Check-in khách sạn -> Đại Nội triều Nguyễn -> Bún bò Huế Mụ Rơi' },
      { dayNum: 'Ngày 2', desc: 'Lăng Tự Đức & Khải Định -> Làng hương Thủy Xuân check-in -> Đi thuyền rồng Sông Hương ngắm hoàng hôn' },
      { dayNum: 'Ngày 3', desc: 'Chợ Đông Ba mua đặc sản mè xửng, tôm chua -> Thưởng trà Cung đình -> Tạm biệt Huế' },
    ],
  },
  {
    id: 'it-danang',
    dest: 'Đà Nẵng',
    duration: '4n3d',
    title: 'Vệt nắng Biển ngọc & Đèn lồng Phố Cổ',
    cost: '~2.650.000đ / người',
    badge: 'Bán chạy nhất',
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_real.jpg',
    highlights: ['Bà Nà Hills & Cầu Vàng', 'Biển Mỹ Khê', 'Chùa Linh Ứng', 'Phố cổ Hội An'],
    days: [
      { dayNum: 'Ngày 1', desc: 'Đón ga/sân bay -> Tắm biển Mỹ Khê -> Ăn hải sản tươi sống -> Cầu Rồng phun lửa nước tối cuối tuần' },
      { dayNum: 'Ngày 2', desc: 'Quần thể Bà Nà Hills & Cầu Vàng -> Làng Pháp cổ kính -> Ăn tối chợ đêm Helio' },
      { dayNum: 'Ngày 3', desc: 'Bán đảo Sơn Trà & Linh Ứng -> Chèo thuyền thúng Rừng dừa Bảy Mẫu -> Đêm hoa đăng Hội An' },
      { dayNum: 'Ngày 4', desc: 'Cà phê ngắm sông Hàn -> Chợ Hàn mua quà đặc sản miền Trung -> Kết thúc hành trình' },
    ],
  },
  {
    id: 'it-hagiang',
    dest: 'Hà Giang',
    duration: '3n2d',
    title: 'Chinh phục Đèo Mã Pí Lèng & Cột cờ Lũng Cú',
    cost: '~2.200.000đ / người',
    badge: 'Kỳ vĩ địa đầu',
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_lungcu_hero.jpg',
    highlights: ['Cột cờ Lũng Cú', 'Đèo Mã Pí Lèng', 'Sông Nho Quế', 'Phố cổ Đồng Văn'],
    days: [
      { dayNum: 'Ngày 1', desc: 'TP. Hà Giang -> Cổng trời Quản Bạ -> Rừng thông Yên Minh -> Dốc Thẩm Mã -> Thị trấn Đồng Văn' },
      { dayNum: 'Ngày 2', desc: 'Cột cờ Quốc gia Lũng Cú -> Đèo Mã Pí Lèng hùng vĩ -> Đi thuyền Hẻm Tu Sản sông Nho Quế' },
      { dayNum: 'Ngày 3', desc: 'Chợ phiên Đồng Văn -> Dinh thự Vua Mèo (Vương Chính Đức) -> Trở về TP. Hà Giang' },
    ],
  },
];

export type MapHotspot = MapPin;
export const MAP_HOTSPOTS: MapPin[] = VIETNAM_MAP_PINS;

export default function HomePage() {
  const router = useRouter();

  // Search state
  const [destinationInput, setDestinationInput] = useState<string>('Thừa Thiên Huế');
  const [durationInput, setDurationInput] = useState<string>('3n2d');
  const [budgetTierInput, setBudgetTierInput] = useState<string>('standard');
  const [activePopover, setActivePopover] = useState<'destination' | 'duration' | 'budget' | null>(null);
  const [destFilterRegion, setDestFilterRegion] = useState<string>('all');
  const searchConsoleRef = React.useRef<HTMLDivElement>(null);

  const [activeHotspotId, setActiveHotspotId] = useState<string>('hoangsa');

  const currentHotspot = useMemo(() => {
    return MAP_HOTSPOTS.find((h) => h.id === activeHotspotId) || MAP_HOTSPOTS[0];
  }, [activeHotspotId]);

  // 5s Auto-play cycle through hotspots silently without progress bar
  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveHotspotId((cur) => {
        const idx = MAP_HOTSPOTS.findIndex((h) => h.id === cur);
        const nextIdx = (idx + 1) % MAP_HOTSPOTS.length;
        return MAP_HOTSPOTS[nextIdx].id;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Scroll Progress & Right-side HUD Active Waypoint Tracking
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [activeWaypoint, setActiveWaypoint] = useState<string>('hero');

  const WAYPOINTS = useMemo(() => [
    { id: 'hero', label: '01 · Khởi hành & Tìm kiếm' },
    { id: 'sample-itineraries', label: '02 · Lịch trình AI mẫu' },
    { id: 'regions', label: '03 · 4 Vùng di sản' },
    { id: 'weather', label: '04 · Khí hậu thực địa' },
    { id: 'interactive-map', label: '05 · Tọa độ GPS & Biển đảo' },
    { id: 'landmarks', label: '06 · Danh lam thắng cảnh' },
  ], []);

  React.useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          const currentScroll = window.scrollY;
          const progress = totalHeight > 0 ? (currentScroll / totalHeight) * 100 : 0;
          setScrollProgress(Math.min(100, Math.max(0, progress)));

          const waypointIds = ['hero', 'sample-itineraries', 'regions', 'weather', 'interactive-map', 'landmarks'];
          for (let i = waypointIds.length - 1; i >= 0; i--) {
            const el = document.getElementById(waypointIds[i]);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= window.innerHeight * 0.45) {
                setActiveWaypoint(waypointIds[i]);
                break;
              }
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToWaypoint = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll Reveal Intersection Observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const revealElements = document.querySelectorAll(`.${styles.revealOnScroll}`);
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const currentDest = useMemo(() => {
    return (
      FEATURED_DESTINATIONS.find(
        (d) => d.nameVi === destinationInput || d.nameVi.toLowerCase().includes(destinationInput.toLowerCase())
      ) || {
        id: 'custom',
        nameVi: destinationInput,
        region: 'Miền Trung' as const,
        tagline: 'Khám phá văn hóa & di sản bản địa',
        badge: 'Điểm đến',
      }
    );
  }, [destinationInput]);

  const currentDuration = useMemo(() => {
    return DURATION_OPTIONS.find((d) => d.value === durationInput) || DURATION_OPTIONS[2];
  }, [durationInput]);

  const currentBudget = useMemo(() => {
    return BUDGET_OPTIONS.find((b) => b.value === budgetTierInput) || BUDGET_OPTIONS[1];
  }, [budgetTierInput]);

  const filteredDestinations = useMemo(() => {
    if (destFilterRegion === 'all') return FEATURED_DESTINATIONS;
    if (destFilterRegion === 'central') return FEATURED_DESTINATIONS.filter((d) => d.region === 'Miền Trung');
    if (destFilterRegion === 'north') return FEATURED_DESTINATIONS.filter((d) => d.region === 'Miền Bắc');
    if (destFilterRegion === 'highlands') return FEATURED_DESTINATIONS.filter((d) => d.region === 'Tây Nguyên');
    if (destFilterRegion === 'south') return FEATURED_DESTINATIONS.filter((d) => d.region === 'Miền Nam');
    return FEATURED_DESTINATIONS;
  }, [destFilterRegion]);

  // Filter state for regions
  const [activeRegionTab, setActiveRegionTab] = useState<RegionKey>('all');

  // Favorites state
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    halong: true,
    hue: true,
    danang: false,
    hoian: true,
    phuquoc: false,
    dalat: false,
  });

  // Weather State
  const [weatherData, setWeatherData] = useState<Record<string, RealtimeWeather>>(FALLBACK_DESTINATIONS_WEATHER);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(true);
  const [weatherFilter, setWeatherFilter] = useState<'all' | 'north' | 'central' | 'south_highlands'>('all');

  // Swipe & Drag State for Weather Carousel Track
  const weatherTrackRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  React.useEffect(() => {
    let mounted = true;
    fetchAllDestinationsWeather()
      .then((data) => {
        if (mounted && Object.keys(data).length > 0) {
          setWeatherData(data);
        }
      })
      .catch(() => {
        // Fallback is already loaded
      })
      .finally(() => {
        if (mounted) {
          setIsWeatherLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!weatherTrackRef.current) return;
    setIsDragging(true);
    setDragStartX(e.pageX - weatherTrackRef.current.offsetLeft);
    setDragScrollLeft(weatherTrackRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !weatherTrackRef.current) return;
    e.preventDefault();
    const x = e.pageX - weatherTrackRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    weatherTrackRef.current.scrollLeft = dragScrollLeft - walk;
  };

  const handleScrollWeather = (direction: 'left' | 'right') => {
    if (!weatherTrackRef.current) return;
    const offset = direction === 'left' ? -340 : 340;
    weatherTrackRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const renderWeatherIcon = (code: number, isDay = true) => {
    if (code === 0) return <SunIcon size={26} color="#F59E0B" />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 99)) {
      return <CloudRainIcon size={26} color="#0284C7" />;
    }
    return <CloudSunIcon size={26} color="#0088CC" />;
  };

  const filteredWeatherCities = useMemo(() => {
    const list = Object.keys(VISTA_DESTINATIONS_COORD).map((key) => {
      const meta = VISTA_DESTINATIONS_COORD[key];
      const w = weatherData[key] || FALLBACK_DESTINATIONS_WEATHER[key];
      return { key, meta, weather: w };
    });

    if (weatherFilter === 'north') return list.filter((i) => i.meta.region === 'Miền Bắc');
    if (weatherFilter === 'central') return list.filter((i) => i.meta.region === 'Miền Trung');
    if (weatherFilter === 'south_highlands') return list.filter((i) => i.meta.region === 'Miền Nam' || i.meta.region === 'Tây Nguyên');
    return list;
  }, [weatherData, weatherFilter]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredRegions = useMemo(() => {
    if (activeRegionTab === 'all') return CULTURAL_REGIONS;
    return CULTURAL_REGIONS.filter((r) => r.id === activeRegionTab);
  }, [activeRegionTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/planner?dest=${encodeURIComponent(destinationInput)}&duration=${durationInput}&budget=${budgetTierInput}`);
  };

  return (
    <div className={styles.landingRoot}>
      {/* ─── 0. TOP SCROLL PROGRESS BAR (LUMINOUS TELEMETRY) ─────────────── */}
      <div
        className={styles.topScrollProgressBar}
        style={{ width: `${scrollProgress}%` }}
        aria-hidden="true"
      />

      {/* ─── 0.1. RIGHT-SIDE JOURNEY HUD COMPASS DOCK ────────────────────── */}
      <aside className={styles.journeyHudDock} aria-label="Điều hướng nhanh hành trình">
        {WAYPOINTS.map((wp) => {
          const isActive = activeWaypoint === wp.id;
          return (
            <button
              key={wp.id}
              type="button"
              className={`${styles.journeyHudItem} ${isActive ? styles.journeyHudItemActive : ''}`}
              onClick={() => scrollToWaypoint(wp.id)}
              aria-label={`Cuộn tới ${wp.label}`}
            >
              <div className={styles.journeyHudDot} />
              <div className={styles.journeyHudTooltip}>{wp.label}</div>
            </button>
          );
        })}
      </aside>

      {/* ─── 1. TOP GLOBAL NAVBAR ────────────────────────────────────────── */}
      <Navbar activeModule="explore" />

      {/* ─── 2. HERO SECTION CINEMATIC ───────────────────────────────────── */}
      <section className={styles.heroWrapper} id="hero" aria-label="Giới thiệu VISTA">
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <CompassIcon size={14} color="#7DD3FC" />
            <span>Nền tảng du lịch thông minh Việt Nam</span>
          </div>

          <h1 className={styles.heroTitle}>
            Việt Nam qua lăng kính mới,
            <span className={styles.heroHighlight}>kết nối trọn vẹn từng hành trình.</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Khám phá 350+ điểm đến di sản được xác thực, thiết lập lịch trình cá nhân hóa bằng AI trong 30 giây, và quản lý ngân sách nhóm minh bạch với VietQR.
          </p>

          {/* Integrated Travel Search Console (Refined & Interactive) */}
          <div className={styles.searchConsoleWrapper} ref={searchConsoleRef}>
            <div className={styles.searchConsoleCard}>
              {/* Field 1: Destination (Interactive Popover - No Typing Required) */}
              <div
                className={`${styles.searchField} ${styles.searchFieldPrimary} ${activePopover === 'destination' ? styles.searchFieldOpen : ''}`}
                onClick={() => setActivePopover(activePopover === 'destination' ? null : 'destination')}
              >
                <div className={styles.searchFieldIcon}>
                  <MapPinIcon size={18} color="#0088CC" />
                </div>
                <div className={styles.searchFieldContent}>
                  <span className={styles.searchFieldLabel}>Điểm đến</span>
                  <div className={styles.searchFieldValue}>
                    <span>{currentDest.nameVi}</span>
                  </div>
                  <span className={styles.searchFieldSub}>
                    {currentDest.region} • {currentDest.tagline}
                  </span>
                </div>
                <div className={styles.searchFieldChevron}>
                  <ChevronDownIcon size={16} />
                </div>

                {/* Destination Dropdown Popover */}
                {activePopover === 'destination' && (
                  <div
                    className={`${styles.popoverMenu} ${styles.destinationPopover}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={styles.popoverHeader}>
                      <span className={styles.popoverTitle}>
                        <CompassIcon size={15} color="#0088CC" />
                        Chọn điểm đến du lịch
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>1 chạm chọn ngay</span>
                    </div>

                    {/* Region Filter Tabs */}
                    <div className={styles.popoverRegionFilter}>
                      <button
                        type="button"
                        className={`${styles.regionFilterPill} ${destFilterRegion === 'all' ? styles.regionFilterPillActive : ''}`}
                        onClick={() => setDestFilterRegion('all')}
                      >
                        Tất cả
                      </button>
                      <button
                        type="button"
                        className={`${styles.regionFilterPill} ${destFilterRegion === 'central' ? styles.regionFilterPillActive : ''}`}
                        onClick={() => setDestFilterRegion('central')}
                      >
                        Miền Trung
                      </button>
                      <button
                        type="button"
                        className={`${styles.regionFilterPill} ${destFilterRegion === 'north' ? styles.regionFilterPillActive : ''}`}
                        onClick={() => setDestFilterRegion('north')}
                      >
                        Miền Bắc
                      </button>
                      <button
                        type="button"
                        className={`${styles.regionFilterPill} ${destFilterRegion === 'highlands' ? styles.regionFilterPillActive : ''}`}
                        onClick={() => setDestFilterRegion('highlands')}
                      >
                        Tây Nguyên
                      </button>
                      <button
                        type="button"
                        className={`${styles.regionFilterPill} ${destFilterRegion === 'south' ? styles.regionFilterPillActive : ''}`}
                        onClick={() => setDestFilterRegion('south')}
                      >
                        Miền Nam
                      </button>
                    </div>

                    {/* Destination Cards Grid */}
                    <div className={styles.destinationGrid}>
                      {filteredDestinations.map((dest) => {
                        const isSelected = destinationInput.toLowerCase().includes(dest.nameVi.toLowerCase()) || dest.nameVi.toLowerCase().includes(destinationInput.toLowerCase());
                        return (
                          <div
                            key={dest.id}
                            className={`${styles.destinationItemCard} ${isSelected ? styles.destinationItemCardActive : ''}`}
                            onClick={() => {
                              setDestinationInput(dest.nameVi);
                              setActivePopover(null);
                            }}
                          >
                            <div className={styles.destItemInfo}>
                              <div className={styles.destItemNameRow}>
                                <span className={styles.destItemName}>{dest.nameVi}</span>
                                {isSelected ? (
                                  <CheckIcon size={13} color="#0088CC" />
                                ) : (
                                  <span className={styles.destItemBadge}>{dest.region}</span>
                                )}
                              </div>
                              <div className={styles.destItemTagline}>{dest.tagline}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.searchDivider} />

              {/* Field 2: Duration (Custom Dropdown) */}
              <div
                className={`${styles.searchField} ${activePopover === 'duration' ? styles.searchFieldOpen : ''}`}
                onClick={() => setActivePopover(activePopover === 'duration' ? null : 'duration')}
              >
                <div className={styles.searchFieldIcon}>
                  <CalendarIcon size={18} color="#0088CC" />
                </div>
                <div className={styles.searchFieldContent}>
                  <span className={styles.searchFieldLabel}>Thời lượng</span>
                  <div className={styles.searchFieldValue}>
                    <span>{currentDuration.label}</span>
                  </div>
                  <span className={styles.searchFieldSub}>{currentDuration.desc}</span>
                </div>
                <div className={styles.searchFieldChevron}>
                  <ChevronDownIcon size={16} />
                </div>

                {/* Duration Popover */}
                {activePopover === 'duration' && (
                  <div
                    className={`${styles.popoverMenu} ${styles.listPopover}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={styles.popoverHeader}>
                      <span className={styles.popoverTitle}>Thời lượng chuyến đi</span>
                    </div>
                    <div className={styles.simpleOptionList}>
                      {DURATION_OPTIONS.map((opt) => {
                        const isSelected = durationInput === opt.value;
                        return (
                          <div
                            key={opt.value}
                            className={`${styles.simpleOptionItem} ${isSelected ? styles.simpleOptionItemActive : ''}`}
                            onClick={() => {
                              setDurationInput(opt.value);
                              setActivePopover(null);
                            }}
                          >
                            <div className={styles.optionTextCol}>
                              <div className={styles.optionLabelRow}>
                                <span className={styles.optionLabel}>{opt.label}</span>
                                {opt.recommended && <span className={styles.optionBadge}>Gợi ý</span>}
                              </div>
                              <div className={styles.optionDesc}>{opt.desc}</div>
                            </div>
                            {isSelected && <CheckIcon size={15} color="#0088CC" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.searchDivider} />

              {/* Field 3: Budget Tier (Custom Dropdown) */}
              <div
                className={`${styles.searchField} ${activePopover === 'budget' ? styles.searchFieldOpen : ''}`}
                onClick={() => setActivePopover(activePopover === 'budget' ? null : 'budget')}
              >
                <div className={styles.searchFieldIcon}>
                  <WalletIcon size={18} color="#0088CC" />
                </div>
                <div className={styles.searchFieldContent}>
                  <span className={styles.searchFieldLabel}>Mức chi tiêu</span>
                  <div className={styles.searchFieldValue}>
                    <span>{currentBudget.label}</span>
                  </div>
                  <span className={styles.searchFieldSub}>{currentBudget.desc}</span>
                </div>
                <div className={styles.searchFieldChevron}>
                  <ChevronDownIcon size={16} />
                </div>

                {/* Budget Popover */}
                {activePopover === 'budget' && (
                  <div
                    className={`${styles.popoverMenu} ${styles.listPopover}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={styles.popoverHeader}>
                      <span className={styles.popoverTitle}>Ngân sách cá nhân</span>
                    </div>
                    <div className={styles.simpleOptionList}>
                      {BUDGET_OPTIONS.map((opt) => {
                        const isSelected = budgetTierInput === opt.value;
                        return (
                          <div
                            key={opt.value}
                            className={`${styles.simpleOptionItem} ${isSelected ? styles.simpleOptionItemActive : ''}`}
                            onClick={() => {
                              setBudgetTierInput(opt.value);
                              setActivePopover(null);
                            }}
                          >
                            <div className={styles.optionTextCol}>
                              <div className={styles.optionLabelRow}>
                                <span className={styles.optionLabel}>{opt.label}</span>
                                {opt.recommended && <span className={styles.optionBadge}>Khuyên dùng</span>}
                              </div>
                              <div className={styles.optionDesc}>{opt.desc}</div>
                            </div>
                            {isSelected && <CheckIcon size={15} color="#0088CC" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="button"
                className={styles.btnSearchSubmit}
                onClick={handleSearchSubmit}
              >
                <SparklesIcon size={17} color="#FFFFFF" />
                <span>Lên lịch trình AI</span>
              </button>
            </div>

            {/* Quick 1-Touch Suggestions Pills */}
            <div className={styles.quickSuggestionsRow}>
              <span className={styles.quickSugLabel}>
                Gợi ý thịnh hành:
              </span>
              {FEATURED_DESTINATIONS.filter((d) => d.popular).slice(0, 6).map((dest) => {
                const isActive = destinationInput.toLowerCase().includes(dest.nameVi.toLowerCase()) || dest.nameVi.toLowerCase().includes(destinationInput.toLowerCase());
                return (
                  <button
                    key={dest.id}
                    type="button"
                    className={`${styles.quickSugChip} ${isActive ? styles.quickSugChipActive : ''}`}
                    onClick={() => {
                      setDestinationInput(dest.nameVi);
                      setActivePopover(null);
                    }}
                  >
                    {dest.nameVi}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. TRUST & SYSTEM CAPABILITIES BAR ──────────────────────────── */}
      <section className={styles.trustStripWrapper} aria-label="Năng lực hệ thống VISTA">
        <div className={styles.container}>
          <div className={`${styles.trustGrid} ${styles.revealOnScroll}`}>
            <div className={styles.trustItem}>
              <div className={styles.trustIconBox}>
                <ShieldCheckIcon size={20} color="#0088CC" />
              </div>
              <div className={styles.trustText}>
                <span className={styles.trustTitle}>350+ Điểm đến di sản</span>
                <span className={styles.trustDesc}>Khảo sát thực tế & tọa độ GPS chuẩn</span>
              </div>
            </div>

            <div className={styles.trustItem}>
              <div className={styles.trustIconBox}>
                <SparklesIcon size={20} color="#D97706" />
              </div>
              <div className={styles.trustText}>
                <span className={styles.trustTitle}>AI Planner tức thì 30s</span>
                <span className={styles.trustDesc}>Cá nhân hóa theo nhịp độ & sở thích</span>
              </div>
            </div>

            <div className={styles.trustItem}>
              <div className={styles.trustIconBox}>
                <WalletIcon size={20} color="#0F766E" />
              </div>
              <div className={styles.trustText}>
                <span className={styles.trustTitle}>Thủ quỹ & VietQR nhóm</span>
                <span className={styles.trustDesc}>Quyết toán minh bạch, quét mã 1 chạm</span>
              </div>
            </div>

            <div className={styles.trustItem}>
              <div className={styles.trustIconBox}>
                <UsersIcon size={20} color="#475569" />
              </div>
              <div className={styles.trustText}>
                <span className={styles.trustTitle}>Cộng đồng xê dịch văn minh</span>
                <span className={styles.trustDesc}>Đồng hành an toàn & chia sẻ chân thực</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3.5. CURATED AI SAMPLE ITINERARIES (IDEA 1) ──────────────────── */}
      <section className={`${styles.itinerariesSection} ${styles.revealOnScroll}`} id="sample-itineraries">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionEyebrow}>
              <SparklesIcon size={14} color="#0088CC" />
              <span>Lịch trình mẫu tiêu biểu</span>
            </div>
            <h2 className={styles.sectionMainTitle}>Hành trình mẫu tối ưu bởi AI</h2>
            <p className={styles.sectionDesc}>
              Tuyển tập lộ trình kinh điển được tính toán tối ưu thời gian di chuyển, nhịp độ thư thái và dự toán chi phí minh bạch.
            </p>
          </div>

          <div className={styles.itinerariesGrid}>
            {SAMPLE_ITINERARIES.map((it, idx) => (
              <div
                key={it.id}
                className={`${styles.itineraryCard} ${styles.revealOnScroll} ${
                  idx === 0 ? styles.delay100 : idx === 1 ? styles.delay200 : styles.delay300
                }`}
              >
                <div className={styles.itineraryMedia}>
                  <img src={it.image} alt={it.title} />
                  <span className={styles.itineraryBadgeTop}>{it.badge}</span>
                  <span className={styles.itineraryCostBadge}>{it.cost}</span>
                </div>

                <div className={styles.itineraryBody}>
                  <h3 className={styles.itineraryTitle}>{it.title}</h3>

                  <div className={styles.itineraryHighlightsRow}>
                    {it.highlights.map((h) => (
                      <span key={h} className={styles.itineraryHighlightTag}>
                        {h}
                      </span>
                    ))}
                  </div>

                  <div className={styles.itineraryTimeline}>
                    {it.days.map((d, dIdx) => (
                      <div key={dIdx} className={styles.timelineItem}>
                        <div className={styles.timelineDot} />
                        <div className={styles.timelineDayTitle}>{d.dayNum}</div>
                        <div className={styles.timelineDayDesc}>{d.desc}</div>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`/planner?dest=${encodeURIComponent(it.dest)}&duration=${it.duration}`}
                    className={styles.btnItineraryCustomize}
                  >
                    <span>Tùy biến lịch trình này</span>
                    <ArrowRightIcon size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. CULTURAL REGIONS (EDITORIAL PORTFOLIO) ────────────────────── */}
      <section className={`${styles.sectionBlock} ${styles.revealOnScroll}`} id="regions">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionEyebrow}>
              <LandmarkIcon size={14} color="#0088CC" />
              <span>Bản sắc & Không gian văn hóa</span>
            </div>
            <h2 className={styles.sectionMainTitle}>Khám phá Việt Nam qua 4 vùng di sản</h2>
            <p className={styles.sectionDesc}>
              Mỗi vùng đất là một khúc ca kỳ vĩ của thiên nhiên và trầm tích lịch sử ngàn năm đắp bồi.
            </p>
          </div>

          {/* Region Tabs */}
          <div className={styles.regionsFilterRow}>
            <button
              type="button"
              className={`${styles.regionTabBtn} ${activeRegionTab === 'all' ? styles.regionTabBtnActive : ''}`}
              onClick={() => setActiveRegionTab('all')}
            >
              <CompassIcon size={14} />
              <span>Tất cả các vùng</span>
              <span className={styles.regionTabCount}>350</span>
            </button>

            <button
              type="button"
              className={`${styles.regionTabBtn} ${activeRegionTab === 'north' ? styles.regionTabBtnActive : ''}`}
              onClick={() => setActiveRegionTab('north')}
            >
              <MountainIcon size={14} />
              <span>Miền Bắc</span>
              <span className={styles.regionTabCount}>142</span>
            </button>

            <button
              type="button"
              className={`${styles.regionTabBtn} ${activeRegionTab === 'central' ? styles.regionTabBtnActive : ''}`}
              onClick={() => setActiveRegionTab('central')}
            >
              <LandmarkIcon size={14} />
              <span>Miền Trung</span>
              <span className={styles.regionTabCount}>98</span>
            </button>

            <button
              type="button"
              className={`${styles.regionTabBtn} ${activeRegionTab === 'south' ? styles.regionTabBtnActive : ''}`}
              onClick={() => setActiveRegionTab('south')}
            >
              <WavesIcon size={14} />
              <span>Miền Nam</span>
              <span className={styles.regionTabCount}>64</span>
            </button>

            <button
              type="button"
              className={`${styles.regionTabBtn} ${activeRegionTab === 'highlands' ? styles.regionTabBtnActive : ''}`}
              onClick={() => setActiveRegionTab('highlands')}
            >
              <CoffeeIcon size={14} />
              <span>Tây Nguyên</span>
              <span className={styles.regionTabCount}>46</span>
            </button>
          </div>

          {/* Regions Cards Grid */}
          <div className={styles.regionsGrid}>
            {filteredRegions.map((region) => (
              <div key={region.id} className={styles.regionCard}>
                <div className={styles.regionMediaWrapper}>
                  <img src={region.image} alt={region.name} className={styles.regionMedia} />
                  <div className={styles.regionBadgeOverlay}>
                    <MapPinIcon size={12} color="#FFFFFF" />
                    <span>{region.count} điểm đến</span>
                  </div>
                </div>

                <div className={styles.regionCardContent}>
                  <h3 className={styles.regionName}>{region.name}</h3>
                  <span className={styles.regionSubtitle}>{region.subtitle}</span>
                  <p className={styles.regionDesc}>{region.description}</p>

                  <div className={styles.regionTagsRow}>
                    {region.highlights.map((h) => (
                      <span key={h} className={styles.regionTagItem}>
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. LIVE TRAVEL WEATHER DECK & SWIPE TRACK ───────────────────── */}
      <section className={`${styles.weatherSection} ${styles.revealOnScroll}`} id="weather" aria-label="Thời tiết du lịch thời gian thực">
        <div className={styles.container}>
          <div className={styles.weatherHeaderRow}>
            <div className={styles.weatherTitleGroup}>
              <div className={styles.weatherLiveBadge}>
                <span className={styles.livePulseDot} />
                <span>Trực tiếp · Open-Meteo High Precision</span>
              </div>
              <h2 className={styles.sectionMainTitle} style={{ textAlign: 'left', marginBottom: '8px' }}>
                Khí hậu & Thời tiết hành trình các điểm đến
              </h2>
              <p className={styles.sectionDesc} style={{ textAlign: 'left', margin: 0 }}>
                Dữ liệu khí tượng thời gian thực từ 11 thành phố du lịch trọng điểm, hỗ trợ bạn chọn trang phục và thời điểm dạo chơi hoàn hảo.
              </p>
            </div>

            {/* Swipe & Navigation Controls */}
            <div className={styles.weatherControlsRow}>
              <button
                type="button"
                className={styles.weatherNavBtn}
                onClick={() => handleScrollWeather('left')}
                aria-label="Xem điểm đến trước"
              >
                <ChevronLeftIcon size={20} strokeWidth={2.4} color="#1E293B" />
              </button>
              <button
                type="button"
                className={styles.weatherNavBtn}
                onClick={() => handleScrollWeather('right')}
                aria-label="Xem điểm đến tiếp theo"
              >
                <ChevronRightIcon size={20} strokeWidth={2.4} color="#1E293B" />
              </button>
            </div>
          </div>

          {/* Quick Region Filter Tabs */}
          <div className={styles.weatherFilterRow}>
            <button
              type="button"
              className={`${styles.weatherFilterTab} ${weatherFilter === 'all' ? styles.weatherFilterTabActive : ''}`}
              onClick={() => setWeatherFilter('all')}
            >
              Tất cả 11 thành phố
            </button>
            <button
              type="button"
              className={`${styles.weatherFilterTab} ${weatherFilter === 'north' ? styles.weatherFilterTabActive : ''}`}
              onClick={() => setWeatherFilter('north')}
            >
              Miền Bắc (4)
            </button>
            <button
              type="button"
              className={`${styles.weatherFilterTab} ${weatherFilter === 'central' ? styles.weatherFilterTabActive : ''}`}
              onClick={() => setWeatherFilter('central')}
            >
              Miền Trung (4)
            </button>
            <button
              type="button"
              className={`${styles.weatherFilterTab} ${weatherFilter === 'south_highlands' ? styles.weatherFilterTabActive : ''}`}
              onClick={() => setWeatherFilter('south_highlands')}
            >
              Miền Nam & Tây Nguyên (3)
            </button>
          </div>

          {/* Swipeable Draggable Weather Track */}
          {isWeatherLoading ? (
            <SkeletonWeatherBar count={4} />
          ) : (
            <div className={styles.weatherTrackWrapper}>
              <div
                ref={weatherTrackRef}
                className={styles.weatherTrack}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              >
                {filteredWeatherCities.map(({ key, meta, weather }) => (
                  <div key={key} className={styles.weatherCard}>
                    <div>
                      {/* Card Top */}
                      <div className={styles.weatherCardTop}>
                        <div>
                          <h3 className={styles.weatherCityName}>{meta.nameVi}</h3>
                          <span className={styles.weatherRegionBadge}>{meta.region}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
                          <span className={styles.livePulseDot} />
                          <span>LIVE</span>
                        </div>
                      </div>

                      {/* Temp & Icon */}
                      <div className={styles.weatherTempRow}>
                        <div className={styles.weatherTempGroup}>
                          <span className={styles.weatherDegrees}>{weather?.tempFormatted || `${weather?.temp || 26}°C`}</span>
                          <span className={styles.weatherApparent}>Cảm nhận {weather?.apparentTemp || 28}°C</span>
                        </div>
                        <div className={styles.weatherIconWrapper}>
                          {renderWeatherIcon(weather?.weatherCode ?? 1, weather?.isDay ?? true)}
                        </div>
                      </div>

                      {/* Status */}
                      <div className={styles.weatherStatusText}>
                        {weather?.statusVi || 'Nắng ấm chan hòa, trời đẹp'}
                      </div>

                      {/* Metrics */}
                      <div className={styles.weatherMetricsList}>
                        <div className={styles.weatherMetric}>
                          <DropletsIcon size={14} color="#0284C7" />
                          <span>Độ ẩm: {weather?.humidity || 70}%</span>
                        </div>
                        <div className={styles.weatherMetric}>
                          <WindIcon size={14} color="#0284C7" />
                          <span>Gió: {weather?.windSpeed || 10} km/h</span>
                        </div>
                      </div>

                      {/* Advisory */}
                      <div className={styles.weatherTipBox}>
                        {weather?.adviceVi || 'Thời tiết tuyệt vời cho các hoạt động tham quan ngoài trời.'}
                      </div>
                    </div>

                    {/* Quick Action */}
                    <Link
                      href={`/planner?dest=${encodeURIComponent(meta.nameVi)}`}
                      className={styles.weatherCardAction}
                    >
                      <span>Lên lịch đi {meta.nameVi}</span>
                      <ArrowRightIcon size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── 5.5. INTERACTIVE MIDNIGHT GPS MAP & 360 EXPLORER (IDEA 5) ─────── */}
      <section className={`${styles.midnightMapSection} ${styles.revealOnScroll}`} id="interactive-map">
        <div className={styles.container}>
          <div className={styles.mapHeader}>
            <h2 className={styles.mapMainTitle}>Bản đồ Di sản & Tọa độ Du lịch Việt Nam</h2>
          </div>

          <div className={styles.mapInteractiveContainer}>
            {/* Interactive Real S-Map Constellation Column */}
            <div className={styles.sMapWrapper}>
              {/* Real S-Map SVG Canvas */}
              <div className={styles.sMapSvgContainer}>
                <svg
                  viewBox="0 0 600 660"
                  className={styles.sMapSvg}
                  aria-label="Bản đồ địa lý thực Việt Nam với Quần đảo Hoàng Sa và Trường Sa"
                >
                  <defs>
                    {/* Neon Blur Filter */}
                    <filter id="mapNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    <filter id="goldStarGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Gradients */}
                    <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38BDF8" />
                      <stop offset="50%" stopColor="#0088CC" />
                      <stop offset="100%" stopColor="#0284C7" />
                    </linearGradient>

                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FDE047" />
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#D97706" />
                    </linearGradient>

                    {/* Coordinate Grid Pattern */}
                    <pattern id="gridPattern" width="45" height="45" patternUnits="userSpaceOnUse">
                      <path d="M 45 0 L 0 0 0 45" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="1" />
                    </pattern>
                  </defs>

                  {/* Grid Background */}
                  <rect width="600" height="660" fill="url(#gridPattern)" />

                  {/* Latitude Reference Lines */}
                  <line x1="20" y1="80" x2="580" y2="80" stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 4" strokeWidth="1" />
                  <text x="24" y="76" fill="rgba(148, 163, 184, 0.45)" fontSize="9" fontFamily="monospace">22° N</text>

                  <line x1="20" y1="220" x2="580" y2="220" stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 4" strokeWidth="1" />
                  <text x="24" y="216" fill="rgba(148, 163, 184, 0.45)" fontSize="9" fontFamily="monospace">18° N</text>

                  <line x1="20" y1="360" x2="580" y2="360" stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 4" strokeWidth="1" />
                  <text x="24" y="356" fill="rgba(148, 163, 184, 0.45)" fontSize="9" fontFamily="monospace">14° N</text>

                  <line x1="20" y1="500" x2="580" y2="500" stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 4" strokeWidth="1" />
                  <text x="24" y="496" fill="rgba(148, 163, 184, 0.45)" fontSize="9" fontFamily="monospace">10° N</text>

                  {/* Longitude Reference Lines */}
                  <line x1="120" y1="20" x2="120" y2="640" stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 4" strokeWidth="1" />
                  <text x="124" y="648" fill="rgba(148, 163, 184, 0.45)" fontSize="9" fontFamily="monospace">104° E</text>

                  <line x1="250" y1="20" x2="250" y2="640" stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 4" strokeWidth="1" />
                  <text x="254" y="648" fill="rgba(148, 163, 184, 0.45)" fontSize="9" fontFamily="monospace">108° E</text>

                  <line x1="380" y1="20" x2="380" y2="640" stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 4" strokeWidth="1" />
                  <text x="384" y="648" fill="rgba(148, 163, 184, 0.45)" fontSize="9" fontFamily="monospace">112° E</text>

                  <line x1="510" y1="20" x2="510" y2="640" stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 4" strokeWidth="1" />
                  <text x="514" y="648" fill="rgba(148, 163, 184, 0.45)" fontSize="9" fontFamily="monospace">116° E</text>

                  {/* Ocean Watermark Text */}
                  <text
                    x="420"
                    y="390"
                    fill="rgba(56, 189, 248, 0.12)"
                    fontSize="18"
                    fontWeight="800"
                    letterSpacing="6"
                    textAnchor="middle"
                  >
                    BIỂN ĐÔNG VIỆT NAM
                  </text>

                  {/* Compass Rose at top-right */}
                  <g transform="translate(530, 60)" opacity="0.8">
                    <circle cx="0" cy="0" r="22" fill="none" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1" />
                    <circle cx="0" cy="0" r="15" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.8" />
                    <polygon points="0,-18 3,-4 0,0 -3,-4" fill="#EF4444" />
                    <polygon points="0,18 3,4 0,0 -3,4" fill="#94A3B8" />
                    <polygon points="18,0 4,3 0,0 4,-3" fill="#94A3B8" />
                    <polygon points="-18,0 -4,3 0,0 -4,-3" fill="#94A3B8" />
                    <text x="0" y="-22" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="800">N</text>
                  </g>

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* REAL GEOGRAPHIC VIETNAM MAP (63 PROVINCES DATA)            */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {/* Outer Glow */}
                  <path
                    d={VIETNAM_REAL_MAP_PATH}
                    fill="rgba(14, 165, 233, 0.16)"
                    stroke="url(#neonGradient)"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    filter="url(#mapNeonGlow)"
                  />
                  {/* Crisp Inner Edge */}
                  <path
                    d={VIETNAM_REAL_MAP_PATH}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.45)"
                    strokeWidth="0.7"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />




                  {/* ────────────────────────────────────────────────────────── */}
                  {/* QUẦN ĐẢO HOÀNG SA (TP. ĐÀ NẴNG) - SIGNATURE CENTERPIECE 1 */}
                  {/* ────────────────────────────────────────────────────────── */}
                  <g
                    className={`${styles.islandArchipelagoGroup} ${activeHotspotId === 'hoangsa' ? styles.mapSvgNodeActive : ''}`}
                    onClick={() => {
                      setActiveHotspotId('hoangsa');
                    }}
                    aria-label="Quần đảo Hoàng Sa (TP. Đà Nẵng)"
                  >
                    {/* Concentric Radar Rings */}
                    <circle cx="381.2" cy="294.7" className={styles.radarRing1} />
                    <circle cx="381.2" cy="294.7" className={styles.radarRing2} />
                    <circle cx="381.2" cy="294.7" className={styles.radarRing3} />

                    {/* Island Reef Dots */}
                    <circle cx="381.2" cy="294.7" r="5" fill="#FDE047" stroke="#F59E0B" strokeWidth="1" />
                    <circle cx="396" cy="286" r="3.8" fill="#FDE047" stroke="#F59E0B" strokeWidth="0.8" />
                    <circle cx="370" cy="288" r="3" fill="#FCD34D" stroke="#F59E0B" strokeWidth="0.8" />
                    <circle cx="402" cy="300" r="2.8" fill="#FCD34D" stroke="#F59E0B" strokeWidth="0.8" />
                    <circle cx="376" cy="308" r="3.2" fill="#FCD34D" stroke="#F59E0B" strokeWidth="0.8" />
                    <circle cx="392" cy="306" r="2.8" fill="#FCD34D" stroke="#F59E0B" strokeWidth="0.8" />

                    {/* Golden Sovereign Star */}
                    <polygon
                      points="381.2,287.7 383.2,292.7 388.2,292.7 384.2,295.7 386.2,300.7 381.2,297.7 376.2,300.7 378.2,295.7 374.2,292.7 379.2,292.7"
                      fill="#FDE047"
                      stroke="#B45309"
                      strokeWidth="0.5"
                      className={styles.sovereignStar}
                      filter="url(#goldStarGlow)"
                    />

                    {/* Luminous Island Typography directly on map */}
                    <text
                      x="381.2"
                      y="268"
                      textAnchor="middle"
                      fill="#FDE047"
                      fontSize="12"
                      fontWeight="800"
                      filter="url(#goldStarGlow)"
                      letterSpacing="0.8"
                    >
                      QUẦN ĐẢO HOÀNG SA
                    </text>
                    <text
                      x="381.2"
                      y="281"
                      textAnchor="middle"
                      fill="#7DD3FC"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      (TP. ĐÀ NẴNG)
                    </text>
                  </g>

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* QUẦN ĐẢO TRƯỜNG SA (KHÁNH HÒA) - SIGNATURE CENTERPIECE 2  */}
                  {/* ────────────────────────────────────────────────────────── */}
                  <g
                    className={`${styles.islandArchipelagoGroup} ${activeHotspotId === 'truongsa' ? styles.mapSvgNodeActive : ''}`}
                    onClick={() => {
                      setActiveHotspotId('truongsa');
                    }}
                    aria-label="Quần đảo Trường Sa (Tỉnh Khánh Hòa)"
                  >
                    {/* Concentric Radar Rings */}
                    <circle cx="452.1" cy="530.3" className={styles.radarRing1} />
                    <circle cx="452.1" cy="530.3" className={styles.radarRing2} />
                    <circle cx="452.1" cy="530.3" className={styles.radarRing3} />

                    {/* Real Island Archipelago Cluster */}
                    <circle cx="378.3" cy="574.0" r="5" fill="#FDE047" stroke="#F59E0B" strokeWidth="1" />
                    <circle cx="456.3" cy="475.3" r="3.8" fill="#FDE047" stroke="#F59E0B" strokeWidth="0.8" />
                    <circle cx="457.2" cy="519.6" r="3.5" fill="#FCD34D" stroke="#F59E0B" strokeWidth="0.8" />
                    <circle cx="455.9" cy="530.3" r="4.2" fill="#FDE047" stroke="#F59E0B" strokeWidth="0.8" />
                    <circle cx="430.0" cy="550.0" r="3" fill="#FCD34D" stroke="#F59E0B" strokeWidth="0.8" />
                    <circle cx="472.0" cy="522.0" r="3" fill="#FCD34D" stroke="#F59E0B" strokeWidth="0.8" />
                    <circle cx="420.0" cy="580.0" r="3.2" fill="#FCD34D" stroke="#F59E0B" strokeWidth="0.8" />

                    {/* Golden Sovereign Star */}
                    <polygon
                      points="452.1,523.3 454.1,528.3 459.1,528.3 455.1,531.3 457.1,536.3 452.1,533.3 447.1,536.3 449.1,531.3 445.1,528.3 450.1,528.3"
                      fill="#FDE047"
                      stroke="#B45309"
                      strokeWidth="0.5"
                      className={styles.sovereignStar}
                      filter="url(#goldStarGlow)"
                    />

                    {/* Luminous Island Typography directly on map */}
                    <text
                      x="452.1"
                      y="503"
                      textAnchor="middle"
                      fill="#FDE047"
                      fontSize="12"
                      fontWeight="800"
                      filter="url(#goldStarGlow)"
                      letterSpacing="0.8"
                    >
                      QUẦN ĐẢO TRƯỜNG SA
                    </text>
                    <text
                      x="452.1"
                      y="516"
                      textAnchor="middle"
                      fill="#7DD3FC"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      (TỈNH KHÁNH HÒA)
                    </text>
                  </g>

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* ALL MAINLAND & ISLAND CONSTELLATION NODES (41 PINNED NODES)*/}
                  {/* ────────────────────────────────────────────────────────── */}
                  {VIETNAM_MAP_PINS.filter((p) => p.id !== 'hoangsa' && p.id !== 'truongsa').map((pin) => {
                    const isActive = activeHotspotId === pin.id;

                    if (pin.isMajor) {
                      return (
                        <g
                          key={pin.id}
                          className={`${styles.mapSvgNode} ${isActive ? styles.mapSvgNodeActive : ''}`}
                          onClick={() => {
                            setActiveHotspotId(pin.id);
                          }}
                        >
                          <circle
                            cx={pin.x}
                            cy={pin.y}
                            r={isActive ? 9 : 6}
                            fill={isActive ? 'rgba(56, 189, 248, 0.4)' : 'rgba(0, 136, 204, 0.25)'}
                            stroke="#38BDF8"
                            strokeWidth={isActive ? 2.5 : 1.8}
                          />
                          <circle
                            cx={pin.x}
                            cy={pin.y}
                            r={isActive ? 4 : 2.8}
                            fill={isActive ? '#FFFFFF' : '#38BDF8'}
                          />
                          <text
                            x={pin.x + pin.labelDx}
                            y={pin.y + pin.labelDy}
                            textAnchor={pin.labelAnchor}
                            fill={isActive ? '#38BDF8' : '#F8FAFC'}
                            fontSize={isActive ? '11.5' : '10.5'}
                            fontWeight={isActive ? '800' : '700'}
                          >
                            {pin.name}
                          </text>
                        </g>
                      );
                    }

                    // Secondary Tourism Node
                    return (
                      <g
                        key={pin.id}
                        className={`${styles.mapSvgSecondaryNode} ${isActive ? styles.mapSvgSecondaryNodeActive : ''}`}
                        aria-label={`${pin.name} (${pin.province})`}
                        onClick={() => {
                          setActiveHotspotId(pin.id);
                        }}
                      >
                        {isActive && (
                          <circle
                            cx={pin.x}
                            cy={pin.y}
                            r={10}
                            fill="none"
                            stroke="#FDE047"
                            strokeWidth={1.5}
                            strokeDasharray="2 2"
                          />
                        )}
                        <circle
                          cx={pin.x}
                          cy={pin.y}
                          r={isActive ? 5.5 : 3.6}
                          fill={isActive ? '#F59E0B' : 'rgba(14, 165, 233, 0.55)'}
                          stroke={isActive ? '#FDE047' : '#7DD3FC'}
                          strokeWidth={isActive ? 2 : 1.2}
                        />
                        {isActive && (
                          <text
                            x={pin.x + pin.labelDx}
                            y={pin.y + pin.labelDy}
                            textAnchor={pin.labelAnchor}
                            fill="#FDE047"
                            fontSize="10.5"
                            fontWeight="800"
                            filter="url(#goldStarGlow)"
                          >
                            {pin.name}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* National Sovereignty Notice Banner */}
              <div className={styles.sovereignNoticeBanner}>
                <div className={styles.sovereignNoticeText}>
                  <ShieldCheckIcon size={16} color="#F59E0B" />
                  <span>Hoàng Sa (TP. Đà Nẵng) & Trường Sa (Tỉnh Khánh Hòa) là phần máu thịt thiêng liêng của Tổ quốc Việt Nam.</span>
                </div>
              </div>
            </div>

            {/* Display Stage */}
            <div className={styles.mapDisplayStage}>
              <div className={styles.mapStagePhotoWrapper}>
                {currentHotspot.image ? (
                  <img src={currentHotspot.image} alt={currentHotspot.name} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at 50% 50%, #1E293B 0%, #0F172A 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MapPinIcon size={48} color="#38BDF8" />
                  </div>
                )}
                <div className={styles.mapStageGpsOverlay}>
                  <div className={styles.mapStagePulse} />
                  <span>GPS: {currentHotspot.coords}</span>
                </div>
              </div>

              <div className={styles.mapStageDetails}>
                <div className={styles.mapStageTitleRow}>
                  <h3 className={styles.mapStageTitle}>{currentHotspot.name}</h3>
                  <span className={styles.mapStageProvinceBadge}>{currentHotspot.province}</span>
                </div>

                <p className={styles.mapStageDesc}>{currentHotspot.description}</p>

                <div className={styles.mapStageStatsGrid}>
                  <div className={styles.mapStageStatItem}>
                    <span className={styles.mapStageStatLabel}>Vé tham quan</span>
                    <span className={styles.mapStageStatValue}>{currentHotspot.ticketPrice}</span>
                  </div>
                  <div className={styles.mapStageStatItem}>
                    <span className={styles.mapStageStatLabel}>Giờ mở cửa</span>
                    <span className={styles.mapStageStatValue}>{currentHotspot.openHours}</span>
                  </div>
                  <div className={styles.mapStageStatItem}>
                    <span className={styles.mapStageStatLabel}>Thời điểm đẹp nhất</span>
                    <span className={styles.mapStageStatValue}>{currentHotspot.recommendedTime}</span>
                  </div>
                </div>

                <div className={styles.mapStageActions}>
                  <Link href={`/map?dest=${encodeURIComponent(currentHotspot.mapDestQuery)}`} className={styles.btnMapPrimary}>
                    <CompassIcon size={16} />
                    <span>Mở bản đồ số VISTA</span>
                  </Link>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentHotspot.name + ' ' + currentHotspot.province)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btnMapSecondary}
                  >
                    <span>Chỉ đường Google</span>
                    <ArrowRightIcon size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. THREE CORE PILLARS BENTO GRID ────────────────────────────── */}
      <section className={`${styles.sectionBlock} ${styles.revealOnScroll}`} style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionEyebrow}>
              <SparklesIcon size={14} color="#0088CC" />
              <span>Công nghệ phục vụ du lịch</span>
            </div>
            <h2 className={styles.sectionMainTitle}>Hệ sinh thái du lịch thông minh VISTA</h2>
            <p className={styles.sectionDesc}>
              Tích hợp liền mạch từ khâu lên ý tưởng, điều phối hành trình thực tế đến quản lý tài chính nhóm.
            </p>
          </div>

          <div className={styles.bentoGrid}>
            {/* Bento Card 1 (Large): AI Planner */}
            <div className={`${styles.bentoCard} ${styles.bentoLarge}`}>
              <div>
                <div className={styles.bentoHeader}>
                  <div className={styles.bentoIconWrapper}>
                    <SparklesIcon size={24} color="#0088CC" />
                  </div>
                  <div>
                    <span className={styles.bentoBadge}>Trí tuệ nhân tạo</span>
                    <h3 className={styles.bentoTitle}>VISTA AI Planner Pro</h3>
                  </div>
                </div>

                <p className={styles.bentoDesc}>
                  Hệ thống AI tự động phân tích khung giờ khởi hành thực tế, gợi ý lịch trình theo 12 phong cách du lịch chuyên biệt, và tối ưu hóa thời gian di chuyển giữa các điểm đến.
                </p>

                <div className={styles.bentoFeaturesList}>
                  <div className={styles.bentoFeatureItem}>
                    <CheckCircleIcon size={16} />
                    <span>Tự động tối ưu lịch trình khi khởi hành muộn sau 20:00</span>
                  </div>
                  <div className={styles.bentoFeatureItem}>
                    <CheckCircleIcon size={16} />
                    <span>Dữ liệu 350+ danh thắng thực tế với giá vé và giờ mở cửa</span>
                  </div>
                  <div className={styles.bentoFeatureItem}>
                    <CheckCircleIcon size={16} />
                    <span>Tùy biến đổi điểm đến linh hoạt theo sở thích cá nhân</span>
                  </div>
                  <div className={styles.bentoFeatureItem}>
                    <CheckCircleIcon size={16} />
                    <span>Xuất chuyến đi nhóm và lưu trữ bộ sưu tập cá nhân</span>
                  </div>
                </div>
              </div>

              <Link href="/planner" className={styles.btnBentoAction}>
                <span>Trải nghiệm AI Planner ngay</span>
                <ArrowRightIcon size={16} color="#FFFFFF" />
              </Link>
            </div>

            {/* Bento Card 2: Interactive GPS Map */}
            <div className={styles.bentoCard}>
              <div>
                <div className={styles.bentoHeader}>
                  <div className={styles.bentoIconWrapper}>
                    <NavigationIcon size={22} color="#0088CC" />
                  </div>
                  <div>
                    <span className={styles.bentoBadge}>Bản đồ số MapLibre</span>
                    <h3 className={styles.bentoTitle}>Bản đồ GPS & Google Maps</h3>
                  </div>
                </div>

                <p className={styles.bentoDesc}>
                  Trải nghiệm tương tác trực quan với ghim vị trí chuẩn xác 100%, thẻ thông tin nổi phong cách Google Maps và nút kích hoạt dẫn đường GPS ngay lập tức.
                </p>
              </div>

              <Link href="/map" className={styles.btnBentoSecondary}>
                <span>Mở bản đồ du lịch</span>
                <ArrowRightIcon size={14} />
              </Link>
            </div>

            {/* Bento Card 3: Treasury & VietQR */}
            <div className={styles.bentoCard}>
              <div>
                <div className={styles.bentoHeader}>
                  <div className={styles.bentoIconWrapper}>
                    <WalletIcon size={22} color="#0088CC" />
                  </div>
                  <div>
                    <span className={styles.bentoBadge}>Thủ quỹ minh bạch</span>
                    <h3 className={styles.bentoTitle}>Quản lý quỹ nhóm & VietQR</h3>
                  </div>
                </div>

                <p className={styles.bentoDesc}>
                  Xóa bỏ áp lực tính toán tiền nong khi đi đông người. Tự động chia tiền chính xác theo từng khoản chi và thanh toán nhanh chóng qua mã QR ngân hàng.
                </p>
              </div>

              <Link href="/trips" className={styles.btnBentoSecondary}>
                <span>Quản lý chuyến đi nhóm</span>
                <ArrowRightIcon size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. FEATURED DESTINATIONS SHOWCASE ───────────────────────────── */}
      <section className={`${styles.sectionBlock} ${styles.revealOnScroll}`} id="landmarks">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionEyebrow}>
              <CompassIcon size={14} color="#0088CC" />
              <span>Điểm đến chọn lọc</span>
            </div>
            <h2 className={styles.sectionMainTitle}>Danh lam thắng cảnh tiêu biểu Việt Nam</h2>
            <p className={styles.sectionDesc}>
              Những di sản thiên nhiên và văn hóa đặc sắc được đông đảo lữ khách trong nước và quốc tế yêu thích.
            </p>
          </div>

          <div className={styles.destinationsGrid}>
            {SHOWCASE_DESTINATIONS.map((dest) => (
              <div key={dest.id} className={styles.destCard}>
                <div className={styles.destMediaWrapper}>
                  <img src={dest.image} alt={dest.name} className={styles.destMedia} />
                  <div className={styles.destSeasonBadge}>
                    <CalendarIcon size={12} color="#475569" />
                    <span>{dest.season}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.destFavoriteBtn}
                    onClick={(e) => toggleFavorite(dest.id, e)}
                    aria-label="Lưu yêu thích"
                  >
                    <HeartIcon size={16} color={favorites[dest.id] ? '#EF4444' : '#64748B'} filled={favorites[dest.id]} />
                  </button>
                </div>

                <div className={styles.destContent}>
                  <div className={styles.destHeaderRow}>
                    <h3 className={styles.destTitle}>{dest.name}</h3>
                    <div className={styles.destRating}>
                      <StarIcon size={13} />
                      <span>{dest.rating}</span>
                    </div>
                  </div>

                  <div className={styles.destLocationRow}>
                    <MapPinIcon size={12} color="#64748B" />
                    <span>{dest.province} · {dest.category}</span>
                  </div>

                  <p className={styles.destDescription}>{dest.description}</p>

                  <div className={styles.destFooterRow}>
                    <div>
                      <span className={styles.destPriceLabel}>Chi phí dự kiến</span>
                      <div className={styles.destPriceValue}>{dest.priceEstimate}</div>
                    </div>

                    <Link href={`/planner?dest=${encodeURIComponent(dest.province)}`} className={styles.btnDestDetail}>
                      <span>Lên lịch trình</span>
                      <ArrowRightIcon size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6.5. LIVING STORIES & COMMUNITY SHOWCASE ───────────────────── */}
      <section style={{ padding: '80px 0', background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.06), transparent 70%), #0B132B', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className={styles.container}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#22D3EE', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>
              <SparkleStarIcon size={14} /> VISTA LIVING STORIES
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', margin: '0 0 14px' }}>
              Nhịp Sống Hành Trình & Cộng Đồng
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '16px', maxWidth: '580px', margin: '0 auto', lineHeight: 1.6 }}>
              Lắng nghe những trải nghiệm chân thực, khám phá ảnh chụp từ lữ khách và cùng nhau lan tỏa đam mê xê dịch khắp Việt Nam.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            {/* Card 1 */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '22px', padding: '20px', backdropFilter: 'blur(16px)', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', height: '200px', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_bay.jpg" alt="Vịnh Hạ Long" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#22D3EE', background: 'rgba(6,182,212,0.1)', padding: '3px 10px', borderRadius: '999px' }}>
                  <CompassPinIcon size={12} /> Quảng Ninh
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#FF7A59', fontWeight: 600 }}>
                  <LuxeHeartIcon size={14} active={true} /> 48
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC', margin: '0 0 8px' }}>Chèo kayak qua hang Luồn lúc hoàng hôn buông</h3>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>Một trải nghiệm không thể nào quên khi mặt trời đỏ ối dần khuất sau những đảo đá vôi kỳ vĩ...</p>
            </div>

            {/* Card 2 */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '22px', padding: '20px', backdropFilter: 'blur(16px)', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', height: '200px', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_golden_bridge.jpg" alt="Cầu Vàng Đà Nẵng" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#22D3EE', background: 'rgba(6,182,212,0.1)', padding: '3px 10px', borderRadius: '999px' }}>
                  <CompassPinIcon size={12} /> Đà Nẵng
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#FF7A59', fontWeight: 600 }}>
                  <LuxeHeartIcon size={14} active={true} /> 86
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC', margin: '0 0 8px' }}>Săn biển mây Bà Nà Hills từ 6 giờ sáng</h3>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>Đi chuyến cáp treo đầu tiên trong ngày để đón trọn khoảnh khắc đôi bàn tay khổng lồ vươn giữa mây trời.</p>
            </div>

            {/* Card 3 */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '22px', padding: '20px', backdropFilter: 'blur(16px)', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', height: '200px', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/phuquoc_sunset_sanato.jpg" alt="Phú Quốc" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#22D3EE', background: 'rgba(6,182,212,0.1)', padding: '3px 10px', borderRadius: '999px' }}>
                  <CompassPinIcon size={12} /> Kiên Giang
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#FF7A59', fontWeight: 600 }}>
                  <LuxeHeartIcon size={14} active={true} /> 62
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC', margin: '0 0 8px' }}>Chờ hoàng hôn Bãi Trường cùng tách mocktail</h3>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>Bầu trời Phú Quốc chuyển sắc tím hồng huyền ảo, tiếng sóng rì rào êm đềm kết thúc một ngày du ngoạn...</p>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link
              href="/community"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 32px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #22D3EE, #0284C7)',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 6px 24px rgba(6, 182, 212, 0.4)',
                transition: 'all 0.25s ease',
              }}
            >
              <span>Khám Phá Toàn Bộ Câu Chuyện Trên Cộng Đồng</span>
              <ArrowRightIcon size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 7. EDITORIAL FOOTER ─────────────────────────────────────────── */}
      <footer className={styles.footerRoot}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0088CC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                  <CompassIcon size={18} color="#FFFFFF" />
                </div>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>VISTA</span>
              </div>
              <p style={{ fontSize: '13.5px', color: '#94A3B8', lineHeight: 1.6, maxWidth: '320px' }}>
                Nền tảng du lịch thông minh Việt Nam, tiên phong kết nối di sản văn hóa, trí tuệ nhân tạo và trải nghiệm cộng tác nhóm trọn vẹn.
              </p>
            </div>

            <div>
              <h4 className={styles.footerColTitle}>Sản phẩm</h4>
              <div className={styles.footerLinksList}>
                <Link href="/planner" className={styles.footerLink}>AI Planner Pro</Link>
                <Link href="/map" className={styles.footerLink}>Bản đồ số GPS</Link>
                <Link href="/trips" className={styles.footerLink}>Quản lý chuyến đi</Link>
                <Link href="/trips" className={styles.footerLink}>Thủ quỹ & VietQR</Link>
              </div>
            </div>

            <div>
              <h4 className={styles.footerColTitle}>Di sản 4 miền</h4>
              <div className={styles.footerLinksList}>
                <Link href="/planner?dest=Hà Nội" className={styles.footerLink}>Hà Nội & Miền Bắc</Link>
                <Link href="/planner?dest=Thừa Thiên Huế" className={styles.footerLink}>Cố đô Huế & Miền Trung</Link>
                <Link href="/planner?dest=Hồ Chí Minh" className={styles.footerLink}>Sài Gòn & Nam Bộ</Link>
                <Link href="/planner?dest=Lâm Đồng" className={styles.footerLink}>Đà Lạt & Tây Nguyên</Link>
              </div>
            </div>

            <div>
              <h4 className={styles.footerColTitle}>Dự án VISTA</h4>
              <div className={styles.footerLinksList}>
                <span className={styles.footerLink}>Đồ án tốt nghiệp 2026</span>
                <span className={styles.footerLink}>Kiến trúc Monolith & Next.js</span>
                <span className={styles.footerLink}>Bảo mật RBAC & Supabase</span>
                <span className={styles.footerLink}>Tích hợp AI Gemini</span>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <span>© 2026 VISTA Travel Platform. Bản quyền thuộc về Đội ngũ phát triển VISTA.</span>
            <span>Tự hào lan tỏa vẻ đẹp non nước Việt Nam 🇻🇳</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
