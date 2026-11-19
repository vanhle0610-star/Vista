'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/common/Navbar';
import { apiRequest } from '@/lib/api';
import { SkeletonAiGenerating, SkeletonBox } from '@/components/common/Skeleton';
import type { DestinationMarker, RouteStop, MultiDayRoute } from '@/features/map-location/types';
import { computeVistaRoute } from '@/features/map-location/routing/routes';
import { getRealPlacesByProvince, type RealPlace } from '@/data/realDestinationsData';
import {
  VIETNAM_63_PROVINCES,
  matchProvince,
  normalizeVn,
  type DestinationOption,
} from '@/data/provincesData';
import {
  requestAiItinerary,
  isBackendTripId,
  type AiItinerarySuggestionResponse,
  type AiProvider,
  type AiCitation,
} from '@/services/aiPlannerService';
import {
  getTripItinerary,
  mergeTripItinerary,
  type MergeItineraryDay,
} from '@/services/itineraryService';
import { fetchLiveWeatherByCoords, type RealtimeWeather } from '@/services/weatherService';
import styles from './planner.module.css';
import {
  Palmtree,
  Landmark,
  UtensilsCrossed,
  Trees,
  FerrisWheel,
  Camera,
  Coffee,
  MoonStar,
  Mountain,
  Flower2,
  Sailboat,
  ShoppingBag,
  Check,
  Clock,
  RotateCcw,
  Trash2,
  Sparkles,
  ShieldCheck,
  Bookmark,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Share2,
  MoreHorizontal,
  Search,
  Wallet,
  Receipt,
  Pencil,
  Navigation,
  Zap,
  Car,
  Bike,
  Footprints,
} from 'lucide-react';
import {
  getPlanHistory,
  savePlanToHistory,
  deletePlanFromHistory,
  clearAllPlanHistory,
  formatTimeAgo,
  type PlanHistoryRecord,
} from '@/services/planHistoryService';

// Dynamic import for MapLibre map adapter (client-side only to avoid SSR issues)
const MapViewAdapter = dynamic(
  () => import('@/features/map-location/adapter/MapViewAdapter').then((mod) => mod.MapViewAdapter),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: '100%', minHeight: '520px', borderRadius: '16px', overflow: 'hidden' }}>
        <SkeletonBox width="100%" height="520px" borderRadius="16px" />
      </div>
    ),
  }
);

/* ─── TYPES ───────────────────────────────────────────────────────────── */
interface Activity {
  id: string;
  timeSlot: string;
  timeRange: string;
  category: string;
  title: string;
  description: string;
  location: string;
  costVnd: number;
  costLabel?: string;
  tip?: string;
  photoUrl: string;
  transferTimeAfter?: string;
  latitude?: number;
  longitude?: number;
  rationale?: string;
  timeSlotReason?: string;
  whyVisitReason?: string;
  costStatus?: 'FREE' | 'PAID' | 'ESTIMATED' | 'UNVERIFIED';
  warning?: string;
  dataConfidence?: 'VERIFIED' | 'UNVERIFIED_HOURS';
  durationMin?: number;
  waitTimeMin?: number;
  travelDurationFromPreviousMinutes?: number;
  travelDistanceKm?: number;
  transportMode?: string;
  bufferMinutes?: number;
  openingHoursStatus?: string;
  isLocked?: boolean;
  isMustVisit?: boolean;
  rainBackupSuggestion?: {
    destinationId?: string;
    destination_id?: string;
    destinationName?: string;
    destination_name?: string;
    name?: string;
    category?: string;
    distanceKm?: number;
    distance_km?: number;
    note?: string;
  } | null;
  realtimeStatus?: string;
  isOpenRealtime?: boolean;
}

interface DayPlan {
  dayNumber: number;
  dateStr: string;
  title: string;
  dayRationale?: string;
  dayStatus?: string;
  statusReason?: string | null;
  departureInfo?: Record<string, any> | null;
  activities: Activity[];
}

interface SavedItineraryRecord {
  id: string;
  destination: string;
  title: string;
  totalDays: number;
  durationLabel: string;
  startDate: string;
  peopleCount: number;
  budgetTier: string;
  totalEstimatedCost: number;
  savedAt: string;
  days: DayPlan[];
}

interface AiGenerationMetadata {
  provider: AiProvider | 'offline';
  fallbackUsed: boolean;
}

// 63 Provinces & Municipalities across Vietnam
const DESTINATION_LIST: DestinationOption[] = VIETNAM_63_PROVINCES;

// 12 Refined & Compact Travel Styles (T2) with professional vector icons & themed colors
const TRAVEL_STYLES = [
  { id: 'beach', label: 'Biển & Nghỉ dưỡng', icon: Palmtree, color: '#0284C7', bg: '#E0F2FE', activeBg: '#BAE6FD' },
  { id: 'culture', label: 'Văn hóa & Di sản', icon: Landmark, color: '#B45309', bg: '#FEF3C7', activeBg: '#FDE68A' },
  { id: 'cuisine', label: 'Ẩm thực bản địa', icon: UtensilsCrossed, color: '#E11D48', bg: '#FFE4E6', activeBg: '#FECDD3' },
  { id: 'nature', label: 'Thiên nhiên sinh thái', icon: Trees, color: '#16A34A', bg: '#DCFCE7', activeBg: '#BBF7D0' },
  { id: 'entertainment', label: 'Vui chơi giải trí', icon: FerrisWheel, color: '#7C3AED', bg: '#F3E8FF', activeBg: '#DDD6FE' },
  { id: 'photo', label: 'Check-in sống ảo', icon: Camera, color: '#DB2777', bg: '#FCE7F3', activeBg: '#FBCFE8' },
  { id: 'cafe', label: 'Cà phê & Thư giãn', icon: Coffee, color: '#92400E', bg: '#FEF3C7', activeBg: '#FDE68A' },
  { id: 'nightlife', label: 'Chợ đêm & Phố đi bộ', icon: MoonStar, color: '#4F46E5', bg: '#EEF2FF', activeBg: '#E0E7FF' },
  { id: 'adventure', label: 'Trekking & Khám phá', icon: Mountain, color: '#0D9488', bg: '#CCFBF1', activeBg: '#99F6E4' },
  { id: 'wellness', label: 'Khoáng nóng & Spa', icon: Flower2, color: '#059669', bg: '#D1FAE5', activeBg: '#A7F3D0' },
  { id: 'watersports', label: 'Chèo Sup & Lặn biển', icon: Sailboat, color: '#0284C7', bg: '#E0F2FE', activeBg: '#BAE6FD' },
  { id: 'crafts', label: 'Làng nghề & Mua sắm', icon: ShoppingBag, color: '#D97706', bg: '#FEF3C7', activeBg: '#FDE68A' },
];

const DURATION_CHIPS = [
  { id: '1d', label: '1 ngày', days: 1 },
  { id: '2n1d', label: '2N1Đ', days: 2 },
  { id: '3n2d', label: '3N2Đ', days: 3 },
  { id: '4n3d', label: '4N3Đ', days: 4 },
  { id: '5n4d', label: '5N4Đ', days: 5 },
];

const BUDGET_OPTIONS = [
  { id: 'economy', label: 'Tiết kiệm', apiVal: 'BUDGET' },
  { id: 'standard', label: 'Tiêu chuẩn', apiVal: 'MEDIUM' },
  { id: 'luxury', label: 'Cao cấp', apiVal: 'LUXURY' },
];

// Initial Curated Da Nang Plan (Production standard matching reference design)
const INITIAL_DANANG_DAYS: DayPlan[] = [
  {
    dayNumber: 1,
    dateStr: 'Thứ 2, 11/05',
    title: 'Ngày 1 — Khám phá trung tâm Đà Nẵng',
    dayRationale: 'Khởi động Ngày 1 tại Đà Nẵng cực kỳ thảnh thơi: Buổi sáng dạo bước trên Bãi biển Mỹ Khê đón gió biển trong lành, tiếp nối check-in Cầu Rồng kiêu hãnh. Giữa trưa thưởng thức tô Bún chả cá Đà Nẵng đậm đà chuẩn vị bản địa. Buổi chiều tìm hiểu di sản văn hóa Chăm pa tại Bảo tàng Điêu khắc Chăm và khép lại ngày dạo mát ngắm hoàng hôn rực rỡ tại Công viên Biển Đông.',
    activities: [
      {
        id: 'act-1-1',
        timeSlot: 'MORNING',
        timeRange: '08:00–09:45',
        category: 'Biển & Nghỉ dưỡng',
        title: 'Bãi biển Mỹ Khê',
        description: 'Tắm biển, dạo biển và tận hưởng không khí trong lành.',
        location: 'Bãi biển Mỹ Khê, Đà Nẵng',
        costVnd: 0,
        costLabel: 'Miễn phí',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_day.jpg',
        latitude: 16.0592,
        longitude: 108.2467,
      },
      {
        id: 'act-1-2',
        timeSlot: 'MORNING',
        timeRange: '10:00–11:30',
        category: 'Tham quan • Check-in',
        title: 'Cầu Rồng',
        description: 'Biểu tượng của Đà Nẵng, chụp ảnh và dạo quanh.',
        location: 'Đường Nguyễn Văn Linh, Đà Nẵng',
        costVnd: 0,
        costLabel: 'Miễn phí',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_night.jpg',
        latitude: 16.0611,
        longitude: 108.2272,
      },
      {
        id: 'act-1-3',
        timeSlot: 'NOON',
        timeRange: '12:00–13:30',
        category: 'Ẩm thực bản địa',
        title: 'Bún chả cá Đà Nẵng',
        description: 'Thưởng thức đặc sản nổi tiếng với hương vị đậm đà.',
        location: 'Quận Hải Châu, Đà Nẵng',
        costVnd: 60000,
        costLabel: '60.000đ/người',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
        latitude: 16.0678,
        longitude: 108.2208,
      },
      {
        id: 'act-1-4',
        timeSlot: 'AFTERNOON',
        timeRange: '14:00–16:00',
        category: 'Văn hóa & Di sản',
        title: 'Bảo tàng Điêu khắc Chăm',
        description: 'Khám phá kho tàng văn hóa Chăm đặc sắc.',
        location: 'Số 02 đường 2 Tháng 9, Đà Nẵng',
        costVnd: 60000,
        costLabel: '60.000đ/người',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_hanoi_day.jpg',
        latitude: 16.0599,
        longitude: 108.2235,
      },
      {
        id: 'act-1-5',
        timeSlot: 'AFTERNOON',
        timeRange: '17:00–18:30',
        category: 'Thư giãn • Ngắm hoàng hôn',
        title: 'Công viên Biển Đông',
        description: 'Dạo bộ, ngắm biển và tận hưởng không gian sôi động.',
        location: 'Đường Võ Nguyên Giáp, Đà Nẵng',
        costVnd: 0,
        costLabel: 'Miễn phí',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_day.jpg',
        latitude: 16.0689,
        longitude: 108.2464,
      },
    ],
  },
  {
    dayNumber: 2,
    dateStr: 'Thứ 3, 12/05',
    title: 'Ngày 2 · Chinh phục Bà Nà Hills & Cầu Vàng',
    dayRationale: 'Hôm nay xác định là ngày đốt cháy calo và dung lượng điện thoại nhiều nhất trần đời! Lên đỉnh Bà Nà nhớ khoác thêm áo mỏng kẻo gió thổi lạnh run cầm cập, sống ảo ở Cầu Vàng canh lúc sương mù vần vũ như chốn bồng lai tiên cảnh. Trưa càn quét buffet Làng Pháp nạp lại năng lượng, tối về lại sông Hàn ngồi du thuyền chill chill ngắm đèn lấp lánh xả stress cực phê!',
    activities: [
      {
        id: 'act-2-1',
        timeSlot: 'MORNING',
        timeRange: '08:00–12:00',
        category: 'Thắng cảnh nổi tiếng',
        title: 'Cáp treo đạt kỷ lục thế giới & Dạo bước Cầu Vàng',
        description: 'Chiêm ngưỡng Cầu Vàng bồng bềnh giữa biển mây ngút ngàn Bà Nà Hills.',
        location: 'Sun World Bà Nà Hills, Đà Nẵng',
        costVnd: 900000,
        costLabel: '900.000đ / người',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_day.jpg',
        transferTimeAfter: 'Di chuyển nội khu cáp treo',
        timeSlotReason: 'Sáng sớm (08:00 – 12:00) là lúc biển mây bồng bềnh nhất, không khí mát lạnh như châu Âu và chưa bị quá tải đoàn khách đông.',
        whyVisitReason: 'Cây cầu Vàng nâng đỡ bởi đôi bàn tay khổng lồ nổi tiếng toàn cầu, cùng hệ thống cáp treo đạt nhiều kỷ lục thế giới.',
      },
      {
        id: 'act-2-2',
        timeSlot: 'NOON',
        timeRange: '12:30–14:00',
        category: 'Ẩm thực',
        title: 'Buffet Á – Âu tại Làng Pháp Beer Plaza',
        description: 'Hơn 100 món ăn phong phú giữa không gian kiến trúc Gothic phong cách Pháp.',
        location: 'Làng Pháp, Bà Nà Hills',
        costVnd: 700000,
        costLabel: '700.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_south_day.jpg',
        transferTimeAfter: 'Di chuyển 5 phút',
        timeSlotReason: 'Khung giờ trưa (12:30 – 14:00) nghỉ ngơi giữa ngày, nạp năng lượng trong không gian nhà hàng có máy lạnh và biểu diễn âm nhạc sống động.',
        whyVisitReason: 'Bữa tiệc ẩm thực phong phú với hơn 100 món Á – Âu đa dạng, bia tươi mát lạnh trong kiến trúc nhà vòm phong cách Đức.',
      },
      {
        id: 'act-2-3',
        timeSlot: 'AFTERNOON',
        timeRange: '14:30–17:00',
        category: 'Giải trí & Trải nghiệm',
        title: 'Lâu Đài Mặt Trăng & Xe Trượt Ống Alpine Coaster',
        description: 'Trải nghiệm rạp chiếu phim bay 4D và xe trượt cảm giác mạnh ngoài trời.',
        location: 'Fantasy Park, Bà Nà Hills',
        costVnd: 0,
        costLabel: 'Miễn phí kèm vé',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/tay_nguyen_highlands.jpg',
        transferTimeAfter: 'Di chuyển về trung tâm 45 phút',
        timeSlotReason: 'Đầu giờ chiều (14:30 – 17:00) vừa tiêu hóa bữa trưa, nhiệt độ trên đỉnh núi vẫn rất mát mẻ thích hợp vui chơi các trò mạo hiểm.',
        whyVisitReason: 'Khu vui chơi trong nhà lớn nhất Việt Nam với xe trượt ống ngắm toàn cảnh rừng nguyên sinh và các rạp chiếu phim 4D, 5D hiện đại.',
      },
      {
        id: 'act-2-4',
        timeSlot: 'EVENING',
        timeRange: '19:30–21:30',
        category: 'Du thuyền & Ngắm cảnh',
        title: 'Du thuyền sông Hàn ngắm cảnh Tứ đại mỹ cầu',
        description: 'Lướt êm đềm trên sông Hàn, xem biểu diễn múa Chăm Pa và ngắm thành phố rực rỡ.',
        location: 'Bến du thuyền sông Hàn',
        costVnd: 300000,
        costLabel: '300.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_night.jpg',
        timeSlotReason: 'Tối muộn (19:30 – 21:30) sau khi xuống núi về thành phố, ngồi du thuyền lướt sóng đón gió sông Hàn mát rượi xua tan mệt mỏi.',
        whyVisitReason: 'Góc nhìn độc đáo ngắm nhìn 4 cây cầu huyền thoại lung linh trên mặt nước cùng điệu múa Apsara truyền thống quyến rũ.',
      },
    ],
  },
  {
    dayNumber: 3,
    dateStr: 'Thứ 4, 13/05',
    title: 'Ngày 3 · Danh thắng Ngũ Hành Sơn & Mua sắm Chợ Hàn',
    dayRationale: 'Ngày cuối cùng: Sáng leo Ngũ Hành Sơn thắp nhang cầu may mắn tài lộc hanh thông (leo bậc đá cẩn thận kẻo trượt chân nha!), trưa chén sạch dĩa bánh xèo Bà Dưỡng giòn rụm cuốn nem lụi chấm sốt gan béo ngậy. Chiều ghé Chợ Hàn sắm chả bò, tré, mực rim me về làm quà cho người thân bạn bè để khỏi bị trách hờn, rồi làm ly cà phê muối Bạch Đằng ngắm hoàng hôn khép lại chuyến đi 10 điểm!',
    activities: [
      {
        id: 'act-3-1',
        timeSlot: 'MORNING',
        timeRange: '08:30–11:00',
        category: 'Di tích & Khám phá',
        title: 'Khám phá Danh thắng Ngũ Hành Sơn & Động Huyền Không',
        description: 'Quần thể 5 ngọn núi đá vôi kỳ vĩ và viếng ngôi chùa cổ Tam Thai linh thiêng.',
        location: 'Quận Ngũ Hành Sơn, Đà Nẵng',
        costVnd: 80000,
        costLabel: '80.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 20 phút',
        timeSlotReason: 'Buổi sáng (08:30 – 11:00) leo núi đá lúc trời còn râm mát, luồng ánh sáng mặt trời rọi qua vòm động Huyền Không tạo nên khung cảnh huyền ảo.',
        whyVisitReason: 'Quần thể 5 ngọn núi ngũ hành kỳ vĩ với hệ thống hang động tự nhiên huyền bí và các ngôi chùa cổ hàng trăm năm tuổi.',
      },
      {
        id: 'act-3-2',
        timeSlot: 'NOON',
        timeRange: '11:30–13:00',
        category: 'Ẩm thực truyền thống',
        title: 'Thưởng thức Bánh xèo nem lụi Bà Dưỡng',
        description: 'Bánh xèo giòn rụm cuốn rau sống với nước chấm gan thịt gia truyền trứ danh.',
        location: 'Kiệt 280 Hoàng Diệu, Hải Châu',
        costVnd: 180000,
        costLabel: '180.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_south_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 10 phút',
        timeSlotReason: 'Bữa trưa (11:30 – 13:00) sau khi xuống núi, ghé quán ăn nức tiếng trong ngõ để thưởng thức đĩa bánh xèo nóng hổi giòn tan.',
        whyVisitReason: 'Thương hiệu ẩm thực gia truyền hơn 30 năm với nước chấm gan thịt đậu phộng béo ngậy không nơi nào có được.',
      },
      {
        id: 'act-3-3',
        timeSlot: 'AFTERNOON',
        timeRange: '14:00–16:30',
        category: 'Mua sắm & Check-in',
        title: 'Mua sắm đặc sản miền Trung tại Chợ Hàn',
        description: 'Khu chợ sầm uất với đặc sản chả bò, mắm nêm, đồ lưu niệm mang về làm quà.',
        location: 'Đường Trần Phú, Hải Châu',
        costVnd: 200000,
        costLabel: '200.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 15 phút',
        timeSlotReason: 'Đầu giờ chiều (14:00 – 16:30) không gian chợ trong nhà có mái che mát mẻ, thuận tiện mua quà trước khi kết thúc chuyến đi.',
        whyVisitReason: 'Thiên đường đặc sản miền Trung uy tín: chả bò thơm giòn, mực rim me, cá khô và bánh khô mè đóng gói chuẩn sạch.',
      },
      {
        id: 'act-3-4',
        timeSlot: 'EVENING',
        timeRange: '17:00–18:30',
        category: 'Thư giãn & Chill',
        title: 'Thư thả Cà phê ngắm hoàng hôn bên bờ sông Hàn',
        description: 'Kết thúc chuyến đi với ly cà phê muối đậm đà và ngắm nhìn nhịp sống êm đềm.',
        location: 'Đường Bạch Đằng, Đà Nẵng',
        costVnd: 80000,
        costLabel: '80.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_night.jpg',
        timeSlotReason: 'Chiều muộn (17:00 – 18:30) hoàng hôn buông trên mặt sông, thời điểm lý tưởng nhất để ngồi thảnh thơi trò chuyện và nhìn lại chuyến đi.',
        whyVisitReason: 'Thưởng thức ly cà phê muối đặc sản ven đường Bạch Đằng rợp bóng cây xanh, tận hưởng trọn vẹn nhịp sống bình yên của Đà Nẵng.',
      },
    ],
  },
];

// Curated Phu Quoc Plan
const INITIAL_PHUQUOC_DAYS: DayPlan[] = [
  {
    dayNumber: 1,
    dateStr: '14/11/2026',
    title: 'Ngày 1 · Bắc Đảo: Grand World, Safari & Bún Quậy',
    dayRationale: 'Đổ bộ đảo ngọc Phú Quốc là phải tràn đầy năng lượng! Sáng dạo Grand World ngỡ như lạc sang Ý, trưa tự tay quậy tô bún Kiến Xây toát mồ hôi hột nhưng ngon nuốt lưỡi. Chiều đi coi thú ở Safari xem ai nhốt ai, tối càn quét hải sản Chợ đêm nướng mỡ hành thơm nức mũi!',
    activities: [
      {
        id: 'pq-1-1',
        timeSlot: 'MORNING',
        timeRange: '08:00–10:30',
        category: 'Check-in & Cảnh quan',
        title: 'Grand World Phú Quốc & Kênh đào Venice',
        description: 'Dạo bước “thành phố không ngủ” rực rỡ sắc màu và chụp ảnh bên dòng sông Venice.',
        location: 'Bắc Đảo, Phú Quốc',
        costVnd: 0,
        costLabel: 'Miễn phí',
        tip: 'Nên đi sáng sớm để chụp ảnh vắng người và ánh sáng đẹp nhất.',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 15 phút',
      },
      {
        id: 'pq-1-2',
        timeSlot: 'NOON',
        timeRange: '11:30–13:00',
        category: 'Ẩm thực bản địa',
        title: 'Bún Quậy Kiến Xây trứ danh Phú Quốc',
        description: 'Tự tay pha chén nước chấm chua ngọt độc đáo ăn kèm bún hải sản nóng hổi.',
        location: 'Dương Đông, Phú Quốc',
        costVnd: 130000,
        costLabel: '130.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 20 phút',
      },
      {
        id: 'pq-1-3',
        timeSlot: 'AFTERNOON',
        timeRange: '14:30–17:00',
        category: 'Khám phá & Sinh thái',
        title: 'Vinpearl Safari Phú Quốc — Công viên bán hoang dã',
        description: 'Trải nghiệm “nhốt người thả thú” độc đáo ngắm nhìn muôn loài thú quý hiếm.',
        location: 'Gành Dầu, Phú Quốc',
        costVnd: 1300000,
        costLabel: '1.300.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/tay_nguyen_highlands.jpg',
        transferTimeAfter: 'Di chuyển khoảng 25 phút',
      },
      {
        id: 'pq-1-4',
        timeSlot: 'EVENING',
        timeRange: '18:30–21:30',
        category: 'Ẩm thực & Phố đêm',
        title: 'Chợ đêm Phú Quốc & Hải sản tươi sống Dinh Cậu',
        description: 'Thưởng thức hải sản nướng mỡ hành, kem cuộn Thái và mua quà lưu niệm tiêu ngào đường.',
        location: 'Phường Dương Đông, Phú Quốc',
        costVnd: 500000,
        costLabel: '500.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_night.jpg',
      },
    ],
  },
  {
    dayNumber: 2,
    dateStr: 'Thứ 3, 12/05',
    title: 'Ngày 2 · Nam Đảo: Cáp treo Hòn Thơm, Bãi Sao & Cầu Hôn',
    dayRationale: 'Hôm nay đi săn ảnh triệu like ở Nam Đảo: Bay trên biển bằng cáp treo kỷ lục ngắm san hô xanh ngắt, trưa ăn ghẹ Hàm Ninh chắc nịch ngọt lịm. Chiều nằm dài ở Bãi Sao cát trắng như bột mì, hoàng hôn dắt tay người thương qua Cầu Hôn lãng mạn như phim Hàn Quốc!',
    activities: [
      {
        id: 'pq-2-1',
        timeSlot: 'MORNING',
        timeRange: '08:30–11:30',
        category: 'Trải nghiệm kỷ lục',
        title: 'Cáp treo vượt biển Hòn Thơm Sun World',
        description: 'Ngắm toàn cảnh biển ngọc Nam Đảo từ tuyến cáp treo 3 dây vượt biển dài nhất thế giới.',
        location: 'Ga An Thới, Phú Quốc',
        costVnd: 1300000,
        costLabel: '1.300.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 20 phút',
      },
      {
        id: 'pq-2-2',
        timeSlot: 'NOON',
        timeRange: '12:00–13:30',
        category: 'Ẩm thực biển đảo',
        title: 'Hải sản tươi sống Làng chài Hàm Ninh',
        description: 'Thưởng thức ghẹ Hàm Ninh tươi ngọt chắc thịt, gỏi cá trích và tôm mũ ni.',
        location: 'Làng chài Hàm Ninh, Phú Quốc',
        costVnd: 450000,
        costLabel: '450.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_south_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 15 phút',
      },
      {
        id: 'pq-2-3',
        timeSlot: 'AFTERNOON',
        timeRange: '14:30–17:00',
        category: 'Biển & Thiên nhiên',
        title: 'Tắm biển Bãi Sao & Check-in Sunset Sanato',
        description: 'Thả mình trên bãi cát trắng mịn như kem và chụp ảnh cùng đàn voi bay trên biển.',
        location: 'Bãi Sao, Phú Quốc',
        costVnd: 200000,
        costLabel: '200.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_hanoi_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 20 phút',
      },
      {
        id: 'pq-2-4',
        timeSlot: 'EVENING',
        timeRange: '17:30–20:30',
        category: 'Cảnh quan & Check-in',
        title: 'Thị trấn Hoàng Hôn & Cầu Hôn (Kiss Bridge)',
        description: 'Chiêm ngưỡng kiệt tác kiến trúc Cầu Hôn và show biểu diễn ánh sáng Kiss of the Sea.',
        location: 'Sunset Town, Nam Phú Quốc',
        costVnd: 300000,
        costLabel: '300.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_night.jpg',
      },
    ],
  },
  {
    dayNumber: 3,
    dateStr: 'Thứ 4, 13/05',
    title: 'Ngày 3 · Di tích lịch sử, Làng nghề & Chill Bãi Trường',
    dayRationale: 'Ngày cuối đậm chất văn hóa và tận hưởng: Sáng ghé Nhà tù Phú Quốc lắng đọng tri ân lịch sử rồi tạt qua xem nhà thùng nước mắm truyền thống thơm lừng. Trưa cuốn gỏi cá trích nhấp chút rượu sim say đắm lòng người, chiều tối ra OCSEN Bar ngồi ghế lười nghe sóng biển ngắm hoàng hôn đỏ ối chill hết nấc!',
    activities: [
      {
        id: 'pq-3-1',
        timeSlot: 'MORNING',
        timeRange: '08:30–11:00',
        category: 'Lịch sử & Di sản',
        title: 'Di tích Nhà tù Phú Quốc & Nhà thùng Nước mắm',
        description: 'Tìm hiểu di tích lịch sử anh hùng và quy trình ủ chượp nước mắm cá cơm 40 độ đạm.',
        location: 'An Thới, Phú Quốc',
        costVnd: 40000,
        costLabel: '40.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_hanoi_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 15 phút',
      },
      {
        id: 'pq-3-2',
        timeSlot: 'NOON',
        timeRange: '11:30–13:00',
        category: 'Ẩm thực truyền thống',
        title: 'Bữa trưa Gỏi cá trích & Rượu sim rừng',
        description: 'Gỏi cá trích cuốn bánh tráng, dừa nạo và rau rừng chấm nước mắm ớt hiểm.',
        location: 'Dương Đông, Phú Quốc',
        costVnd: 300000,
        costLabel: '300.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 15 phút',
      },
      {
        id: 'pq-3-3',
        timeSlot: 'AFTERNOON',
        timeRange: '14:00–16:30',
        category: 'Sinh thái & Khám phá',
        title: 'Vườn tiêu Suối Đá & Suối Tranh',
        description: 'Dạo bước giữa rừng tiêu trĩu quả và tắm dòng suối trong vắt giữa thiên nhiên.',
        location: 'Dương Tơ, Phú Quốc',
        costVnd: 60000,
        costLabel: '60.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/tay_nguyen_highlands.jpg',
        transferTimeAfter: 'Di chuyển khoảng 15 phút',
      },
      {
        id: 'pq-3-4',
        timeSlot: 'EVENING',
        timeRange: '17:00–19:30',
        category: 'Thư giãn & Chill',
        title: 'Chill Cocktail ngắm hoàng hôn OCSEN Beach Bar',
        description: 'Ngồi ghế lười bên bờ biển nghe nhạc acoustic và ngắm hoàng hôn rực đỏ buông xuống biển Tây.',
        location: 'Bãi Trường, Phú Quốc',
        costVnd: 240000,
        costLabel: '240.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_night.jpg',
      },
    ],
  },
];

// Interface for Replacement spots in Replace Drawer
export interface ReplacementPlace {
  id: string;
  category: string;
  title: string;
  description: string;
  costLabel: string;
  costVnd: number;
  photoUrl: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
}

// Date helpers for smart quick planning (T1)
function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getFutureDateIso(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekendIso(): string {
  const d = new Date();
  const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
  const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek);
  d.setDate(d.getDate() + daysUntilSaturday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Multi-day distinct itinerary generator & Semantic Intent Extractor (T1, T3)
export function extractArrivalDepartureTimes(text: string): {
  arrivalTime?: string;
  departureTime?: string;
  pace?: string;
  travelMode?: string;
  hasElderly?: boolean;
  hasChildren?: boolean;
  dietaryPreference?: string;
} {
  if (!text) return {};
  const norm = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();

  let arrivalTime: string | undefined;
  let departureTime: string | undefined;

  // Arrival pattern: hạ cánh / đến / tới / check-in / có mặt / đáp / bay đến (hỗ trợ 14:00, 14h, 2 giờ chiều...)
  const arrivalMatch = norm.match(
    /(?:den|ha\s*canh|toi|check-?in|co\s*mat|dap|bay\s*den)[^0-9\n]{0,45}(\d{1,2})\s*(?:gio|h|:|g)\s*(\d{1,2})?\s*(sang|trua|chieu|toi|dem)?/i
  );
  if (arrivalMatch) {
    let hourNum = parseInt(arrivalMatch[1], 10);
    const minNum = arrivalMatch[2] ? parseInt(arrivalMatch[2], 10) : 0;
    const period = arrivalMatch[3];
    if (period && (period === 'chieu' || period === 'toi') && hourNum < 12) {
      hourNum += 12;
    } else if (period === 'trua' && hourNum >= 1 && hourNum <= 3) {
      hourNum += 12;
    }
    if (hourNum >= 0 && hourNum <= 23 && minNum >= 0 && minNum <= 59) {
      arrivalTime = `${String(hourNum).padStart(2, '0')}:${String(minNum).padStart(2, '0')}`;
    }
  } else if (/(?:den|ha\s*canh|toi|bay\s*den)[^.\n]{0,25}buoi\s*chieu/i.test(norm)) {
    arrivalTime = '14:00';
  } else if (/(?:den|ha\s*canh|toi|bay\s*den)[^.\n]{0,25}buoi\s*toi/i.test(norm)) {
    arrivalTime = '19:30';
  }

  // Departure pattern: về / rời / bay về / khởi hành về / trả phòng / check-out / rời khỏi
  const departureMatch = norm.match(
    /(?:ve|roi|bay\s*ve|khoi\s*hanh\s*ve|tra\s*phong|check-?out|roi\s*khoi|ra\s*san\s*bay)[^0-9\n]{0,45}(\d{1,2})\s*(?:gio|h|:|g)\s*(\d{1,2})?\s*(sang|trua|chieu|toi|dem)?/i
  );
  if (departureMatch) {
    let hourNum = parseInt(departureMatch[1], 10);
    const minNum = departureMatch[2] ? parseInt(departureMatch[2], 10) : 0;
    const period = departureMatch[3];
    if (period && (period === 'chieu' || period === 'toi') && hourNum < 12) {
      hourNum += 12;
    } else if (period === 'trua' && hourNum >= 1 && hourNum <= 3) {
      hourNum += 12;
    }
    if (hourNum >= 0 && hourNum <= 23 && minNum >= 0 && minNum <= 59) {
      departureTime = `${String(hourNum).padStart(2, '0')}:${String(minNum).padStart(2, '0')}`;
    }
  } else if (/(?:bay\s*ve|khoi\s*hanh\s*ve|roi\s*di)[^.\n]{0,25}buoi\s*sang/i.test(norm)) {
    departureTime = '11:00';
  }

  const hasElderly = /nguoi\s*lon\s*tuoi|nguoi\s*gia|ong\s*ba|bo\s*me|cha\s*me|cao\s*tuoi|phu\s*huynh/.test(norm);
  const hasChildren = /tre\s*em|tre\s*nho|em\s*be|con\s*nho|gia\s*dinh\s*co\s*be/.test(norm);

  let pace: string | undefined;
  if (norm.includes('thu tha') || norm.includes('thong tha') || norm.includes('nghi duong') || norm.includes('cham rai') || norm.includes('nhe nhang') || hasElderly || hasChildren) {
    pace = 'RELAXED';
  } else if (norm.includes('day') || norm.includes('nhieu noi') || norm.includes('toi da') || norm.includes('check-in het') || norm.includes('lien tuc')) {
    pace = 'PACKED';
  }

  let travelMode: string | undefined;
  if (norm.includes('xe may') || norm.includes('phuot') || norm.includes('xe ga') || norm.includes('motorbike')) {
    travelMode = 'MOTORBIKE';
  } else if (norm.includes('di bo') || norm.includes('tan bo') || norm.includes('walking')) {
    travelMode = 'WALKING';
  } else if (hasElderly || hasChildren) {
    travelMode = 'DRIVING';
  }

  let dietaryPreference: string | undefined;
  if (norm.includes('chay')) dietaryPreference = 'Ăn chay thanh đạm';
  else if (norm.includes('hai san')) dietaryPreference = 'Hải sản tươi sống';

  return { arrivalTime, departureTime, pace, travelMode, hasElderly, hasChildren, dietaryPreference };
}

function generateWittyDayRationale(dayNum: number, dest: string, title?: string): string {
  const wittyLines: Record<number, string[]> = {
    1: [
      `Khởi động Ngày 1 tại ${dest}: Hạ cánh êm ái, đừng vội vã chạy show kẻo sập nguồn! Sáng thong thả check-in sống ảo, trưa 'chiến' ngay đặc sản trứ danh no căng rốn. Chiều tối ra phố hóng gió ngắm cảnh lung linh. Nhớ sạc đầy pin điện thoại kẻo hối hận không kịp nha!`,
      `Chào sân ${dest} thật hoành tráng! Lộ trình hôm nay ưu tiên làm quen nhịp sống, check-in nhận phòng thảnh thơi rồi ghé ngay những điểm biểu tượng. Đừng quên nạp năng lượng bằng món ngon bản địa kẻo bụng réo sôi sục nha!`,
    ],
    2: [
      `Ngày 2 bung lụa hết nấc tại ${dest}: Hôm nay AI xếp toàn điểm 'đinh' siêu phẩm! Sáng dậy sớm tí hít thở khí trời trong lành, trưa 'chén' no nê để chiều oanh tạc các khu danh thắng kỳ vĩ. Lên đồ rực rỡ để có bộ ảnh triệu like khoe người yêu cũ nào!`,
      `Tâm điểm của chuyến đi là hôm nay! Cung đường được tính toán gọn gàng theo trục thuận tiện không sợ quay đầu xe hay say xe. Tận hưởng trọn vẹn cảnh đẹp và không gian tuyệt vời tại ${dest}, nhớ mang theo nón và chiếc bụng đói nhé!`,
    ],
    3: [
      `Ngày 3 - kết màn trọn vẹn: Thong thả ghé chợ hoặc phố đặc sản mua quà cho mẹ, cho sếp và hội bạn thân để không bị giận! Ghé quán cà phê chill ngắm cảnh nhìn lại chuyến đi đầy ắp tiếng cười. Chuyến đi 10 điểm không có nhưng!`,
      `Khép lại hành trình ${dest} với những trải nghiệm lắng đọng: Sáng đi dạo danh lam thanh tịnh, trưa thưởng thức món ngon gia truyền rồi rẽ qua sắm đặc sản làm quà. Vừa vui vừa không lo bị viêm màng túi!`,
    ],
  };

  const pool = wittyLines[dayNum] || [
    `Ngày ${dayNum} khám phá ${dest}: Lịch trình được sắp xếp cực mượt mà theo một đường thẳng! Bạn chỉ việc xúng xính váy áo và giữ tinh thần hứng khởi, cả thế giới cảnh đẹp và đồ ăn ngon cứ để AI lo!`,
  ];
  return pool[(dayNum - 1) % pool.length];
}

function formatVietnameseDateStr(startDateIso: string, dayOffset: number): string {
  try {
    const [y, m, d] = (startDateIso || getTodayIso()).split('-').map(Number);
    const curDate = new Date(y, m - 1, d + dayOffset);
    const dayOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][curDate.getDay()];
    const dd = String(curDate.getDate()).padStart(2, '0');
    const mm = String(curDate.getMonth() + 1).padStart(2, '0');
    return `${dayOfWeek}, ${dd}/${mm}`;
  } catch {
    return `Ngày ${dayOffset + 1}`;
  }
}

function pickAuthenticPlacePhoto(
  preferredUrl: string | undefined | null,
  places: RealPlace[],
  indexSeed: number,
  provinceFallback: string
): string {
  const isGenuine = (url?: string | null): url is string =>
    Boolean(url && !url.includes('unsplash.com') && !url.includes('location_map.svg'));
  if (isGenuine(preferredUrl)) return preferredUrl;
  const realPool = places.filter((p) => isGenuine(p.image));
  if (realPool.length > 0) {
    return realPool[Math.abs(indexSeed) % realPool.length].image;
  }
  return provinceFallback;
}

function generateDistinctDayPlan(
  destName: string,
  totalDays: number,
  isLateDeparture: boolean,
  budgetTier: string,
  interests: string[],
  baseLat: number,
  baseLng: number,
  photoUrl: string,
  arrivalTime?: string,
  departureTime?: string,
  hasElderly?: boolean,
  startDateIso?: string
): DayPlan[] {
  const rawPlaces = getRealPlacesByProvince(destName);
  // Nếu đoàn có người lớn tuổi, ưu tiên lọc bỏ các điểm leo núi/hang động dốc cao
  const realPlaces = hasElderly
    ? rawPlaces.filter((p) => !/đỉnh|đèo|hang|động|thác|leo|ngũ hành sơn/i.test(p.name))
    : rawPlaces;
  const effectivePlaces = realPlaces.length >= 4 ? realPlaces : rawPlaces;
  const days: DayPlan[] = [];

  // Categorize real places to pick smart daily slots
  const landmarks = effectivePlaces.filter((p) =>
    /di tích|lịch sử|thắng cảnh|kiến trúc|tâm linh|văn hóa|khám phá|bảo tàng/i.test(p.category)
  );
  const culinary = effectivePlaces.filter((p) =>
    /ẩm thực|chợ|quán|đặc sản|mua sắm/i.test(p.category) || /chợ|ẩm thực|quán|bún|cơm|bánh/i.test(p.name)
  );
  const natureCraft = effectivePlaces.filter((p) =>
    /thiên nhiên|sinh thái|làng|nghỉ dưỡng|check-in|ngắm cảnh|phượt|biển/i.test(p.category)
  );
  const eveningSpots = effectivePlaces.filter((p) =>
    /cầu|sông|đêm|phố|thuyền|biển/i.test(p.category) || /cầu|sông|đêm|phố|chợ|hồ/i.test(p.name)
  );

  const fallbackList = realPlaces.length > 0 ? realPlaces : [
    {
      name: `Khu di tích danh thắng ${destName}`,
      province: destName,
      category: 'Di tích & Thắng cảnh',
      latitude: baseLat,
      longitude: baseLng,
      priceMin: 50000,
      priceMax: 100000,
      openingHours: '07:30 - 17:30',
      description: `Điểm đến di sản tiêu biểu tại ${destName}, nơi lưu giữ nét đẹp văn hóa và cảnh quan thiên nhiên.`,
      image: photoUrl,
    }
  ];

  const pickPlace = (list: typeof realPlaces, index: number) => {
    if (list.length > 0) {
      return list[index % list.length];
    }
    return fallbackList[index % fallbackList.length];
  };

  const dayThemes = [
    'Chạm ngõ & Khám phá biểu tượng di sản',
    'Trải nghiệm điểm nhấn & Kỳ quan nổi tiếng',
    'Di sản làng nghề & Bản sắc truyền thống',
    'Thiên nhiên sinh thái & Khám phá phong cảnh',
    'Khép lại hành trình & Kỷ niệm trọn vẹn',
  ];

  for (let d = 1; d <= totalDays; d++) {
    const dayNumber = d;
    const themeIndex = (d - 1) % dayThemes.length;
    const title = `Ngày ${d} · ${dayThemes[themeIndex]}`;
    let activities: Activity[] = [];

    // T1: If Day 1 and Late Evening Departure (>= 20:00)
    if (d === 1 && isLateDeparture) {
      const nightPlace = eveningSpots.length > 0 ? eveningSpots[0] : (culinary[0] || fallbackList[0]);
      const nCost = nightPlace.priceMin || 120000;
      activities = [
        {
          id: `act-${d}-late-1`,
          timeSlot: 'EVENING',
          timeRange: '20:30–21:30',
          category: 'Nhận phòng & Nghỉ ngơi',
          title: `Nhận phòng khách sạn & Nghỉ ngơi sau chuyến đi`,
          description: `Check-in tại khách sạn trung tâm ${destName}, sắp xếp hành lý và thư giãn nhẹ nhàng sau thời gian di chuyển.`,
          location: `Khách sạn trung tâm ${destName}`,
          costVnd: 0,
          costLabel: 'Đã bao gồm',
          photoUrl: photoUrl || 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_day.jpg',
          transferTimeAfter: 'Di chuyển khoảng 10 phút',
          latitude: baseLat,
          longitude: baseLng,
        },
        {
          id: `act-${d}-late-2`,
          timeSlot: 'NIGHT',
          timeRange: '21:45–23:15',
          category: nightPlace.category || 'Ăn khuya & Dạo phố đêm',
          title: nightPlace.name,
          description: nightPlace.description || `Thưởng thức ẩm thực đêm và dạo bộ tận hưởng nhịp sống về đêm của ${destName}.`,
          location: `${nightPlace.name}, ${destName}`,
          costVnd: nCost,
          costLabel: nCost === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(nCost)}đ / nhóm`,
          tip: 'Các hoạt động buổi tối thường kéo dài đến 23h30, không khí rất dễ chịu và mát mẻ.',
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_night.jpg',
          latitude: nightPlace.latitude || baseLat + 0.005,
          longitude: nightPlace.longitude || baseLng + 0.005,
        },
      ];
    } else {
      const morningPlace = pickPlace(landmarks.length > 0 ? landmarks : realPlaces, (d - 1) * 2);
      const noonPlace = pickPlace(culinary.length > 0 ? culinary : realPlaces, d - 1);
      const afternoonPlace = pickPlace(natureCraft.length > 0 ? natureCraft : realPlaces, (d - 1) * 2 + 1);
      const eveningPlace = pickPlace(eveningSpots.length > 0 ? eveningSpots : realPlaces, d);

      const mCost = morningPlace.priceMin || (budgetTier === 'luxury' ? 250000 : 80000);
      const isNoonChe = noonPlace.name.toLowerCase().includes('chè') || noonPlace.name.toLowerCase().includes('che ');
      const nCost = isNoonChe ? (noonPlace.priceMin || 16000) : (noonPlace.priceMin || 150000);
      const aCost = afternoonPlace.priceMin || 60000;
      const eCost = eveningPlace.priceMin || 120000;

      activities = [
        {
          id: `act-${d}-1`,
          timeSlot: 'MORNING',
          timeRange: '08:00–10:30',
          category: morningPlace.category,
          title: morningPlace.name,
          description: morningPlace.description,
          location: `${morningPlace.name}, ${destName}`,
          costVnd: mCost,
          costLabel: mCost === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(mCost)}đ / người`,
          tip: 'Nên khởi hành sớm vào buổi sáng để tận hưởng ánh sáng đẹp và không khí trong lành.',
          photoUrl: photoUrl || 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
          transferTimeAfter: 'Di chuyển khoảng 15 phút',
          latitude: morningPlace.latitude,
          longitude: morningPlace.longitude,
        },
        {
          id: `act-${d}-2`,
          timeSlot: 'NOON',
          timeRange: '11:30–13:00',
          category: noonPlace.category || 'Ẩm thực bản địa',
          title: noonPlace.name.includes('Chợ') || noonPlace.name.includes('Ẩm thực') || noonPlace.name.includes('Thưởng thức') ? noonPlace.name : `Thưởng thức đặc sản tại ${noonPlace.name}`,
          description: isNoonChe ? 'Thưởng thức các loại chè đặc sản nức tiếng thanh mát, ngọt dịu (giá chỉ từ 12.000đ – 20.000đ/ly).' : noonPlace.description,
          location: `${noonPlace.name}, ${destName}`,
          costVnd: nCost,
          costLabel: isNoonChe ? `~${new Intl.NumberFormat('vi-VN').format(nCost)}đ (12k–20k/ly)` : `${new Intl.NumberFormat('vi-VN').format(nCost)}đ / nhóm`,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_south_day.jpg',
          transferTimeAfter: 'Di chuyển khoảng 15 phút',
          latitude: noonPlace.latitude,
          longitude: noonPlace.longitude,
        },
        {
          id: `act-${d}-3`,
          timeSlot: 'AFTERNOON',
          timeRange: '14:30–17:00',
          category: afternoonPlace.category,
          title: afternoonPlace.name,
          description: afternoonPlace.description,
          location: `${afternoonPlace.name}, ${destName}`,
          costVnd: aCost,
          costLabel: aCost === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(aCost)}đ / người`,
          tip: 'Không gian lý tưởng để chụp ảnh lưu niệm và tìm hiểu văn hóa bản xứ.',
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/tay_nguyen_highlands.jpg',
          transferTimeAfter: 'Di chuyển khoảng 20 phút',
          latitude: afternoonPlace.latitude,
          longitude: afternoonPlace.longitude,
        },
        {
          id: `act-${d}-4`,
          timeSlot: 'EVENING',
          timeRange: '18:30–21:00',
          category: eveningPlace.category || 'Cảnh quan & Phố đêm',
          title: eveningPlace.name,
          description: eveningPlace.description,
          location: `${eveningPlace.name}, ${destName}`,
          costVnd: eCost,
          costLabel: eCost === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(eCost)}đ / nhóm`,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_night.jpg',
          latitude: eveningPlace.latitude,
          longitude: eveningPlace.longitude,
        },
      ];

      // Ràng buộc thời gian Ngày 1 (Hạ cánh muộn -> bỏ sáng/trưa)
      if (d === 1 && arrivalTime) {
        const arrH = parseInt(arrivalTime.split(':')[0], 10);
        if (arrH >= 12) {
          activities = activities.filter((a) => a.timeSlot === 'AFTERNOON' || a.timeSlot === 'EVENING');
        } else if (arrH >= 10) {
          activities = activities.filter((a) => a.timeSlot !== 'MORNING');
        }
      }

      // Ràng buộc thời gian Ngày cuối (Bay về sớm -> bỏ chiều/tối)
      if (d === totalDays && departureTime) {
        const depH = parseInt(departureTime.split(':')[0], 10);
        if (depH <= 12) {
          activities = activities.filter((a) => a.timeSlot === 'MORNING');
        } else if (depH <= 17) {
          activities = activities.filter((a) => a.timeSlot === 'MORNING' || a.timeSlot === 'NOON');
        } else if (depH < 20) {
          activities = activities.filter((a) => a.timeSlot !== 'EVENING');
        }
      }
    }

    days.push({
      dayNumber,
      dateStr: formatVietnameseDateStr(startDateIso || getTodayIso(), d - 1),
      title,
      dayRationale: generateWittyDayRationale(d, destName, title),
      activities,
    });
  }

  return days;
}


function getDestinationTagline(dest: string): string {
  const norm = (dest || '').toLowerCase();
  if (norm.includes('hà nội') || norm.includes('hanoi')) {
    return 'Nghìn năm văn hiến, 36 phố phường rêu phong và tinh hoa ẩm thực Tràng An.';
  }
  if (norm.includes('hồ chí minh') || norm.includes('sài gòn') || norm.includes('saigon')) {
    return 'Đô thị năng động, nhịp sống sầm uất và thiên đường ẩm thực đa sắc màu.';
  }
  if (norm.includes('huế') || norm.includes('hue')) {
    return 'Cố đô trầm mặc, di sản cung đình vàng son và nét thi vị sông Hương.';
  }
  if (norm.includes('hội an') || norm.includes('quảng nam')) {
    return 'Phố cổ đèn lồng rực rỡ, kiến trúc hoài niệm và ẩm thực đậm đà xứ Quảng.';
  }
  if (norm.includes('phú quốc')) {
    return 'Đảo ngọc thiên đường, bãi biển cát trắng mịn và hoàng hôn lộng lẫy.';
  }
  if (norm.includes('hà giang')) {
    return 'Hùng vĩ cao nguyên đá Đồng Văn, đèo Mã Pí Lèng và sắc hoa tam giác mạch.';
  }
  if (norm.includes('đà lạt')) {
    return 'Thành phố ngàn hoa, đồi thông thơ mộng và khí hậu se lạnh quanh năm.';
  }
  if (norm.includes('nha trang') || norm.includes('khánh hòa')) {
    return 'Vịnh biển trong xanh, bãi cát trắng trải dài và hải sản tươi ngon.';
  }
  return 'Biển xanh cát trắng, ẩm thực phong phú và muôn vàn trải nghiệm thú vị.';
}

export default function PlannerPage() {
  const router = useRouter();

  // Workflow View states
  const [activeView, setActiveView] = useState<'timeline' | 'map'>('timeline');
  const [activeMainTab, setActiveMainTab] = useState<'timeline' | 'map' | 'budget' | 'checklist'>('timeline');
  const [checkedListItems, setCheckedListItems] = useState<Record<string, boolean>>({
    chk1: true,
    chk2: true,
  });
  const toggleChecklistItem = (id: string) => {
    setCheckedListItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [hasPlanGenerated, setHasPlanGenerated] = useState<boolean>(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [planHistoryList, setPlanHistoryList] = useState<PlanHistoryRecord[]>([]);

  useEffect(() => {
    setPlanHistoryList(getPlanHistory());
  }, []);
  const [aiGenerationMetadata, setAiGenerationMetadata] = useState<AiGenerationMetadata>({
    provider: 'offline',
    fallbackUsed: true,
  });

  // Signal indicator mode: GREEN for API Key, PINK for fallback/deterministic mechanism
  const isApiKeyMode = useMemo(() => {
    return (
      !aiGenerationMetadata.fallbackUsed &&
      (aiGenerationMetadata.provider === 'local' ||
        aiGenerationMetadata.provider === 'gemini' ||
        aiGenerationMetadata.provider === 'claude')
    );
  }, [aiGenerationMetadata]);
  const [aiCitations, setAiCitations] = useState<AiCitation[]>([]);
  const [aiCustomInsights, setAiCustomInsights] = useState<{
    weather?: string;
    pacing?: string;
    advice?: string;
    strategic?: string;
    companionFit?: string;
    budgetOptimization?: string;
  }>({});

  // Preference Form Inputs
  const [destination, setDestination] = useState<string>('Đà Nẵng');
  const [planWarnings, setPlanWarnings] = useState<string[]>([]);

  const changeDestination = (newDest: string) => {
    const trimmed = (newDest || '').trim();
    if (!trimmed) return;
    setDestination(trimmed);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('vista_selected_province', trimmed);
        setTimeout(() => {
          try {
            const url = new URL(window.location.href);
            url.searchParams.set('dest', trimmed);
            window.history.replaceState({}, '', url.toString());
          } catch {
            // ignore
          }
        }, 0);
      } catch (e) {
        console.warn('Failed to update URL and storage:', e);
      }
    }
  };
  const [destSearchQuery, setDestSearchQuery] = useState<string>('');
  const [showDestDropdown, setShowDestDropdown] = useState<boolean>(false);
  const destDropdownRef = useRef<HTMLDivElement>(null);

  // Close destination dropdown when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (destDropdownRef.current && !destDropdownRef.current.contains(event.target as Node)) {
        setShowDestDropdown(false);
        setDestSearchQuery('');
      }
    };
    if (showDestDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showDestDropdown]);
  const [startDate, setStartDate] = useState<string>(getTodayIso());
  const startDateInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDatePicker = () => {
    if (startDateInputRef.current) {
      if (typeof startDateInputRef.current.showPicker === 'function') {
        try {
          startDateInputRef.current.showPicker();
        } catch {
          startDateInputRef.current.focus();
        }
      } else {
        startDateInputRef.current.focus();
      }
    }
  };
  const [duration, setDuration] = useState<string>('3n2d');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['beach', 'cuisine']);
  const [showAllStyles, setShowAllStyles] = useState<boolean>(false);

  // Balanced styles: show top 6 by default, plus any item user currently selected
  const displayedStyles = useMemo(() => {
    if (showAllStyles) return TRAVEL_STYLES;
    return TRAVEL_STYLES.filter((st, idx) => idx < 6 || selectedStyles.includes(st.id));
  }, [showAllStyles, selectedStyles]);
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [budgetTier, setBudgetTier] = useState<string>('standard');
  const [showWishes, setShowWishes] = useState<boolean>(false);
  const [wishesText, setWishesText] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // T1: Check if departure date is today and local time >= 20:00 (8:00 PM)
  const isLateEveningDeparture = useMemo(() => {
    if (!isHydrated) return false;
    if (startDate === getTodayIso()) {
      const currentHour = new Date().getHours();
      return currentHour >= 20;
    }
    return false;
  }, [isHydrated, startDate]);

  // Visual Departure Date Display (Day of week, stamp, relative days)
  const departureDateInfo = useMemo(() => {
    if (!startDate) {
      return {
        dayOfWeek: 'Thứ Sáu',
        shortDayOfWeek: 'T6',
        dayNumber: '11',
        monthYear: 'tháng 12, 2026',
        relativeText: '',
      };
    }
    try {
      const parts = startDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        const dayIndex = d.getDay();
        const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const shortWeekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const dayOfWeek = weekdays[dayIndex] || 'Thứ Sáu';
        const shortDayOfWeek = shortWeekdays[dayIndex] || 'T6';
        const dayNumber = String(day).padStart(2, '0');
        const monthYear = `tháng ${month + 1}, ${year}`;

        let relativeText = '';
        const todayIso = getTodayIso();
        const tomorrowIso = getFutureDateIso(1);
        if (startDate === todayIso) {
          relativeText = 'Hôm nay';
        } else if (startDate === tomorrowIso) {
          relativeText = 'Ngày mai';
        } else {
          const todayD = new Date();
          todayD.setHours(0, 0, 0, 0);
          const diffDays = Math.round((d.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            relativeText = `Sau ${diffDays} ngày`;
          }
        }

        return { dayOfWeek, shortDayOfWeek, dayNumber, monthYear, relativeText };
      }
    } catch {
      // fallback
    }
    return {
      dayOfWeek: 'Thứ Sáu',
      shortDayOfWeek: 'T6',
      dayNumber: '11',
      monthYear: 'tháng 12, 2026',
      relativeText: '',
    };
  }, [startDate]);

  // Active Itinerary Data
  const [itineraryDays, setItineraryDays] = useState<DayPlan[]>([]);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [detectedArrivalTime, setDetectedArrivalTime] = useState<string | null>(null);
  const [detectedDepartureTime, setDetectedDepartureTime] = useState<string | null>(null);
  const [detectedElderly, setDetectedElderly] = useState<boolean>(false);
  const [detectedChildren, setDetectedChildren] = useState<boolean>(false);
  const [coPilotInput, setCoPilotInput] = useState<string>('');
  const [coPilotReply, setCoPilotReply] = useState<string | null>(null);
  const [coPilotInsiderTip, setCoPilotInsiderTip] = useState<string | null>(null);
  const [coPilotProactive, setCoPilotProactive] = useState<string | null>(null);
  const [coPilotSuggestions, setCoPilotSuggestions] = useState<RealPlace[]>([]);
  const [isCoPilotBusy, setIsCoPilotBusy] = useState<boolean>(false);
  const [showTripDna, setShowTripDna] = useState<boolean>(false);
  const [showAiInsights, setShowAiInsights] = useState<boolean>(false);
  const [showCoPilot, setShowCoPilot] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedItinerariesList, setSavedItinerariesList] = useState<SavedItineraryRecord[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);

  const reloadSavedItineraries = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('vista_saved_itineraries');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSavedItinerariesList(parsed);
            setSavedCount(parsed.length);
            return;
          }
        }
      } catch {
        // ignore
      }
      setSavedItinerariesList([]);
      setSavedCount(0);
    }
  };

  useEffect(() => {
    reloadSavedItineraries();
  }, []);

  const openSavedDrawer = () => {
    reloadSavedItineraries();
    setShowSavedDrawer(true);
  };
  const [openTipId, setOpenTipId] = useState<string | null>('act-1-1');
  const [activeOverflowId, setActiveOverflowId] = useState<string | null>(null);

  // Overlays
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState<boolean>(false);
  const [customBudgetRates, setCustomBudgetRates] = useState<{
    roomRatePerNight?: number | null;
    roomsNeeded?: number | null;
    diningPerPersonDay?: number | null;
    dailyVehicleRate?: number | null;
    totalActPerPerson?: number | null;
  }>({});
  const [editingBudgetKey, setEditingBudgetKey] = useState<'activities' | 'dining' | 'transit' | 'lodging' | null>(null);
  const [showCreateTripModal, setShowCreateTripModal] = useState<boolean>(false);
  const [showSavedDrawer, setShowSavedDrawer] = useState<boolean>(false);
  const [replaceTargetActivityId, setReplaceTargetActivityId] = useState<string | null>(null);
  const [replaceSearchQuery, setReplaceSearchQuery] = useState<string>('');
  const [replaceBatchIndex, setReplaceBatchIndex] = useState<number>(0);
  const [showAddActivityModal, setShowAddActivityModal] = useState<boolean>(false);
  const [selectedMapPin, setSelectedMapPin] = useState<number>(1);
  const [mapFocusPinTrigger, setMapFocusPinTrigger] = useState<number>(0);
  const [mapViewMode, setMapViewMode] = useState<'day' | 'all'>('day');
  const [dayRouteGeometries, setDayRouteGeometries] = useState<Record<number, { lat: number; lng: number }[]>>({});
  const [dayRouteLegs, setDayRouteLegs] = useState<Record<number, { distanceKm: number; durationMin: number }[]>>({});
  const [mapTravelMode, setMapTravelMode] = useState<'DRIVING' | 'MOTORBIKE' | 'WALKING'>('DRIVING');

  // Section 9.1 — Internal Plan Source Signal & Admin Inspection Mode
  const [hasAdminInspectPermission, setHasAdminInspectPermission] = useState<boolean>(false);
  const [adminInspectMode, setAdminInspectMode] = useState<boolean>(false);
  const [showSourcePopover, setShowSourcePopover] = useState<boolean>(false);
  const [internalDiagnostics, setInternalDiagnostics] = useState<Record<string, any> | null>(null);

  // Workbench interactive state: Pace, Replan Diff banner & Undo history
  const [activePace, setActivePace] = useState<'RELAXED' | 'MODERATE' | 'INTENSIVE'>('MODERATE');
  const [replanDiff, setReplanDiff] = useState<Record<string, any> | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<{ days: DayPlan[]; totalCost: number; diff: any } | null>(null);
  const [isReplanLoading, setIsReplanLoading] = useState<boolean>(false);
  const [planConflicts, setPlanConflicts] = useState<Record<string, any>[]>([]);
  const [aiThinkingStep, setAiThinkingStep] = useState<number>(0);
  const [rejectedDestinationIds, setRejectedDestinationIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const isInspectQuery = params.get('inspect') === '1' || params.get('admin') === '1';
    const isAdminRole =
      localStorage.getItem('vista_user_role') === 'ADMIN' ||
      localStorage.getItem('vista_admin_inspect_allowed') === '1' ||
      isInspectQuery;
    if (isAdminRole) {
      setHasAdminInspectPermission(true);
      if (isInspectQuery || localStorage.getItem('vista_admin_inspect_mode') === '1') {
        setAdminInspectMode(true);
      }
    }
  }, []);

  // Modal form states
  const [newTripTitle, setNewTripTitle] = useState<string>('Chuyến đi Đà Nẵng 3N2Đ');
  const [newTripVisibility, setNewTripVisibility] = useState<string>('private');
  const [newActTitle, setNewActTitle] = useState<string>('');
  const [newActCategory, setNewActCategory] = useState<string>('Tham quan');
  const [newActTime, setNewActTime] = useState<string>('14:00–15:30');
  const [newActCost, setNewActCost] = useState<string>('0');
  const [addActMode, setAddActMode] = useState<'suggested' | 'custom'>('suggested');
  const [addActSearchQuery, setAddActSearchQuery] = useState<string>('');
  const [addActCategoryFilter, setAddActCategoryFilter] = useState<string>('all');
  const [selectedSuggestedPlace, setSelectedSuggestedPlace] = useState<RealPlace | null>(null);
  const [showActAutocomplete, setShowActAutocomplete] = useState<boolean>(false);

  // AI Smart Prompt Natural Language Intent Parsing
  const [smartPromptText, setSmartPromptText] = useState<string>('');
  const [isParsingSmartPrompt, setIsParsingSmartPrompt] = useState<boolean>(false);

  const isAiBusy = isGenerating || isParsingSmartPrompt || isReplanLoading || isCoPilotBusy;

  useEffect(() => {
    if (!isAiBusy) {
      setAiThinkingStep(0);
      return;
    }
    setAiThinkingStep(0);
    const timer = setInterval(() => {
      setAiThinkingStep((prev) => (prev < 3 ? prev + 1 : 3));
    }, 340);
    return () => clearInterval(timer);
  }, [isAiBusy]);

  const SMART_PROMPT_PRESETS = [
    {
      icon: '🌊',
      label: 'Đà Nẵng 3N2Đ: Cặp đôi, hải sản & hoàng hôn biển',
      text: 'Cặp đôi đi Đà Nẵng 3 ngày 2 đêm, thích ăn hải sản, check-in view biển và ngắm hoàng hôn, ngân sách vừa phải',
    },
    {
      icon: '🏯',
      label: 'Huế 2N1Đ: Có người lớn tuổi, nhịp độ thong thả',
      text: 'Gia đình có bố mẹ 68 tuổi đi Huế 2 ngày 1 đêm, nhịp độ thong thả không leo trèo, thích ngắm sông Hương và di tích',
    },
    {
      icon: '🏖️',
      label: 'Phú Quốc 4N3Đ: Luxury, có trẻ nhỏ & safari',
      text: 'Gia đình có 2 bé nhỏ đi Phú Quốc 4 ngày luxury, thích đi safari, bãi biển cát trắng, ẩm thực phong phú',
    },
    {
      icon: '☕',
      label: 'Hà Nội 1 ngày: Đáp 11:30 về 20:00, phố cổ & cafe',
      text: 'Đi công tác kết hợp du lịch Hà Nội 1 ngày, đáp lúc 11:30 về lúc 20:00, muốn dạo phố cổ và thưởng thức cà phê trứng',
    },
  ];

  // Linked Trip State (Bidirectional Connection with /trips)
  const [linkedTripId, setLinkedTripId] = useState<string | null>(null);
  const [linkedTripTitle, setLinkedTripTitle] = useState<string | null>(null);
  const isLoadedRef = useRef(false);

  // ─── HERO CAROUSEL & SUGGESTED TEMPLATES (EMPTY STATE DESIGN) ──────────────
  const [heroIndex, setHeroIndex] = useState<number>(0);

  const HERO_FEATURED = useMemo(
    () => [
      {
        province: 'Đà Nẵng',
        countryTag: 'Việt Nam',
        title: 'Đà Nẵng',
        subtitle: 'đang chờ bạn khám phá',
        image:
          'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_golden_bridge.jpg',
      },
      {
        province: 'Hà Nội',
        countryTag: 'Việt Nam',
        title: 'Hà Nội',
        subtitle: 'nghìn năm văn hiến',
        image:
          'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hanoi_real.jpg',
      },
      {
        province: 'Phú Quốc',
        countryTag: 'Việt Nam',
        title: 'Phú Quốc',
        subtitle: 'thiên đường biển ngọc',
        image:
          'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/phuquoc_beach.jpg',
      },
      {
        province: 'Hội An',
        countryTag: 'Việt Nam',
        title: 'Hội An',
        subtitle: 'phố cổ đèn lồng lung linh',
        image:
          'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hoian_ancient_town.jpg',
      },
      {
        province: 'Nha Trang (Khánh Hòa)',
        countryTag: 'Việt Nam',
        title: 'Nha Trang',
        subtitle: 'Nhà thờ Núi · Chùa Long Sơn · Biển đảo & đặc sản vịnh ngọc',
        image:
          'https://statics.vinpearl.com/nha%20tho%20da%2C%20nha%20tho%20nui%20nha%20trang_1681984462.jpg',
      },
      {
        province: 'Đà Lạt (Lâm Đồng)',
        countryTag: 'Việt Nam',
        title: 'Đà Lạt',
        subtitle: 'Đồi chè Cầu Đất · Hồ Tuyền Lâm · Rừng thông sương mờ',
        image:
          'https://statics.vinpearl.com/doi-che-cau-dat-01_1688736872.jpg',
      },
      {
        province: 'Thừa Thiên Huế',
        countryTag: 'Việt Nam',
        title: 'Cố đô Huế',
        subtitle: 'Đại Nội · Chùa Thiên Mụ · Lăng Khải Định & Vịnh Lăng Cô',
        image:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/C%E1%BB%95ng_Ng%E1%BB%8D_M%C3%B4n_Hu%E1%BA%BF.jpg/800px-C%E1%BB%95ng_Ng%E1%BB%8D_M%C3%B4n_Hu%E1%BA%BF.jpg',
      },
      {
        province: 'Sa Pa',
        countryTag: 'Việt Nam',
        title: 'Sa Pa',
        subtitle: 'Đỉnh Fansipan · Bản Cát Cát · Sương mờ miền sơn cước',
        image:
          'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/sapa_real.jpg',
      },
    ],
    []
  );

  // Active destination object
  const activeDestObj = useMemo(() => {
    return DESTINATION_LIST.find((d) => d.nameVi === destination || d.province === destination) || DESTINATION_LIST[0];
  }, [destination]);

  // Clean, short destination name without verbose province parenthesis (e.g. "Đà Lạt (Lâm Đồng)" -> "Đà Lạt")
  const cleanDestName = useMemo(() => {
    return destination.replace(/\s*\(.*?\)\s*/g, '').trim() || destination;
  }, [destination]);

  // Verified local landmarks for active destination (with real non-generic photos first)
  const provinceRealPlaces = useMemo(() => {
    const raw = getRealPlacesByProvince(destination);
    return raw.filter(
      (p) => p.image && !p.image.includes('location_map.svg') && !p.image.includes('relief_location_map.svg')
    );
  }, [destination]);

  const activeHero = useMemo(() => {
    if (heroIndex !== 0) return HERO_FEATURED[heroIndex % HERO_FEATURED.length];
    const found = HERO_FEATURED.find(
      (h) =>
        h.province.toLowerCase() === destination.toLowerCase() ||
        destination.toLowerCase().includes(h.province.toLowerCase())
    );
    if (found) return found;

    const sightHighlights = provinceRealPlaces
      .filter((p) => !p.category.toLowerCase().includes('ẩm thực') && !p.image.includes('unsplash.com'))
      .slice(0, 3);
    const fallbackHeroImg =
      sightHighlights[0]?.image ||
      provinceRealPlaces.find((p) => !p.image.includes('unsplash.com'))?.image ||
      activeDestObj.photo;
    const highlightNames = provinceRealPlaces.slice(0, 3).map((p) => p.name);
    const dynamicSubtitle =
      highlightNames.length >= 2
        ? `Khám phá ${highlightNames.join(' · ')}`
        : 'Hành trình bản địa chọn lọc đang chờ bạn khám phá';

    return {
      province: destination,
      countryTag: 'Việt Nam',
      title: cleanDestName,
      subtitle: dynamicSubtitle,
      image: fallbackHeroImg,
    };
  }, [destination, cleanDestName, heroIndex, HERO_FEATURED, activeDestObj, provinceRealPlaces]);

  const handleNextHero = () => {
    const next = (heroIndex + 1) % HERO_FEATURED.length;
    setHeroIndex(next);
    changeDestination(HERO_FEATURED[next].province);
  };

  const handlePrevHero = () => {
    const prev = (heroIndex - 1 + HERO_FEATURED.length) % HERO_FEATURED.length;
    setHeroIndex(prev);
    changeDestination(HERO_FEATURED[prev].province);
  };

  // Realtime Weather from Open-Meteo API
  const [realtimeWeather, setRealtimeWeather] = useState<RealtimeWeather | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadRealtimeWeather = async () => {
      if (!activeDestObj || typeof activeDestObj.lat !== 'number' || typeof activeDestObj.lng !== 'number') return;
      try {
        const live = await fetchLiveWeatherByCoords(activeDestObj.lat, activeDestObj.lng, destination);
        if (isMounted && live) {
          setRealtimeWeather(live);
        }
      } catch (err) {
        console.warn('Live weather lookup failed:', err);
      }
    };
    void loadRealtimeWeather();
    return () => {
      isMounted = false;
    };
  }, [activeDestObj?.lat, activeDestObj?.lng, destination]);

  // Suggested itinerary cards: Curated unique highlights & distinct photography for ALL 63 provinces
  const suggestedCards = useMemo(() => {
    const dLower = destination.toLowerCase();
    if (dLower.includes('đà nẵng') || dLower.includes('danang')) {
      return [
        {
          id: 'dn-1',
          title: 'Đà Nẵng – Hội An – Bà Nà Hills',
          subtitle: 'Cầu Vàng · Bán đảo Sơn Trà · Phố cổ đèn lồng',
          themeBadge: '🏛️ Di sản & Biểu tượng',
          duration: '3n2d',
          durationBadge: '3N2Đ',
          timeInfo: '3 ngày 2 đêm',
          destInfo: 'Đà Nẵng',
          image:
            'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_real.jpg',
          styles: ['beach', 'culture'],
        },
        {
          id: 'dn-2',
          title: 'Food Tour Chợ Hàn & Biển Mỹ Khê',
          subtitle: 'Bún chả cá · Nhà thờ Con Gà · Ngắm cầu Rồng phun lửa',
          themeBadge: '🍜 Ẩm thực & Biển',
          duration: '2n1d',
          durationBadge: '2N1Đ',
          timeInfo: '2 ngày 1 đêm',
          destInfo: 'Đà Nẵng',
          image:
            'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Da_Nang_Cathedral_2019.jpg/800px-Da_Nang_Cathedral_2019.jpg',
          styles: ['culture', 'cuisine'],
        },
        {
          id: 'dn-3',
          title: 'Đà Nẵng – Ngũ Hành Sơn – Hội An',
          subtitle: 'Ngũ Hành Sơn · Bảo tàng Chăm & hoàng hôn sông Hoài',
          themeBadge: '🌿 Nghỉ dưỡng & Chill',
          duration: '4n3d',
          durationBadge: '4N3Đ',
          timeInfo: '4 ngày 3 đêm',
          destInfo: 'Đà Nẵng',
          image:
            'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/My_Khe_Beach%2C_Da_Nang.jpg/800px-My_Khe_Beach%2C_Da_Nang.jpg',
          styles: ['culture', 'beach'],
        },
      ];
    }
    if (dLower.includes('hà nội') || dLower.includes('hanoi')) {
      return [
        {
          id: 'hn-1',
          title: 'Hà Nội – Văn Miếu – Tràng An',
          subtitle: 'Hồ Gươm · Văn Miếu Quốc Tử Giám · Di sản Tràng An',
          themeBadge: '🏛️ Di sản ngàn năm',
          duration: '3n2d',
          durationBadge: '3N2Đ',
          timeInfo: '3 ngày 2 đêm',
          destInfo: 'Hà Nội',
          image:
            'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/ninhbinh_trangan.jpg',
          styles: ['culture', 'nature'],
        },
        {
          id: 'hn-2',
          title: '36 Phố Phường & Cà phê Trứng Phố Cổ',
          subtitle: 'Lăng Bác · Chùa Một Cột · Food Tour Phố Cổ',
          themeBadge: '☕ Phố cổ & Ẩm thực',
          duration: '2n1d',
          durationBadge: '2N1Đ',
          timeInfo: '2 ngày 1 đêm',
          destInfo: 'Hà Nội',
          image:
            'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hanoi_real.jpg',
          styles: ['culture', 'cuisine'],
        },
        {
          id: 'hn-3',
          title: 'Hà Nội – Vịnh Hạ Long – Yên Tử',
          subtitle: 'Thủ đô · Du thuyền Vịnh Hạ Long & Non thiêng Yên Tử',
          themeBadge: '⛵ Kỳ quan & Tâm linh',
          duration: '4n3d',
          durationBadge: '4N3Đ',
          timeInfo: '4 ngày 3 đêm',
          destInfo: 'Hà Nội',
          image:
            'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_bay.jpg',
          styles: ['nature', 'culture'],
        },
      ];
    }
    if (dLower.includes('phú quốc') || dLower.includes('phuquoc')) {
      return [
        {
          id: 'pq-1',
          title: 'Thiên đường biển đảo & Sunset Sanato',
          subtitle: 'Bãi Sao · Hoàng hôn Sunset Sanato · Chợ đêm Dương Đông',
          themeBadge: '🌅 Hoàng hôn & Biển',
          duration: '3n2d',
          durationBadge: '3N2Đ',
          timeInfo: '3 ngày 2 đêm',
          destInfo: 'Phú Quốc (Kiên Giang)',
          image:
            'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/phuquoc_beach.jpg',
          styles: ['beach', 'photo'],
        },
        {
          id: 'pq-2',
          title: 'Grand World & Vinpearl Safari cuối tuần',
          subtitle: 'Thành phố không ngủ · Vườn thú mở & ẩm thực hải sản',
          themeBadge: '🎡 Giải trí & Gia đình',
          duration: '2n1d',
          durationBadge: '2N1Đ',
          timeInfo: '2 ngày 1 đêm',
          destInfo: 'Phú Quốc (Kiên Giang)',
          image:
            'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/phuquoc_real.jpg',
          styles: ['entertainment', 'beach'],
        },
        {
          id: 'pq-3',
          title: 'Nam đảo · Cáp treo Hòn Thơm & Bãi Khem',
          subtitle: 'Cáp treo vượt biển · Lặn ngắm san hô & nghỉ dưỡng',
          themeBadge: '🏝️ Tour 4 Đảo',
          duration: '4n3d',
          durationBadge: '4N3Đ',
          timeInfo: '4 ngày 3 đêm',
          destInfo: 'Phú Quốc (Kiên Giang)',
          image:
            'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/phuquoc_sunset_sanato.jpg',
          styles: ['beach', 'entertainment'],
        },
      ];
    }

    // Dynamic curated builder for ALL remaining 60 provinces: 3 unique photos & 3 distinct local themes
    const isFoodCat = (cat: string, name: string) => {
      const t = `${cat} ${name}`.toLowerCase();
      return t.includes('ẩm thực') || t.includes('chợ') || t.includes('quán') || t.includes('nem') || t.includes('bún') || t.includes('cơm') || t.includes('bánh');
    };
    const isGenuineImg = (url?: string) =>
      Boolean(url && !url.includes('unsplash.com') && !url.includes('location_map.svg') && !url.includes('danang_real.jpg'));

    const sightPlaces = provinceRealPlaces.filter((p) => !isFoodCat(p.category, p.name));
    const foodPlaces = provinceRealPlaces.filter((p) => isFoodCat(p.category, p.name));

    const usedImgs = new Set<string>();
    const fallbackGallery = [
      'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
      'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hoian_ancient_town.jpg',
      'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_lungcu_hero.jpg',
      'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hue_real.jpg',
    ];

    const pickUniqueImg = (candidates: RealPlace[]): string => {
      for (const p of candidates) {
        if (isGenuineImg(p.image) && !usedImgs.has(p.image)) {
          usedImgs.add(p.image);
          return p.image;
        }
      }
      if (activeDestObj.photo && !usedImgs.has(activeDestObj.photo) && !activeDestObj.photo.includes('danang_real.jpg')) {
        usedImgs.add(activeDestObj.photo);
        return activeDestObj.photo;
      }
      for (const p of candidates) {
        if (p.image && !usedImgs.has(p.image)) {
          usedImgs.add(p.image);
          return p.image;
        }
      }
      for (const fb of fallbackGallery) {
        if (!usedImgs.has(fb)) {
          usedImgs.add(fb);
          return fb;
        }
      }
      return fallbackGallery[0];
    };

    const s1 = sightPlaces[0]?.name || cleanDestName;
    const s2 = sightPlaces[1]?.name;
    const s3 = sightPlaces[2]?.name;
    const f1 = foodPlaces[0]?.name || `Ẩm thực ${cleanDestName}`;
    const f2 = foodPlaces[1]?.name;

    const img1 = pickUniqueImg([sightPlaces[0], sightPlaces[1], ...provinceRealPlaces].filter(Boolean));
    const img2 = pickUniqueImg([foodPlaces[0], foodPlaces[1], sightPlaces[1], ...provinceRealPlaces].filter(Boolean));
    const img3 = pickUniqueImg([sightPlaces[2], sightPlaces[1], sightPlaces[0], ...provinceRealPlaces].filter(Boolean));

    return [
      {
        id: 'prov-1',
        title: s2 ? `${s1} · ${s2}` : `Biểu tượng ${s1} & Khám phá ${cleanDestName}`,
        subtitle: `Tham quan di tích nổi tiếng · Check-in ${s1} & đặc sản trưa`,
        themeBadge: '🏛️ Biểu tượng & Văn hóa',
        duration: '3n2d',
        durationBadge: '3N2Đ',
        timeInfo: '3 ngày 2 đêm',
        destInfo: destination,
        image: img1,
        styles: ['culture', 'nature'],
      },
      {
        id: 'prov-2',
        title: f2 ? `Food Tour ${f1} · ${f2}` : `Food Tour ${f1} & Phố đêm ${cleanDestName}`,
        subtitle: `Thưởng thức đặc sản bản địa tại ${f1} kết hợp dạo chơi cuối tuần`,
        themeBadge: '🍜 Food Tour Bản Địa',
        duration: '2n1d',
        durationBadge: '2N1Đ',
        timeInfo: '2 ngày 1 đêm',
        destInfo: destination,
        image: img2,
        styles: ['cuisine', 'culture'],
      },
      {
        id: 'prov-3',
        title: s3 ? `${s3} · Nghỉ dưỡng & Chill ${cleanDestName}` : `Nhịp chậm & Góc check-in đẹp tại ${cleanDestName}`,
        subtitle: `Lịch trình thảnh thơi, cà phê chiều & góc sống ảo ít người biết`,
        themeBadge: '🌿 Thảnh thơi & Check-in',
        duration: '4n3d',
        durationBadge: '4N3Đ',
        timeInfo: '4 ngày 3 đêm',
        destInfo: destination,
        image: img3,
        styles: ['nature', 'photo'],
      },
    ];
  }, [destination, cleanDestName, activeDestObj, provinceRealPlaces]);

  const handleApplyTemplate = (card: typeof suggestedCards[0]) => {
    setDestination(card.destInfo);
    setDuration(card.duration);
    if (card.styles) setSelectedStyles(card.styles);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('vista_selected_province', card.destInfo);
      } catch {
        // ignore
      }
    }
    handleGenerateClick();
  };

  // Handle URL params on mount
  useEffect(() => {
    const initParams = async () => {
      await Promise.resolve();
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('clear') || params.get('reset')) {
          try {
            localStorage.removeItem('vista_active_planner_state');
            localStorage.removeItem('vista_saved_itineraries');
            localStorage.removeItem('vista_planner_history');
            localStorage.removeItem('vista_selected_province');
            localStorage.removeItem('vista_custom_trips');
            localStorage.removeItem('vista_last_trip_id');
          } catch {}
          window.location.replace('/planner');
          return;
        }

        const tripIdParam = params.get('tripId');
        const destParam = params.get('dest') || params.get('destination');
        const tabParam = params.get('tab');
        if (tabParam && ['timeline', 'map', 'budget', 'checklist'].includes(tabParam)) {
          setActiveMainTab(tabParam as any);
        }

        // Single source of truth for destination: URL param > localStorage
        let resolvedProvince = destParam;
        if (!resolvedProvince && typeof window !== 'undefined') {
          resolvedProvince = localStorage.getItem('vista_selected_province');
        }
        if (resolvedProvince && resolvedProvince.trim()) {
          setDestination(resolvedProvince.trim());
          if (typeof window !== 'undefined') {
            localStorage.setItem('vista_selected_province', resolvedProvince.trim());
          }
        }

        // Check if loading an existing trip
        if (tripIdParam) {
          try {
            if (isBackendTripId(tripIdParam)) {
              setLinkedTripId(tripIdParam);
              setLinkedTripTitle('Chuyến đi VISTA');
              const persisted = await getTripItinerary(tripIdParam);
              if (persisted.days.length > 0) {
                const destinationForPhoto = destParam || 'Đà Nẵng';
                const destinationOption = DESTINATION_LIST.find(
                  (item) =>
                    destinationForPhoto.toLowerCase().includes(item.id)
                    || destinationForPhoto.toLowerCase().includes(item.nameVi.toLowerCase()),
                );
                const photoUrl = destinationOption?.photo || DESTINATION_LIST[0].photo;
                const persistedDays: DayPlan[] = persisted.days.map((day) => ({
                  dayNumber: day.dayNumber,
                  dateStr: new Date(`${day.tripDate}T00:00:00`).toLocaleDateString('vi-VN'),
                  title: `Ngày ${day.dayNumber} · Lịch trình chính thức`,
                  activities: day.activities.map((activity, index) => {
                    const start = activity.startTime?.slice(0, 5);
                    const end = activity.endTime?.slice(0, 5);
                    const title = activity.destinationName || activity.customStopName || 'Hoạt động';
                    return {
                      id: activity.destinationId || activity.id,
                      timeSlot: start && Number(start.slice(0, 2)) < 12
                        ? 'MORNING'
                        : start && Number(start.slice(0, 2)) < 18
                          ? 'AFTERNOON'
                          : 'EVENING',
                      timeRange: start && end ? `${start}–${end}` : 'Chưa xác định',
                      category: 'Lịch trình chính thức',
                      title,
                      description: activity.note || '',
                      location: destinationForPhoto,
                      costVnd: 0,
                      costLabel: 'Theo dữ liệu chuyến đi',
                      photoUrl,
                      transferTimeAfter: index < day.activities.length - 1
                        ? 'Tiếp tục theo thứ tự lịch trình'
                        : undefined,
                    };
                  }),
                }));
                setItineraryDays(persistedDays);
                setDuration(`${Math.min(persistedDays.length, 5)}n${Math.max(1, persistedDays.length - 1)}d`);
                setHasPlanGenerated(true);
                setAiGenerationMetadata({ provider: 'offline', fallbackUsed: false });
              }
            }

            const storedTrips = localStorage.getItem('vista_custom_trips');
            const customList: Array<{ id: string; title: string; destination: string; itineraryDays?: DayPlan[] }> =
              storedTrips ? JSON.parse(storedTrips) : [];
            const foundCustom = customList.find((t) => t.id === tripIdParam);
            if (foundCustom) {
              setLinkedTripId(foundCustom.id);
              setLinkedTripTitle(foundCustom.title);
              if (foundCustom.destination) {
                setDestination(foundCustom.destination);
                setNewTripTitle(foundCustom.title);
              }
              if (foundCustom.itineraryDays && foundCustom.itineraryDays.length > 0) {
                setItineraryDays(foundCustom.itineraryDays);
                setHasPlanGenerated(true);
                const len = foundCustom.itineraryDays.length;
                if (len <= 2) setDuration('2n1d');
                else if (len === 3) setDuration('3n2d');
                else if (len === 4) setDuration('4n3d');
                else setDuration('5n4d');
              }
            } else if (tripIdParam === 'demo-danang-2026') {
              setLinkedTripId('demo-danang-2026');
              setLinkedTripTitle('Hành trình Đà Nẵng – Hội An 2026');
              setDestination('Đà Nẵng');
              setItineraryDays(INITIAL_DANANG_DAYS);
              setHasPlanGenerated(true);
            } else if (tripIdParam === 'trip-phuquoc-2026') {
              setLinkedTripId('trip-phuquoc-2026');
              setLinkedTripTitle('Nghỉ dưỡng hoàng hôn Phú Quốc');
              setDestination('Phú Quốc');
              setItineraryDays(INITIAL_PHUQUOC_DAYS);
              setHasPlanGenerated(true);
            } else if (tripIdParam === 'trip-hagiang-2026') {
              setLinkedTripId('trip-hagiang-2026');
              setLinkedTripTitle('Chinh phục Hà Giang – Mèo Vạc');
              setDestination('Hà Giang');
              setHasPlanGenerated(true);
            }
          } catch {
            // ignore
          }
        }

        if (destParam && !tripIdParam) {
          const norm = destParam.toLowerCase();
          const matched = DESTINATION_LIST.find(
            (d) => d.id === norm || d.nameVi.toLowerCase().includes(norm) || norm.includes(d.id)
          );
          if (matched) {
            setDestination(matched.nameVi);
            setNewTripTitle(`Chuyến đi ${matched.nameVi} 3N2Đ`);
            setHasPlanGenerated(false);
            setItineraryDays([]);
          }
        }

        // Clean initial state on entry:
        // Do not auto-display a pre-generated plan. If an old active plan existed in localStorage,
        // safely back it up into history so the user can review it via the History Drawer anytime.
        if (!tripIdParam) {
          try {
            const savedPlannerState = localStorage.getItem('vista_active_planner_state');
            if (savedPlannerState) {
              const parsed = JSON.parse(savedPlannerState);
              if (
                parsed &&
                parsed.destination &&
                Array.isArray(parsed.itineraryDays) &&
                parsed.itineraryDays.length > 0 &&
                parsed.hasPlanGenerated
              ) {
                savePlanToHistory({
                  destination: parsed.destination,
                  title: parsed.newTripTitle || `${parsed.destination}, đi là mê`,
                  totalDays: parsed.itineraryDays.length,
                  durationLabel: parsed.duration || `${parsed.itineraryDays.length}n${Math.max(1, parsed.itineraryDays.length - 1)}d`,
                  startDate: parsed.startDate || getTodayIso(),
                  peopleCount: parsed.peopleCount || 2,
                  budgetTier: parsed.budgetTier || 'standard',
                  totalEstimatedCost: 3000000,
                  itineraryDays: parsed.itineraryDays,
                  aiMetadata: parsed.aiGenerationMetadata,
                  warnings: [],
                  selectedStyles: parsed.selectedStyles,
                  wishesText: parsed.wishesText,
                });
                setPlanHistoryList(getPlanHistory());
                localStorage.removeItem('vista_active_planner_state');
              }
            }
          } catch (e) {
            console.warn('Migration of legacy active plan:', e);
          }
        }
        isLoadedRef.current = true;
      }
    };
    void initParams();
  }, []);

  // Auto-persist planner state so switching tabs/pages never loses user's current destination or itinerary
  useEffect(() => {
    if (!isLoadedRef.current || typeof window === 'undefined') return;
    try {
      const stateToPersist = {
        destination,
        destSearchQuery,
        startDate,
        duration,
        selectedStyles,
        peopleCount,
        budgetTier,
        wishesText,
        itineraryDays,
        hasPlanGenerated,
        activeDay,
        newTripTitle,
        linkedTripId,
        linkedTripTitle,
        aiGenerationMetadata,
        updatedAt: Date.now(),
      };
      localStorage.setItem('vista_active_planner_state', JSON.stringify(stateToPersist));
    } catch {
      // ignore
    }
  }, [
    destination,
    destSearchQuery,
    startDate,
    duration,
    selectedStyles,
    peopleCount,
    budgetTier,
    wishesText,
    itineraryDays,
    hasPlanGenerated,
    activeDay,
    newTripTitle,
    linkedTripId,
    linkedTripTitle,
    aiGenerationMetadata,
  ]);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3500);
  };

  const markDirty = () => {
    setHasUnsavedChanges(true);
    setIsSaved(false);
  };

  const toggleStyle = (id: string) => {
    markDirty();
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Days Count Helper
  const daysCount = useMemo(() => {
    const found = DURATION_CHIPS.find((c) => c.id === duration);
    return found ? found.days : 3;
  }, [duration]);

  // Unified Group-Scaled Budget Breakdown Model
  const budgetBreakdown = useMemo(() => {
    const count = Math.max(1, peopleCount);
    const nights = Math.max(1, daysCount - 1);

    // 1. Activities & Tickets (vé tham quan, trải nghiệm)
    let computedActPerPerson = 0;
    itineraryDays.forEach((day) => {
      day.activities.forEach((act) => {
        computedActPerPerson += act.costVnd || 0;
      });
    });
    const totalActPerPerson = customBudgetRates.totalActPerPerson ?? computedActPerPerson;
    const totalActivities = totalActPerPerson * count;

    // 2. Dining & Food (ăn uống đặc sản theo ngày)
    // economy: 180k/người/ngày, standard: 350k/người/ngày, luxury: 750k/người/ngày
    const defaultDiningPerPersonDay =
      budgetTier === 'economy' ? 180000 : budgetTier === 'luxury' ? 750000 : 350000;
    const diningPerPersonDay = customBudgetRates.diningPerPersonDay ?? defaultDiningPerPersonDay;
    const totalDining = diningPerPersonDay * count * daysCount;

    // 3. Lodging (Khách sạn / Homestay) - Quy chuẩn 2 người / phòng đôi
    const defaultRoomsNeeded = Math.ceil(count / 2);
    const roomsNeeded = Math.max(1, customBudgetRates.roomsNeeded ?? defaultRoomsNeeded);
    const defaultRoomRatePerNight =
      budgetTier === 'economy' ? 450000 : budgetTier === 'luxury' ? 2200000 : 850000;
    const roomRatePerNight = customBudgetRates.roomRatePerNight ?? defaultRoomRatePerNight;
    const totalLodging = roomsNeeded * roomRatePerNight * nights;

    // 4. Local Transit (Phương tiện di chuyển nội tỉnh theo quy mô nhóm)
    let vehicleDescription = '';
    let defaultVehicleRate = 0;
    if (count <= 2) {
      vehicleDescription = 'Xe máy (1 xe)';
      defaultVehicleRate = 160000;
    } else if (count <= 4) {
      vehicleDescription = 'Xe ô tô 4-5 chỗ tự lái/taxi';
      defaultVehicleRate = 750000;
    } else if (count <= 7) {
      vehicleDescription = 'Xe du lịch 7 chỗ';
      defaultVehicleRate = 1100000;
    } else if (count <= 16) {
      vehicleDescription = 'Xe du lịch 16 chỗ (Ford Transit)';
      defaultVehicleRate = 1800000;
    } else {
      vehicleDescription = 'Xe du lịch 29-35 chỗ chuyên tuyến';
      defaultVehicleRate = 2600000;
    }
    const dailyVehicleRate = customBudgetRates.dailyVehicleRate ?? defaultVehicleRate;
    const totalLocalTransport = dailyVehicleRate * daysCount;

    const hasCustomRates = Object.values(customBudgetRates).some(
      (v) => v !== null && v !== undefined
    );

    // Baseline Total On-Site Cost
    const totalBaseline = totalActivities + totalDining + totalLodging + totalLocalTransport;
    const perPersonBaseline = Math.round(totalBaseline / count);

    // Fluctuation Range (Biên độ dao động thực tế: -12% ngày thường/sớm đến +25% cuối tuần/mùa cao điểm)
    const minFluctuation = Math.round(totalBaseline * 0.88);
    const maxFluctuation = Math.round(totalBaseline * 1.25);
    const perPersonMin = Math.round(minFluctuation / count);
    const perPersonMax = Math.round(maxFluctuation / count);

    // Intercity transit estimate (từ tỉnh thành khác đến điểm đến)
    const isNorthMountain = ['sa pa', 'sapa', 'hà giang', 'mộc châu', 'tam đảo', 'mai châu'].some((p) =>
      destination.toLowerCase().includes(p)
    );
    const isIslandOrFar = ['phú quốc', 'côn đảo', 'nha trang', 'đà lạt', 'đà nẵng', 'quy nhơn'].some((p) =>
      destination.toLowerCase().includes(p)
    );

    let intercityType = 'Xe khách giường nằm khứ hồi';
    let intercityMinPerPerson = 560000;
    let intercityMaxPerPerson = 850000;
    if (isIslandOrFar) {
      intercityType = 'Vé máy bay khứ hồi (ước tính hạng phổ thông)';
      intercityMinPerPerson = 1800000;
      intercityMaxPerPerson = 3600000;
    } else if (isNorthMountain) {
      intercityType = 'Xe khách Cabin VIP / Limousine 2 chiều';
      intercityMinPerPerson = 600000;
      intercityMaxPerPerson = 950000;
    }

    return {
      count,
      nights,
      roomsNeeded,
      roomRatePerNight,
      totalLodging,
      diningPerPersonDay,
      totalDining,
      dailyVehicleRate,
      vehicleDescription,
      totalLocalTransport,
      totalActPerPerson,
      totalActivities,
      totalBaseline,
      perPersonBaseline,
      minFluctuation,
      maxFluctuation,
      perPersonMin,
      perPersonMax,
      intercityType,
      intercityMinPerPerson,
      intercityMaxPerPerson,
      intercityMinGroup: intercityMinPerPerson * count,
      intercityMaxGroup: intercityMaxPerPerson * count,
      weekendSurchargeMin: Math.round(totalLodging * 0.15),
      weekendSurchargeMax: Math.round(totalLodging * 0.35),
      specialtyUpgradePerPerson: budgetTier === 'economy' ? 120000 : 250000,
      contingencyGroup: Math.round(totalBaseline * 0.08),
      hasCustomRates,
      defaultRoomRatePerNight,
      defaultRoomsNeeded,
      defaultDiningPerPersonDay,
      defaultVehicleRate,
      computedActPerPerson,
    };
  }, [peopleCount, daysCount, budgetTier, itineraryDays, destination, customBudgetRates]);

  // Total Estimated Cost Calculation (Group baseline)
  const totalEstimatedCost = useMemo(() => {
    return budgetBreakdown.totalBaseline;
  }, [budgetBreakdown]);

  const perPersonCost = useMemo(() => {
    return budgetBreakdown.perPersonBaseline;
  }, [budgetBreakdown]);

  // Destination weather insight (Fixing hardcoded coastal text for mountain regions)
  const destWeatherInsight = useMemo(() => {
    const d = destination.toLowerCase();
    if (
      d.includes('sa pa') ||
      d.includes('sapa') ||
      d.includes('hà giang') ||
      d.includes('mộc châu') ||
      d.includes('tam đảo') ||
      d.includes('đà lạt') ||
      d.includes('fansipan')
    ) {
      return {
        temp: '14°C – 22°C',
        text: 'Khí hậu vùng cao mát lành se lạnh, sương mù sáng sớm; chiều tối nhiệt độ hạ nhanh, cần mang áo khoác ấm và giày êm bám đường tốt.',
        badge: '⛰️ Khí hậu miền núi cao',
      };
    }
    if (
      d.includes('phú quốc') ||
      d.includes('đà nẵng') ||
      d.includes('nha trang') ||
      d.includes('quy nhơn') ||
      d.includes('vũng tàu') ||
      d.includes('hạ long') ||
      d.includes('côn đảo') ||
      d.includes('phan thiết')
    ) {
      return {
        temp: '27°C – 32°C',
        text: 'Nắng ráo chan hòa, tầm nhìn biển thông thoáng, sóng êm thuận lợi tham quan vịnh đảo, tắm biển và thể thao nước.',
        badge: '🌊 Thời tiết biển đảo',
      };
    }
    return {
      temp: '24°C – 30°C',
      text: 'Thời tiết mát mẻ khô ráo, không khí trong lành, rất thuận tiện dạo phố, khám phá di tích văn hóa và thưởng thức ẩm thực.',
      badge: '🏛️ Thời tiết văn hóa đô thị',
    };
  }, [destination]);

  // Active day plan
  const currentDayPlan = useMemo(() => {
    if (!itineraryDays || itineraryDays.length === 0) return null;
    return itineraryDays.find((d) => d.dayNumber === activeDay) || itineraryDays[0] || null;
  }, [itineraryDays, activeDay]);

  // Day subtotal & transparent component breakdown calculation
  const currentDayBreakdown = useMemo(() => {
    const count = budgetBreakdown.count;
    const dailyDining = budgetBreakdown.diningPerPersonDay * count;
    const transport = budgetBreakdown.dailyVehicleRate;
    const stayAlloc = Math.round(budgetBreakdown.totalLodging / Math.max(1, daysCount));
    if (!currentDayPlan || !currentDayPlan.activities) {
      return {
        ticketsGroup: 0,
        dailyDining,
        transport,
        stayAlloc,
        total: dailyDining + transport + stayAlloc,
      };
    }
    let ticketsGroup = 0;
    currentDayPlan.activities.forEach((a) => {
      ticketsGroup += (a.costVnd || 0) * count;
    });
    return {
      ticketsGroup,
      dailyDining,
      transport,
      stayAlloc,
      total: ticketsGroup + dailyDining + transport + stayAlloc,
    };
  }, [currentDayPlan, budgetBreakdown, daysCount]);

  const currentDaySubtotal = currentDayBreakdown.total;

  // Helper: parse "HH:MM" to minutes since midnight
  const parseHhMmToMinutes = (hhmm: string, fallbackMin: number): number => {
    const cleaned = (hhmm || '').trim();
    const m = cleaned.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return fallbackMin;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };

  const formatMinutesToHhMm = (totalMin: number): string => {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMin)));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Helper: compute road distance (km) between two activities
  const computeLegDistanceKm = (a: Activity, b: Activity): number => {
    if (a.latitude && a.longitude && b.latitude && b.longitude) {
      const R = 6371;
      const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
      const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
      const hav =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((a.latitude * Math.PI) / 180) *
          Math.cos((b.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
      const roadKm = R * c * 1.35;
      return Math.max(0.4, Math.round(roadKm * 10) / 10);
    }
    return 1.8;
  };

  // Toggle Locked status for an activity
  const toggleActivityLock = (actId: string) => {
    setItineraryDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber !== activeDay) return d;
        return {
          ...d,
          activities: d.activities.map((a) => {
            if (a.id === actId) {
              const nextLocked = !a.isLocked;
              triggerToast(nextLocked ? `🔒 Đã khóa mốc thời gian: ${a.title}` : `🔓 Đã mở khóa mốc thời gian: ${a.title}`);
              return { ...a, isLocked: nextLocked };
            }
            return a;
          }),
        };
      })
    );
  };

  // Structured Replan through Backend API with Undo support
  const executeStructuredReplan = async (
    instructionText: string,
    actionPayload?: { action: string; [key: string]: any }
  ) => {
    if (!currentDayPlan) return;
    setIsReplanLoading(true);

    // Save snapshot for 1-click Undo
    setUndoSnapshot({
      days: JSON.parse(JSON.stringify(itineraryDays)),
      totalCost: totalEstimatedCost,
      diff: replanDiff,
    });

    try {
      const [response] = await Promise.all([
        fetch('/api/ai/replan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(adminInspectMode ? { 'X-Admin-Inspect': 'true' } : {}),
          },
          body: JSON.stringify({
            plan: {
              destinationProvince: destination,
              totalDays: itineraryDays.length,
              peopleCount: peopleCount,
              budgetTier: budgetTier,
              pace: activePace,
              estimatedTotalCost: totalEstimatedCost,
              internalDiagnostics: internalDiagnostics,
              days: itineraryDays,
            },
            instruction: instructionText,
            constraints: {
              target_day: activeDay,
              pace: activePace,
              has_elderly: detectedElderly,
              has_children: detectedChildren,
              start_date: startDate,
              arrival_time: detectedArrivalTime,
              departure_time: detectedDepartureTime,
              ...(actionPayload || {}),
            },
            includeInternalDiagnostics: adminInspectMode,
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 950)),
      ]);

      if (!response.ok) {
        throw new Error(`Replan failed with status ${response.status}`);
      }

      const resData = await response.json();
      if (resData.days && Array.isArray(resData.days)) {
        const realPlacesForDest = getRealPlacesByProvince(destination);
        const mappedDays: DayPlan[] = resData.days.map((d: any) => ({
          dayNumber: d.dayNumber,
          dateStr: formatVietnameseDateStr(startDate, (d.dayNumber || 1) - 1),
          title: d.title || `Ngày ${d.dayNumber}`,
          dayRationale: d.dayRationale || '',
          dayStatus: d.dayStatus || 'ACTIVE',
          statusReason: d.statusReason || null,
          departureInfo: d.departureInfo || null,
          activities: (d.activities || []).map((a: any, actIdx: number) => {
            const timeRangeStr = `${a.startTime || '08:30'}–${a.endTime || '10:00'}`;
            const titleStr = String(a.destinationName || '').toLowerCase();
            const matchedP = realPlacesForDest.find((p) => {
              const pName = p.name.toLowerCase();
              return pName.includes(titleStr) || titleStr.includes(pName);
            });
            return {
              id: a.destinationId,
              timeSlot: a.timeSlot,
              timeRange: timeRangeStr,
              category: a.category || 'Tham quan',
              title: a.destinationName,
              description: a.note || '',
              location: `${destination}, Việt Nam`,
              costVnd: a.estimatedCost ?? 0,
              costLabel: a.costLabel || '0 VND',
              latitude: typeof a.latitude === 'number' ? a.latitude : matchedP?.latitude,
              longitude: typeof a.longitude === 'number' ? a.longitude : matchedP?.longitude,
              photoUrl: pickAuthenticPlacePhoto(
                a.photoUrl || matchedP?.image,
                realPlacesForDest,
                (d.dayNumber || 1) * 5 + actIdx,
                activeDestObj.photo
              ),
              tip: a.tip || '',
              durationMin: a.durationMin,
              waitTimeMin: a.waitTimeMin,
              travelDurationFromPreviousMinutes: a.travelDurationFromPreviousMinutes,
              travelDistanceKm: a.travelDistanceKm,
              transportMode: a.transportMode,
              bufferMinutes: a.bufferMinutes,
              openingHoursStatus: a.openingHoursStatus,
              isLocked: a.isLocked,
              isMustVisit: a.isMustVisit,
              dataConfidence: a.dataConfidence,
              rainBackupSuggestion: a.rainBackupSuggestion || null,
              realtimeStatus: a.realtimeStatus || 'Dự kiến mở lúc bạn đến',
              isOpenRealtime: true,
            };
          }),
        }));

        setItineraryDays(mappedDays);
        if (resData.pace === 'RELAXED' || resData.pace === 'MODERATE' || resData.pace === 'INTENSIVE') {
          setActivePace(resData.pace);
        }
        if (resData.warnings && Array.isArray(resData.warnings)) {
          setPlanWarnings(resData.warnings);
        }
        if (resData.conflicts && Array.isArray(resData.conflicts)) {
          setPlanConflicts(resData.conflicts);
        } else {
          setPlanConflicts([]);
        }
        if (resData.replanDiff) {
          setReplanDiff(resData.replanDiff);
        }
        if (resData.internalDiagnostics) {
          setInternalDiagnostics(resData.internalDiagnostics);
        }
        const actionMsg = actionPayload?.action === 'CHANGE_PACE'
          ? '✨ Đã cập nhật nhịp độ toàn chuyến đi!'
          : `✨ AI Co-Pilot: Lịch trình Ngày ${activeDay} đã được tính toán lại thành công!`;
        triggerToast(actionMsg);
      }
    } catch (err: any) {
      console.error('Replan error:', err);
      triggerToast(`⚠️ Không thể kết nối bộ lập lịch: ${err.message || err}`);
    } finally {
      setIsReplanLoading(false);
    }
  };

  const handleUndoReplan = () => {
    if (!undoSnapshot) return;
    setItineraryDays(undoSnapshot.days);
    setReplanDiff(undoSnapshot.diff);
    setUndoSnapshot(null);
    triggerToast('↩️ Đã hoàn tác về phiên bản trước đó!');
  };

  // Reorder activity up/down and dynamically recalculate arrival/departure times & leg transfers
  const handleMoveActivityOrder = (actIdx: number, direction: 'up' | 'down') => {
    if (!currentDayPlan) return;
    const targetIdx = direction === 'up' ? actIdx - 1 : actIdx + 1;
    if (targetIdx < 0 || targetIdx >= currentDayPlan.activities.length) return;

    // Send structured action REORDER_STOP to backend replanner
    executeStructuredReplan(
      `Đổi thứ tự điểm thứ ${actIdx + 1} sang vị trí ${targetIdx + 1} Ngày ${activeDay}`,
      { action: 'REORDER_STOP', from_index: actIdx, to_index: targetIdx }
    );
  };

  // Schedule-aware opening status (replaces confusing wall-clock "Đang mở cửa" for future dates)
  const getScheduleOpeningInfo = (act: Activity, startTime: string, endTime: string) => {
    const titleLower = (act.title || '').toLowerCase();
    const catLower = (act.category || '').toLowerCase();
    const rawRealtime = act.realtimeStatus || '';

    // Special exterior-only / renovation notice
    if (titleLower.includes('nhà thờ đức bà')) {
      return {
        text: `Tham quan bên ngoài · Mở cả ngày (Bên trong đang trùng tu)`,
        color: '#0369A1',
        bg: '#F0F9FF',
        border: '#BAE6FD',
        dot: '#0284C7',
      };
    }

    // 24/24 open public spaces
    if (
      rawRealtime.includes('24/24') ||
      titleLower.includes('phố đi bộ') ||
      titleLower.includes('bãi biển') ||
      titleLower.includes('cầu ') ||
      titleLower.includes('bến bạch đằng') ||
      titleLower.includes('hồ hoàn kiếm')
    ) {
      return {
        text: `Không gian mở 24/24 · Lý tưởng khung ${startTime}–${endTime}`,
        color: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0',
        dot: '#10B981',
      };
    }

    if (act.dataConfidence === 'UNVERIFIED_HOURS') {
      return {
        text: `Dự kiến ghé ${startTime}–${endTime} (Giờ mở cửa cần kiểm tra trước)`,
        color: '#B45309',
        bg: '#FFFBEB',
        border: '#FDE68A',
        dot: '#F59E0B',
      };
    }

    // Extract closing time if present in rawRealtime (e.g. "Đang mở cửa (Đóng lúc 18:00)" or "Đã đóng cửa · Mở lại 07:30")
    const closeMatch = rawRealtime.match(/Đóng lúc\s*(\d{1,2}:\d{2})/i);
    const closeTimeStr = closeMatch ? closeMatch[1] : catLower.includes('ẩm thực') || catLower.includes('chợ') ? '22:00' : '18:00';

    return {
      text: `Dự kiến mở lúc bạn đến (${startTime}–${endTime} · Đóng lúc ${closeTimeStr})`,
      color: '#059669',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      dot: '#10B981',
    };
  };

  const totalDayDistanceKm = useMemo(() => {
    if (!currentDayPlan || !currentDayPlan.activities || currentDayPlan.activities.length <= 1) return '2,5';
    let total = 0;
    for (let i = 1; i < currentDayPlan.activities.length; i++) {
      total += computeLegDistanceKm(currentDayPlan.activities[i - 1], currentDayPlan.activities[i]);
    }
    return (Math.round(total * 10) / 10).toLocaleString('vi-VN');
  }, [currentDayPlan]);

  // Destination filtered list with intelligent Vietnamese diacritic matching
  const filteredDestinations = useMemo(() => {
    if (!destSearchQuery.trim()) return DESTINATION_LIST;
    return DESTINATION_LIST.filter((d) => matchProvince(destSearchQuery, d));
  }, [destSearchQuery]);

  // Map markers for active day (T5)
  const DAY_ROUTE_COLORS = ['#0284C7', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0D9488', '#DC2626'];

  const mapMarkers: DestinationMarker[] = useMemo(() => {
    if (mapViewMode === 'all' && itineraryDays.length > 0) {
      const allMarkers: DestinationMarker[] = [];
      itineraryDays.forEach((d) => {
        (d.activities || []).forEach((act, idx) => {
          allMarkers.push({
            id: `${d.dayNumber}::${act.id}`,
            name: act.title,
            province: destination,
            category: act.category,
            latitude: act.latitude || (activeDestObj.lat + Math.sin(d.dayNumber * 1.8 + idx * 1.2) * 0.02),
            longitude: act.longitude || (activeDestObj.lng + Math.cos(d.dayNumber * 1.8 + idx * 1.2) * 0.02),
            description: act.description,
            priceMin: act.costVnd || 0,
            priceMax: act.costVnd || 0,
            openingHours: '08:00 - 22:00',
            sourceUrl: '',
            thumbnailUrl: act.photoUrl,
          });
        });
      });
      return allMarkers;
    }
    if (!currentDayPlan || !currentDayPlan.activities || currentDayPlan.activities.length === 0) return [];
    return currentDayPlan.activities.map((act, idx) => ({
      id: act.id,
      name: act.title,
      province: destination,
      category: act.category,
      latitude: act.latitude || (activeDestObj.lat + Math.sin(activeDay * 1.8 + idx * 1.2) * 0.02),
      longitude: act.longitude || (activeDestObj.lng + Math.cos(activeDay * 1.8 + idx * 1.2) * 0.02),
      description: act.description,
      priceMin: act.costVnd || 0,
      priceMax: act.costVnd || 0,
      openingHours: '08:00 - 22:00',
      sourceUrl: '',
      thumbnailUrl: act.photoUrl,
    }));
  }, [mapViewMode, itineraryDays, currentDayPlan, destination, activeDestObj, activeDay]);

  // Fetch OSRM road route geometries for each day when switching to Map tab or changing travel mode
  useEffect(() => {
    if (activeMainTab !== 'map' || !itineraryDays || itineraryDays.length === 0) return;
    let cancelled = false;

    const loadRoutes = async () => {
      const nextGeoms: Record<number, { lat: number; lng: number }[]> = {};
      const nextLegs: Record<number, { distanceKm: number; durationMin: number }[]> = {};
      await Promise.all(
        itineraryDays.map(async (d) => {
          const pts = (d.activities || []).map((act, idx) => ({
            latitude: act.latitude || (activeDestObj.lat + Math.sin(d.dayNumber * 1.8 + idx * 1.2) * 0.02),
            longitude: act.longitude || (activeDestObj.lng + Math.cos(d.dayNumber * 1.8 + idx * 1.2) * 0.02),
            label: act.title,
          }));
          if (pts.length < 2) return;
          // Immediate ordered polyline fallback
          nextGeoms[d.dayNumber] = pts.map((p) => ({ lat: p.latitude, lng: p.longitude }));
          try {
            const routingMode = mapTravelMode === 'WALKING' ? 'WALKING' : 'DRIVING';
            const res = await computeVistaRoute({
              origin: pts[0],
              destination: pts[pts.length - 1],
              waypoints: pts.slice(1, -1),
              mode: routingMode,
              fromGps: false,
            });
            if (res && Array.isArray(res.path) && res.path.length >= 2) {
              nextGeoms[d.dayNumber] = res.path;
            }
            if (res && Array.isArray(res.legs) && res.legs.length > 0) {
              nextLegs[d.dayNumber] = res.legs.map((lg) => {
                const distKm = lg.distanceKm ?? Number(((lg.distanceMeters || 0) / 1000).toFixed(1));
                let durMin = lg.durationMin ?? Math.max(1, Math.round((lg.durationMillis || 0) / 60000));
                if (mapTravelMode === 'MOTORBIKE') {
                  durMin = Math.max(1, Math.round((distKm / 32) * 60));
                } else if (mapTravelMode === 'WALKING') {
                  durMin = Math.max(1, Math.round((distKm / 4.5) * 60));
                }
                return {
                  distanceKm: distKm,
                  durationMin: durMin,
                };
              });
            }
          } catch {
            // Keep ordered direct path
          }
        })
      );
      if (!cancelled) {
        setDayRouteGeometries(nextGeoms);
        setDayRouteLegs(nextLegs);
      }
    };

    void loadRoutes();
    return () => {
      cancelled = true;
    };
  }, [activeMainTab, itineraryDays, activeDestObj, mapTravelMode]);

  // Google Maps Multi-stop Turn-by-Turn GPS Navigation URL
  const getGoogleMapsMultiStopUrl = (activities?: Activity[]) => {
    if (!activities || activities.length === 0) return 'https://www.google.com/maps';
    const validActs = activities.filter((a) => typeof a.latitude === 'number' && typeof a.longitude === 'number');
    if (validActs.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
    }
    if (validActs.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${validActs[0].latitude},${validActs[0].longitude}`;
    }
    const origin = `${validActs[0].latitude},${validActs[0].longitude}`;
    const dest = `${validActs[validActs.length - 1].latitude},${validActs[validActs.length - 1].longitude}`;
    const waypoints = validActs.slice(1, -1).map((a) => `${a.latitude},${a.longitude}`).join('|');
    const travelModeParam = mapTravelMode === 'WALKING' ? 'walking' : mapTravelMode === 'MOTORBIKE' ? 'two-wheeler' : 'driving';
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=${travelModeParam}`;
  };

  // Route TSP Optimizer (Greedy Nearest Neighbor to eliminate zig-zag)
  const handleOptimizeDayRoute = (dayNum: number) => {
    const day = itineraryDays.find((d) => d.dayNumber === dayNum);
    if (!day || !day.activities || day.activities.length <= 2) {
      triggerToast('Lộ trình cần ít nhất 3 điểm để tối ưu hóa thứ tự.');
      return;
    }

    const acts = [...day.activities];
    const origin = acts[0];
    const remaining = acts.slice(1);

    const optimized: Activity[] = [origin];
    let currentPoint = origin;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const dist = Math.hypot(
          (candidate.latitude || 0) - (currentPoint.latitude || 0),
          (candidate.longitude || 0) - (currentPoint.longitude || 0)
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      const nextStop = remaining.splice(nearestIdx, 1)[0];
      optimized.push(nextStop);
      currentPoint = nextStop;
    }

    const defaultTimeSlots: Array<{ slot: 'MORNING' | 'NOON' | 'AFTERNOON' | 'EVENING'; range: string }> = [
      { slot: 'MORNING', range: '08:30–10:30' },
      { slot: 'NOON', range: '11:30–13:00' },
      { slot: 'AFTERNOON', range: '14:30–17:00' },
      { slot: 'EVENING', range: '18:30–21:00' },
    ];

    const updatedActs = optimized.map((act, idx) => {
      const template = defaultTimeSlots[Math.min(idx, defaultTimeSlots.length - 1)];
      return {
        ...act,
        timeSlot: template.slot,
        timeRange: template.range,
      };
    });

    setItineraryDays((prev) =>
      prev.map((d) => (d.dayNumber === dayNum ? { ...d, activities: updatedActs } : d))
    );

    triggerToast(`⚡ Đã tối ưu hóa cung đường Ngày ${dayNum} ngắn nhất! Lộ trình liền mạch, không lo quay đầu.`);
  };

  const activeDayRouteStops: RouteStop[] = useMemo(() => {
    if (mapViewMode !== 'day' || !currentDayPlan?.activities?.length) return [];
    const total = currentDayPlan.activities.length;
    return currentDayPlan.activities.map((act, idx) => ({
      id: act.id,
      latitude: act.latitude || (activeDestObj.lat + Math.sin(activeDay * 1.8 + idx * 1.2) * 0.02),
      longitude: act.longitude || (activeDestObj.lng + Math.cos(activeDay * 1.8 + idx * 1.2) * 0.02),
      label: `${act.title} (${act.timeRange.split('–')[0]})`,
      tag: String(idx + 1),
      type: idx === 0 ? 'origin' : idx === total - 1 ? 'destination' : 'waypoint',
    }));
  }, [mapViewMode, currentDayPlan, activeDestObj, activeDay]);

  const activeDayRouteGeometry: { lat: number; lng: number }[] = useMemo(() => {
    if (mapViewMode !== 'day' || !currentDayPlan?.activities?.length) return [];
    if (dayRouteGeometries[activeDay] && dayRouteGeometries[activeDay].length >= 2) {
      return dayRouteGeometries[activeDay];
    }
    return currentDayPlan.activities.map((act, idx) => ({
      lat: act.latitude || (activeDestObj.lat + Math.sin(activeDay * 1.8 + idx * 1.2) * 0.02),
      lng: act.longitude || (activeDestObj.lng + Math.cos(activeDay * 1.8 + idx * 1.2) * 0.02),
    }));
  }, [mapViewMode, currentDayPlan, dayRouteGeometries, activeDay, activeDestObj]);

  const multiDayMapRoutes: MultiDayRoute[] = useMemo(() => {
    if (mapViewMode !== 'all' || !itineraryDays.length) return [];
    return itineraryDays.map((d, dIdx) => {
      const color = DAY_ROUTE_COLORS[dIdx % DAY_ROUTE_COLORS.length];
      const acts = d.activities || [];
      const stops: RouteStop[] = acts.map((act, idx) => ({
        id: `${d.dayNumber}::${act.id}`,
        latitude: act.latitude || (activeDestObj.lat + Math.sin(d.dayNumber * 1.8 + idx * 1.2) * 0.02),
        longitude: act.longitude || (activeDestObj.lng + Math.cos(d.dayNumber * 1.8 + idx * 1.2) * 0.02),
        label: `${act.title} (${act.timeRange.split('–')[0]})`,
        tag: `${d.dayNumber}.${idx + 1}`,
        dayNumber: d.dayNumber,
        color,
      }));
      const geometry =
        dayRouteGeometries[d.dayNumber] && dayRouteGeometries[d.dayNumber].length >= 2
          ? dayRouteGeometries[d.dayNumber]
          : stops.map((s) => ({ lat: s.latitude, lng: s.longitude }));
      return { dayNumber: d.dayNumber, color, geometry, stops };
    });
  }, [mapViewMode, itineraryDays, dayRouteGeometries, activeDestObj]);

  // Active activity currently selected for replacement
  const targetActivityToReplace = useMemo(() => {
    if (!replaceTargetActivityId || !itineraryDays) return null;
    for (const day of itineraryDays) {
      if (day.activities) {
        const found = day.activities.find((a) => a.id === replaceTargetActivityId);
        if (found) return found;
      }
    }
    return null;
  }, [replaceTargetActivityId, itineraryDays]);

  // Dynamic Replacement Spots tailored to active destination, slot context, elderly persona, and excluding already-used places
  const replacementPlaces: ReplacementPlace[] = useMemo(() => {
    const allRealPlaces = getRealPlacesByProvince(destination);

    // 1. Tập hợp các địa điểm đã có mặt trong lịch trình hiện tại để KHÔNG bao giờ gợi ý trùng
    const usedTitles = new Set<string>();
    itineraryDays?.forEach((d) => {
      d.activities?.forEach((a) => {
        if (a.title) usedTitles.add(a.title.toLowerCase().trim());
      });
    });

    // 2. Xác định ngữ cảnh của hoạt động đang muốn thay thế (buổi nào? ăn uống hay tham quan?)
    const targetSlot = targetActivityToReplace?.timeSlot?.toUpperCase() || 'AFTERNOON';
    const targetCatNorm = (targetActivityToReplace?.category || '').toLowerCase();
    const isReplacingFood =
      targetSlot === 'NOON' ||
      targetCatNorm.includes('ẩm thực') ||
      targetCatNorm.includes('ăn') ||
      targetCatNorm.includes('đặc sản');

    const queryNorm = replaceSearchQuery
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .trim();

    // 3. Lọc các địa điểm chưa dùng và khớp từ khóa tìm kiếm (nếu người dùng gõ tìm)
    const availablePool = allRealPlaces.filter((p) => {
      const pNameLower = p.name.toLowerCase().trim();
      for (const used of usedTitles) {
        if (used.includes(pNameLower) || pNameLower.includes(used)) {
          return false; // Loại bỏ điểm đã nằm trong lịch trình
        }
      }
      if (queryNorm) {
        const pNorm = `${p.name} ${p.category} ${p.description}`
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'd')
          .toLowerCase();
        return pNorm.includes(queryNorm);
      }
      return true;
    });

    const sourceList = availablePool.length > 0 ? availablePool : allRealPlaces;

    // 4. Chấm điểm ưu tiên theo khung giờ (Sáng/Trưa/Chiều/Tối) và thể lực đoàn (Người lớn tuổi)
    const scored = sourceList.map((p, idx) => {
      const pText = `${p.name} ${p.category} ${p.description}`.toLowerCase();
      const isFoodPlace =
        pText.includes('ẩm thực') ||
        pText.includes('quán') ||
        pText.includes('nhà hàng') ||
        pText.includes('chợ') ||
        pText.includes('bún') ||
        pText.includes('mì') ||
        pText.includes('bánh') ||
        pText.includes('cơm') ||
        pText.includes('hải sản') ||
        pText.includes('đặc sản');
      const isNightPlace =
        pText.includes('đêm') ||
        pText.includes('cầu') ||
        pText.includes('phố') ||
        pText.includes('du thuyền') ||
        pText.includes('quảng trường');
      const isStrenuous =
        pText.includes('đỉnh ') ||
        pText.includes('núi ') ||
        pText.includes('đèo ') ||
        pText.includes('hang ') ||
        pText.includes('động ') ||
        pText.includes('thác ') ||
        pText.includes('ngũ hành sơn');

      let score = 100;
      if (isReplacingFood) {
        score += isFoodPlace ? 200 : -80;
      } else if (targetSlot === 'EVENING') {
        score += isNightPlace || isFoodPlace ? 150 : 0;
        if (isStrenuous) score -= 120;
      } else if (targetSlot === 'MORNING') {
        score += !isFoodPlace ? 100 : -40;
      } else {
        // AFTERNOON
        score += !isFoodPlace ? 90 : 20;
      }

      if (detectedElderly && isStrenuous) {
        score -= 250; // Tránh gợi ý điểm leo trèo nặng khi đoàn có người lớn tuổi
      }

      return { place: p, score, idx };
    });

    scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

    // 5. Phân trang xoay vòng theo replaceBatchIndex (mỗi lần bấm "Đổi loạt gợi ý khác" sẽ lấy 6 địa điểm mới)
    const pageSize = 6;
    const total = scored.length;
    const picked: typeof scored = [];
    if (total <= pageSize || queryNorm) {
      picked.push(...scored.slice(0, 10));
    } else {
      const startIdx = (replaceBatchIndex * pageSize) % total;
      for (let i = 0; i < pageSize; i++) {
        picked.push(scored[(startIdx + i) % total]);
      }
    }

    return picked.map(({ place }, i) => {
      const costVal = place.priceMin || 0;
      const costLabel =
        costVal === 0
          ? 'Miễn phí vé'
          : `${new Intl.NumberFormat('vi-VN').format(costVal)}đ / người`;
      return {
        id: `rep-dyn-${destination}-${replaceBatchIndex}-${i}-${place.name}`,
        category: place.category || 'Tham quan & Trải nghiệm',
        title: place.name,
        description: place.description,
        costLabel,
        costVnd: costVal,
        photoUrl: pickAuthenticPlacePhoto(place.image, getRealPlacesByProvince(destination), i, activeDestObj.photo),
        latitude: place.latitude,
        longitude: place.longitude,
        openingHours: place.openingHours,
      };
    });
  }, [
    destination,
    activeDestObj,
    itineraryDays,
    targetActivityToReplace,
    replaceSearchQuery,
    replaceBatchIndex,
    detectedElderly,
  ]);

  // Real places in the selected province/city for Add Activity modal suggestions
  const citySuggestedPlaces: RealPlace[] = useMemo(() => {
    const raw = getRealPlacesByProvince(destination);
    let list = raw;

    // Filter by category if not 'all'
    if (addActCategoryFilter !== 'all') {
      list = list.filter((p) => {
        const cat = (p.category || '').toLowerCase();
        if (addActCategoryFilter === 'Tham quan') {
          return cat.includes('tham quan') || cat.includes('di tích') || cat.includes('bảo tàng') || cat.includes('chùa') || cat.includes('văn hóa');
        }
        if (addActCategoryFilter === 'Ẩm thực') {
          return cat.includes('ẩm thực') || cat.includes('ăn') || cat.includes('quán') || cat.includes('cà phê') || cat.includes('đặc sản');
        }
        if (addActCategoryFilter === 'Check-in') {
          return cat.includes('check-in') || cat.includes('sống ảo') || cat.includes('biển') || cat.includes('cầu') || cat.includes('núi');
        }
        return true;
      });
    }

    // Filter by search query if any
    if (addActSearchQuery.trim()) {
      const q = addActSearchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      list = list.filter((p) => {
        const pNorm = `${p.name} ${p.category} ${p.description}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return pNorm.includes(q);
      });
    }

    return list;
  }, [destination, addActCategoryFilter, addActSearchQuery]);

  // Autocomplete suggestions when typing custom activity title
  const autocompleteMatches: RealPlace[] = useMemo(() => {
    if (!newActTitle.trim() || newActTitle.trim().length < 2) return [];
    const q = newActTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const raw = getRealPlacesByProvince(destination);
    return raw
      .filter((p) => {
        const nameNorm = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nameNorm.includes(q);
      })
      .slice(0, 4);
  }, [destination, newActTitle]);

  const handleSelectSuggestedPlace = (place: RealPlace) => {
    setSelectedSuggestedPlace(place);
    setNewActTitle(place.name);
    const cat = (place.category || '').toLowerCase();
    if (cat.includes('ẩm thực') || cat.includes('ăn') || cat.includes('quán') || cat.includes('cà phê')) {
      setNewActCategory('Ẩm thực');
    } else if (cat.includes('biển') || cat.includes('nghỉ dưỡng')) {
      setNewActCategory('Biển & nghỉ dưỡng');
    } else if (cat.includes('giải trí')) {
      setNewActCategory('Giải trí');
    } else if (cat.includes('check-in') || cat.includes('sống ảo')) {
      setNewActCategory('Check-in');
    } else {
      setNewActCategory('Tham quan');
    }
    if (place.priceMin && place.priceMin > 0) {
      setNewActCost(String(place.priceMin));
    } else {
      setNewActCost('0');
    }
    setShowActAutocomplete(false);
  };

  // ─── REAL AI ITINERARY GENERATION (T1, T3, T6) ───────────────────────────
  const handleGenerateClick = async () => {
    setIsGenerating(true);
    setHasUnsavedChanges(false);
    setIsSaved(false);

    const budgetTierObj = BUDGET_OPTIONS.find((b) => b.id === budgetTier);
    const budgetLevelApi = budgetTierObj ? budgetTierObj.apiVal : 'MEDIUM';

    const selectedStyleLabels = selectedStyles.map((sId) => {
      const found = TRAVEL_STYLES.find((t) => t.id === sId);
      return found ? found.label : sId;
    });

    try {
      const companionType =
        peopleCount === 1
          ? 'Đi một mình (Solo)'
          : peopleCount === 2
            ? 'Cặp đôi (Couple)'
            : peopleCount <= 4
              ? 'Gia đình nhỏ / Bạn bè'
              : 'Đoàn đông người';

      const {
        arrivalTime: detectedArrival,
        departureTime: detectedDeparture,
        pace: detectedPace,
        travelMode: detectedTravelMode,
        hasElderly,
        hasChildren,
      } = extractArrivalDepartureTimes(wishesText || '');

      setDetectedArrivalTime(detectedArrival || null);
      setDetectedDepartureTime(detectedDeparture || null);
      setDetectedElderly(Boolean(hasElderly));
      setDetectedChildren(Boolean(hasChildren));
      setCoPilotReply(null);

      const pace = detectedPace || activePace || 'MODERATE';
      if (detectedPace && (detectedPace === 'RELAXED' || detectedPace === 'MODERATE' || detectedPace === 'INTENSIVE')) {
        setActivePace(detectedPace);
      }
      const travelMode = detectedTravelMode || 'DRIVING';

      const [data] = await Promise.all([
        requestAiItinerary({
          destinationProvince: destination,
          totalDays: daysCount,
          budgetLevel: budgetLevelApi,
          interests: wishesText.trim()
            ? [...selectedStyleLabels, wishesText.trim()].slice(0, 10)
            : selectedStyleLabels,
          priorityInterests: selectedStyleLabels.slice(0, 3),
          startDate,
          peopleCount,
          travelWith: companionType,
          specialRequests: wishesText.trim() || undefined,
          arrivalTime: detectedArrival,
          departureTime: detectedDeparture,
          pace,
          travelMode,
          customNotes: wishesText.trim() || undefined,
          enableLlmRerank: true,
          enableLlmNarration: true,
          rejectedDestinationIds: rejectedDestinationIds.length > 0 ? rejectedDestinationIds : undefined,
          includeInternalDiagnostics: hasAdminInspectPermission && adminInspectMode,
        }, linkedTripId),
        new Promise((resolve) => setTimeout(resolve, 1250)),
      ]);

      const isLiveAi =
        data.provider === 'local' ||
        data.provider === 'claude' ||
        data.provider === 'gemini';

      if (data.warnings && Array.isArray(data.warnings)) {
        setPlanWarnings(data.warnings);
      } else {
        setPlanWarnings([]);
      }
      if (data.conflicts && Array.isArray(data.conflicts)) {
        setPlanConflicts(data.conflicts);
      } else {
        setPlanConflicts([]);
      }
      if (hasAdminInspectPermission && data.internalDiagnostics) {
        setInternalDiagnostics(data.internalDiagnostics);
      } else {
        setInternalDiagnostics(null);
      }

      setAiGenerationMetadata({
        provider: isLiveAi ? (data.provider === 'claude' ? 'claude' : 'gemini') : (data.provider ?? 'offline'),
        fallbackUsed: isLiveAi ? false : Boolean(data.fallbackUsed),
      });
      setAiCitations(data.citations ?? []);
      setAiCustomInsights({
        weather: data.weatherSummary,
        pacing: data.pacingSummary,
        advice: data.localAdviceSummary,
        strategic: data.strategicRationale,
        companionFit: data.companionFitRationale,
        budgetOptimization: data.budgetOptimizationRationale,
      });

      if (data && data.days && Array.isArray(data.days) && data.days.length > 0) {
        const responseDays = data.days as unknown as Record<string, unknown>[];
        const transformedDays: DayPlan[] = responseDays.map((dayItem, idx: number) => {
          const dayNum = (dayItem.dayNumber as number) || idx + 1;
          const latOffset = (aIdx: number) => activeDestObj.lat + Math.sin(dayNum * 1.8 + aIdx * 1.2) * 0.02;
          const lngOffset = (aIdx: number) => activeDestObj.lng + Math.cos(dayNum * 1.8 + aIdx * 1.2) * 0.02;

          let rawActivities = (dayItem.activities as Record<string, unknown>[]) || [];

          // Ràng buộc giờ đến Ngày 1: Nếu đến muộn (ví dụ 14:00) thì bỏ các slot MORNING, NOON
          if (dayNum === 1 && detectedArrival) {
            const arrH = parseInt(detectedArrival.split(':')[0], 10);
            rawActivities = rawActivities.filter((act) => {
              const slot = String(act.timeSlot || '').toUpperCase();
              if (slot === 'MORNING') return false;
              if (slot === 'NOON' && arrH >= 12) return false;
              const st = act.startTime ? String(act.startTime) : undefined;
              if (st) {
                const stH = parseInt(st.split(':')[0], 10);
                if (stH < arrH) return false;
              }
              return true;
            });
          }

          // Ràng buộc giờ về Ngày cuối: Nếu bay về sớm (ví dụ 11:00) thì bỏ các slot sau đó
          if (dayNum === responseDays.length && detectedDeparture) {
            const depH = parseInt(detectedDeparture.split(':')[0], 10);
            rawActivities = rawActivities.filter((act) => {
              const slot = String(act.timeSlot || '').toUpperCase();
              if (slot === 'EVENING' && depH < 19) return false;
              if (slot === 'AFTERNOON' && depH < 14) return false;
              if (slot === 'NOON' && depH < 12) return false;
              const st = act.startTime ? String(act.startTime) : undefined;
              if (st) {
                const stH = parseInt(st.split(':')[0], 10);
                if (stH >= depH) return false;
              }
              return true;
            });
          }

          // T1: If day 1 and late evening departure, ensure evening start
          if (dayNum === 1 && isLateEveningDeparture) {
            rawActivities = [
              {
                timeSlot: 'EVENING',
                destinationName: `Nhận phòng khách sạn & Thư giãn (${destination})`,
                title: `Nhận phòng khách sạn & Thư giãn (${destination})`,
                note: `Check-in khách sạn, cất hành lý và chuẩn bị cho buổi tối đầu tiên tại ${destination}.`,
                estimatedCostVnd: 0,
                rationale: `Khởi đầu nhẹ nhàng sau chuyến di chuyển, nạp năng lượng sẵn sàng quẩy hết mình các ngày tới!`,
              },
              {
                timeSlot: 'NIGHT',
                destinationName: `Phố ẩm thực & Dạo cảnh đêm lung linh`,
                title: `Ăn tối muộn & Dạo phố đêm lung linh`,
                note: `Thưởng thức ẩm thực đêm đặc sản và cảm nhận vẻ đẹp lung linh của thành phố.`,
                estimatedCostVnd: 200000,
                rationale: `Làm một bữa ăn khuya đặc sản ấm bụng, dạo mát ngắm phố lên đèn cực chill.`,
              },
            ];
          }

          const realPlaces = getRealPlacesByProvince(destination);

          const activities: Activity[] = rawActivities.map((act: Record<string, unknown>, actIdx: number) => {
            const rawSlot = String(act.timeSlot || '').toUpperCase();
            const catStr = String(act.category || '').toLowerCase();
            const defaultPlace = realPlaces[actIdx % Math.max(1, realPlaces.length)]?.name || `${destination} Landmark`;
            const placeTitle = String(act.destinationName || act.title || act.name || act.placeName || defaultPlace);
            const titleStr = placeTitle.toLowerCase();
            const isFoodStop = catStr.includes('ẩm thực') || catStr.includes('ăn') || catStr.includes('chợ') || titleStr.includes('ẩm thực') || titleStr.includes('chợ') || titleStr.includes('bún') || titleStr.includes('cơm') || titleStr.includes('bánh');

            const matchedPlace = realPlaces.find((p) => {
              const pName = p.name.toLowerCase();
              return pName.includes(titleStr) || titleStr.includes(pName);
            });

            const isChe = titleStr.startsWith('chè ') || titleStr.includes(' chè ') || titleStr.includes('chè hẻm') || titleStr.includes('che hem') || Boolean(matchedPlace?.name.toLowerCase().includes('chè'));

            let costVal = Number(act.estimatedCost || act.estimatedCostVnd) || 0;
            // Nếu là quán chè, giá thực tế bình dân chuẩn bản địa chỉ từ 12.000đ – 20.000đ / ly (người)
            if (isChe) {
              const perPersonChe = (matchedPlace?.priceMin && matchedPlace.priceMin >= 10000 && matchedPlace.priceMin <= 25000)
                ? matchedPlace.priceMin
                : 16000;
              costVal = perPersonChe * peopleCount;
            }

            let timeSlot = rawSlot;
            if (!timeSlot || timeSlot === 'UNKNOWN') {
              if (actIdx === 0) timeSlot = 'MORNING';
              else if (actIdx === 1) timeSlot = isFoodStop ? 'NOON' : (rawActivities.length === 3 ? 'AFTERNOON' : 'NOON');
              else if (actIdx === 2) timeSlot = rawActivities.length === 3 ? 'EVENING' : 'AFTERNOON';
              else timeSlot = 'EVENING';
            }

            let timeRange = '08:00–10:30';
            if (act.startTime && act.endTime) {
              timeRange = `${act.startTime}–${act.endTime}`;
            } else if (dayNum === 1 && isLateEveningDeparture) {
              timeRange = actIdx === 0 ? '20:30–21:30' : '21:45–23:15';
            } else if (timeSlot === 'MORNING') {
              timeRange = '08:00–10:30';
            } else if (timeSlot === 'NOON') {
              timeRange = '11:30–13:00';
            } else if (timeSlot === 'AFTERNOON') {
              timeRange = '14:30–17:00';
            } else if (timeSlot === 'EVENING') {
              timeRange = '18:30–21:00';
            }

            const rawCostStatus = (act as any).costStatus as string | undefined;
            const costStatus: 'FREE' | 'PAID' | 'ESTIMATED' | 'UNVERIFIED' =
              rawCostStatus === 'UNVERIFIED' ? 'UNVERIFIED' :
                rawCostStatus === 'FREE' || costVal === 0 ? 'FREE' :
                  rawCostStatus === 'ESTIMATED' ? 'ESTIMATED' : 'PAID';

            let costLabel = `${new Intl.NumberFormat('vi-VN').format(costVal)}đ / nhóm`;
            if (isChe) {
              costLabel = `~${new Intl.NumberFormat('vi-VN').format(costVal)}đ (12k–20k/ly)`;
            } else if (costStatus === 'UNVERIFIED') {
              costLabel = 'Chưa xác minh giá';
            } else if (costStatus === 'FREE' || costVal === 0) {
              costLabel = 'Miễn phí vé';
            } else if (costStatus === 'ESTIMATED') {
              costLabel = `~${new Intl.NumberFormat('vi-VN').format(costVal)}đ (Ước tính)`;
            }

            const nextAct = rawActivities[actIdx + 1];
            let transferTimeAfter: string | undefined = undefined;
            if (nextAct) {
              const nextTravelMin = (nextAct as any).travelDurationFromPreviousMinutes;
              const nextBufferMin = (nextAct as any).bufferMinutes;
              if (typeof nextTravelMin === 'number' && nextTravelMin > 0) {
                transferTimeAfter = `🚗 Di chuyển ~${nextTravelMin} phút${nextBufferMin ? ` · Đệm nghỉ ${nextBufferMin} phút` : ''}`;
              } else {
                transferTimeAfter = 'Di chuyển khoảng 15–20 phút';
              }
            }

            const photoUrl = pickAuthenticPlacePhoto(
              matchedPlace?.image,
              realPlaces,
              (dayNum - 1) * 5 + actIdx,
              activeDestObj.photo
            );
            const actLat = typeof act.latitude === 'number' ? act.latitude : (matchedPlace?.latitude || latOffset(actIdx));
            const actLng = typeof act.longitude === 'number' ? act.longitude : (matchedPlace?.longitude || lngOffset(actIdx));

            const defaultTimeSlotReason =
              timeSlot === 'MORNING'
                ? 'Sáng sớm (08:00 – 10:30) tiết trời mát mẻ, nắng dịu nhẹ, chụp hình không bị chói mắt và ít đông đúc.'
                : timeSlot === 'NOON'
                  ? 'Khung giờ trưa (11:30 – 13:00) nắng gắt nhất trong ngày, hoàn hảo để dừng chân nghỉ ngơi trong không gian mát mẻ, nạp năng lượng và thưởng thức đặc sản bản địa.'
                  : timeSlot === 'AFTERNOON'
                    ? 'Đầu giờ chiều (14:30 – 17:00) nắng đã dịu bớt, đường sá thông thoáng, rất thích hợp để dạo chơi ngắm cảnh và trải nghiệm làng nghề.'
                    : 'Buổi tối (18:30 – 21:00) phố lên đèn lung linh, gió mát rượi, nhịp sống đêm sôi động nhất để dạo mát và thưởng thức ẩm thực.';

            const defaultWhyVisitReason = isFoodStop || timeSlot === 'NOON'
              ? 'Thiên đường ăn uống với vô vàn món đặc sản nóng hổi chuẩn vị bản địa, giá cả bình dân và không khí ấm cúng.'
              : catStr.includes('biển')
                ? 'Bãi biển tuyệt đẹp với bờ cát mịn và nước trong xanh, là biểu tượng du lịch nhất định phải check-in khi ghé thăm.'
                : catStr.includes('văn hóa') || catStr.includes('chùa') || catStr.includes('bảo tàng') || catStr.includes('lăng') || catStr.includes('di tích')
                  ? 'Không gian thanh tịnh với nét kiến trúc đặc sắc, mang lại cảm giác bình yên và những bức hình kỷ niệm có hồn.'
                  : 'Điểm dừng chân nổi bật được du khách yêu thích, vừa vặn trên cung đường và mang đến nhiều trải nghiệm thú vị.';

            let finalDesc = String(act.note || act.activityDescription || `Khám phá vẻ đẹp và không khí đặc trưng tại ${destination}.`);
            if (isChe && (finalDesc.includes('ăn trưa') || finalDesc.includes('Dừng chân ăn trưa'))) {
              finalDesc = 'Thưởng thức các loại chè đặc sản nức tiếng thanh mát, ngọt dịu (chè bột lọc heo quay, chè hạt sen... giá chỉ từ 12.000đ – 20.000đ/ly).';
            }

            let finalTimeSlotReason = act.timeSlotReason ? String(act.timeSlotReason) : defaultTimeSlotReason;
            if (isChe && (finalTimeSlotReason.includes('dừng chân ăn uống') || finalTimeSlotReason.includes('hồi phục thể lực'))) {
              finalTimeSlotReason = 'Khung giờ trưa ghé quán chè thưởng thức ly chè thanh mát giải nhiệt tức thì, vừa ngon miệng vừa chuẩn vị đặc sản xứ Huế với giá chỉ từ 12k–20k/ly.';
            }

            let finalWhyVisitReason = act.whyVisitReason ? String(act.whyVisitReason) : defaultWhyVisitReason;
            if (isChe) {
              finalWhyVisitReason = 'Thương hiệu chè trứ danh với hàng chục món chè cung đình và dân dã (chè bột lọc heo quay, chè sen, chè môn sáp...) chuẩn vị truyền thống chỉ từ 12.000đ – 20.000đ/ly.';
            }

            return {
              id: String(act.destinationId || `act-${dayNum}-${actIdx + 1}`),
              timeSlot: String(timeSlot),
              timeRange,
              category: String(act.category || (timeSlot === 'NOON' ? (isChe ? 'Ẩm thực & Chè đặc sản' : 'Ẩm thực & Đặc sản') : 'Tham quan & Trải nghiệm')),
              title: placeTitle,
              description: finalDesc,
              location: `${destination}, Việt Nam`,
              costVnd: costVal,
              costStatus,
              costLabel,
              dataConfidence: ((act as any).dataConfidence || (act as any).data_confidence || 'VERIFIED') as 'VERIFIED' | 'UNVERIFIED_HOURS',
              tip: isChe ? 'Nên thử chè bột lọc heo quay và chè hạt sen nhãn lồng trứ danh xứ Huế!' : (actIdx === 0 ? 'Khởi hành đúng giờ để có trải nghiệm trọn vẹn.' : undefined),
              photoUrl,
              transferTimeAfter,
              latitude: actLat,
              longitude: actLng,
              rationale: act.rationale ? String(act.rationale) : undefined,
              timeSlotReason: finalTimeSlotReason,
              whyVisitReason: finalWhyVisitReason,
              warning: (act as any).warning ? String((act as any).warning) : undefined,
              durationMin: typeof (act as any).durationMin === 'number' ? (act as any).durationMin : undefined,
              waitTimeMin: typeof (act as any).waitTimeMin === 'number' ? (act as any).waitTimeMin : undefined,
              travelDurationFromPreviousMinutes: typeof (act as any).travelDurationFromPreviousMinutes === 'number' ? (act as any).travelDurationFromPreviousMinutes : undefined,
              travelDistanceKm: typeof (act as any).travelDistanceKm === 'number' ? (act as any).travelDistanceKm : undefined,
              transportMode: typeof (act as any).transportMode === 'string' ? (act as any).transportMode : undefined,
              openingHoursStatus: typeof (act as any).openingHoursStatus === 'string' ? (act as any).openingHoursStatus : undefined,
              isLocked: Boolean((act as any).isLocked),
              isMustVisit: Boolean((act as any).isMustVisit),
              rainBackupSuggestion: (act as any).rainBackupSuggestion || (act as any).rain_backup_suggestion || null,
              realtimeStatus: typeof (act as any).realtimeStatus === 'string' ? (act as any).realtimeStatus : undefined,
              isOpenRealtime: typeof (act as any).isOpenRealtime === 'boolean' ? (act as any).isOpenRealtime : undefined,
            };
          });

          let calculatedDateStr = `Ngày ${dayNum}`;
          try {
            const [y, m, d] = startDate.split('-').map(Number);
            const curDate = new Date(y, m - 1, d + (dayNum - 1));
            const dayOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][curDate.getDay()];
            const dd = String(curDate.getDate()).padStart(2, '0');
            const mm = String(curDate.getMonth() + 1).padStart(2, '0');
            calculatedDateStr = `${dayOfWeek}, ${dd}/${mm}`;
          } catch {
            calculatedDateStr = `Ngày ${dayNum}`;
          }

          const rawDayRationale = (dayItem.dayRationale as string) || (dayItem.rationale as string);
          return {
            dayNumber: dayNum,
            dateStr: calculatedDateStr,
            title: String(dayItem.title || dayItem.dateLabel || `Ngày ${dayNum} · Trải nghiệm & Khám phá ${destination}`),
            dayRationale: rawDayRationale || generateWittyDayRationale(dayNum, destination, String(dayItem.title || '')),
            dayStatus: typeof (dayItem as any).dayStatus === 'string' ? (dayItem as any).dayStatus : 'ACTIVE',
            statusReason: typeof (dayItem as any).statusReason === 'string' ? (dayItem as any).statusReason : null,
            departureInfo: (dayItem as any).departureInfo || null,
            activities,
          };
        });

        setItineraryDays(transformedDays);
        setActiveDay(1);
        setHasPlanGenerated(true);

        // Auto-save to Plan History
        try {
          savePlanToHistory({
            destination,
            title: `Chuyến đi ${destination} ${daysCount}N${Math.max(1, daysCount - 1)}Đ`,
            totalDays: daysCount,
            durationLabel: duration,
            startDate,
            peopleCount,
            budgetTier,
            totalEstimatedCost: budgetBreakdown.totalBaseline,
            itineraryDays: transformedDays,
            aiMetadata: {
              provider: isLiveAi ? (data.provider === 'claude' ? 'claude' : 'gemini') : (data.provider ?? 'offline'),
              fallbackUsed: isLiveAi ? false : Boolean(data.fallbackUsed),
            },
            warnings: data.warnings,
            selectedStyles,
            wishesText,
            photoUrl: activeDestObj.photo,
          });
          setPlanHistoryList(getPlanHistory());
        } catch (e) {
          console.warn('Failed to auto-save plan to history:', e);
        }

        const sourceLabel = data.provider === 'claude'
          ? 'Claude AI'
          : (data.provider === 'gemini' || data.provider === 'local')
            ? 'VISTA AI (Gemini Engine)'
            : 'Thuật toán tối ưu';
        triggerToast(`Hoàn tất lịch trình ${destination} (${daysCount} ngày) bằng ${sourceLabel}!`);
        return;
      }
      throw new Error('Empty response from AI planner endpoint');
    } catch (err) {
      console.warn('AI live call fallback to local multi-day distinct generator:', err);
      // Smart distinct multi-day generator (T1, T3)
      const { arrivalTime: fallbackArrival, departureTime: fallbackDeparture, hasElderly: fallbackElderly } =
        extractArrivalDepartureTimes(wishesText || '');
      const generated = generateDistinctDayPlan(
        destination,
        daysCount,
        isLateEveningDeparture,
        budgetTier,
        selectedStyleLabels,
        activeDestObj.lat,
        activeDestObj.lng,
        activeDestObj.photo,
        fallbackArrival,
        fallbackDeparture,
        fallbackElderly
      );

      setItineraryDays(generated);
      setAiGenerationMetadata({ provider: 'offline', fallbackUsed: true });
      setAiCitations([]);
      setActiveDay(1);
      setHasPlanGenerated(true);

      // Auto-save fallback to Plan History
      try {
        savePlanToHistory({
          destination,
          title: `Chuyến đi ${destination} ${daysCount}N${Math.max(1, daysCount - 1)}Đ`,
          totalDays: daysCount,
          durationLabel: duration,
          startDate,
          peopleCount,
          budgetTier,
          totalEstimatedCost: budgetBreakdown.totalBaseline,
          itineraryDays: generated,
          aiMetadata: { provider: 'offline', fallbackUsed: true },
          selectedStyles,
          wishesText,
          photoUrl: activeDestObj.photo,
        });
        setPlanHistoryList(getPlanHistory());
      } catch (e) {
        console.warn('Failed to auto-save fallback plan to history:', e);
      }

      triggerToast(`Đã tạo lịch trình thông minh tối ưu cho ${destination} (${daysCount} ngày)!`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── RESET PLANNER TO CLEAN STATE ─────────────────────────────────────────
  const handleResetToCleanState = () => {
    setHasPlanGenerated(false);
    setItineraryDays([]);
    setPlanWarnings([]);
    setAiCustomInsights({});
    setAiCitations([]);
    setCoPilotReply(null);
    setLinkedTripId(null);
    setLinkedTripTitle(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('vista_active_planner_state');
      } catch {
        // ignore
      }
    }
    triggerToast('Đã làm mới! Không gian lập lịch trình hiện đang sạch sẽ.');
  };

  const handleSaveCurrentPlan = () => {
    try {
      savePlanToHistory({
        destination,
        title: newTripTitle || `Chuyến đi ${destination} ${daysCount}N${Math.max(1, daysCount - 1)}Đ`,
        totalDays: daysCount,
        durationLabel: duration,
        startDate,
        peopleCount,
        budgetTier,
        totalEstimatedCost: budgetBreakdown.totalBaseline,
        itineraryDays,
        aiMetadata: aiGenerationMetadata,
        selectedStyles,
        wishesText,
        photoUrl: activeDestObj.photo,
      });
      setPlanHistoryList(getPlanHistory());
      triggerToast('Đã lưu lịch trình vào bộ sưu tập của bạn!');
    } catch (e) {
      console.warn('Error saving plan to history:', e);
    }
  };

  // ─── RESTORE & MANAGE PLAN HISTORY ─────────────────────────────────────────
  const handleRestoreFromHistory = (rec: PlanHistoryRecord) => {
    setDestination(rec.destination);
    if (rec.durationLabel) setDuration(rec.durationLabel);
    if (rec.peopleCount) setPeopleCount(rec.peopleCount);
    if (rec.budgetTier) setBudgetTier(rec.budgetTier);
    if (rec.startDate) setStartDate(rec.startDate);
    if (rec.selectedStyles && Array.isArray(rec.selectedStyles)) setSelectedStyles(rec.selectedStyles);
    if (rec.wishesText) setWishesText(rec.wishesText);
    if (rec.warnings) setPlanWarnings(rec.warnings);
    if (rec.aiMetadata) {
      setAiGenerationMetadata({
        provider: (rec.aiMetadata.provider as AiProvider | 'offline') || 'offline',
        fallbackUsed: !!rec.aiMetadata.fallbackUsed,
      });
    }
    setItineraryDays(rec.itineraryDays as DayPlan[]);
    setActiveDay(1);
    setHasPlanGenerated(true);
    setShowHistoryDrawer(false);
    triggerToast(`Đã khôi phục kế hoạch du lịch "${rec.destination}" từ lịch sử!`);
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deletePlanFromHistory(id);
    setPlanHistoryList(updated);
    triggerToast('Đã xóa kế hoạch khỏi lịch sử.');
  };

  const handleClearAllHistory = () => {
    if (typeof window !== 'undefined' && window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử tạo lịch trình không?')) {
      clearAllPlanHistory();
      setPlanHistoryList([]);
      triggerToast('Đã dọn sạch toàn bộ lịch sử tạo plan.');
    }
  };

  // ─── RESTORE & MANAGE SAVED ITINERARIES ────────────────────────────────────
  const handleRestoreSavedItinerary = (rec: SavedItineraryRecord) => {
    setDestination(rec.destination);
    if (rec.durationLabel) setDuration(rec.durationLabel);
    if (rec.peopleCount) setPeopleCount(rec.peopleCount);
    if (rec.budgetTier) setBudgetTier(rec.budgetTier);
    if (rec.startDate) setStartDate(rec.startDate);
    setItineraryDays(rec.days);
    setActiveDay(1);
    setHasPlanGenerated(true);
    setShowSavedDrawer(false);
    triggerToast(`Đã tải lịch trình đã lưu "${rec.title}"!`);
  };

  const handleDeleteSavedItinerary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('vista_saved_itineraries');
        const list: SavedItineraryRecord[] = stored ? JSON.parse(stored) : [];
        const updated = list.filter((item) => item.id !== id);
        localStorage.setItem('vista_saved_itineraries', JSON.stringify(updated));
        setSavedItinerariesList(updated);
        setSavedCount(updated.length);
        triggerToast('Đã xóa lịch trình khỏi danh sách lưu.');
      } catch {
        // ignore
      }
    }
  };

  // ─── AI SMART PROMPT PARSER & INSTANT GENERATOR ──────────────────────────
  const handleExecuteSmartPrompt = async (promptInput?: string) => {
    const rawText = (promptInput ?? smartPromptText).trim();
    if (!rawText) return;

    setIsParsingSmartPrompt(true);
    try {
      const res = await fetch('/api/ai/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: rawText }),
      });

      if (res.ok) {
        const parsed = await res.json();
        if (parsed.destination) {
          changeDestination(parsed.destination);
        }
        if (parsed.total_days) {
          const daysNum = Number(parsed.total_days);
          if (daysNum === 1) setDuration('1 ngày');
          else if (daysNum === 2) setDuration('2n1d');
          else if (daysNum === 3) setDuration('3n2d');
          else if (daysNum === 4) setDuration('4n3d');
          else setDuration('5n4d');
        }
        if (parsed.people_count) {
          setPeopleCount(Number(parsed.people_count));
        }
        if (parsed.budget_tier) {
          setBudgetTier(parsed.budget_tier === 'economy' ? 'saving' : parsed.budget_tier === 'luxury' ? 'luxury' : 'standard');
        }
        if (parsed.has_elderly !== undefined) {
          setDetectedElderly(Boolean(parsed.has_elderly));
        }
        if (parsed.has_children !== undefined) {
          setDetectedChildren(Boolean(parsed.has_children));
        }
        if (parsed.arrival_time) {
          setDetectedArrivalTime(parsed.arrival_time);
        }
        if (parsed.departure_time) {
          setDetectedDepartureTime(parsed.departure_time);
        }
        setWishesText(rawText);

        handleGenerateClick();
      } else {
        setWishesText(rawText);
        handleGenerateClick();
      }
    } catch (err) {
      console.warn('Smart prompt parsing error, executing directly with local parser:', err);
      setWishesText(rawText);
      handleGenerateClick();
    } finally {
      setIsParsingSmartPrompt(false);
    }
  };

  // ─── INTERACTIVE AI CO-PILOT (CONVERSATIONAL REPLANNING) ──────────────────
  const handleCoPilotCommand = async (customText?: string) => {
    const rawCmd = (customText ?? coPilotInput).trim();
    if (!rawCmd) return;

    setIsCoPilotBusy(true);
    if (!customText) setCoPilotInput('');

    // Try calling Python AI Replanner Engine v2 via Next.js route
    try {
      const budgetTierObj = BUDGET_OPTIONS.find((b) => b.id === budgetTier);
      const budgetLevelApi = budgetTierObj ? budgetTierObj.apiVal : 'MEDIUM';

      const replanHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (hasAdminInspectPermission && adminInspectMode) {
        replanHeaders['X-Admin-Inspect'] = 'true';
      }

      const replanRes = await fetch('/api/ai/replan', {
        method: 'POST',
        headers: replanHeaders,
        body: JSON.stringify({
          plan: {
            destinationProvince: destination,
            totalDays: daysCount,
            peopleCount,
            budgetLevel: budgetLevelApi,
            internalDiagnostics,
            days: itineraryDays,
          },
          instruction: rawCmd,
          constraints: {
            has_elderly: detectedElderly,
            has_children: detectedChildren,
          },
          includeInternalDiagnostics: hasAdminInspectPermission && adminInspectMode,
        }),
      });

      if (replanRes.ok) {
        const replanData = await replanRes.json();
        if (replanData && replanData.days && Array.isArray(replanData.days) && replanData.days.length > 0) {
          const transformed: DayPlan[] = replanData.days.map((d: any) => ({
            dayNumber: d.dayNumber,
            dateStr: formatVietnameseDateStr(startDate, (d.dayNumber || 1) - 1),
            title: d.title || `Ngày ${d.dayNumber}`,
            dayRationale: d.dayRationale || '',
            dayStatus: d.dayStatus || 'ACTIVE',
            statusReason: d.statusReason || null,
            departureInfo: d.departureInfo || null,
            activities: (d.activities || []).map((a: any, actIdx: number) => ({
              id: a.destinationId || `act-${d.dayNumber}-${actIdx + 1}`,
              timeSlot: a.timeSlot || 'MORNING',
              timeRange: `${a.startTime || '08:30'}–${a.endTime || '10:30'}`,
              category: a.category || 'Tham quan',
              title: a.destinationName || a.title || 'Điểm đến',
              description: a.whyVisitReason || a.note || 'Trải nghiệm du lịch bản địa',
              location: `${destination}, Việt Nam`,
              costVnd: a.estimatedCost || 0,
              costStatus: a.costStatus || 'FREE',
              costLabel: a.costLabel || 'Miễn phí vé',
              dataConfidence: a.dataConfidence || 'VERIFIED',
              durationMin: a.durationMin,
              waitTimeMin: a.waitTimeMin,
              travelDurationFromPreviousMinutes: a.travelDurationFromPreviousMinutes,
              travelDistanceKm: a.travelDistanceKm,
              transportMode: a.transportMode,
              openingHoursStatus: a.openingHoursStatus,
              isLocked: Boolean(a.isLocked),
              isMustVisit: Boolean(a.isMustVisit),
              rainBackupSuggestion: a.rainBackupSuggestion || null,
              tip: a.tip || undefined,
              photoUrl: pickAuthenticPlacePhoto(
                a.photoUrl,
                getRealPlacesByProvince(destination),
                (d.dayNumber || 1) * 5 + actIdx,
                activeDestObj.photo
              ),
              timeSlotReason: a.timeSlotReason || a.rationale || undefined,
              whyVisitReason: a.whyVisitReason || undefined,
            })),
          }));

          setItineraryDays(transformed);
          if (replanData.warnings && Array.isArray(replanData.warnings)) {
            setPlanWarnings(replanData.warnings);
          }
          if (replanData.conflicts && Array.isArray(replanData.conflicts)) {
            setPlanConflicts(replanData.conflicts);
          } else {
            setPlanConflicts([]);
          }
          if (hasAdminInspectPermission && replanData.internalDiagnostics) {
            setInternalDiagnostics(replanData.internalDiagnostics);
          }
          if (replanData.coPilotReply) {
            setCoPilotReply(replanData.coPilotReply);
          } else {
            setCoPilotReply(`✨ AI Co-Pilot đã điều chỉnh xong: "${rawCmd}". Lịch trình và ngân sách đã được tính toán lại chính xác!`);
          }
          if (replanData.insiderTip) {
            setCoPilotInsiderTip(replanData.insiderTip);
          } else {
            setCoPilotInsiderTip(null);
          }
          if (replanData.proactiveSuggestion) {
            setCoPilotProactive(replanData.proactiveSuggestion);
          } else {
            setCoPilotProactive(null);
          }
          triggerToast(`AI Co-Pilot đã cập nhật lịch trình thành công!`);
          setIsCoPilotBusy(false);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('AI replan endpoint error, using local fallback:', apiErr);
    }

    const norm = rawCmd
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase();

    // Kho tri thức Thổ Địa Bản Xứ Độc Quyền cho VISTA Co-Pilot
    const destNorm = destination
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase();
    const isHaTinh = destNorm.includes('ha tinh');
    const isDaNang = destNorm.includes('da nang');
    const isHoiAn = destNorm.includes('quang nam') || destNorm.includes('hoi an');
    const isDaLat = destNorm.includes('lam dong') || destNorm.includes('da lat');
    const isPhuQuoc = destNorm.includes('kien giang') || destNorm.includes('phu quoc');

    const localInsiderInfo = isHaTinh
      ? {
          specialties: 'Mực nhảy Vũng Áng hấp sả gừng, Bánh bèo đĩa ngập tép mỡ giòn rụm, Ram bánh mướt nóng giòn, Kẹo Cu đơ Cầu Phủ kèm chè xanh om.',
          foodTip: 'Mực nhảy Vũng Áng ngon nhất là khi còn bơi tanh tách trong lồng bè, yêu cầu hấp bia sả gừng chấm mù tạt cay nồng hoặc nướng mọi. Đừng quên thử bánh bèo đĩa rắc hành phi tép mỡ thơm nức mũi nhé!',
          timingTip: 'Chùa Hương Tích nên đi cáp treo sáng sớm trước 09:00 để vừa ngắm mây sương bồng bềnh vừa tránh nắng trưa gắt; còn Biển Thiên Cầm hoàng hôn đẹp xuất sắc nhất lúc 17:15 khi bầu trời chuyển sắc tím cam.',
          sunsetCafe: 'Quán Cafe view Biển Thiên Cầm hoặc lầu vọng cảnh Hồ Kẻ Gỗ',
        }
      : isDaNang
      ? {
          specialties: 'Bún mắm nêm thịt quay Bà Thuyên, Mì Quảng ếch, Bánh tráng cuốn thịt heo Đại Lộc hai đầu da, Cà phê muối đường Bạch Đằng.',
          foodTip: 'Ăn hải sản ghé đường Võ Nguyên Giáp hoặc quán Năm Đảnh, vào tận bể chỉ từng con cân ký rồi hãy nhờ chế biến để đảm bảo tươi rói và chuẩn giá niêm yết nhé!',
          timingTip: 'Cầu Rồng phun lửa lúc 21:00 thứ Bảy & Chủ Nhật, bạn nên đứng mạn đường Trần Hưng Đạo phía đầu rồng đón gió mát mà không lo bị tạt nước. Chiều tầm 15:30 lên Bán đảo Sơn Trà ngắm đàn voọc chà vá chân nâu là đẹp nhất!',
          sunsetCafe: 'Quán Cafe muối ngắm sông Hàn đường Bạch Đằng hoặc rooftop ven biển Mỹ Khê',
        }
      : isHoiAn
      ? {
          specialties: 'Cơm gà xé giòn Bà Buội, Cao lầu Bá Lễ khói củi, Nước Mót sả sen thanh lọc, Bánh mì Madam Khánh giòn rụm.',
          foodTip: 'Bánh mì Madam Khánh giòn thơm ngập pate tự làm, còn nước Mót nhớ uống tại chỗ ở số 150 Trần Phú để cảm nhận trọn vẹn hương sen sả thơm ngát!',
          timingTip: 'Phố cổ đẹp mê mẩn lúc 17:00 nắng vàng rọi tường rêu phong, và 18:30 khi cả phố đồng loạt thắp đèn lồng. Đi thuyền hoa đăng trên sông Hoài nhớ thương lượng giá tầm 50k - 100k/thuyền cho 2-4 người nha!',
          sunsetCafe: 'Faifo Coffee tầng thượng ngắm mái ngói rêu phong hoặc The Deck House An Bàng',
        }
      : isDaLat
      ? {
          specialties: 'Lẩu gà lá é Tao Ngộ, Bánh tráng nướng Dì Đinh, Lẩu bò Ba Toa quán gỗ, Sữa đậu nành nóng hổi kèm bánh tiêu đêm chợ.',
          foodTip: 'Lẩu gà lá é nên ăn lúc trời se lạnh về chiều, nhúng lá é vừa chín tới the the bùi bùi. Ăn kem bơ nhớ ghé quán Thanh Thảo đường Nguyễn Văn Trỗi!',
          timingTip: 'Săn mây đồi Đa Phú hoặc Cầu Đất đẹp nhất lúc 05:15 - 06:15 sáng; chiều tầm 16:30 ngồi cafe ven Hồ Tuyền Lâm ngắm rừng thông soi bóng.',
          sunsetCafe: 'Tiệm Cà Phê Túi Mơ To hoặc Cheo Veooo hoàng hôn buông thung lũng',
        }
      : isPhuQuoc
      ? {
          specialties: 'Gỏi cá trích bóp dừa cuốn bánh tráng rau rừng chấm mắm đậu phộng, Bún quậy Kiến Xây tự pha nước chấm, Hải sản Làng chài Hàm Ninh.',
          foodTip: 'Ăn Bún quậy Kiến Xây nhớ tự tay pha chén nước chấm tắc - ớt - muối tiêu đánh sủi bọt theo đúng gu của bạn thì ăn mới đúng điệu!',
          timingTip: 'Ngắm hoàng hôn Phú Quốc đẹp không góc chết tại Bãi Trường hoặc Dinh Cậu đúng 17:30. Tour đảo nên khởi hành cano từ 08:30 sáng nước biển trong vắt như gương!',
          sunsetCafe: 'Sunset Sanato Beach Club hoặc OCSEN Beach Bar & Club ngắm mặt trời lặn biển Tây',
        }
      : {
          specialties: `Các món đặc sản trứ danh và hải sản tươi sống đặc trưng của ${destination}.`,
          foodTip: `Hãy chọn các quán ăn có đông người dân bản địa ghé vào, niêm yết bảng giá rõ ràng để thưởng thức hương vị nguyên bản và tránh tình trạng chặt chém du lịch nhé!`,
          timingTip: `Buổi sáng nên khởi hành sớm để tránh nắng gắt, buổi chiều từ 16:30 là khung giờ vàng để ngắm hoàng hôn và chụp ảnh phong cảnh đẹp nhất tại ${destination}.`,
          sunsetCafe: `Quán cà phê view ngắm hoàng hôn thoáng mát tại ${destination}`,
        };

    // 0. Nhận diện Điều khiển & Hướng dẫn Sử dụng Hệ thống (System Navigator)
    if (/sua gia|gia phong|tien phong|khach san|ngan sach|chi phi|sua tien|doi gia/.test(norm)) {
      setShowBudgetModal(true);
      setCoPilotReply('✨ Tui đã mở sẵn Bảng dự toán chi phí & biên độ dao động cho bạn rồi nè! Bạn chỉ cần bấm vào nút "Sửa" cạnh dòng Khách sạn hoặc Ăn uống để nhập giá thực tế theo ý bạn nhé. Mọi chi phí sẽ tự động tính toán lại tức thì!');
      setCoPilotInsiderTip('Mẹo: Nhập giá phòng khách sạn thực tế bạn đã đặt giúp VISTA cân đối chính xác từng đồng ngân sách chuyến đi!');
      setCoPilotProactive('Sau khi sửa giá, bạn có muốn tui tối ưu lại chi phí ăn uống và vé tham quan cho vừa khít ví tiền không?');
      triggerToast('Đã mở Bảng dự toán chi phí!');
      setIsCoPilotBusy(false);
      return;
    }

    if (/ban do|duong di|khoang cach|lo trinh di chuyen|map/.test(norm)) {
      setActiveMainTab('map');
      setCoPilotReply('🗺️ Tui đã chuyển sang Tab Bản đồ di chuyển rồi nhé! Bạn có thể xem lộ trình trực quan từng ngày, vị trí các điểm dừng chân và khoảng cách giữa các chặng.');
      setCoPilotInsiderTip('Mẹo: Trên bản đồ, bạn có thể click vào từng icon địa điểm để xem chỉ đường GPS và thời gian lái xe thực tế.');
      setCoPilotProactive('Bạn có muốn tui kiểm tra lại xem thứ tự các điểm dừng đã tối ưu cung đường ngắn nhất chưa?');
      triggerToast('Đã chuyển sang Tab Bản đồ di chuyển!');
      setIsCoPilotBusy(false);
      return;
    }

    if (/chuan bi|hanh trang|do dac|mang theo|vali|checklist/.test(norm)) {
      setActiveMainTab('checklist');
      setCoPilotReply('🎒 Tui đã mở Tab Danh sách chuẩn bị hành trang giúp bạn kiểm tra các vật dụng quan trọng: CCCD/Hộ chiếu, thuốc men, đồ bơi và sạc dự phòng trước khi lên đường!');
      setCoPilotInsiderTip('Mẹo: Hãy tick chọn các món đồ đã cho vào vali để không bị bỏ quên phút chót!');
      setCoPilotProactive('Cần tui nhắc nhở thêm đồ dùng đặc thù theo thời tiết mùa này không?');
      triggerToast('Đã chuyển sang Tab Danh sách chuẩn bị!');
      setIsCoPilotBusy(false);
      return;
    }

    if (/tao chuyen di|luu chuyen di|thu quy|chia tien|tao tour/.test(norm)) {
      setShowCreateTripModal(true);
      setCoPilotReply('🚀 Tui đã mở form Tạo chuyến đi cho bạn! Sau khi lưu, toàn bộ lịch trình và ngân sách sẽ được lưu vào cơ sở dữ liệu và kích hoạt ngay trang Quản lý Chuyến đi & Ví Thủ Quỹ để nhóm chia tiền nha!');
      setCoPilotInsiderTip('Mẹo: Đặt tên chuyến đi kèm năm (VD: Chuyến Đi Hà Tĩnh 2026) để dễ tìm lại trong danh sách.');
      setCoPilotProactive('Sau khi lưu chuyến đi, bạn có thể gửi link mời bạn bè cùng vào theo dõi ví thủ quỹ.');
      triggerToast('Đã mở form Tạo chuyến đi!');
      setIsCoPilotBusy(false);
      return;
    }

    // 1. Xác định ngày mục tiêu (mặc định là activeDay hiện tại)
    let targetDay = activeDay;
    const dayMatch = norm.match(/ngay\s*(\d+)/);
    if (dayMatch) {
      const parsedDay = parseInt(dayMatch[1], 10);
      if (parsedDay >= 1 && parsedDay <= itineraryDays.length) {
        targetDay = parsedDay;
      }
    }

    // 2. Nhận diện Thắc mắc tư vấn ẩm thực & Kinh nghiệm Thổ Địa (Expert Insider Q&A)
    if (/co gi ngon|an gi|dac san gi|an gi ngon|mon gi ngon|co quan nao ngon|choi gi|di dau choi|co gi hay|kinh nghiem/.test(norm)) {
      const realPool = getRealPlacesByProvince(destination);
      const usedTitles = new Set<string>();
      itineraryDays.forEach((d) =>
        d.activities.forEach((a) => usedTitles.add(a.title.toLowerCase().trim()))
      );

      const wantFoodQuery = /ngon|an|dac san|hai san|mon/.test(norm);
      const matchedDests = realPool
        .filter((p) => {
          if (usedTitles.has(p.name.toLowerCase().trim())) return false;
          if (wantFoodQuery) {
            const pText = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase();
            return /ẩm thực|quán|nhà hàng|bún|hải sản|cơm|bánh|đặc sản|lẩu|gỏi/.test(pText);
          }
          return true;
        })
        .slice(0, 3);

      setCoPilotSuggestions(matchedDests);
      setCoPilotReply(
        `😋 Chuẩn gu sành sỏi luôn! Ở ${destination}, linh hồn ẩm thực và trải nghiệm bản địa nằm ở: ${localInsiderInfo.specialties}. Bạn cứ ghé thử là mê chữ ê kéo dài!`
      );
      setCoPilotInsiderTip(wantFoodQuery ? localInsiderInfo.foodTip : localInsiderInfo.timingTip);
      setCoPilotProactive(`Tui đã chọn sẵn ${matchedDests.length} điểm nức tiếng bên dưới. Bạn có thể bấm nút "+ Thêm vào Ngày ${targetDay}" để đưa ngay vào lịch trình nhé!`);
      setActiveDay(targetDay);
      setIsCoPilotBusy(false);
      return;
    }

    // 3. Kịch bản A: Yêu cầu ngủ nướng / lùi giờ buổi sáng (Cascading Sleep-In Timeline)
    if (norm.includes('ngu nuong') || norm.includes('day muon') || norm.includes('lui gio') || norm.includes('khoi hanh muon')) {
      setItineraryDays((prev) =>
        prev.map((d) => {
          if (d.dayNumber !== targetDay || d.activities.length === 0) return d;
          const acts = [...d.activities];
          if (acts.length >= 1) {
            acts[0] = {
              ...acts[0],
              timeRange: '09:30–11:15',
              timeSlotReason: 'Đã lùi giờ khởi hành sang 09:30 theo yêu cầu để cả đoàn thoải mái ngủ nướng xả stress, ăn sáng thong thả.',
            };
          }
          if (acts.length >= 2) {
            acts[1] = {
              ...acts[1],
              timeRange: '12:00–13:30',
              timeSlotReason: 'Bữa trưa dời sang 12:00 thong thả thưởng thức ẩm thực sau buổi sáng thư giãn.',
            };
          }
          if (acts.length >= 3) {
            acts[2] = {
              ...acts[2],
              timeRange: '14:30–17:00',
            };
          }
          if (acts.length >= 4) {
            acts[3] = {
              ...acts[3],
              timeRange: '18:30–21:00',
            };
          }
          return { ...d, activities: acts };
        })
      );
      setActiveDay(targetDay);
      setCoPilotReply(
        `😴 Chuẩn bài luôn bạn ơi! Đi du lịch xả stress chứ có phải đi tập quân sự đâu mà dậy sớm chi cho cực! Tui đã tự động lùi lịch Ngày ${targetDay} bắt đầu từ 09:30, bữa trưa dời sang 12:00 và dạo chiều 14:30 vừa vặn không lo dồn dập rồi nè! ✨`
      );
      setCoPilotInsiderTip(localInsiderInfo.foodTip);
      setCoPilotProactive(`Buổi sáng dậy muộn thong thả, chiều nay bạn có muốn tui gợi ý thêm ${localInsiderInfo.sunsetCafe} để ghé chill ngắm cảnh không?`);
      triggerToast(`Trợ lý AI đã điều chỉnh lịch Ngày ${targetDay} bắt đầu từ 09:30!`);
      setIsCoPilotBusy(false);
      return;
    }

    // 4. Kịch bản B: Xác định buổi mục tiêu và hoán đổi địa điểm
    let targetSlot: 'MORNING' | 'NOON' | 'AFTERNOON' | 'EVENING' = 'AFTERNOON';
    if (norm.includes('sang') || norm.includes('morning')) {
      targetSlot = 'MORNING';
    } else if (norm.includes('trua') || norm.includes('an trua') || norm.includes('noon') || norm.includes('chay') || norm.includes('hai san') || norm.includes('quan an') || norm.includes('dac san')) {
      targetSlot = 'NOON';
    } else if (norm.includes('toi') || norm.includes('dem') || norm.includes('an toi') || norm.includes('evening') || norm.includes('cho dem')) {
      targetSlot = 'EVENING';
    } else if (norm.includes('chieu') || norm.includes('afternoon')) {
      targetSlot = 'AFTERNOON';
    }

    const realPool = getRealPlacesByProvince(destination);
    const usedTitles = new Set<string>();
    itineraryDays.forEach((d) =>
      d.activities.forEach((a) => usedTitles.add(a.title.toLowerCase().trim()))
    );

    const wantFood =
      targetSlot === 'NOON' ||
      /an |quan|nha hang|chay|hai san|dac san|bun|mi|com|banh|lau/.test(norm);
    const wantRelaxedOrElderly =
      /nhe nhang|nguoi lon tuoi|nguoi gia|ong ba|met|khong leo|cafe|ca phe|nghi ngoi|bang phang| mát/.test(norm);
    const wantBeachOrRiver = /bien|dao mat|ngam canh|song|cau|du thuyen|chill|hoang hon/.test(norm);

    let bestCand = realPool[0];
    let bestScore = -9999;

    for (const p of realPool) {
      const pNameLower = p.name.toLowerCase().trim();
      let score = usedTitles.has(pNameLower) ? -600 : 100;
      const pNorm = `${p.name} ${p.category} ${p.description || ''}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .toLowerCase();

      if (wantFood) {
        if (/am thuc|cho|quan|nha hang|dac san|bun|mi|com|banh|hai san/.test(pNorm)) score += 300;
        else score -= 150;
      }
      if (wantRelaxedOrElderly) {
        if (/dinh|deo|hang|dong|thac|leo|ngu hanh son/.test(pNorm)) score -= 700;
        if (/bao tang|bien|cau|song|pho co|chua|cafe|ca phe|ho|cong vien/.test(pNorm)) score += 260;
      }
      if (wantBeachOrRiver) {
        if (/bien|bai|song|cau|dao|du thuyen|hoang hon|cafe/.test(pNorm)) score += 240;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCand = p;
      }
    }

    if (bestCand) {
      const costVal = bestCand.priceMin ?? 0;
      const costLabel =
        costVal === 0
          ? 'Miễn phí vé'
          : `${new Intl.NumberFormat('vi-VN').format(costVal * peopleCount)}đ / nhóm`;

      const customWhy = wantRelaxedOrElderly
        ? 'Không gian bằng phẳng, thoáng mát, rất nhẹ nhàng và có nhiều chỗ nghỉ chân lý tưởng cho cả gia đình và người lớn tuổi.'
        : wantFood
          ? 'Điểm thưởng thức ẩm thực bản địa nổi tiếng, nguyên liệu tươi rói, hương vị đậm đà và không gian ngồi thoải mái.'
          : bestCand.description || `Điểm trải nghiệm được yêu thích hàng đầu tại ${destination}.`;

      setItineraryDays((prev) =>
        prev.map((d) => {
          if (d.dayNumber !== targetDay) return d;
          let targetIdx = d.activities.findIndex((a) => a.timeSlot === targetSlot);
          if (targetIdx === -1) {
            targetIdx = targetSlot === 'MORNING' ? 0 : targetSlot === 'EVENING' ? d.activities.length - 1 : Math.min(1, d.activities.length - 1);
          }
          if (targetIdx < 0 || targetIdx >= d.activities.length) return d;

          const oldAct = d.activities[targetIdx];
          const updatedAct: Activity = {
            ...oldAct,
            id: `act-copilot-${Date.now()}`,
            title: bestCand.name,
            category: bestCand.category || oldAct.category,
            description: bestCand.description || customWhy,
            location: `${bestCand.name}, ${destination}`,
            costVnd: costVal * peopleCount,
            costStatus: costVal === 0 ? 'FREE' : 'PAID',
            costLabel,
            photoUrl: pickAuthenticPlacePhoto(bestCand.image, realPool, targetIdx, oldAct.photoUrl),
            latitude: bestCand.latitude || oldAct.latitude,
            longitude: bestCand.longitude || oldAct.longitude,
            whyVisitReason: customWhy,
          };

          const nextActs = [...d.activities];
          nextActs[targetIdx] = updatedAct;
          return { ...d, activities: nextActs };
        })
      );

      const slotNameVi =
        targetSlot === 'MORNING'
          ? 'buổi sáng'
          : targetSlot === 'NOON'
            ? 'bữa trưa'
            : targetSlot === 'EVENING'
              ? 'buổi tối'
              : 'buổi chiều';

      setActiveDay(targetDay);
      setCoPilotReply(
        `🎉 Tuyệt vời ông mặt trời! Tui đã đổi chặng ${slotNameVi} Ngày ${targetDay} sang ngay "${bestCand.name}" (${bestCand.category}) theo đúng gu của bạn nè! ${customWhy}`
      );
      setCoPilotInsiderTip(wantFood ? localInsiderInfo.foodTip : localInsiderInfo.timingTip);
      setCoPilotProactive(`Sau chặng này, bạn có muốn bổ sung thêm ${localInsiderInfo.sunsetCafe} để chuyến đi thêm trọn vẹn không?`);
      triggerToast(`Đã cập nhật ${slotNameVi} Ngày ${targetDay} sang ${bestCand.name}!`);
    } else {
      setCoPilotReply(`Úi chà, tui tìm mỏi mắt khắp ${destination} mà chưa ra điểm nào đúng gu này! Bạn thử gõ rõ hơn xíu như "đổi ăn trưa hải sản" hay "chiều muốn ngắm hoàng hôn chill chill" xem sao nha! 😉`);
      setCoPilotInsiderTip(localInsiderInfo.foodTip);
      setCoPilotProactive(null);
    }

    setIsCoPilotBusy(false);
  };

  const handleAddSuggestionToDay = (suggestedDest: RealPlace, targetDayNum: number) => {
    const costVal = suggestedDest.priceMin ?? 0;
    const costLabel =
      costVal === 0
        ? 'Miễn phí vé'
        : `${new Intl.NumberFormat('vi-VN').format(costVal * peopleCount)}đ / nhóm`;
    const customWhy = suggestedDest.description || `Điểm trải nghiệm được đề xuất bởi AI Co-Pilot tại ${destination}.`;

    setItineraryDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber !== targetDayNum) return d;
        const newAct: Activity = {
          id: `act-copilot-${Date.now()}`,
          timeSlot: 'AFTERNOON',
          timeRange: '15:30–17:00',
          category: suggestedDest.category || 'Tham quan',
          title: suggestedDest.name,
          description: suggestedDest.description || customWhy,
          location: `${suggestedDest.name}, ${destination}`,
          costVnd: costVal * peopleCount,
          costStatus: costVal === 0 ? 'FREE' : 'PAID',
          costLabel,
          photoUrl: pickAuthenticPlacePhoto(
            suggestedDest.image,
            getRealPlacesByProvince(destination),
            d.activities.length,
            activeDestObj.photo
          ),
          latitude: suggestedDest.latitude,
          longitude: suggestedDest.longitude,
          whyVisitReason: customWhy,
        };
        return { ...d, activities: [...d.activities, newAct] };
      })
    );
    setCoPilotSuggestions([]);
    setActiveDay(targetDayNum);
    triggerToast(`Đã thêm "${suggestedDest.name}" vào Ngày ${targetDayNum}!`);
    setCoPilotReply(`✨ Đã bổ sung thành công "${suggestedDest.name}" vào Ngày ${targetDayNum}! Lịch trình và chi phí đã tự động cập nhật lại nha.`);
  };

  // ─── SAVE ITINERARY REAL PERSISTENCE ──────────────────────────────────────
  const handleSaveToggle = async () => {
    const record: SavedItineraryRecord = {
      id: `saved-${Date.now()}`,
      destination,
      title: `${destination}, đi là mê`,
      totalDays: daysCount,
      durationLabel: `${daysCount} ngày ${Math.max(1, daysCount - 1)} đêm`,
      startDate,
      peopleCount,
      budgetTier,
      totalEstimatedCost,
      savedAt: new Date().toLocaleDateString('vi-VN'),
      days: itineraryDays,
    };

    try {
      if (isBackendTripId(linkedTripId)) {
        const source = aiGenerationMetadata.provider === 'local'
          ? 'AI_LOCAL'
          : aiGenerationMetadata.provider === 'gemini'
            ? 'AI_GEMINI'
            : 'AI_OFFLINE';
        const mergeDays: MergeItineraryDay[] = itineraryDays.map((day) => ({
          dayNumber: day.dayNumber,
          activities: day.activities.map((activity, index) => {
            const [startTime, endTime] = activity.timeRange
              .split(/[–-]/)
              .map((value) => value.trim())
              .map((value) => /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : undefined);
            const destinationId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activity.id)
              ? activity.id
              : undefined;
            return {
              destinationId,
              customStopName: destinationId ? undefined : activity.title,
              startTime,
              endTime,
              sortOrder: index,
              note: activity.description,
              source,
            };
          }),
        }));
        await mergeTripItinerary(linkedTripId, mergeDays);
      }

      const stored = localStorage.getItem('vista_saved_itineraries');
      const list: SavedItineraryRecord[] = stored ? JSON.parse(stored) : [];
      list.unshift(record);
      localStorage.setItem('vista_saved_itineraries', JSON.stringify(list));
      setSavedItinerariesList(list);
      setSavedCount(list.length);
      setIsSaved(true);

      // If linked to an existing trip, update that trip's itinerary and cost in vista_custom_trips
      if (linkedTripId) {
        try {
          const storedTrips = localStorage.getItem('vista_custom_trips');
          if (storedTrips) {
            const tripList: Array<{ id: string; itineraryDays?: DayPlan[]; budgetTotal?: number; alertText?: string }> =
              JSON.parse(storedTrips);
            const idx = tripList.findIndex((t) => t.id === linkedTripId);
            if (idx !== -1) {
              tripList[idx].itineraryDays = itineraryDays;
              tripList[idx].budgetTotal = totalEstimatedCost;
              tripList[idx].alertText = `Lịch trình đã được cập nhật (${itineraryDays.reduce((acc, d) => acc + d.activities.length, 0)} hoạt động)`;
              localStorage.setItem('vista_custom_trips', JSON.stringify(tripList));
            }
          }
        } catch {
          // ignore
        }
        triggerToast(
          isBackendTripId(linkedTripId)
            ? `Đã đồng bộ lịch trình chính thức vào chuyến đi "${linkedTripTitle}"!`
            : `Đã lưu lịch trình vào chuyến đi cục bộ "${linkedTripTitle}"!`,
        );
      } else {
        triggerToast(`Đã lưu lịch trình "${destination}" vào bộ sưu tập cá nhân.`);
      }
    } catch (error) {
      console.error('Could not persist itinerary:', error);
      setIsSaved(false);
      triggerToast('Không thể đồng bộ lịch trình. Dữ liệu hiện tại vẫn được giữ nguyên để thử lại.');
    }
  };

  // ─── CREATE REAL GROUP TRIP DIRECTLY ON DATABASE ────────────────────────
  const handleCreateTripSubmit = async () => {
    const destName = destination.includes('Việt Nam') ? destination : `${destination}, Việt Nam`;
    const tripTitle = newTripTitle || `Chuyến đi ${destination} ${daysCount} ngày`;

    // Calculate dates
    const today = new Date();
    const startIso = today.toISOString().split('T')[0];
    const endDateObj = new Date(today);
    endDateObj.setDate(today.getDate() + Math.max(1, daysCount));
    const endIso = endDateObj.toISOString().split('T')[0];

    try {
      // 1. Create Trip directly on PostgreSQL Database via Spring Boot API
      const backendTrip = await apiRequest<any>('/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tripTitle,
          startDate: startIso,
          endDate: endIso,
          destinationSummary: destName,
          budgetTotal: totalEstimatedCost || 15000000,
          currency: 'VND',
        }),
      });

      const realTripId = backendTrip.id;

      if (typeof window !== 'undefined') {
        localStorage.setItem('vista_last_trip_id', realTripId);
        window.dispatchEvent(new CustomEvent('vista-trip-selected', { detail: realTripId }));
        window.dispatchEvent(new CustomEvent('vista_trip_changed', { detail: realTripId }));

        try {
          const storedTrips = localStorage.getItem('vista_custom_trips');
          const customList = storedTrips ? JSON.parse(storedTrips) : [];
          const newTripObj = {
            id: realTripId,
            title: tripTitle,
            destination: destName,
            startDate: startIso,
            endDate: endIso,
            itineraryDays,
            budgetTotal: totalEstimatedCost || 15000000,
            updatedAt: Date.now(),
          };
          const updatedList = [newTripObj, ...customList.filter((t: any) => t.id !== realTripId)];
          localStorage.setItem('vista_custom_trips', JSON.stringify(updatedList));
        } catch (e) {
          console.warn('Failed to save to vista_custom_trips:', e);
        }
      }

      setLinkedTripId(realTripId);
      setLinkedTripTitle(tripTitle);

      // 2. Persist AI itinerary days into database if activities exist
      if (Array.isArray(itineraryDays) && itineraryDays.length > 0) {
        try {
          const mergeDays: MergeItineraryDay[] = itineraryDays.map((d) => ({
            dayNumber: d.dayNumber,
            activities: d.activities.map((a, idx) => ({
              customStopName: a.title,
              note: a.description,
              startTime: a.timeSlot === 'MORNING' ? '08:00' : a.timeSlot === 'AFTERNOON' ? '14:00' : '19:00',
              endTime: a.timeSlot === 'MORNING' ? '11:30' : a.timeSlot === 'AFTERNOON' ? '17:00' : '21:30',
              sortOrder: idx + 1,
              source: 'AI_GEMINI',
            })),
          }));
          await mergeTripItinerary(realTripId, mergeDays);
        } catch (itinErr) {
          console.warn('Itinerary merge error:', itinErr);
        }
      }

      setShowCreateTripModal(false);
      triggerToast('🎉 Đã lưu chuyến đi và toàn bộ lịch trình AI vào Database thành công!');
      setTimeout(() => {
        router.push(`/trips/${realTripId}`);
      }, 700);
    } catch (err: any) {
      triggerToast(`⚠️ Không thể lưu vào Database: ${err.message || 'Lỗi kết nối'}`);
    }
  };

  // ─── REPLACE ACTIVITY HANDLER ─────────────────────────────────────────────
  const handleSelectReplacement = (place: ReplacementPlace) => {
    if (!replaceTargetActivityId) return;
    setItineraryDays((prev) =>
      prev.map((day) => ({
        ...day,
        activities: day.activities.map((act) => {
          if (act.id === replaceTargetActivityId) {
            return {
              ...act,
              category: place.category,
              title: place.title,
              description: place.description,
              location: `${place.title}, ${destination}`,
              costVnd: place.costVnd,
              costLabel: place.costLabel,
              photoUrl: place.photoUrl,
              latitude: place.latitude ?? act.latitude,
              longitude: place.longitude ?? act.longitude,
              whyVisitReason: place.description,
            };
          }
          return act;
        }),
      }))
    );
    if (replaceTargetActivityId) {
      setRejectedDestinationIds((prev) =>
        prev.includes(replaceTargetActivityId) ? prev : [...prev.slice(-19), replaceTargetActivityId]
      );
    }
    setReplaceTargetActivityId(null);
    setReplaceSearchQuery('');
    markDirty();
    triggerToast(`Đã thay địa điểm thành: ${place.title}`);
  };

  // ─── DELETE ACTIVITY HANDLER ──────────────────────────────────────────────
  const handleDeleteActivity = (actId: string) => {
    setItineraryDays((prev) =>
      prev.map((day) => ({
        ...day,
        activities: day.activities.filter((a) => a.id !== actId),
      }))
    );
    setActiveOverflowId(null);
    markDirty();
    triggerToast('Đã xóa hoạt động khỏi lịch trình.');
  };

  // ─── ADD ACTIVITY HANDLER (SUGGESTED OR CUSTOM) ───────────────────────────
  const handleAddActivity = () => {
    if (!newActTitle.trim()) return;
    const costNum = parseInt(newActCost, 10) || 0;
    const newAct: Activity = {
      id: `act-${Date.now()}`,
      timeSlot: 'AFTERNOON',
      timeRange: newActTime || '14:00–15:30',
      category: newActCategory,
      title: newActTitle,
      description:
        selectedSuggestedPlace?.description ||
        `Hoạt động do bạn thêm vào lịch trình trải nghiệm ${destination}.`,
      location: destination,
      costVnd: costNum,
      costLabel:
        costNum === 0
          ? 'Miễn phí'
          : `${new Intl.NumberFormat('vi-VN').format(costNum)}đ / người`,
      photoUrl: pickAuthenticPlacePhoto(
        selectedSuggestedPlace?.image,
        getRealPlacesByProvince(destination),
        0,
        activeDestObj.photo
      ),
      latitude: selectedSuggestedPlace?.latitude,
      longitude: selectedSuggestedPlace?.longitude,
    };

    setItineraryDays((prev) =>
      prev.map((day) => {
        if (day.dayNumber === activeDay) {
          return {
            ...day,
            activities: [...day.activities, newAct],
          };
        }
        return day;
      })
    );

    setShowAddActivityModal(false);
    setNewActTitle('');
    setSelectedSuggestedPlace(null);
    setAddActSearchQuery('');
    setAddActCategoryFilter('all');
    setShowActAutocomplete(false);
    markDirty();
    triggerToast(`Đã thêm "${newActTitle}" vào Ngày ${activeDay}.`);
  };

  return (
    <div className={styles.plannerPage}>
      {/* Decorative Sky Plane & Flight Path (As shown in mockup) */}
      <div className={styles.decorativeSkyPlane} aria-hidden="true">
        <svg width="220" height="110" viewBox="0 0 220 110" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 85 C 60 95, 90 40, 130 65 C 160 85, 175 40, 195 25"
            stroke="#93C5FD"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
          <path
            d="M130 65 C 145 75, 155 70, 150 55 C 145 42, 132 50, 130 65"
            stroke="#93C5FD"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          <g transform="translate(192, 15) rotate(22)">
            <path
              d="M21 16 L28 10 L28 12 L23 16 L23 20 L28 22 L28 24 L21 21 L13 26 L12 24 L16 19 L16 16 L6 13 L6 10 L16 13 L16 8 L13 5 L13 3 L18 5 L21 16 Z"
              fill="#0284C7"
            />
          </g>
        </svg>
      </div>

      {/* Decorative Tropical Palms at bottom right */}
      <div className={styles.decorativePalms} aria-hidden="true">
        <svg width="260" height="200" viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M260 120 C 200 130, 160 170, 140 200 L260 200 Z" fill="#E0F2FE" opacity="0.6" />
          <path d="M260 80 C 180 95, 130 150, 100 200 L260 200 Z" fill="#BAE6FD" opacity="0.4" />
          <g stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
            <path d="M260 150 Q 210 130 175 160 Q 210 145 260 150" fill="#BAE6FD" />
            <path d="M260 120 Q 200 100 155 135 Q 195 115 260 120" fill="#BAE6FD" />
            <path d="M260 90 Q 220 70 180 95 Q 215 80 260 90" fill="#93C5FD" />
          </g>
        </svg>
      </div>

      {/* ─── LINKED TRIP BANNER (BIDIRECTIONAL CONNECTION) ─── */}
      {linkedTripTitle && (
        <div style={{
          background: '#EFF6FF',
          borderBottom: '1px solid #BFDBFE',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13.5px',
          color: '#1E40AF',
          fontWeight: 600,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              padding: '4px 10px',
              borderRadius: '999px',
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Đang liên kết chuyến đi
            </span>
            <span>Lịch trình cho: <strong>{linkedTripTitle}</strong> ({destination})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleSaveToggle}
              style={{
                padding: '6px 14px',
                background: '#0070BA',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Lưu cập nhật vào Chuyến đi</span>
            </button>
            <Link
              href="/trips"
              style={{
                padding: '6px 14px',
                background: '#ffffff',
                color: '#1E40AF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              ← Về danh sách Chuyến đi
            </Link>
          </div>
        </div>
      )}

      {/* ─── 3. TWO-COLUMN PLANNING WORKSPACE ─── */}
      <main className={styles.workspaceContainer}>
        {/* ════════════════════════════════════════════════════════════════════
            LEFT COLUMN — TRIP PREFERENCES FORM CARD
            ════════════════════════════════════════════════════════════════════ */}
        <aside className={styles.preferencesCard} aria-label="Thiết lập chuyến đi">
          {/* Card Header */}
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIcon}>
              <Sparkles size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className={styles.cardHeaderTitle}>Thiết lập chuyến đi</h2>
              <p className={styles.cardHeaderDesc}>Tùy chỉnh lịch trình thông minh cùng AI</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    try {
                      localStorage.removeItem('vista_active_planner_state');
                      localStorage.removeItem('vista_saved_itineraries');
                      localStorage.removeItem('vista_planner_history');
                      localStorage.removeItem('vista_selected_province');
                      localStorage.removeItem('vista_custom_trips');
                    } catch {}
                    window.location.href = '/planner?reset=1';
                  }
                }}
                title="Xóa cache và làm mới bộ nhớ"
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={11} />
                <span>Xóa cache</span>
              </button>
              {planHistoryList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(true)}
                  title="Xem các lịch trình đã lưu"
                  style={{
                    background: '#E0F2FE',
                    border: '1px solid #BAE6FD',
                    color: '#0284C7',
                    borderRadius: '8px',
                    padding: '5px 9px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <Bookmark size={12} />
                  <span>Đã lưu ({planHistoryList.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* GROUP A — ĐIỂM ĐẾN & THỜI GIAN */}
          <div className={styles.formGroup}>
            <div className={styles.groupTitleWithBar}>Điểm đến & Lịch trình</div>

            {/* 1. Điểm đến (Đầy đủ 63 tỉnh thành & Tìm kiếm thông minh không dấu) */}
            <div className={styles.destinationSelectWrapper} ref={destDropdownRef}>
              <label className={styles.fieldLabel} htmlFor="dest-search-input">
                Điểm đến
              </label>
              <div
                className={`${styles.destinationInputWrapper} ${showDestDropdown ? styles.destinationInputWrapperActive : ''}`}
                onClick={() => setShowDestDropdown((prev) => !prev)}
              >
                <svg className={styles.destinationIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  id="dest-search-input"
                  type="text"
                  className={styles.destinationInput}
                  placeholder="Nhập hoặc tìm kiếm 63 tỉnh thành..."
                  value={showDestDropdown ? destSearchQuery : cleanDestName}
                  onChange={(e) => {
                    setDestSearchQuery(e.target.value);
                    setShowDestDropdown(true);
                  }}
                  onFocus={() => {
                    setShowDestDropdown(true);
                    if (!destSearchQuery) setDestSearchQuery('');
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredDestinations.length > 0) {
                        const top = filteredDestinations[0].nameVi;
                        changeDestination(top);
                        setShowDestDropdown(false);
                        setDestSearchQuery('');
                        triggerToast(`Đã chọn điểm đến: ${top}`);
                      } else if (destSearchQuery.trim()) {
                        const custom = destSearchQuery.trim();
                        changeDestination(custom);
                        setShowDestDropdown(false);
                        setDestSearchQuery('');
                        triggerToast(`Đã chọn điểm đến: ${custom}`);
                      }
                    }
                  }}
                />
                {destSearchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDestSearchQuery('');
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                      fontSize: '13px',
                      padding: '2px 6px',
                    }}
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  style={{
                    cursor: 'pointer',
                    transform: showDestDropdown ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Destination Dropdown (Hỗ trợ 63 tỉnh thành & Tìm kiếm không dấu) */}
              {showDestDropdown && (
                <div className={styles.destinationDropdown}>
                  {/* Quick selection chips for top destinations */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, marginBottom: '6px' }}>
                      🌟 ĐIỂM ĐẾN PHỔ BIẾN NHẤT:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {[
                        'Đà Nẵng',
                        'Hà Nội',
                        'TP. Hồ Chí Minh',
                        'Phú Quốc (Kiên Giang)',
                        'Đà Lạt (Lâm Đồng)',
                        'Nha Trang (Khánh Hòa)',
                        'Hội An (Quảng Nam)',
                        'Hà Tĩnh',
                        'Sa Pa (Lào Cai)',
                        'Ninh Bình',
                      ].map((popularName) => (
                        <button
                          key={popularName}
                          type="button"
                          onClick={() => {
                            changeDestination(popularName);
                            setShowDestDropdown(false);
                            setDestSearchQuery('');
                            triggerToast(`Đã chọn điểm đến: ${popularName}`);
                          }}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            border: destination === popularName ? '1px solid #0284C7' : '1px solid #CBD5E1',
                            background: destination === popularName ? '#E0F2FE' : '#FFFFFF',
                            color: destination === popularName ? '#0284C7' : '#334155',
                            fontWeight: destination === popularName ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          {popularName.replace(/\s*\(.*\)/, '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Count status */}
                  <div style={{ padding: '6px 12px', fontSize: '11px', color: '#64748B', fontWeight: 600, borderBottom: '1px solid #F1F5F9', background: '#FFFFFF' }}>
                    {filteredDestinations.length > 0
                      ? `Có ${filteredDestinations.length} điểm đến khớp tìm kiếm (Đầy đủ 63 tỉnh thành)`
                      : `Không tìm thấy tỉnh thành có tên "${destSearchQuery}"`}
                  </div>

                  {/* Empty state: allow selecting typed string or resetting */}
                  {filteredDestinations.length === 0 && (
                    <div style={{ padding: '14px 12px', textAlign: 'center', background: '#FFFFFF' }}>
                      <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 10px 0' }}>
                        Bạn có thể dùng <strong>&quot;{destSearchQuery}&quot;</strong> làm điểm đến hoặc xem lại danh sách:
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const customName = destSearchQuery.trim();
                            if (customName) {
                              changeDestination(customName);
                              setShowDestDropdown(false);
                              setDestSearchQuery('');
                              triggerToast(`Đã chọn điểm đến: ${customName}`);
                            }
                          }}
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#FFFFFF',
                            background: '#0284C7',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Dùng &quot;{destSearchQuery}&quot;
                        </button>
                        <button
                          type="button"
                          onClick={() => setDestSearchQuery('')}
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#475569',
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          Xem tất cả 63 tỉnh thành
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Destination List Items */}
                  {filteredDestinations.map((d) => (
                    <div
                      key={d.id}
                      className={`${styles.destinationItem} ${destination === d.nameVi || destination === d.province ? styles.destinationItemActive : ''}`}
                      onClick={() => {
                        const chosen = d.nameVi;
                        changeDestination(chosen);
                        setShowDestDropdown(false);
                        setDestSearchQuery('');
                        if (hasPlanGenerated) {
                          if (d.id === 'phuquoc' || chosen.includes('Phú Quốc')) {
                            setItineraryDays(INITIAL_PHUQUOC_DAYS);
                            setActiveDay(1);
                            setNewTripTitle(`Chuyến đi Phú Quốc ${daysCount} ngày`);
                            triggerToast('Đã tải lịch trình thông minh cho Phú Quốc!');
                          } else if (d.id === 'danang' || chosen.includes('Đà Nẵng')) {
                            setItineraryDays(INITIAL_DANANG_DAYS);
                            setActiveDay(1);
                            setNewTripTitle(`Chuyến đi Đà Nẵng ${daysCount} ngày`);
                            triggerToast('Đã tải lịch trình thông minh cho Đà Nẵng!');
                          } else {
                            const customPlan = generateDistinctDayPlan(
                              chosen,
                              daysCount,
                              isLateEveningDeparture,
                              budgetTier,
                              selectedStyles,
                              d.lat,
                              d.lng,
                              d.photo
                            );
                            setItineraryDays(customPlan);
                            setActiveDay(1);
                            setNewTripTitle(`Chuyến đi ${chosen} ${daysCount} ngày`);
                            triggerToast(`Đã tải lịch trình thông minh cho ${chosen}!`);
                          }
                        } else {
                          triggerToast(`Đã chọn điểm đến: ${chosen}`);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600 }}>{d.nameVi}</span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>{d.province} · Miền {d.region}</span>
                      </div>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#F1F5F9', color: '#475569', fontWeight: 600 }}>
                        {d.region === 'Bắc' ? 'Miền Bắc' : d.region === 'Trung' ? 'Miền Trung' : 'Miền Nam'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Ngày khởi hành (Smart Departure Cockpit) */}
            <div>
              <label className={styles.fieldLabel} htmlFor="start-date-input">
                Ngày khởi hành
              </label>

              <div className={styles.dateCockpitCard}>
                <div
                  className={styles.dateCockpitMain}
                  onClick={handleOpenDatePicker}
                  role="button"
                  tabIndex={0}
                  title="Bấm để mở lịch chọn ngày"
                >
                  <div className={styles.dateStampBox}>
                    <span className={styles.dateStampDayOfWeek}>{departureDateInfo.shortDayOfWeek}</span>
                    <span className={styles.dateStampNumber}>{departureDateInfo.dayNumber}</span>
                  </div>
                  <div className={styles.dateCockpitDetails}>
                    <span className={styles.dateCockpitTitle}>
                      {departureDateInfo.dayOfWeek}, {departureDateInfo.dayNumber} {departureDateInfo.monthYear}
                    </span>
                    <div className={styles.dateCockpitSubRow}>
                      {departureDateInfo.relativeText && (
                        <span className={styles.dateCockpitBadge}>{departureDateInfo.relativeText}</span>
                      )}
                      <span className={styles.dateCockpitHint}>Bấm mở lịch</span>
                    </div>
                  </div>
                  <div className={styles.dateCockpitCalendarIcon}>
                    <Calendar size={17} strokeWidth={2.2} />
                  </div>
                  <input
                    ref={startDateInputRef}
                    id="start-date-input"
                    type="date"
                    min={getTodayIso()}
                    className={styles.dateCockpitHiddenInput}
                    value={startDate}
                    onChange={(e) => {
                      const chosen = e.target.value;
                      if (chosen && chosen < getTodayIso()) {
                        triggerToast('Không thể chọn ngày trong quá khứ!');
                        return;
                      }
                      setStartDate(chosen);
                      markDirty();
                    }}
                  />
                </div>

                {/* Quick Date Segmented Bar */}
                <div className={styles.dateSegmentedCapsule}>
                  <button
                    type="button"
                    className={`${styles.dateSegmentBtn} ${startDate === getTodayIso() ? styles.dateSegmentBtnActive : ''}`}
                    onClick={() => {
                      setStartDate(getTodayIso());
                      markDirty();
                    }}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    className={`${styles.dateSegmentBtn} ${startDate === getFutureDateIso(1) ? styles.dateSegmentBtnActive : ''}`}
                    onClick={() => {
                      setStartDate(getFutureDateIso(1));
                      markDirty();
                    }}
                  >
                    Ngày mai
                  </button>
                  <button
                    type="button"
                    className={`${styles.dateSegmentBtn} ${startDate === getWeekendIso() ? styles.dateSegmentBtnActive : ''}`}
                    onClick={() => {
                      setStartDate(getWeekendIso());
                      markDirty();
                    }}
                  >
                    Cuối tuần
                  </button>
                </div>
              </div>

              {/* Weather Widget Strip — Clean Typography, No Emoticon Clutter */}
              <div
                className={styles.weatherCockpitStrip}
                onClick={() =>
                  triggerToast(
                    realtimeWeather
                      ? `Thời tiết thực tế tại ${cleanDestName} (${realtimeWeather.updatedTime}): ${realtimeWeather.tempFormatted} - ${realtimeWeather.statusVi}. Độ ẩm: ${realtimeWeather.humidity}%, Gió: ${realtimeWeather.windSpeed} km/h. Lời khuyên VISTA: ${realtimeWeather.adviceVi}`
                      : `Thời tiết ${cleanDestName} hôm nay: ${destWeatherInsight.temp} - ${destWeatherInsight.text}`
                  )
                }
                role="button"
                tabIndex={0}
                title="Bấm để xem chi tiết thời tiết realtime"
              >
                <div className={styles.weatherCockpitLeft}>
                  <span className={styles.weatherCockpitDot} />
                  <span className={styles.weatherCockpitLocation}>
                    {cleanDestName} · {realtimeWeather ? realtimeWeather.tempFormatted : (destWeatherInsight.temp.split('–')[0].trim() || '24°C')}
                  </span>
                  {realtimeWeather?.isLive && (
                    <span className={styles.weatherLiveBadge}>Live</span>
                  )}
                </div>
                <span className={styles.weatherCockpitDesc}>
                  {realtimeWeather ? realtimeWeather.statusVi : 'Nhiều mây, trời dịu'}
                </span>
              </div>

              {/* Smart Night-Shift Mode (T1) — High-tech Minimalist Slate */}
              {isLateEveningDeparture && (
                <div className={styles.nightShiftCard}>
                  <div className={styles.nightShiftHeader}>
                    <span className={styles.nightShiftBadge}>LỘ TRÌNH ĐÊM</span>
                    <span className={styles.nightShiftTime}>Sau 20:00</span>
                  </div>
                  <div className={styles.nightShiftBody}>
                    <div className={styles.nightShiftTitle}>Tự động điều chỉnh Ngày 1</div>
                    <div className={styles.nightShiftSteps}>
                      <span className={styles.nightShiftStep}>1. Nhận phòng</span>
                      <span className={styles.nightShiftArrow}>→</span>
                      <span className={styles.nightShiftStep}>2. Ăn tối muộn</span>
                      <span className={styles.nightShiftArrow}>→</span>
                      <span className={styles.nightShiftStep}>3. Dạo đêm</span>
                    </div>
                    <p className={styles.nightShiftDesc}>
                      Đã tối ưu lược bỏ các hoạt động sáng & chiều không khả thi.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Thời lượng */}
            <div>
              <label className={styles.fieldLabel}>Thời lượng</label>
              <div className={styles.durationChips}>
                {DURATION_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className={`${styles.chipBtn} ${duration === chip.id ? styles.chipBtnActive : ''}`}
                    onClick={() => {
                      setDuration(chip.id);
                      markDirty();
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GROUP B — PHONG CÁCH CHUYẾN ĐI (Compact & Refined Style Pills) */}
          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div className={styles.groupTitleWithBar} style={{ margin: 0 }}>Sở thích trải nghiệm</div>
              <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 700, background: '#E0F2FE', padding: '2px 8px', borderRadius: '99px' }}>
                {selectedStyles.length} đã chọn (Ưu tiên 2–3)
              </span>
            </div>

            <div className={styles.stylesPillsGrid}>
              {displayedStyles.map((st) => {
                const isSelected = selectedStyles.includes(st.id);
                const priorityRank = selectedStyles.indexOf(st.id);
                const IconCmp = st.icon;
                return (
                  <button
                    key={st.id}
                    type="button"
                    className={`${styles.stylePillBtn} ${isSelected ? styles.stylePillBtnActive : ''}`}
                    onClick={() => toggleStyle(st.id)}
                    title={st.label}
                  >
                    <div className={styles.stylePillLeft}>
                      <div
                        className={styles.stylePillIconBox}
                        style={{
                          backgroundColor: isSelected ? st.activeBg : st.bg,
                          color: st.color,
                        }}
                      >
                        <IconCmp size={14} strokeWidth={2.2} />
                      </div>
                      <span className={styles.stylePillLabel}>{st.label}</span>
                    </div>
                    {isSelected && (
                      <div
                        className={styles.stylePillCheckCircle}
                        title={priorityRank < 3 ? `Sở thích ưu tiên #${priorityRank + 1}` : 'Đã chọn'}
                        style={priorityRank < 3 ? { width: 'auto', padding: '0 5px', borderRadius: '99px', fontSize: '9.5px', fontWeight: 700 } : undefined}
                      >
                        {priorityRank < 3 ? `#${priorityRank + 1}` : <Check size={10} strokeWidth={3} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {hasPlanGenerated && hasUnsavedChanges && (
              <button
                type="button"
                onClick={() => handleGenerateClick()}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  minHeight: '36px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                }}
              >
                <span>🔄 Áp dụng sở thích mới & Cập nhật lịch trình ngay</span>
              </button>
            )}

            <button
              type="button"
              className={styles.btnToggleMoreStyles}
              onClick={() => setShowAllStyles((prev) => !prev)}
            >
              {showAllStyles ? (
                <>
                  <span>Thu gọn bớt</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                </>
              ) : (
                <>
                  <span>Xem thêm +{TRAVEL_STYLES.length - 6} phong cách khác</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                </>
              )}
            </button>
          </div>

          {/* GROUP C — THÀNH VIÊN & NGÂN SÁCH */}
          <div className={styles.formGroup}>
            <div className={styles.groupTitleWithBar}>Thành viên & Ngân sách</div>

            {/* Unified Card for Group C */}
            <div className={styles.groupCUnifiedCard}>
              {/* Row 1: Số người tham gia */}
              <div className={styles.groupCFieldRow}>
                <div className={styles.groupCFieldMeta}>
                  <label className={styles.groupCLabel}>Số người tham gia</label>
                  <span className={styles.groupCSubLabel}>Người lớn & trẻ em</span>
                </div>
                <div className={styles.counterControlModern}>
                  <button
                    type="button"
                    className={styles.counterBtnModern}
                    disabled={peopleCount <= 1}
                    onClick={() => {
                      setPeopleCount((p) => Math.max(1, p - 1));
                      markDirty();
                    }}
                    aria-label="Giảm số người"
                  >
                    –
                  </button>
                  <span className={styles.counterValueModern}>{peopleCount} người</span>
                  <button
                    type="button"
                    className={styles.counterBtnModern}
                    onClick={() => {
                      setPeopleCount((p) => p + 1);
                      markDirty();
                    }}
                    aria-label="Tăng số người"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.groupCDivider} />

              {/* Row 2: Hạng mức chi tiêu (Segmented Capsule Bar) */}
              <div className={styles.groupCSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.groupCLabel}>Hạng mức chi tiêu</label>
                  <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600 }}>
                    {budgetTier === 'economy' ? 'Tiết kiệm' : budgetTier === 'luxury' ? 'Cao cấp' : 'Tiêu chuẩn'}
                  </span>
                </div>
                <div className={styles.segmentedCapsuleBar}>
                  {BUDGET_OPTIONS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`${styles.segmentedCapsuleBtn} ${budgetTier === b.id ? styles.segmentedCapsuleBtnActive : ''}`}
                      onClick={() => {
                        setBudgetTier(b.id);
                        markDirty();
                      }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.groupCDivider} />

              {/* Row 2.5: Nhịp độ chuyến đi (Pace Selector) */}
              <div className={styles.groupCSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.groupCLabel}>Nhịp độ di chuyển</label>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                    {activePace === 'RELAXED' ? '🌿 Thư thả' : activePace === 'INTENSIVE' ? '⚡ Đi nhiều' : '⚖️ Cân bằng'}
                  </span>
                </div>
                <div className={styles.segmentedCapsuleBar}>
                  {[
                    { id: 'RELAXED', label: '🌿 Thư thả' },
                    { id: 'MODERATE', label: '⚖️ Cân bằng' },
                    { id: 'INTENSIVE', label: '⚡ Đi nhiều' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`${styles.segmentedCapsuleBtn} ${activePace === p.id ? styles.segmentedCapsuleBtnActive : ''}`}
                      onClick={() => {
                        setActivePace(p.id as any);
                        markDirty();
                        if (hasPlanGenerated) {
                          executeStructuredReplan(`Đổi nhịp độ sang ${p.label}`, { action: 'CHANGE_PACE', pace: p.id });
                        }
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.groupCDivider} />

              {/* Row 3: Thêm mong muốn riêng */}
              <div className={styles.groupCSection}>
                <button
                  type="button"
                  className={`${styles.wishesTriggerPillModern} ${showWishes ? styles.wishesTriggerPillModernActive : ''}`}
                  onClick={() => setShowWishes((prev) => !prev)}
                  aria-expanded={showWishes}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '13px' }}>✨</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#142D4E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {wishesText ? `Mong muốn: ${wishesText}` : '+ Thêm mong muốn riêng'}
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    style={{
                      transform: showWishes ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s ease',
                      color: '#0284C7',
                      flexShrink: 0,
                    }}
                  />
                </button>

                {showWishes && (
                  <div className={styles.wishesExpandContainerModern}>
                    <textarea
                      className={styles.wishesTextareaModern}
                      placeholder="Ví dụ: ít đi bộ, ưu tiên ẩm thực bản địa, có người lớn tuổi hoặc trẻ em..."
                      value={wishesText}
                      rows={2}
                      onChange={(e) => {
                        setWishesText(e.target.value);
                        markDirty();
                      }}
                    />
                    <div className={styles.wishesQuickTagsRow}>
                      {[
                        { label: '🌿 Món chay', val: 'Ưu tiên ẩm thực chay' },
                        { label: '👶 Có trẻ nhỏ', val: 'Lịch trình nhẹ nhàng cho trẻ nhỏ' },
                        { label: '👴 Người lớn tuổi', val: 'Ít bậc thang, nghỉ ngơi thoải mái' },
                        { label: '📸 Sống ảo', val: 'Ưu tiên các góc check-in đẹp' },
                      ].map((tag) => (
                        <button
                          key={tag.label}
                          type="button"
                          className={styles.wishesQuickTagBtn}
                          onClick={() => {
                            const newText = wishesText
                              ? `${wishesText.replace(/[,.]\s*$/, '')}, ${tag.val}`
                              : tag.val;
                            setWishesText(newText);
                            markDirty();
                          }}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className={styles.fieldHintModern}>
              <span style={{ color: '#0284C7' }}>ⓘ</span> Chi phí & tuyến đường được AI tự động cân đối theo số người và hạng mức.
            </p>

            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowAdvancedOptions((p) => !p)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#65758A',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{showAdvancedOptions ? 'Thu gọn tùy chọn khác' : 'Mở rộng tùy chọn khác'}</span>
                <span style={{ fontSize: '10px' }}>{showAdvancedOptions ? '⌃' : '⌵'}</span>
              </button>
            </div>
          </div>

          {/* Sticky CTA Action Dock — Always easily accessible */}
          <div className={styles.sidebarStickyCta}>
            {hasUnsavedChanges && (
              <div className={styles.dirtyIndicator}>
                <Clock size={13} className={styles.dirtyIndicatorIcon} />
                <span>Có thiết lập mới chưa áp dụng</span>
              </div>
            )}

            <button
              type="button"
              className={styles.btnPrimaryAction}
              onClick={handleGenerateClick}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <div className={styles.spinnerBlue} style={{ width: '18px', height: '18px', borderWidth: '2px', borderColor: '#FFFFFF', borderTopColor: 'transparent' }} />
              ) : (
                <Sparkles size={16} />
              )}
              <span>{isGenerating ? 'Đang tạo lịch trình...' : 'Tạo lịch trình với AI'}</span>
            </button>

            <p className={styles.formActionSubtext}>
              Tối ưu hóa hành trình bằng AI & dữ liệu hơn 2.000 điểm đến thực tế.
            </p>
          </div>
        </aside>

        {/* ════════════════════════════════════════════════════════════════════
            RIGHT COLUMN — REAL GENERATED ITINERARY WORKSPACE
            ════════════════════════════════════════════════════════════════════ */}
        <section className={styles.itineraryWorkspace} aria-label="Lịch trình gợi ý">
          {/* ─── REAL GENERATING LOADING SKELETON ─── */}
          {isGenerating && <SkeletonAiGenerating />}

          {/* ─── CLEAN INITIAL STATE: HERO SHOWCASE & SUGGESTED CARDS (AS IN MOCKUP) ─── */}
          {!isGenerating && !hasPlanGenerated && (
            <div className={styles.cleanWorkspaceWrapper}>
              {/* Top Hero Destination Showcase Banner */}
              <div className={styles.emptyHeroShowcase}>
                <img
                  src={activeHero.image}
                  alt={activeHero.title}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg';
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 0,
                  }}
                />
                <div className={styles.emptyHeroOverlay} />
                <div className={styles.emptyHeroContent}>
                  <span className={styles.emptyHeroTag}>
                    <MapPin size={13} color="#0088CC" />
                    <span>{activeHero.countryTag}</span>
                  </span>
                  <h2 className={styles.emptyHeroTitle}>{activeHero.title}</h2>
                  <p className={styles.emptyHeroSubtitle}>{activeHero.subtitle}</p>
                </div>

                {/* Carousel Navigation Buttons */}
                <div className={styles.emptyHeroNav}>
                  <button
                    type="button"
                    className={styles.emptyHeroNavBtn}
                    onClick={handlePrevHero}
                    aria-label="Điểm đến trước"
                    title="Điểm đến trước"
                  >
                    <ChevronLeft size={18} color="#0F172A" />
                  </button>
                  <button
                    type="button"
                    className={styles.emptyHeroNavBtn}
                    onClick={handleNextHero}
                    aria-label="Điểm đến tiếp theo"
                    title="Điểm đến tiếp theo"
                  >
                    <ChevronRight size={18} color="#0F172A" />
                  </button>
                </div>
              </div>

              {/* Suggested Itineraries Section */}
              <div className={styles.suggestedSection}>
                <div className={styles.suggestedHeader}>
                  <h3 className={styles.suggestedHeaderTitle}>
                    <Sparkles size={18} color="#F59E0B" />
                    <span>Lịch trình gợi ý cho bạn</span>
                  </h3>
                  <button
                    type="button"
                    className={styles.suggestedHeaderLink}
                    onClick={() => setShowSavedDrawer(true)}
                  >
                    <span>Xem tất cả</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* 3 Responsive Cards Grid */}
                <div className={styles.suggestedGrid}>
                  {suggestedCards.map((card) => (
                    <div
                      key={card.id}
                      className={styles.suggestedCard}
                      onClick={() => handleApplyTemplate(card)}
                      role="button"
                      tabIndex={0}
                      title={`Xem lịch trình ${card.title}`}
                    >
                      <div className={styles.suggestedCardImageWrapper}>
                        <img
                          src={card.image}
                          alt={card.title}
                          className={styles.suggestedCardImage}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg';
                          }}
                        />
                        <span className={styles.suggestedCardBadge}>
                          {card.durationBadge}
                        </span>
                        {(card as any).themeBadge && (
                          <span className={styles.suggestedCardThemeBadge}>
                            {(card as any).themeBadge}
                          </span>
                        )}
                      </div>

                      <div className={styles.suggestedCardBody}>
                        <h4 className={styles.suggestedCardTitle}>{card.title}</h4>
                        {(card as any).subtitle && (
                          <p className={styles.suggestedCardSubtitle}>{(card as any).subtitle}</p>
                        )}
                        <div className={styles.suggestedCardFooter}>
                          <div className={styles.suggestedCardMeta}>
                            <Clock size={12} />
                            <span>
                              {card.timeInfo} · <MapPin size={11} style={{ display: 'inline', margin: '0 1px' }} /> {card.destInfo}
                            </span>
                          </div>
                          <div className={styles.suggestedCardArrow}>
                            <ChevronRight size={15} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── GENERATED ITINERARY VIEW (LIVE PRODUCT) ─── */}
          {!isGenerating && hasPlanGenerated && (
            <>
              {/* 1. DESTINATION HERO BANNER (Top of Itinerary Workspace) */}
              <div
                className={styles.destinationHeroBanner}
                style={{
                  backgroundImage: `url(${activeHero.image || activeDestObj.photo || '/destinations/danang.jpg'})`,
                }}
              >
                <div className={styles.heroOverlay} />
                <div className={styles.heroContent}>
                  <span className={styles.heroTag}>
                    <MapPin size={12} color="#0284C7" />
                    <span>{destination}</span>
                  </span>
                  <h2 className={styles.heroTitle}>{destination}</h2>
                  <p className={styles.heroSubtitle}>
                    {getDestinationTagline(destination)}
                  </p>
                  <button
                    type="button"
                    className={styles.heroCtaBtn}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open(`https://www.google.com/search?q=${encodeURIComponent('Du lịch ' + destination)}`, '_blank');
                      }
                    }}
                  >
                    <span>Khám phá điểm đến</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div className={styles.heroStatsGlass}>
                  <div className={styles.heroStatRow}>
                    <span>Thời lượng</span>
                    <span className={styles.heroStatValue}>
                      {daysCount}N{Math.max(0, daysCount - 1)}Đ · {peopleCount} khách
                    </span>
                  </div>
                  <div className={styles.heroStatRow}>
                    <span>Tổng dự toán</span>
                    <span className={styles.heroStatHighlight}>
                      ~{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalBaseline)}đ
                    </span>
                  </div>
                  <div className={styles.heroStatRow}>
                    <span>Động cơ AI</span>
                    <span className={styles.heroStatValue} style={{ color: '#059669' }}>
                      {isApiKeyMode ? '✨ Gemini Engine' : '⚙️ Thuật toán tối ưu'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. ITINERARY HEADER BAR (Title, Duration, Actions) */}
              <div className={styles.itineraryHeaderBar}>
                <div className={styles.itineraryHeaderLeft} style={{ position: 'relative' }}>
                  <div className={styles.itineraryHeaderIcon}>
                    <Calendar size={18} color="#0284C7" />
                  </div>
                  <h3 className={styles.itineraryHeaderTitle}>
                    Lịch trình chuyến đi {destination}
                  </h3>
                  <span className={styles.durationPill}>
                    {duration}
                  </span>

                  {/* Section 9.1: Internal Plan Source Indicator Dot (ONLY rendered when admin inspection permission & mode are active) */}
                  {hasAdminInspectPermission && adminInspectMode && (
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '4px' }}>
                      {(() => {
                        const curSrc = internalDiagnostics?.current_source || {
                          source_code: 'UNRECORDED',
                          label: 'Chưa ghi nhận nguồn',
                          color: 'gray',
                        };
                        const initSrc = internalDiagnostics?.initial_plan_source || curSrc;
                        const lastReplanSrc = internalDiagnostics?.last_replan_source || null;
                        const dotColor =
                          curSrc.color === 'blue' || curSrc.source_code === 'MODEL_ASSISTED'
                            ? '#2563EB'
                            : curSrc.color === 'orange' || curSrc.source_code === 'FALLBACK_TO_ALGORITHM'
                              ? '#F97316'
                              : '#64748B';
                        return (
                          <>
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={`Nguồn lập lịch: ${curSrc.label}`}
                              aria-expanded={showSourcePopover}
                              title={`Nguồn lập lịch: ${curSrc.label}`}
                              onClick={() => setShowSourcePopover((prev) => !prev)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setShowSourcePopover((prev) => !prev);
                                } else if (e.key === 'Escape') {
                                  setShowSourcePopover(false);
                                }
                              }}
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: dotColor,
                                display: 'inline-block',
                                cursor: 'pointer',
                                boxShadow: `0 0 0 2px #FFFFFF, 0 0 0 3px ${dotColor}40`,
                                outline: 'none',
                              }}
                            />
                            {showSourcePopover && (
                              <div
                                role="dialog"
                                aria-label="Chi tiết nguồn lập lịch nội bộ"
                                style={{
                                  position: 'absolute',
                                  top: '22px',
                                  left: 0,
                                  zIndex: 60,
                                  minWidth: '280px',
                                  padding: '12px 14px',
                                  borderRadius: '10px',
                                  backgroundColor: '#0F172A',
                                  color: '#F8FAFC',
                                  fontSize: '12px',
                                  lineHeight: 1.5,
                                  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.35)',
                                  border: '1px solid #334155',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <strong style={{ color: '#FFFFFF', fontSize: '12.5px' }}>
                                    Nguồn lập lịch: {curSrc.label}
                                  </strong>
                                  <button
                                    type="button"
                                    onClick={() => setShowSourcePopover(false)}
                                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div style={{ color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div>• <strong>Lịch ban đầu:</strong> {initSrc.label || 'Chưa ghi nhận nguồn'}</div>
                                  {lastReplanSrc && (
                                    <div>• <strong>Lần chỉnh gần nhất:</strong> {lastReplanSrc.label}</div>
                                  )}
                                  {curSrc.run_id && (
                                    <div>• <strong>Mã lần tạo:</strong> <code>{curSrc.run_id}</code></div>
                                  )}
                                  {curSrc.timestamp && (
                                    <div>• <strong>Thời gian:</strong> {curSrc.timestamp}</div>
                                  )}
                                  {curSrc.fallback_reason && (
                                    <div style={{ marginTop: '4px', padding: '5px 8px', borderRadius: '6px', background: '#431407', color: '#FDBA74', border: '1px solid #9A3412' }}>
                                      ⚠️ <strong>Lý do chuyển sang thuật toán:</strong> {curSrc.fallback_reason}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className={styles.itineraryHeaderRight}>
                  {hasAdminInspectPermission && (
                    <button
                      type="button"
                      className={styles.btnOutlineAction}
                      onClick={() => {
                        const next = !adminInspectMode;
                        setAdminInspectMode(next);
                        setShowSourcePopover(false);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('vista_admin_inspect_mode', next ? '1' : '0');
                        }
                      }}
                      style={
                        adminInspectMode
                          ? { borderColor: '#0284C7', backgroundColor: '#F0F9FF', color: '#0369A1' }
                          : undefined
                      }
                      title="Bật/tắt chế độ kiểm tra nguồn lập lịch nội bộ (Chỉ hiển thị cho quản trị viên)"
                    >
                      <ShieldCheck size={14} />
                      <span>Chế độ kiểm tra {adminInspectMode ? '(Bật)' : '(Tắt)'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.btnOutlineAction}
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.share) {
                        navigator.share({
                          title: `Lịch trình VISTA ${destination}`,
                          text: `Xem lịch trình ${destination} ${duration} của tôi trên VISTA!`,
                          url: window.location.href,
                        }).catch(() => {});
                      } else if (typeof navigator !== 'undefined') {
                        navigator.clipboard.writeText(window.location.href);
                        setShowToast('Đã sao chép liên kết lịch trình!');
                        setTimeout(() => setShowToast(null), 3000);
                      }
                    }}
                  >
                    <Share2 size={15} />
                    <span>Chia sẻ</span>
                  </button>

                  <button
                    type="button"
                    className={styles.btnOutlineAction}
                    onClick={handleSaveCurrentPlan}
                    title="Lưu vào lịch sử chuyến đi"
                  >
                    <Bookmark size={15} />
                    <span>Lưu</span>
                  </button>

                  <button
                    type="button"
                    className={styles.btnPrimaryActionSmall}
                    onClick={() => setShowCoPilot(!showCoPilot)}
                  >
                    <Sparkles size={15} />
                    <span>Chỉnh sửa với AI</span>
                  </button>
                </div>
              </div>

              {/* Collapsible AI Copilot Re-planner */}
              {showCoPilot && (
                <div className={styles.aiSmartPromptBox} style={{ margin: '0 0 16px 0' }}>
                  <div className={styles.aiSmartPromptHeader}>
                    <div className={styles.aiSmartPromptTitle}>
                      <Sparkles size={16} color="#0284C7" />
                      <span>Trợ lý AI Co-Pilot: Tinh chỉnh & Điều hướng chuyến đi</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCoPilot(false)}
                      style={{ background: 'none', border: 'none', color: '#65758A', cursor: 'pointer', fontSize: '13px' }}
                    >
                      Đóng ✕
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (coPilotInput.trim()) {
                        handleCoPilotCommand(coPilotInput);
                      }
                    }}
                    className={styles.aiSmartPromptInputWrapper}
                  >
                    <input
                      type="text"
                      className={styles.aiSmartPromptInput}
                      placeholder="Ví dụ: Tôi muốn ngủ nướng ngày 2, đổi trưa sang hải sản, sửa giá phòng khách sạn..."
                      value={coPilotInput}
                      onChange={(e) => setCoPilotInput(e.target.value)}
                      disabled={isCoPilotBusy}
                    />
                    <button
                      type="submit"
                      className={styles.aiSmartPromptBtn}
                      disabled={isCoPilotBusy || !coPilotInput.trim()}
                    >
                      <Sparkles size={14} />
                      <span>{isCoPilotBusy ? 'Đang phân tích...' : 'Gửi yêu cầu'}</span>
                    </button>
                  </form>

                  {/* Quick Action Chips */}
                  <div className={styles.aiSmartPromptPills}>
                    <span className={styles.aiSmartPromptPillLabel}>Gợi ý nhanh:</span>
                    <button
                      type="button"
                      className={styles.aiSmartPromptPill}
                      onClick={() => handleCoPilotCommand(`Cho mình ngủ nướng Ngày ${activeDay}`)}
                      disabled={isCoPilotBusy}
                    >
                      😴 Ngủ nướng Ngày {activeDay}
                    </button>
                    <button
                      type="button"
                      className={styles.aiSmartPromptPill}
                      onClick={() => handleCoPilotCommand(`Ở ${destination} có món gì ngon và quán nào chất lượng?`)}
                      disabled={isCoPilotBusy}
                    >
                      🦞 Đặc sản {destination}
                    </button>
                    <button
                      type="button"
                      className={styles.aiSmartPromptPill}
                      onClick={() => handleCoPilotCommand(`Đổi bữa trưa Ngày ${activeDay} sang quán hải sản tươi sống`)}
                      disabled={isCoPilotBusy}
                    >
                      🦀 Đổi trưa hải sản
                    </button>
                    <button
                      type="button"
                      className={styles.aiSmartPromptPill}
                      onClick={() => handleCoPilotCommand(`Gợi ý quán cafe view đẹp ngắm hoàng hôn ở ${destination}`)}
                      disabled={isCoPilotBusy}
                    >
                      ☕ Cafe view hoàng hôn
                    </button>
                    <button
                      type="button"
                      className={styles.aiSmartPromptPill}
                      onClick={() => handleCoPilotCommand('Đoàn có người lớn tuổi, đi lại nhẹ nhàng thôi')}
                      disabled={isCoPilotBusy}
                    >
                      👨‍👩‍👧 Nhẹ nhàng gia đình
                    </button>
                    <button
                      type="button"
                      className={styles.aiSmartPromptPill}
                      onClick={() => handleCoPilotCommand('Làm sao để sửa giá khách sạn và chi phí?')}
                      disabled={isCoPilotBusy}
                    >
                      💵 Sửa giá khách sạn
                    </button>
                    <button
                      type="button"
                      className={styles.aiSmartPromptPill}
                      onClick={() => handleCoPilotCommand('Mở bản đồ di chuyển')}
                      disabled={isCoPilotBusy}
                    >
                      🗺️ Mở bản đồ lộ trình
                    </button>
                  </div>

                  {/* AI Assistant Conversational Reply Card & Suggestions */}
                  {coPilotReply && (
                    <div className={styles.coPilotReplyCard}>
                      <div className={styles.coPilotReplyHeader}>
                        <span className={styles.coPilotReplyBadge}>
                          <Sparkles size={12} />
                          <span>Thổ Địa Du Lịch AI Sành Sỏi VISTA</span>
                        </span>
                        <button
                          type="button"
                          className={styles.coPilotReplyDismiss}
                          onClick={() => {
                            setCoPilotReply(null);
                            setCoPilotInsiderTip(null);
                            setCoPilotProactive(null);
                            setCoPilotSuggestions([]);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      <p className={styles.coPilotReplyText}>{coPilotReply}</p>

                      {coPilotInsiderTip && (
                        <div className={styles.coPilotInsiderBox}>
                          <span className={styles.coPilotInsiderTitle}>
                            💡 Thổ Địa Mách Nước:
                          </span>
                          <p className={styles.coPilotInsiderText}>{coPilotInsiderTip}</p>
                        </div>
                      )}

                      {coPilotProactive && (
                        <div className={styles.coPilotProactiveBox}>
                          <span>🎯</span>
                          <span>{coPilotProactive}</span>
                        </div>
                      )}

                      {coPilotSuggestions.length > 0 && (
                        <div className={styles.coPilotSuggestionsBox}>
                          <span className={styles.coPilotSuggestionsTitle}>Gợi ý trải nghiệm dành riêng cho bạn:</span>
                          <div className={styles.coPilotSuggestionsList}>
                            {coPilotSuggestions.map((sug) => (
                              <div key={sug.name} className={styles.coPilotSuggestionItem}>
                                <div className={styles.coPilotSuggestionInfo}>
                                  <span className={styles.coPilotSuggestionName}>{sug.name}</span>
                                  <span className={styles.coPilotSuggestionMeta}>
                                    {sug.category} · {sug.priceMin ? `${new Intl.NumberFormat('vi-VN').format(sug.priceMin)}đ` : 'Miễn phí'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className={styles.coPilotSuggestionAddBtn}
                                  onClick={() => handleAddSuggestionToDay(sug, activeDay)}
                                >
                                  + Thêm vào Ngày {activeDay}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. MAIN NAVIGATION TABS (4 Tabs) */}
              <div className={styles.mainNavTabs}>
                <button
                  type="button"
                  className={`${styles.mainNavTabBtn} ${activeMainTab === 'timeline' ? styles.mainNavTabBtnActive : ''}`}
                  onClick={() => setActiveMainTab('timeline')}
                >
                  <Calendar size={16} />
                  <span>Lịch trình chi tiết</span>
                </button>
                <button
                  type="button"
                  className={`${styles.mainNavTabBtn} ${activeMainTab === 'map' ? styles.mainNavTabBtnActive : ''}`}
                  onClick={() => setActiveMainTab('map')}
                >
                  <MapPin size={16} />
                  <span>Bản đồ di chuyển</span>
                </button>
                <button
                  type="button"
                  className={`${styles.mainNavTabBtn} ${activeMainTab === 'budget' ? styles.mainNavTabBtnActive : ''}`}
                  onClick={() => setActiveMainTab('budget')}
                >
                  <Wallet size={16} />
                  <span>Dự toán chi phí</span>
                </button>
                <button
                  type="button"
                  className={`${styles.mainNavTabBtn} ${activeMainTab === 'checklist' ? styles.mainNavTabBtnActive : ''}`}
                  onClick={() => setActiveMainTab('checklist')}
                >
                  <Check size={16} />
                  <span>Danh sách chuẩn bị</span>
                </button>
              </div>

              {/* 4. TAB CONTENT: TIMELINE (3 COLUMNS) */}
              {activeMainTab === 'timeline' && (
                <div className={styles.timelineThreeColumnsGrid}>
                  {/* SUB-COLUMN 1: Vertical Day Navigation */}
                  <div className={styles.subDayNav}>
                    {itineraryDays.map((d) => {
                      const isDayActive = d.dayNumber === activeDay;
                      return (
                        <button
                          key={d.dayNumber}
                          type="button"
                          className={`${styles.subDayCard} ${isDayActive ? styles.subDayCardActive : ''}`}
                          onClick={() => {
                            setActiveDay(d.dayNumber);
                            setSelectedMapPin(1);
                          }}
                        >
                          <span className={styles.subDayTitle}>Ngày {d.dayNumber}</span>
                          <span className={styles.subDayDate}>{d.dateStr}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* SUB-COLUMN 2: Center Timeline List */}
                  <div className={styles.subTimelineCenter}>
                    {/* Day Title & Meta Chips */}
                    <div className={styles.timelineDayHeader}>
                      <h4 className={styles.timelineDayTitle}>
                        Ngày {activeDay} — {currentDayPlan?.title?.replace(/^Ngày \d+\s*[·—-—-]\s*/, '') || `Khám phá trung tâm ${destination}`}
                      </h4>
                      <div className={styles.timelineDayMeta}>
                        <span className={styles.timelineDayMetaItem} title="Tổng quãng đường di chuyển giữa các điểm trong ngày">
                          <MapPin size={13} color="#0284C7" />
                          <span>~ {totalDayDistanceKm} km ({currentDayPlan?.activities?.length || 0} điểm)</span>
                        </span>
                        <span className={styles.timelineDayMetaItem} title="Dự toán trọn gói trong ngày cho cả đoàn">
                          <Wallet size={13} color="#0284C7" />
                          <span>~ {new Intl.NumberFormat('vi-VN').format(currentDaySubtotal)}đ</span>
                        </span>
                      </div>
                    </div>

                    {/* Transparent Daily Cost Breakdown Strip (Giải thích rõ cấu thành dự toán Ngày) */}
                    <div
                      style={{
                        marginBottom: '12px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#334155',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📊 Cấu thành dự toán Ngày {activeDay} ({peopleCount} người):</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        <span style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '3px 8px' }}>
                          🎟️ Vé tham quan: <strong>{currentDayBreakdown.ticketsGroup > 0 ? `${new Intl.NumberFormat('vi-VN').format(currentDayBreakdown.ticketsGroup)}đ` : '0đ (Miễn phí vé)'}</strong>
                        </span>
                        <span style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '3px 8px' }}>
                          🍜 Ăn uống 3 bữa & Cà phê: <strong>{new Intl.NumberFormat('vi-VN').format(currentDayBreakdown.dailyDining)}đ</strong>
                        </span>
                        <span style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '3px 8px' }}>
                          🛵 Đi lại ({budgetBreakdown.vehicleDescription}): <strong>{new Intl.NumberFormat('vi-VN').format(currentDayBreakdown.transport)}đ</strong>
                        </span>
                        <span style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '3px 8px' }}>
                          🏨 Phân bổ lưu trú: <strong>{new Intl.NumberFormat('vi-VN').format(currentDayBreakdown.stayAlloc)}đ</strong>
                        </span>
                      </div>
                    </div>

                    {/* Hard Conflicts / Commitment Violations if any */}
                    {planConflicts && planConflicts.length > 0 && (
                      <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {planConflicts.map((cf, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              background: '#FEF2F2',
                              border: '1px solid #FECACA',
                              color: '#991B1B',
                              fontSize: '12.5px',
                            }}
                          >
                            <div style={{ fontWeight: 700, marginBottom: '3px' }}>
                              ⚠️ Xung đột lịch hẹn ({cf.item_name || 'Mục đã khóa'}): {cf.message}
                            </div>
                            {Array.isArray(cf.suggested_resolutions) && cf.suggested_resolutions.length > 0 && (
                              <div style={{ fontSize: '11.5px', color: '#7F1D1D', marginTop: '2px' }}>
                                💡 Gợi ý xử lý: {cf.suggested_resolutions.join(' · ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactive Workbench: Quick Replan Toolbar & Replan Diff Banner */}
                    <div
                      style={{
                        marginBottom: '12px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: '#F0F9FF',
                        border: '1px solid #BAE6FD',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={15} color="#0284C7" />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369A1' }}>
                          Thao tác nhanh Ngày {activeDay}:
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          disabled={isReplanLoading}
                          onClick={() => executeStructuredReplan(`Dời bữa trưa Ngày ${activeDay} muộn hơn 45 phút`, { action: 'SHIFT_LUNCH', shift_minutes: 45 })}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#FFFFFF',
                            border: '1px solid #0284C7',
                            color: '#0284C7',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ⏰ Dời bữa trưa +45p
                        </button>
                        <button
                          type="button"
                          disabled={isReplanLoading}
                          onClick={() => executeStructuredReplan(`Kích hoạt phương án mưa trong nhà Ngày ${activeDay}`, { action: 'RAIN_BACKUP' })}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#FFFFFF',
                            border: '1px solid #0284C7',
                            color: '#0284C7',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          🌧️ Đổi phương án mưa
                        </button>
                        {undoSnapshot && (
                          <button
                            type="button"
                            onClick={handleUndoReplan}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: '#FEF3C7',
                              border: '1px solid #F59E0B',
                              color: '#B45309',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            ↩️ Hoàn tác (Undo)
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Replan Diff Banner (kept, moved, replaced, dropped) */}
                    {replanDiff && (
                      <div
                        style={{
                          marginBottom: '12px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          fontSize: '12px',
                          color: '#334155',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🔍 Chi tiết thay đổi vừa tính toán lại (Replan Diff):</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {replanDiff.moved && replanDiff.moved.length > 0 && (
                            <div>
                              ⏱️ <strong>Giờ đã điều chỉnh:</strong>{' '}
                              {replanDiff.moved.map((m: any, idx: number) => (
                                <span key={idx} style={{ marginRight: '6px' }}>
                                  {m.destination_name} ({m.old_start_time} ➔ <strong>{m.new_start_time}</strong>);
                                </span>
                              ))}
                            </div>
                          )}
                          {replanDiff.replaced && replanDiff.replaced.length > 0 && (
                            <div>
                              🔄 <strong>Điểm đã thay thế:</strong>{' '}
                              {replanDiff.replaced.map((r: any, idx: number) => (
                                <span key={idx} style={{ marginRight: '6px' }}>
                                  {r.old_destination_name} ➔ <strong>{r.new_destination_name}</strong>;
                                </span>
                              ))}
                            </div>
                          )}
                          {replanDiff.dropped && replanDiff.dropped.length > 0 && (
                            <div style={{ color: '#B91C1C' }}>
                              🗑️ <strong>Điểm đã lược bỏ:</strong>{' '}
                              {replanDiff.dropped.map((d: any, idx: number) => (
                                <span key={idx} style={{ marginRight: '6px' }}>
                                  {d.destination_name};
                                </span>
                              ))}
                            </div>
                          )}
                          {replanDiff.summary && Array.isArray(replanDiff.summary) && replanDiff.summary.length > 0 && (
                            <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#64748B' }}>
                              Ghi chú AI: {replanDiff.summary.join(' · ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Warnings if any */}
                    {planWarnings && planWarnings.length > 0 && (
                      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {planWarnings.map((w, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '12px',
                              background: 'linear-gradient(90deg, #FFF1F2 0%, #FEF2F2 100%)',
                              border: '1px solid #FECDD3',
                              borderLeft: '3.5px solid #F43F5E',
                              boxShadow: '0 2px 8px rgba(244, 63, 94, 0.06)',
                              color: '#9F1239',
                              fontSize: '12.5px',
                              fontWeight: 500,
                              lineHeight: 1.45,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                            }}
                          >
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '7px',
                                background: '#FFE4E6',
                                color: '#E11D48',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 800,
                                flexShrink: 0,
                                marginTop: '1px',
                              }}
                            >
                              !
                            </span>
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty Day / Departure-Only Day Banner */}
                    {currentDayPlan && (!currentDayPlan.activities || currentDayPlan.activities.length === 0) && (
                      <div
                        style={{
                          marginBottom: '14px',
                          padding: '16px',
                          borderRadius: '10px',
                          background: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          color: '#92400E',
                          fontSize: '13px',
                        }}
                      >
                        <strong>
                          {currentDayPlan.dayStatus === 'DEPARTURE_ONLY'
                            ? '✈️ Ngày di chuyển ra sân bay / bến xe'
                            : '🌿 Thời gian tự do / Chưa có điểm phù hợp'}
                        </strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#78350F' }}>
                          {currentDayPlan.statusReason || currentDayPlan.dayRationale}
                        </p>
                      </div>
                    )}

                    {/* Final-Day Departure Window Info Banner */}
                    {currentDayPlan?.departureInfo?.has_departure_constraint && (
                      <div
                        style={{
                          marginBottom: '12px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          color: '#166534',
                          fontSize: '12px',
                        }}
                      >
                        <strong>✈️ Lịch khởi hành về ({currentDayPlan.departureInfo.departure_point || 'Sân bay / Bến xe'} lúc {currentDayPlan.departureInfo.departure_time}):</strong>{' '}
                        {currentDayPlan.departureInfo.summary}
                      </div>
                    )}

                    {/* Activities Vertical Flow with Detailed Start–End Time, Route Legs & Free-Window Explanations */}
                    <div className={styles.timelineList}>
                      {currentDayPlan?.activities?.map((act, actIdx) => {
                        const rangeParts = act.timeRange ? act.timeRange.split(/[-–]/) : [];
                        const startTime = rangeParts[0]?.trim() || `0${8 + actIdx * 3}:30`;
                        const defaultEndMin = parseHhMmToMinutes(startTime, 8 * 60 + 30) + (actIdx === 1 ? 90 : 120);
                        const endTime = rangeParts[1]?.trim() || formatMinutesToHhMm(defaultEndMin);
                        const startMin = parseHhMmToMinutes(startTime, 8 * 60 + 30);
                        const endMin = Math.max(startMin + 45, parseHhMmToMinutes(endTime, defaultEndMin));
                        const stayMinutes = endMin - startMin;

                        const isPaid = (act.costVnd || 0) > 0;
                        const catLower = (act.category || '').toLowerCase();
                        const titleLower = (act.title || '').toLowerCase();
                        const isFoodOrMarketOrCafe =
                          catLower.includes('ẩm thực') ||
                          catLower.includes('chợ') ||
                          catLower.includes('cà phê') ||
                          catLower.includes('ăn') ||
                          titleLower.includes('chợ') ||
                          titleLower.includes('phố ẩm thực') ||
                          titleLower.includes('cafe') ||
                          titleLower.includes('cà phê') ||
                          titleLower.includes('bánh mì') ||
                          titleLower.includes('cơm');

                        const priceText = isPaid
                          ? `${new Intl.NumberFormat('vi-VN').format(act.costVnd)}đ/người`
                          : isFoodOrMarketOrCafe
                            ? 'Miễn phí vé vào'
                            : 'Miễn phí vé';

                        const spendingSubHint = !isPaid && isFoodOrMarketOrCafe
                          ? 'Ăn uống/mua sắm: ~50k–150k/người'
                          : !isPaid && titleLower.includes('nguyễn huệ')
                            ? 'Dạo phố 0đ · Cà phê/ăn vặt ~45k–80k'
                            : null;

                        const openInfo = getScheduleOpeningInfo(act, startTime, endTime);

                        // Compute route leg & time gap to next stop
                        const totalActs = currentDayPlan.activities.length;
                        const nextAct = actIdx < totalActs - 1 ? currentDayPlan.activities[actIdx + 1] : null;
                        let legInfo: {
                          distKmStr: string;
                          modeLabel: string;
                          travelMin: number;
                          gapWindowStr: string | null;
                          gapExplanation: string | null;
                        } | null = null;

                        if (nextAct) {
                          const distKm = computeLegDistanceKm(act, nextAct);
                          const distKmStr = distKm.toLocaleString('vi-VN');
                          const isWalkable = distKm <= 1.2;
                          const walkMin = Math.max(5, Math.round(distKm * 12));
                          const driveMin = Math.max(6, Math.round(distKm * 3.2 + 4));
                          const travelMin = isWalkable ? walkMin : driveMin;
                          const modeLabel = isWalkable
                            ? `🚶 Đi bộ ~${walkMin} phút (hoặc 🛵 Xe máy/Taxi ~${driveMin} phút)`
                            : `🛵 Xe máy / 🚕 Taxi ~${driveMin} phút`;

                          const nextParts = nextAct.timeRange ? nextAct.timeRange.split(/[-–]/) : [];
                          const nextStartStr = nextParts[0]?.trim() || formatMinutesToHhMm(endMin + travelMin + 30);
                          const nextStartMin = parseHhMmToMinutes(nextStartStr, endMin + travelMin + 30);
                          const arrivalAtNextAreaMin = endMin + travelMin;
                          const freeBufferMin = nextStartMin - arrivalAtNextAreaMin;

                          let gapWindowStr: string | null = null;
                          let gapExplanation: string | null = null;
                          if (freeBufferMin >= 25) {
                            gapWindowStr = `${formatMinutesToHhMm(arrivalAtNextAreaMin)} – ${nextStartStr} (${freeBufferMin >= 60 ? `${Math.floor(freeBufferMin / 60)} giờ ${freeBufferMin % 60 > 0 ? `${freeBufferMin % 60} phút` : ''}`.trim() : `${freeBufferMin} phút`})`;
                            if (endMin >= 13 * 60 + 30 && nextStartMin >= 17 * 60 + 30) {
                              gapExplanation = '☕🍜 Khoảng nghỉ chiều & ăn tối: Thưởng thức cà phê chiều, về khách sạn nghỉ ngơi tắm rửa và dùng bữa tối trước khi dạo phố buổi tối.';
                            } else if (endMin <= 11 * 60 + 30 && nextStartMin >= 11 * 60 + 15) {
                              gapExplanation = '🥤 Nghỉ chân uống nước mát, chụp hình dọc đường & di chuyển sang điểm dừng buổi trưa.';
                            } else if (endMin >= 12 * 60 + 15 && nextStartMin <= 15 * 60 + 30) {
                              gapExplanation = '🛌 Nghỉ trưa thư giãn tránh nắng gắt hoặc ngồi cà phê máy lạnh trước khi tiếp tục hành trình buổi chiều.';
                            } else {
                              gapExplanation = '☕ Thời gian thư giãn tự do, thưởng thức đồ uống giải khát hoặc tự do dạo quanh khu vực lân cận.';
                            }
                          }

                          legInfo = {
                            distKmStr,
                            modeLabel,
                            travelMin,
                            gapWindowStr,
                            gapExplanation,
                          };
                        }

                        return (
                          <React.Fragment key={act.id}>
                            <div className={styles.timelineRow}>
                              <div className={styles.timelineTimeLabel} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', minWidth: '64px' }}>
                                <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>{startTime}</span>
                                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>đến {endTime}</span>
                                <span style={{ fontSize: '10px', color: '#0284C7', background: '#E0F2FE', padding: '1px 6px', borderRadius: '99px', fontWeight: 700, marginTop: '2px' }}>
                                  ⏱️ {stayMinutes}p
                                </span>
                              </div>

                              <div className={styles.timelineTrack}>
                                <div className={styles.timelineDot} />
                                <div className={styles.timelineLine} />
                              </div>

                              <div className={styles.activityCard}>
                                <img
                                  src={act.photoUrl || activeDestObj.photo}
                                  alt={act.title}
                                  className={styles.activityThumb}
                                  onError={(e) => {
                                    const img = e.currentTarget as HTMLImageElement;
                                    if (img.src !== activeDestObj.photo) {
                                      img.src = activeDestObj.photo;
                                    }
                                  }}
                                />
                                <div className={styles.activityContent}>
                                  <div className={styles.activityTitleRow}>
                                    <h5 className={styles.activityTitle}>
                                      <span style={{ color: '#0284C7', marginRight: '5px', fontWeight: 800 }}>#{actIdx + 1}</span>
                                      {act.title}
                                    </h5>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                      <span className={styles.categoryPill}>{act.category}</span>
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          color: openInfo.color,
                                          background: openInfo.bg,
                                          border: `1px solid ${openInfo.border}`,
                                          borderRadius: '999px',
                                          padding: '2px 8px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: openInfo.dot,
                                          }}
                                        />
                                        {openInfo.text}
                                      </span>
                                    </div>
                                  </div>
                                  <p className={styles.activityDesc}>{act.description}</p>

                                  {/* 1-Click Rain Backup Suggestion (Indoor Fallback) */}
                                  {act.rainBackupSuggestion && (act.rainBackupSuggestion.destinationId || act.rainBackupSuggestion.destination_id) && (
                                    <div
                                      style={{
                                        marginTop: '6px',
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        background: '#F8FAFC',
                                        border: '1px dashed #94A3B8',
                                        fontSize: '11.5px',
                                        color: '#334155',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <span>
                                        🌧️ <strong>Nếu trời mưa:</strong> Đổi sang <strong>{act.rainBackupSuggestion.destinationName || act.rainBackupSuggestion.destination_name || act.rainBackupSuggestion.name}</strong>
                                        {(act.rainBackupSuggestion.distanceKm ?? act.rainBackupSuggestion.distance_km) !== undefined && (
                                          <span style={{ color: '#64748B' }}> ({act.rainBackupSuggestion.distanceKm ?? act.rainBackupSuggestion.distance_km} km)</span>
                                        )}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={isReplanLoading || act.isLocked}
                                        onClick={() =>
                                          executeStructuredReplan(
                                            `Đổi '${act.title}' sang điểm trong nhà '${act.rainBackupSuggestion?.destinationName || act.rainBackupSuggestion?.destination_name || act.rainBackupSuggestion?.name}' do trời mưa`,
                                            {
                                              action: 'REPLACE_STOP',
                                              target_destination_id: act.id,
                                              replacement_destination_id: act.rainBackupSuggestion?.destinationId || act.rainBackupSuggestion?.destination_id,
                                            }
                                          )
                                        }
                                        style={{
                                          minHeight: 0,
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          border: '1px solid #0284C7',
                                          background: '#E0F2FE',
                                          color: '#0369A1',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          cursor: isReplanLoading || act.isLocked ? 'not-allowed' : 'pointer',
                                          opacity: isReplanLoading || act.isLocked ? 0.55 : 1,
                                        }}
                                      >
                                        {act.isLocked ? 'Đang khóa' : 'Đổi ngay'}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className={styles.activityRightSide} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                  <span className={isPaid ? styles.activityPriceBadgePaid : styles.activityPriceBadge}>
                                    {priceText}
                                  </span>
                                  {spendingSubHint && (
                                    <span style={{ fontSize: '10.5px', color: '#475569', background: '#F1F5F9', padding: '2px 6px', borderRadius: '6px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                      {spendingSubHint}
                                    </span>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    <button
                                      type="button"
                                      onClick={() => toggleActivityLock(act.id)}
                                      title={act.isLocked ? "Đang khóa khung giờ (Bấm để mở khóa)" : "Khóa mốc thời gian này khi tính lại lịch"}
                                      style={{
                                        minHeight: 0,
                                        padding: '4px 7px',
                                        borderRadius: '6px',
                                        border: act.isLocked ? '1px solid #F59E0B' : '1px solid #E2E8F0',
                                        background: act.isLocked ? '#FEF3C7' : '#FFFFFF',
                                        color: act.isLocked ? '#B45309' : '#64748B',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                    >
                                      <span>{act.isLocked ? '🔒 Khóa' : '🔓 Tự do'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveActivityOrder(actIdx, 'up')}
                                      disabled={actIdx === 0}
                                      title="Đẩy điểm này lên sớm hơn (Tự động tính lại giờ & quãng đường)"
                                      style={{
                                        width: '26px',
                                        height: '26px',
                                        minHeight: 0,
                                        padding: 0,
                                        borderRadius: '6px',
                                        border: '1px solid #E2E8F0',
                                        background: actIdx === 0 ? '#F8FAFC' : '#FFFFFF',
                                        color: actIdx === 0 ? '#CBD5E1' : '#334155',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: actIdx === 0 ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveActivityOrder(actIdx, 'down')}
                                      disabled={actIdx === totalActs - 1}
                                      title="Chuyển điểm này xuống muộn hơn (Tự động tính lại giờ & quãng đường)"
                                      style={{
                                        width: '26px',
                                        height: '26px',
                                        minHeight: 0,
                                        padding: 0,
                                        borderRadius: '6px',
                                        border: '1px solid #E2E8F0',
                                        background: actIdx === totalActs - 1 ? '#F8FAFC' : '#FFFFFF',
                                        color: actIdx === totalActs - 1 ? '#CBD5E1' : '#334155',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: actIdx === totalActs - 1 ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      ↓
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.activityMenuBtn}
                                      onClick={() => {
                                        setReplaceTargetActivityId(act.id);
                                      }}
                                      title="Đổi địa điểm khác hoặc xóa"
                                    >
                                      <MoreHorizontal size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Inter-Stop Route Leg & Time-Gap Explanation Strip */}
                            {legInfo && (
                              <div
                                style={{
                                  marginLeft: '86px',
                                  marginBottom: '12px',
                                  marginTop: '-4px',
                                  padding: '9px 13px',
                                  borderRadius: '10px',
                                  background: 'linear-gradient(90deg, #F0F9FF 0%, #F8FAFC 100%)',
                                  borderLeft: '3px solid #0EA5E9',
                                  borderTop: '1px solid #E2E8F0',
                                  borderRight: '1px solid #E2E8F0',
                                  borderBottom: '1px solid #E2E8F0',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  fontSize: '12px',
                                  color: '#334155',
                                }}
                              >
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 700, color: '#0284C7' }}>
                                    📍 Chặng {actIdx + 1} → {actIdx + 2}: ~{legInfo.distKmStr} km
                                  </span>
                                  <span>·</span>
                                  <span>{legInfo.modeLabel}</span>
                                </div>
                                {legInfo.gapWindowStr && legInfo.gapExplanation && (
                                  <div style={{ color: '#475569', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                    <strong style={{ color: '#0F172A' }}>⏳ Khung {legInfo.gapWindowStr}:</strong> {legInfo.gapExplanation}
                                  </div>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Bottom action: Add Activity */}
                    <div style={{ marginTop: '16px' }}>
                      <button
                        type="button"
                        className={styles.btnAddActivityDashed}
                        onClick={() => setShowAddActivityModal(true)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1.5px dashed #CBD5E1',
                          borderRadius: '10px',
                          background: '#FFFFFF',
                          color: '#0284C7',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>+ Thêm hoạt động vào Ngày {activeDay}</span>
                      </button>
                    </div>
                  </div>

                  {/* SUB-COLUMN 3: Right Sidebar Quick Insights */}
                  <div className={styles.subRightSidebar}>
                    {/* Card 1: Tổng dự toán chuyến đi */}
                    <div
                      className={styles.budgetSummaryCard}
                      onClick={() => setActiveMainTab('budget')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.budgetSummaryHeader}>
                        <div className={styles.budgetSummaryTitleGroup}>
                          <div className={styles.budgetIcon}>
                            <Wallet size={18} color="#0284C7" />
                          </div>
                          <div>
                            <span className={styles.budgetSummaryLabel}>Tổng dự toán chuyến đi</span>
                            <div className={styles.budgetTotalNumber}>
                              {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalBaseline)}đ
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} color="#65758A" />
                      </div>
                      <div className={styles.budgetSubtext}>
                        {peopleCount} người · {duration}
                      </div>
                    </div>

                    {/* Card 2: Tuyến đường Ngày activeDay */}
                    <div className={styles.routePreviewCard}>
                      <div className={styles.routeCardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MapPin size={16} color="#0284C7" />
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#142D4E' }}>
                            Tuyến đường Ngày {activeDay}
                          </span>
                        </div>
                        <button
                          type="button"
                          style={{ fontSize: '12px', color: '#0284C7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => setActiveMainTab('map')}
                        >
                          Bản đồ lớn →
                        </button>
                      </div>

                      {/* Mini Map Route Preview Card (GPU-friendly, 0-lag) */}
                      <div
                        className={styles.miniMapWrapper}
                        onClick={() => setActiveMainTab('map')}
                        title="Bấm để mở bản đồ toàn cảnh số"
                        style={{
                          cursor: 'pointer',
                          background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '14px 16px',
                          color: '#FFFFFF',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.18)',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        {/* Decorative background grid pattern */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: 0.12,
                            backgroundImage: 'radial-gradient(#FFFFFF 1.5px, transparent 1.5px)',
                            backgroundSize: '16px 16px',
                            pointerEvents: 'none',
                          }}
                        />

                        {/* Top info */}
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#BAE6FD', fontWeight: 700 }}>
                              Lộ trình Ngày {activeDay}
                            </span>
                            <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px', color: '#FFFFFF' }}>
                              📍 {cleanDestName} · {mapMarkers.length} điểm dừng
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              background: 'rgba(255,255,255,0.22)',
                              backdropFilter: 'blur(4px)',
                              padding: '3px 9px',
                              borderRadius: '999px',
                              fontWeight: 600,
                              color: '#FFFFFF',
                            }}
                          >
                            Bản đồ số
                          </span>
                        </div>

                        {/* Route Nodes Preview Chips */}
                        <div
                          style={{
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            overflowX: 'auto',
                            padding: '4px 0',
                            scrollbarWidth: 'none',
                          }}
                        >
                          {currentDayPlan?.activities?.slice(0, 4).map((act, idx) => (
                            <div key={act.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <span
                                style={{
                                  background: '#FFFFFF',
                                  color: '#0284C7',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                                }}
                              >
                                {idx + 1}
                              </span>
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  color: '#F0F9FF',
                                  maxWidth: '85px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {act.title}
                              </span>
                              {idx < Math.min((currentDayPlan?.activities?.length || 0) - 1, 3) && (
                                <span style={{ color: '#7DD3FC', fontSize: '11px' }}>→</span>
                              )}
                            </div>
                          ))}
                          {(currentDayPlan?.activities?.length || 0) > 4 && (
                            <span style={{ fontSize: '11px', color: '#BAE6FD', fontWeight: 700, flexShrink: 0 }}>
                              +{ (currentDayPlan?.activities?.length || 0) - 4 } điểm
                            </span>
                          )}
                        </div>

                        {/* Bottom CTA to open interactive MapLibre full view */}
                        <div
                          style={{
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1px solid rgba(255,255,255,0.22)',
                            paddingTop: '8px',
                          }}
                        >
                          <span style={{ fontSize: '12px', color: '#E0F2FE' }}>🗺️ Xem tương tác toạ độ &amp; vệ tinh</span>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#0284C7',
                              background: '#FFFFFF',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                          >
                            Mở bản đồ lớn ↗
                          </span>
                        </div>
                      </div>

                      {/* Route Sequence Footer */}
                      <div className={styles.routeStopsFooter}>
                        <span>📍 {currentDayPlan?.activities?.map((a) => a.title).join(' → ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. TAB CONTENT: MAP VIEW */}
              {activeMainTab === 'map' && (
                <div className={styles.mapViewContainer}>
                  {/* Top Control Bar: Day Switcher + All-Days Mode & Route Stops Strip */}
                  <div className={styles.mapTopControlBar}>
                    <div className={styles.mapTopRow}>
                      <div className={styles.mapDayTabs}>
                        <button
                          type="button"
                          className={`${styles.mapDayTabBtn} ${mapViewMode === 'all' ? styles.mapDayTabBtnActive : ''}`}
                          onClick={() => setMapViewMode('all')}
                        >
                          🗺️ Tất cả các ngày ({itineraryDays.length}N)
                        </button>
                        {itineraryDays.map((d, dIdx) => {
                          const dayColor = DAY_ROUTE_COLORS[dIdx % DAY_ROUTE_COLORS.length];
                          const isSelectedDay = mapViewMode === 'day' && activeDay === d.dayNumber;
                          return (
                            <button
                              key={d.dayNumber}
                              type="button"
                              className={`${styles.mapDayTabBtn} ${isSelectedDay ? styles.mapDayTabBtnActive : ''}`}
                              onClick={() => {
                                setMapViewMode('day');
                                setActiveDay(d.dayNumber);
                                setSelectedMapPin(1);
                                setMapFocusPinTrigger(0);
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <span
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: dayColor,
                                  display: 'inline-block',
                                }}
                              />
                              <span>Ngày {d.dayNumber} ({d.activities?.length || 0} điểm)</span>
                            </button>
                          );
                        })}
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                        {mapViewMode === 'all'
                          ? '🛣️ Đang vẽ toàn bộ lộ trình Ngày 1 → Ngày ' + itineraryDays.length + ' theo từng màu'
                          : (() => {
                              const legs = dayRouteLegs[activeDay] || [];
                              const modeName = mapTravelMode === 'MOTORBIKE' ? 'xe máy' : mapTravelMode === 'WALKING' ? 'đi bộ' : 'lái xe';
                              if (legs.length > 0) {
                                const totalKm = legs.reduce((s, l) => s + l.distanceKm, 0);
                                const totalMin = legs.reduce((s, l) => s + l.durationMin, 0);
                                return `🛣️ Cung đường thực tế Ngày ${activeDay}: ${totalKm.toFixed(1)} km · ~${totalMin} phút ${modeName}`;
                              }
                              return '📍 Đường nối thứ tự 1 → ' + (currentDayPlan?.activities?.length || 0) + ' trên bản đồ';
                            })()}
                      </span>
                    </div>

                    {/* Pro Live Navigation & Route Optimization Controls */}
                    <div className={styles.mapActionsBar}>
                      <div className={styles.mapTravelModeTabs}>
                        <button
                          type="button"
                          className={`${styles.mapTravelModeBtn} ${mapTravelMode === 'DRIVING' ? styles.mapTravelModeBtnActive : ''}`}
                          onClick={() => setMapTravelMode('DRIVING')}
                          title="Phương tiện: Ô tô (Tuyến đường lớn)"
                        >
                          <Car size={13} />
                          <span>Ô tô</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.mapTravelModeBtn} ${mapTravelMode === 'MOTORBIKE' ? styles.mapTravelModeBtnActive : ''}`}
                          onClick={() => setMapTravelMode('MOTORBIKE')}
                          title="Phương tiện: Xe máy (Linh hoạt đường ngõ)"
                        >
                          <Bike size={13} />
                          <span>Xe máy</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.mapTravelModeBtn} ${mapTravelMode === 'WALKING' ? styles.mapTravelModeBtnActive : ''}`}
                          onClick={() => setMapTravelMode('WALKING')}
                          title="Phương tiện: Đi bộ (Phố đi bộ & dạo phố)"
                        >
                          <Footprints size={13} />
                          <span>Đi bộ</span>
                        </button>
                      </div>

                      <div className={styles.mapActionsRightGroup}>
                        {mapViewMode === 'day' && currentDayPlan?.activities && currentDayPlan.activities.length >= 3 && (
                          <button
                            type="button"
                            className={styles.mapOptimizeBtn}
                            onClick={() => handleOptimizeDayRoute(activeDay)}
                            title="Tự động sắp xếp lại thứ tự các điểm dừng theo thuật toán TSP ngắn nhất"
                          >
                            <Zap size={13} />
                            <span>Tối ưu cung đường ngắn nhất</span>
                          </button>
                        )}

                        <a
                          href={getGoogleMapsMultiStopUrl(currentDayPlan?.activities)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.mapNavGoogleBtn}
                          title={`Mở toàn bộ lộ trình Ngày ${activeDay} trên Google Maps để bật GPS dẫn đường thực tế`}
                        >
                          <Navigation size={13} />
                          <span>Chỉ đường Google Maps (Ngày {activeDay})</span>
                        </a>
                      </div>
                    </div>

                    {/* Interactive Route Stops Strip (Single Day) or Multi-Day Color Legend */}
                    {mapViewMode === 'day' && currentDayPlan?.activities && currentDayPlan.activities.length > 0 && (
                      <div className={styles.mapStopsStrip}>
                        {currentDayPlan.activities.map((act, idx) => {
                          const pinNum = idx + 1;
                          const isSelected = selectedMapPin === pinNum;
                          const legAfter = (dayRouteLegs[activeDay] || [])[idx];
                          return (
                            <React.Fragment key={act.id || idx}>
                              <button
                                type="button"
                                className={`${styles.mapStopPill} ${isSelected ? styles.mapStopPillActive : ''}`}
                                onClick={() => {
                                  setSelectedMapPin(pinNum);
                                  setMapFocusPinTrigger((n) => n + 1);
                                }}
                              >
                                <span className={styles.mapStopNumber}>{pinNum}</span>
                                <span>{act.title}</span>
                                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                                  ({act.timeRange.split('–')[0]})
                                </span>
                              </button>
                              {idx < currentDayPlan.activities.length - 1 && (
                                <span
                                  style={{
                                    color: '#0284C7',
                                    fontWeight: 700,
                                    fontSize: '11.5px',
                                    alignSelf: 'center',
                                    flexShrink: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    background: '#F0F9FF',
                                    border: '1px solid #BAE6FD',
                                    borderRadius: '999px',
                                    padding: '2px 7px',
                                  }}
                                >
                                  ➔ {legAfter ? `${legAfter.distanceKm}km · ${legAfter.durationMin}p` : ''}
                                </span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}

                    {mapViewMode === 'all' && itineraryDays.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                        {itineraryDays.map((d, dIdx) => {
                          const color = DAY_ROUTE_COLORS[dIdx % DAY_ROUTE_COLORS.length];
                          return (
                            <div
                              key={d.dayNumber}
                              onClick={() => {
                                setMapViewMode('day');
                                setActiveDay(d.dayNumber);
                                setSelectedMapPin(1);
                                setMapFocusPinTrigger(0);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px',
                                padding: '5px 10px',
                                borderRadius: '8px',
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                cursor: 'pointer',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: color,
                                  color: '#FFFFFF',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  flexShrink: 0,
                                }}
                              >
                                Ngày {d.dayNumber}
                              </span>
                              <span style={{ color: '#334155', fontWeight: 500 }}>
                                {(d.activities || []).map((a, i) => `${d.dayNumber}.${i + 1} ${a.title}`).join(' ➔ ') || 'Ngày tự do'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Interactive WebGL Map Canvas */}
                  <div className={styles.realMapAdapterWrapper}>
                    <MapViewAdapter
                      destinations={mapMarkers}
                      selectedDestinationId={
                        mapViewMode === 'day'
                          ? currentDayPlan?.activities?.[selectedMapPin - 1]?.id
                          : `${activeDay}::${currentDayPlan?.activities?.[selectedMapPin - 1]?.id || ''}`
                      }
                      onSelectDestination={(dest) => {
                        if (!dest) return;
                        if (mapViewMode === 'all' && dest.id.includes('::')) {
                          const [dStr, actId] = dest.id.split('::');
                          const dNum = Number(dStr);
                          const dayObj = itineraryDays.find((d) => d.dayNumber === dNum);
                          const fIdx = dayObj?.activities ? dayObj.activities.findIndex((a) => a.id === actId) : -1;
                          if (dNum) setActiveDay(dNum);
                          if (fIdx >= 0) setSelectedMapPin(fIdx + 1);
                          return;
                        }
                        const fIdx = currentDayPlan?.activities ? currentDayPlan.activities.findIndex((a) => a.id === dest.id) : -1;
                        if (fIdx >= 0) setSelectedMapPin(fIdx + 1);
                      }}
                      routeGeometry={mapViewMode === 'day' ? activeDayRouteGeometry : undefined}
                      routeStops={mapViewMode === 'day' ? activeDayRouteStops : undefined}
                      multiDayRoutes={mapViewMode === 'all' ? multiDayMapRoutes : undefined}
                      hideDestinationMarkers={true}
                      disableAutoCenterOnSelect={true}
                      locationBadgeLabel={cleanDestName}
                      initialCenter={{
                        latitude: currentDayPlan?.activities?.[0]?.latitude || activeDestObj.lat,
                        longitude: currentDayPlan?.activities?.[0]?.longitude || activeDestObj.lng,
                        zoom: 12.5,
                      }}
                      cameraTarget={
                        mapFocusPinTrigger > 0 && mapViewMode === 'day' && mapMarkers[selectedMapPin - 1]
                          ? {
                              latitude: mapMarkers[selectedMapPin - 1].latitude,
                              longitude: mapMarkers[selectedMapPin - 1].longitude,
                              zoom: 13.8,
                            }
                          : undefined
                      }
                      showSelectedCard={false}
                    />

                    {/* Floating Glassmorphic Stop Preview Card */}
                    {currentDayPlan?.activities?.[selectedMapPin - 1] && (
                      <div className={styles.mapPreviewCard}>
                        <img
                          src={currentDayPlan.activities[selectedMapPin - 1].photoUrl || activeDestObj.photo}
                          alt={currentDayPlan.activities[selectedMapPin - 1].title}
                          className={styles.mapPreviewPhoto}
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            if (img.src !== activeDestObj.photo) {
                              img.src = activeDestObj.photo;
                            }
                          }}
                        />
                        <div className={styles.mapPreviewDetails}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span className={styles.mapPreviewCategory}>
                              Điểm {selectedMapPin}/{currentDayPlan.activities.length} · {currentDayPlan.activities[selectedMapPin - 1].category}
                            </span>
                            <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                              <button
                                type="button"
                                disabled={selectedMapPin <= 1}
                                onClick={() => {
                                  setSelectedMapPin((p) => Math.max(1, p - 1));
                                  setMapFocusPinTrigger((n) => n + 1);
                                }}
                                style={{
                                  border: '1px solid #CBD5E1',
                                  background: '#F8FAFC',
                                  color: '#0F172A',
                                  borderRadius: '6px',
                                  width: '28px',
                                  height: '28px',
                                  minHeight: 0,
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: selectedMapPin <= 1 ? 'not-allowed' : 'pointer',
                                  opacity: selectedMapPin <= 1 ? 0.4 : 1,
                                }}
                                title="Điểm trước"
                              >
                                <ChevronLeft size={15} color="#0F172A" />
                              </button>
                              <button
                                type="button"
                                disabled={selectedMapPin >= currentDayPlan.activities.length}
                                onClick={() => {
                                  setSelectedMapPin((p) => Math.min(currentDayPlan.activities.length, p + 1));
                                  setMapFocusPinTrigger((n) => n + 1);
                                }}
                                style={{
                                  border: '1px solid #CBD5E1',
                                  background: '#F8FAFC',
                                  color: '#0F172A',
                                  borderRadius: '6px',
                                  width: '28px',
                                  height: '28px',
                                  minHeight: 0,
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: selectedMapPin >= currentDayPlan.activities.length ? 'not-allowed' : 'pointer',
                                  opacity: selectedMapPin >= currentDayPlan.activities.length ? 0.4 : 1,
                                }}
                                title="Điểm tiếp theo"
                              >
                                <ChevronRight size={15} color="#0F172A" />
                              </button>
                            </div>
                          </div>

                          <h4 className={styles.mapPreviewTitle}>
                            {currentDayPlan.activities[selectedMapPin - 1].title}
                          </h4>

                          <span className={styles.mapPreviewCost}>
                            💰 {currentDayPlan.activities[selectedMapPin - 1].costLabel || 'Miễn phí vé'}
                          </span>

                          <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                            ⏰ {currentDayPlan.activities[selectedMapPin - 1].timeRange} · 📍 {currentDayPlan.activities[selectedMapPin - 1].location}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <a
                              href={
                                currentDayPlan.activities[selectedMapPin - 1].latitude && currentDayPlan.activities[selectedMapPin - 1].longitude
                                  ? `https://www.google.com/maps/dir/?api=1&destination=${currentDayPlan.activities[selectedMapPin - 1].latitude},${currentDayPlan.activities[selectedMapPin - 1].longitude}`
                                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentDayPlan.activities[selectedMapPin - 1].title + ' ' + destination)}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.mapPreviewNavBtn}
                            >
                              <span>🗺️ Chỉ đường</span>
                            </a>

                            <button
                              type="button"
                              className={styles.mapPreviewActionBtn}
                              onClick={() => {
                                const curAct = currentDayPlan.activities[selectedMapPin - 1];
                                if (curAct) setReplaceTargetActivityId(curAct.id);
                              }}
                              title="Đổi sang địa điểm khác gần tuyến đường"
                            >
                              ⇄ Đổi điểm
                            </button>

                            <button
                              type="button"
                              className={styles.mapPreviewActionBtn}
                              disabled={selectedMapPin <= 1 || isReplanLoading}
                              onClick={() => {
                                const idx = selectedMapPin - 1;
                                handleMoveActivityOrder(idx, 'up');
                                setSelectedMapPin(Math.max(1, selectedMapPin - 1));
                              }}
                              title="Đưa điểm này lên chặng trước"
                            >
                              ↑ Lên
                            </button>

                            <button
                              type="button"
                              className={styles.mapPreviewActionBtn}
                              disabled={selectedMapPin >= currentDayPlan.activities.length || isReplanLoading}
                              onClick={() => {
                                const idx = selectedMapPin - 1;
                                handleMoveActivityOrder(idx, 'down');
                                setSelectedMapPin(Math.min(currentDayPlan.activities.length, selectedMapPin + 1));
                              }}
                              title="Đẩy điểm này xuống chặng sau"
                            >
                              ↓ Xuống
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. TAB CONTENT: BUDGET BREAKDOWN */}
              {activeMainTab === 'budget' && (
                <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2EAF0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E2EAF0', paddingBottom: '16px' }}>
                    <div>
                      <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#142D4E', margin: '0 0 4px 0' }}>
                        Dự toán tổng hợp chuyến đi {destination}
                      </h4>
                      <p style={{ fontSize: '13px', color: '#65758A', margin: 0 }}>
                        Chi phí tính toán cho đoàn {peopleCount} người · {duration} · Hạng mức {budgetTier === 'economy' ? 'Tiết kiệm' : budgetTier === 'luxury' ? 'Cao cấp' : 'Tiêu chuẩn'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.btnPrimaryActionSmall}
                      onClick={() => setShowBudgetModal(true)}
                    >
                      <span>Xem bảng chi tiết & biên độ dao động</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ background: '#F0F8FC', borderRadius: '10px', padding: '16px', border: '1px solid #E0F2FB' }}>
                      <span style={{ fontSize: '12px', color: '#65758A', fontWeight: 600 }}>TỔNG DỰ TOÁN CẢ ĐOÀN</span>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284C7', margin: '4px 0' }}>
                        {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalBaseline)}đ
                      </div>
                      <span style={{ fontSize: '12px', color: '#21856B', fontWeight: 600 }}>
                        ~{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.perPersonBaseline)}đ / người
                      </span>
                    </div>

                    <div style={{ background: '#FAFBFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2EAF0' }}>
                      <span style={{ fontSize: '12px', color: '#65758A', fontWeight: 600 }}>LƯU TRÚ ({budgetBreakdown.roomsNeeded} phòng · {budgetBreakdown.nights} đêm)</span>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#142D4E', margin: '4px 0' }}>
                        {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalLodging)}đ
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#8996A5' }}>
                        {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.roomRatePerNight)}đ / phòng / đêm
                      </span>
                    </div>

                    <div style={{ background: '#FAFBFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2EAF0' }}>
                      <span style={{ fontSize: '12px', color: '#65758A', fontWeight: 600 }}>ẨM THỰC 3 BỮA ({daysCount} ngày)</span>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#142D4E', margin: '4px 0' }}>
                        {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalDining)}đ
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#8996A5' }}>
                        {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.diningPerPersonDay)}đ / người / ngày
                      </span>
                    </div>

                    <div style={{ background: '#FAFBFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2EAF0' }}>
                      <span style={{ fontSize: '12px', color: '#65758A', fontWeight: 600 }}>DI CHUYỂN NỘI TỈNH</span>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#142D4E', margin: '4px 0' }}>
                        {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalLocalTransport)}đ
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#8996A5' }}>
                        {budgetBreakdown.vehicleDescription}
                      </span>
                    </div>
                  </div>

                  {/* ─── 1. BIÊN ĐỘ DAO ĐỘNG GIÁ THỰC TẾ (CORRIDOR BANNER) ─── */}
                  <div style={{
                    background: 'linear-gradient(135deg, #F0F8FC 0%, #FFFFFF 100%)',
                    borderRadius: '12px',
                    border: '1px solid #DDF2FC',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>📊</span>
                        <strong style={{ fontSize: '14.5px', color: '#142D4E' }}>
                          Biên độ dao động dự kiến theo thời điểm khởi hành
                        </strong>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#0284C7',
                        background: '#E0F2FB',
                        padding: '3px 10px',
                        borderRadius: '99px',
                      }}>
                        Biên độ: ~{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.minFluctuation)}đ – {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.maxFluctuation)}đ
                      </span>
                    </div>

                    {/* 3 Range Milestones */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '4px' }}>
                      <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2EAF0' }}>
                        <span style={{ fontSize: '11px', color: '#21856B', fontWeight: 700, textTransform: 'uppercase' }}>
                          🌱 Giá tối ưu (Ngày thường / Đặt sớm)
                        </span>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#21856B', margin: '3px 0 2px' }}>
                          {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.minFluctuation)}đ
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#65758A' }}>
                          ~{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.perPersonMin)}đ / người
                        </span>
                      </div>

                      <div style={{ background: '#E0F2FB', padding: '12px 14px', borderRadius: '8px', border: '1px solid #0284C7' }}>
                        <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 700, textTransform: 'uppercase' }}>
                          🎯 Mức dự toán cơ sở (Khuyến nghị)
                        </span>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#0284C7', margin: '3px 0 2px' }}>
                          {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalBaseline)}đ
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#0369A1' }}>
                          ~{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.perPersonBaseline)}đ / người
                        </span>
                      </div>

                      <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2EAF0' }}>
                        <span style={{ fontSize: '11px', color: '#B87D35', fontWeight: 700, textTransform: 'uppercase' }}>
                          🔥 Mức cao điểm (Cuối tuần / Lễ hội)
                        </span>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#B87D35', margin: '3px 0 2px' }}>
                          {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.maxFluctuation)}đ
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#65758A' }}>
                          ~{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.perPersonMax)}đ / người
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ─── 2. CHI TIẾT CÁC YẾU TỐ DAO ĐỘNG & PHÁT SINH (THE USER REQUEST) ─── */}
                  <div>
                    <h5 style={{ fontSize: '15px', fontWeight: 700, color: '#142D4E', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⚡</span>
                      <span>Lưu ý chi tiết các khoản dao động & chi phí có thể phát sinh</span>
                    </h5>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                      {/* Factor 1: Intercity Travel */}
                      <div style={{ background: '#FAFBFC', border: '1px solid #E2EAF0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#142D4E' }}>
                            ✈️ Phương tiện khứ hồi liên tỉnh (Đến {destination})
                          </strong>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284C7', whiteSpace: 'nowrap' }}>
                            {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.intercityMinGroup)}đ – {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.intercityMaxGroup)}đ
                          </span>
                        </div>
                        <p style={{ fontSize: '12.5px', color: '#65758A', margin: 0, lineHeight: 1.5 }}>
                          Đề xuất: <strong>{budgetBreakdown.intercityType}</strong> (~{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.intercityMinPerPerson)}đ – {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.intercityMaxPerPerson)}đ/người).
                          <br />
                          <em>Lưu ý:</em> Đặt vé sớm 2–3 tuần rẻ hơn 25–40%. Các chuyến bay sáng sớm hoặc đêm muộn thường có mức giá tốt nhất; giờ bay vàng (08:00–10:00) hoặc dịp lễ giá có thể tăng gấp đôi.
                        </p>
                      </div>

                      {/* Factor 2: Hotel Surcharges */}
                      <div style={{ background: '#FAFBFC', border: '1px solid #E2EAF0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#142D4E' }}>
                            🏨 Phụ thu phòng cuối tuần & Mùa cao điểm
                          </strong>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#B87D35', whiteSpace: 'nowrap' }}>
                            +{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.weekendSurchargeMin)}đ – +{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.weekendSurchargeMax)}đ
                          </span>
                        </div>
                        <p style={{ fontSize: '12.5px', color: '#65758A', margin: 0, lineHeight: 1.5 }}>
                          Khách sạn tại {destination} thường phụ thu từ +15% đến +35% vào đêm Thứ 6 và Thứ 7 cho {budgetBreakdown.roomsNeeded} phòng của đoàn.
                          <br />
                          <em>Lưu ý:</em> Đi vào ngày thường (Thứ 2 đến Thứ 5) luôn giữ được mức giá chuẩn niêm yết và không gian nghỉ ngơi yên tĩnh nhất.
                        </p>
                      </div>

                      {/* Factor 3: Food Upgrade */}
                      <div style={{ background: '#FAFBFC', border: '1px solid #E2EAF0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#142D4E' }}>
                            🍲 Nâng cấp đặc sản & Bữa tiệc riêng
                          </strong>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#21856B', whiteSpace: 'nowrap' }}>
                            +{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.specialtyUpgradePerPerson)}đ / người / bữa
                          </span>
                        </div>
                        <p style={{ fontSize: '12.5px', color: '#65758A', margin: 0, lineHeight: 1.5 }}>
                          Chi phí cơ sở đã bao gồm 3 bữa ăn no với ẩm thực tiêu chuẩn.
                          <br />
                          <em>Lưu ý:</em> Khoản dao động này dành riêng cho việc gọi thêm tiệc hải sản tươi sống chọn tại bể, lẩu cá hồi/cá tầm, buffet nướng BBQ hoặc thưởng thức cafe view ngắm hoàng hôn.
                        </p>
                      </div>

                      {/* Factor 4: Contingency Buffer */}
                      <div style={{ background: '#FAFBFC', border: '1px solid #E2EAF0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#142D4E' }}>
                            🛡️ Quỹ dự phòng phát sinh & Quà lưu niệm (Khuyên dùng)
                          </strong>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284C7', whiteSpace: 'nowrap' }}>
                            ~{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.contingencyGroup)}đ (8% dự toán)
                          </span>
                        </div>
                        <p style={{ fontSize: '12.5px', color: '#65758A', margin: 0, lineHeight: 1.5 }}>
                          Nên dự trù khoảng 8–10% để chuyến đi luôn chủ động và thoải mái.
                          <br />
                          <em>Lưu ý:</em> Dành cho tiền gửi xe, nước uống giải khát dọc đường, mua đặc sản bánh kẹo địa phương mang về làm quà biếu, tiền tips và thuốc men sơ cứu khẩn cấp.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ─── 3. BẢNG MINH BẠCH: ĐÃ BAO GỒM VS CHƯA BAO GỒM ─── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '4px' }}>
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ color: '#15803D', fontWeight: 800, fontSize: '15px' }}>✓</span>
                        <strong style={{ fontSize: '13.5px', color: '#15803D' }}>ĐÃ TÍNH TRONG DỰ TOÁN CƠ SỞ</strong>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', color: '#166534', fontSize: '12.5px', lineHeight: 1.6 }}>
                        <li>Vé tham quan các điểm di tích & thắng cảnh theo lịch trình</li>
                        <li>Ăn uống 3 bữa/ngày chuẩn mức <strong>{budgetTier === 'economy' ? 'Tiết kiệm' : budgetTier === 'luxury' ? 'Cao cấp' : 'Tiêu chuẩn'}</strong></li>
                        <li>Phương tiện nội tỉnh: <strong>{budgetBreakdown.vehicleDescription}</strong></li>
                        <li>Khách sạn <strong>{budgetBreakdown.roomsNeeded} phòng</strong> ({budgetBreakdown.nights} đêm) theo tiêu chuẩn đoàn</li>
                      </ul>
                    </div>

                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ color: '#B91C1C', fontWeight: 800, fontSize: '15px' }}>✕</span>
                        <strong style={{ fontSize: '13.5px', color: '#B91C1C' }}>CHƯA BAO GỒM (SẼ DAO ĐỘNG RIÊNG)</strong>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', color: '#991B1B', fontSize: '12.5px', lineHeight: 1.6 }}>
                        <li>Vé máy bay / tàu hỏa / xe khách khứ hồi từ tỉnh nhà đến {destination}</li>
                        <li>Mua sắm quà biếu, giỏ quà đặc sản mang về cho người thân</li>
                        <li>Các trò chơi tự chọn cao cấp: cáp treo, tour ca nô lặn ngắm san hô</li>
                        <li>Phụ thu phòng đơn nếu đoàn có thành viên muốn ở phòng riêng 1 mình</li>
                      </ul>
                    </div>
                  </div>

                  {/* ─── 4. LỜI KHUYÊN TỐI ƯU CHI PHÍ TỪ VISTA AI ─── */}
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>💡</span>
                    <div>
                      <strong style={{ fontSize: '13.5px', color: '#92400E', display: 'block', marginBottom: '4px' }}>
                        Mẹo thông minh tối ưu chi phí từ VISTA AI:
                      </strong>
                      <span style={{ fontSize: '12.5px', color: '#78350F', lineHeight: 1.5 }}>
                        {peopleCount <= 2
                          ? 'Với nhóm 1–2 người, việc sử dụng xe máy nội tỉnh kết hợp săn vé máy bay vào khung giờ sáng sớm giúp tiết kiệm đến 40% tổng chi phí chuyến đi.'
                          : peopleCount <= 5
                          ? 'Với nhóm gia đình 3–5 người, đặt phòng khách sạn theo dạng Family Suite hoặc Homestay nguyên căn vừa tiết kiệm chi phí phòng, vừa có không gian sinh hoạt chung ấm cúng.'
                          : 'Với đoàn đông người, thuê xe ô tô theo ngày có tài xế trọn gói sẽ rẻ hơn và tiện lợi hơn rất nhiều so với việc gọi nhiều xe taxi riêng lẻ dọc đường.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. TAB CONTENT: CHECKLIST */}
              {activeMainTab === 'checklist' && (
                <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2EAF0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ borderBottom: '1px solid #E2EAF0', paddingBottom: '14px' }}>
                    <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#142D4E', margin: '0 0 4px 0' }}>
                      Hành trang chuẩn bị cho chuyến đi {destination}
                    </h4>
                    <p style={{ fontSize: '13px', color: '#65758A', margin: 0 }}>
                      Danh sách gợi ý chuẩn bị phù hợp cho lịch trình {duration} ({peopleCount} người)
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { id: 'chk1', label: 'CCCD / Hộ chiếu & Giấy tờ tùy thân gốc của từng người' },
                      { id: 'chk2', label: `Xác nhận đặt vé di chuyển & phòng khách sạn tại ${destination}` },
                      { id: 'chk3', label: 'Trang phục thoải mái, đồ bơi, áo khoác mỏng chống nắng & gió biển' },
                      { id: 'chk4', label: 'Kem chống nắng SPF 50+, kính râm, mũ rộng vành, khăn ướt' },
                      { id: 'chk5', label: 'Sạc điện thoại, pin sạc dự phòng 10.000mAh+, túi chống nước máy ảnh' },
                      { id: 'chk6', label: 'Thuốc men cá nhân cơ bản: say tàu xe, giảm đau hạ sốt, men tiêu hóa' },
                      { id: 'chk7', label: 'Chuẩn bị một ít tiền mặt mệnh giá nhỏ (10k-50k) để thưởng thức ẩm thực đường phố' },
                    ].map((item) => {
                      const isChecked = !!checkedListItems[item.id];
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleChecklistItem(item.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: `1px solid ${isChecked ? '#BAE6FD' : '#E2EAF0'}`,
                            background: isChecked ? '#F0F9FF' : '#FAFBFC',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              border: `1.5px solid ${isChecked ? '#0284C7' : '#CBD5E1'}`,
                              background: isChecked ? '#0284C7' : '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              fontSize: '12px',
                              flexShrink: 0,
                            }}
                          >
                            {isChecked && <Check size={14} strokeWidth={3} />}
                          </div>
                          <span
                            style={{
                              fontSize: '14px',
                              color: isChecked ? '#142D4E' : '#65758A',
                              fontWeight: isChecked ? 600 : 400,
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

        </section>
      </main>

      {/* ════════════════════════════════════════════════════════════════════
          OVERLAYS & REAL INTERACTION DIALOGS
          ════════════════════════════════════════════════════════════════════ */}

      {/* 0. SLEEK AI THINKING MODAL */}
      {isAiBusy && (
        <div className={styles.aiThinkingBackdrop} role="dialog" aria-modal="true" aria-label="VISTA AI đang xử lý">
          <div className={styles.aiThinkingCard}>
            <div className={styles.aiThinkingHero}>
              <div className={styles.aiThinkingOrbWrap}>
                <div className={styles.aiThinkingOrbRing} />
                <div className={styles.aiThinkingOrb}>
                  <Sparkles size={26} />
                </div>
              </div>
              <span className={styles.aiThinkingBadge}>
                <span className={styles.aiThinkingBadgeDot} />
                VISTA AI · Gemini Engine
              </span>
              <h3 className={styles.aiThinkingTitle}>
                {isReplanLoading || isCoPilotBusy
                  ? 'Đang tối ưu lại lịch trình'
                  : isParsingSmartPrompt
                    ? 'Đang phân tích yêu cầu'
                    : `Đang thiết kế chuyến đi ${cleanDestName}`}
              </h3>
              <div className={styles.aiThinkingMetaLine}>
                <span>{daysCount} ngày</span>
                <span>·</span>
                <span>{peopleCount} khách</span>
                <span>·</span>
                <span>{BUDGET_OPTIONS.find((b) => b.id === budgetTier)?.label || 'Tiêu chuẩn'}</span>
              </div>
            </div>

            <div className={styles.aiThinkingStepList}>
              {[
                'Phân tích sở thích & khung giờ',
                `Lọc điểm thực tế tại ${cleanDestName}`,
                'Tối ưu tuyến đường & giờ mở cửa',
                'Hoàn thiện lịch trình & dự toán',
              ].map((stepLabel, sIdx) => {
                const isDone = aiThinkingStep > sIdx;
                const isActive = aiThinkingStep === sIdx;
                return (
                  <div
                    key={sIdx}
                    className={`${styles.aiThinkingStepRow} ${
                      isDone ? styles.aiThinkingStepDone : isActive ? styles.aiThinkingStepActive : ''
                    }`}
                  >
                    <span className={styles.aiThinkingStepDot}>
                      {isDone ? '✓' : sIdx + 1}
                    </span>
                    <span className={styles.aiThinkingStepText}>{stepLabel}</span>
                    {isActive && <span className={styles.aiThinkingStepLive}>Đang chạy</span>}
                  </div>
                );
              })}
            </div>

            <div className={styles.aiThinkingProgressWrap}>
              <div className={styles.aiThinkingProgressTrack}>
                <div
                  className={styles.aiThinkingProgressFill}
                  style={{ width: `${Math.min(96, (aiThinkingStep + 1) * 24)}%` }}
                />
              </div>
              <span className={styles.aiThinkingProgressPct}>
                {Math.min(96, (aiThinkingStep + 1) * 24)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOAST NOTIFICATION */}
      {showToast && (
        <div className={styles.toastNotification} role="status">
          <svg className={styles.toastIconCheck} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{showToast}</span>
        </div>
      )}

      {/* 2. REAL CREATE TRIP MODAL */}
      {showCreateTripModal && (
        <div className={styles.overlayBackdrop} onClick={() => setShowCreateTripModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Tạo chuyến đi nhóm thực tế</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowCreateTripModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <label className={styles.fieldLabel}>Tên chuyến đi</label>
                <input
                  type="text"
                  className={styles.wishesTextarea}
                  style={{ minHeight: 'auto', padding: '10px 12px' }}
                  value={newTripTitle}
                  onChange={(e) => setNewTripTitle(e.target.value)}
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Chế độ hiển thị</label>
                <select
                  className={styles.wishesTextarea}
                  style={{ minHeight: 'auto', padding: '10px 12px' }}
                  value={newTripVisibility}
                  onChange={(e) => setNewTripVisibility(e.target.value)}
                >
                  <option value="private">Riêng tư (Chỉ thành viên được mời)</option>
                  <option value="public">Công khai (Cộng đồng VISTA có thể xem)</option>
                </select>
              </div>

              <div style={{ background: '#F8FAFD', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E3EAF2' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#14283F' }}>Thông tin đính kèm từ AI:</span>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>
                  • {daysCount} ngày ({itineraryDays.reduce((acc, d) => acc + d.activities.length, 0)} hoạt động)<br />
                  • Dự toán chi phí: {new Intl.NumberFormat('vi-VN').format(totalEstimatedCost)}đ ({peopleCount} người)
                </p>
              </div>

              <p className={styles.fieldHint}>
                Sau khi tạo, chuyến đi sẽ được lưu vào danh sách chuyến đi của bạn. Bạn có thể gửi mã mời cho bạn bè và quản lý thu chi quỹ nhóm.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowCreateTripModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.btnCreateTripPrimary}
                onClick={handleCreateTripSubmit}
              >
                Tạo chuyến đi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. BUDGET DETAILS MODAL */}
      {showBudgetModal && (
        <div className={styles.overlayBackdrop} onClick={() => setShowBudgetModal(false)}>
          <div className={styles.modalBox} style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Dự toán chi phí & Phân tích khoản dao động</h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Điểm đến: {destination} · {daysCount} ngày {budgetBreakdown.nights} đêm · Đoàn {budgetBreakdown.count} người ({budgetBreakdown.roomsNeeded} phòng đôi)
                </span>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowBudgetModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Section 1: Base On-Site Budget */}
              <div style={{ marginBottom: '16px' }}>
                <div className={styles.budgetModalSectionHead}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>
                    1. Chi phí cơ sở tại điểm đến (Có thể tùy chỉnh theo thực tế)
                  </span>
                  {budgetBreakdown.hasCustomRates && (
                    <button
                      type="button"
                      className={styles.budgetResetAllBtn}
                      onClick={() => {
                        setCustomBudgetRates({});
                        setEditingBudgetKey(null);
                      }}
                    >
                      <RotateCcw size={11} strokeWidth={2.2} />
                      <span>Khôi phục mặc định AI</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Row 1: Activities */}
                  <div className={`${styles.budgetItemCard} ${editingBudgetKey === 'activities' ? styles.budgetItemCardEditing : ''}`}>
                    <div className={styles.budgetItemTopRow}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#14283F', display: 'block' }}>
                          Vé tham quan & Hoạt động
                          {customBudgetRates.totalActPerPerson != null && (
                            <span className={styles.budgetCustomTag}>Đã tùy chỉnh</span>
                          )}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                          {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalActPerPerson)}đ/người × {budgetBreakdown.count} người
                        </span>
                      </div>
                      <div className={styles.budgetItemRight}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                          {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalActivities)}đ
                        </span>
                        <button
                          type="button"
                          className={`${styles.budgetEditBtn} ${editingBudgetKey === 'activities' ? styles.budgetEditBtnActive : ''}`}
                          onClick={() => setEditingBudgetKey(editingBudgetKey === 'activities' ? null : 'activities')}
                        >
                          {editingBudgetKey === 'activities' ? (
                            <>
                              <Check size={12} strokeWidth={2.5} />
                              <span>Xong</span>
                            </>
                          ) : (
                            <>
                              <Pencil size={12} strokeWidth={2} />
                              <span>Sửa</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {editingBudgetKey === 'activities' && (
                      <div className={styles.budgetInlineEditor}>
                        <span className={styles.budgetInlineLabel}>Chi phí/người (đ):</span>
                        <input
                          type="number"
                          min={0}
                          step={50000}
                          className={styles.budgetInlineInput}
                          value={budgetBreakdown.totalActPerPerson}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/^0+(?=\d)/, '');
                            e.target.value = raw;
                            const val = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                            setCustomBudgetRates((prev) => ({ ...prev, totalActPerPerson: val }));
                          }}
                        />
                        <button
                          type="button"
                          className={styles.budgetPresetChip}
                          onClick={() => setCustomBudgetRates((prev) => ({ ...prev, totalActPerPerson: 0 }))}
                        >
                          0đ (Miễn phí)
                        </button>
                        {customBudgetRates.totalActPerPerson != null && (
                          <button
                            type="button"
                            className={styles.budgetPresetChip}
                            onClick={() => setCustomBudgetRates((prev) => ({ ...prev, totalActPerPerson: null }))}
                          >
                            Mặc định ({new Intl.NumberFormat('vi-VN').format(budgetBreakdown.computedActPerPerson)}đ)
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 2: Dining */}
                  <div className={`${styles.budgetItemCard} ${editingBudgetKey === 'dining' ? styles.budgetItemCardEditing : ''}`}>
                    <div className={styles.budgetItemTopRow}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#14283F', display: 'block' }}>
                          Ăn uống ({daysCount} ngày)
                          {customBudgetRates.diningPerPersonDay != null && (
                            <span className={styles.budgetCustomTag}>Đã tùy chỉnh</span>
                          )}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                          {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.diningPerPersonDay)}đ/người/ngày × {daysCount}N × {budgetBreakdown.count} người
                        </span>
                      </div>
                      <div className={styles.budgetItemRight}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                          {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalDining)}đ
                        </span>
                        <button
                          type="button"
                          className={`${styles.budgetEditBtn} ${editingBudgetKey === 'dining' ? styles.budgetEditBtnActive : ''}`}
                          onClick={() => setEditingBudgetKey(editingBudgetKey === 'dining' ? null : 'dining')}
                        >
                          {editingBudgetKey === 'dining' ? (
                            <>
                              <Check size={12} strokeWidth={2.5} />
                              <span>Xong</span>
                            </>
                          ) : (
                            <>
                              <Pencil size={12} strokeWidth={2} />
                              <span>Sửa</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {editingBudgetKey === 'dining' && (
                      <div className={styles.budgetInlineEditor}>
                        <span className={styles.budgetInlineLabel}>Mức ăn/người/ngày (đ):</span>
                        <input
                          type="number"
                          min={0}
                          step={50000}
                          className={styles.budgetInlineInput}
                          value={budgetBreakdown.diningPerPersonDay}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/^0+(?=\d)/, '');
                            e.target.value = raw;
                            const val = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                            setCustomBudgetRates((prev) => ({ ...prev, diningPerPersonDay: val }));
                          }}
                        />
                        <button
                          type="button"
                          className={styles.budgetPresetChip}
                          onClick={() => setCustomBudgetRates((prev) => ({ ...prev, diningPerPersonDay: 200000 }))}
                        >
                          200k
                        </button>
                        <button
                          type="button"
                          className={styles.budgetPresetChip}
                          onClick={() => setCustomBudgetRates((prev) => ({ ...prev, diningPerPersonDay: 350000 }))}
                        >
                          350k
                        </button>
                        <button
                          type="button"
                          className={styles.budgetPresetChip}
                          onClick={() => setCustomBudgetRates((prev) => ({ ...prev, diningPerPersonDay: 500000 }))}
                        >
                          500k
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Local Transit */}
                  <div className={`${styles.budgetItemCard} ${editingBudgetKey === 'transit' ? styles.budgetItemCardEditing : ''}`}>
                    <div className={styles.budgetItemTopRow}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#14283F', display: 'block' }}>
                          Di chuyển nội thành ({daysCount} ngày)
                          {customBudgetRates.dailyVehicleRate != null && (
                            <span className={styles.budgetCustomTag}>Đã tùy chỉnh</span>
                          )}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                          {budgetBreakdown.vehicleDescription} ({new Intl.NumberFormat('vi-VN').format(budgetBreakdown.dailyVehicleRate)}đ/ngày)
                        </span>
                      </div>
                      <div className={styles.budgetItemRight}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                          {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalLocalTransport)}đ
                        </span>
                        <button
                          type="button"
                          className={`${styles.budgetEditBtn} ${editingBudgetKey === 'transit' ? styles.budgetEditBtnActive : ''}`}
                          onClick={() => setEditingBudgetKey(editingBudgetKey === 'transit' ? null : 'transit')}
                        >
                          {editingBudgetKey === 'transit' ? (
                            <>
                              <Check size={12} strokeWidth={2.5} />
                              <span>Xong</span>
                            </>
                          ) : (
                            <>
                              <Pencil size={12} strokeWidth={2} />
                              <span>Sửa</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {editingBudgetKey === 'transit' && (
                      <div className={styles.budgetInlineEditor}>
                        <span className={styles.budgetInlineLabel}>Chi phí xe/ngày (đ):</span>
                        <input
                          type="number"
                          min={0}
                          step={50000}
                          className={styles.budgetInlineInput}
                          value={budgetBreakdown.dailyVehicleRate}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/^0+(?=\d)/, '');
                            e.target.value = raw;
                            const val = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                            setCustomBudgetRates((prev) => ({ ...prev, dailyVehicleRate: val }));
                          }}
                        />
                        <button
                          type="button"
                          className={styles.budgetPresetChip}
                          onClick={() => setCustomBudgetRates((prev) => ({ ...prev, dailyVehicleRate: 0 }))}
                        >
                          0đ (Xe cá nhân)
                        </button>
                        {customBudgetRates.dailyVehicleRate != null && (
                          <button
                            type="button"
                            className={styles.budgetPresetChip}
                            onClick={() => setCustomBudgetRates((prev) => ({ ...prev, dailyVehicleRate: null }))}
                          >
                            Mặc định ({new Intl.NumberFormat('vi-VN').format(budgetBreakdown.defaultVehicleRate)}đ)
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 4: Lodging */}
                  <div className={`${styles.budgetItemCard} ${editingBudgetKey === 'lodging' ? styles.budgetItemCardEditing : ''}`}>
                    <div className={styles.budgetItemTopRow}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#14283F', display: 'block' }}>
                          Khách sạn lưu trú ({budgetBreakdown.nights} đêm {budgetTier === 'economy' ? 'tiết kiệm' : budgetTier === 'luxury' ? 'cao cấp' : 'tiêu chuẩn'})
                          {(customBudgetRates.roomRatePerNight != null || customBudgetRates.roomsNeeded != null) && (
                            <span className={styles.budgetCustomTag}>Đã tùy chỉnh</span>
                          )}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                          {budgetBreakdown.roomsNeeded} phòng đôi × {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.roomRatePerNight)}đ × {budgetBreakdown.nights} đêm
                        </span>
                      </div>
                      <div className={styles.budgetItemRight}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                          {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalLodging)}đ
                        </span>
                        <button
                          type="button"
                          className={`${styles.budgetEditBtn} ${editingBudgetKey === 'lodging' ? styles.budgetEditBtnActive : ''}`}
                          onClick={() => setEditingBudgetKey(editingBudgetKey === 'lodging' ? null : 'lodging')}
                        >
                          {editingBudgetKey === 'lodging' ? (
                            <>
                              <Check size={12} strokeWidth={2.5} />
                              <span>Xong</span>
                            </>
                          ) : (
                            <>
                              <Pencil size={12} strokeWidth={2} />
                              <span>Sửa</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {editingBudgetKey === 'lodging' && (
                      <div className={styles.budgetInlineEditor}>
                        <span className={styles.budgetInlineLabel}>Số phòng:</span>
                        <div className={styles.budgetStepper}>
                          <button
                            type="button"
                            className={styles.budgetStepperBtn}
                            onClick={() =>
                              setCustomBudgetRates((prev) => ({
                                ...prev,
                                roomsNeeded: Math.max(1, budgetBreakdown.roomsNeeded - 1),
                              }))
                            }
                          >
                            −
                          </button>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                            {budgetBreakdown.roomsNeeded}
                          </span>
                          <button
                            type="button"
                            className={styles.budgetStepperBtn}
                            onClick={() =>
                              setCustomBudgetRates((prev) => ({
                                ...prev,
                                roomsNeeded: budgetBreakdown.roomsNeeded + 1,
                              }))
                            }
                          >
                            +
                          </button>
                        </div>

                        <span className={styles.budgetInlineLabel}>Giá/đêm (đ):</span>
                        <input
                          type="number"
                          min={0}
                          step={50000}
                          className={styles.budgetInlineInput}
                          value={budgetBreakdown.roomRatePerNight}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/^0+(?=\d)/, '');
                            e.target.value = raw;
                            const val = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                            setCustomBudgetRates((prev) => ({ ...prev, roomRatePerNight: val }));
                          }}
                        />
                        <button
                          type="button"
                          className={styles.budgetPresetChip}
                          onClick={() => setCustomBudgetRates((prev) => ({ ...prev, roomRatePerNight: 350000 }))}
                        >
                          350k
                        </button>
                        <button
                          type="button"
                          className={styles.budgetPresetChip}
                          onClick={() => setCustomBudgetRates((prev) => ({ ...prev, roomRatePerNight: 500000 }))}
                        >
                          500k
                        </button>
                        <button
                          type="button"
                          className={styles.budgetPresetChip}
                          onClick={() => setCustomBudgetRates((prev) => ({ ...prev, roomRatePerNight: 850000 }))}
                        >
                          850k
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '2px solid #E3EAF2', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>
                    <strong style={{ fontSize: '14.5px', color: '#14283F' }}>Tổng dự toán cơ sở:</strong>
                    <div style={{ fontSize: '12px', color: '#0088CC', fontWeight: '600' }}>
                      Khoảng {new Intl.NumberFormat('vi-VN').format(perPersonCost)}đ / người
                    </div>
                  </div>
                  <span style={{ fontSize: '19px', fontWeight: '800', color: '#0088CC' }}>
                    {new Intl.NumberFormat('vi-VN').format(totalEstimatedCost)}đ
                  </span>
                </div>
              </div>

              {/* Section 2: Fluctuating / Variable Expenses (User's Core Requirement) */}
              <div className={styles.modalFluctuationCard}>
                <div className={styles.modalFluctuationHeader}>
                  <div className={styles.modalFluctuationTitle}>
                    <span>⚡ 2. Các khoản chi phí dao động thực tế</span>
                  </div>
                  <span className={styles.modalFluctuationBadge}>
                    Biên độ: {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.minFluctuation)}đ – {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.maxFluctuation)}đ
                  </span>
                </div>

                <div className={styles.modalFluctuationList}>
                  {/* Fluctuation Item 1: Intercity Transport */}
                  <div className={styles.modalFluctuationItem}>
                    <div className={styles.modalFluctuationTop}>
                      <span className={styles.modalFluctuationName}>
                        🚌 Phương tiện khứ hồi liên tỉnh (Chưa bao gồm trong lịch trình)
                      </span>
                      <span className={styles.modalFluctuationVal}>
                        {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.intercityMinGroup)}đ – {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.intercityMaxGroup)}đ
                      </span>
                    </div>
                    <span className={styles.modalFluctuationDesc}>
                      Gợi ý: <strong>{budgetBreakdown.intercityType}</strong> (~{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.intercityMinPerPerson)}đ – {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.intercityMaxPerPerson)}đ / người khứ hồi). Mức giá phụ thuộc mạnh vào thời điểm đặt vé sớm hay muộn và khung giờ khởi hành.
                    </span>
                  </div>

                  {/* Fluctuation Item 2: Weekend & Holiday Surcharge */}
                  <div className={styles.modalFluctuationItem}>
                    <div className={styles.modalFluctuationTop}>
                      <span className={styles.modalFluctuationName}>
                        🏨 Phụ thu phòng cuối tuần & Ngày lễ (Surcharge)
                      </span>
                      <span className={styles.modalFluctuationVal}>
                        +{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.weekendSurchargeMin)}đ – +{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.weekendSurchargeMax)}đ
                      </span>
                    </div>
                    <span className={styles.modalFluctuationDesc}>
                      Các khách sạn và homestay thường áp dụng phụ thu từ +15% đến +35% vào các đêm thứ 6, thứ 7 hoặc dịp lễ lớn cho {budgetBreakdown.roomsNeeded} phòng lưu trú của đoàn.
                    </span>
                  </div>

                  {/* Fluctuation Item 3: Specialty Upgrade */}
                  <div className={styles.modalFluctuationItem}>
                    <div className={styles.modalFluctuationTop}>
                      <span className={styles.modalFluctuationName}>
                        🍲 Nâng cấp ẩm thực đặc sản & Bữa tiệc riêng
                      </span>
                      <span className={styles.modalFluctuationVal}>
                        +{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.specialtyUpgradePerPerson)}đ / người / bữa
                      </span>
                    </div>
                    <span className={styles.modalFluctuationDesc}>
                      Dành cho nhu cầu gọi thêm lẩu cá hồi/cá tầm (vùng núi cao), tiệc hải sản tươi sống (vùng biển), tiệc nướng BBQ rượu ngô hoặc thực đơn tiệc liên hoan riêng.
                    </span>
                  </div>

                  {/* Fluctuation Item 4: Optional High-Ticket Activities */}
                  <div className={styles.modalFluctuationItem}>
                    <div className={styles.modalFluctuationTop}>
                      <span className={styles.modalFluctuationName}>
                        🚠 Vé trải nghiệm cao cấp tự chọn (Fansipan / Dù lượn / Ca nô)
                      </span>
                      <span className={styles.modalFluctuationVal}>
                        150.000đ – 850.000đ / người
                      </span>
                    </div>
                    <span className={styles.modalFluctuationDesc}>
                      Tùy thuộc vào việc các thành viên trong nhóm có nhu cầu đi Cáp treo Fansipan, bay dù lượn ngắm thung lũng, tour ca nô lặn biển hay thuê trang phục dân tộc check-in.
                    </span>
                  </div>

                  {/* Fluctuation Item 5: Contingency */}
                  <div className={styles.modalFluctuationItem}>
                    <div className={styles.modalFluctuationTop}>
                      <span className={styles.modalFluctuationName}>
                        🛍️ Quỹ dự phòng phát sinh & Quà lưu niệm
                      </span>
                      <span className={styles.modalFluctuationVal}>
                        ~{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.contingencyGroup)}đ (8% dự toán)
                      </span>
                    </div>
                    <span className={styles.modalFluctuationDesc}>
                      Khuyến nghị chuẩn bị quỹ phát sinh dự phòng cho các chi phí ngoài lịch trình như cà phê giải khát, quà bánh địa phương, tiền tips và thuốc men sơ cứu.
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Scope Transparency Grid */}
              <div className={styles.modalScopeGrid}>
                <div className={`${styles.modalScopeCol} ${styles.modalScopeIncluded}`}>
                  <span className={styles.modalScopeTitle} style={{ color: '#047857' }}>
                    ✓ ĐÃ BAO GỒM TRONG DỰ TOÁN
                  </span>
                  <ul style={{ margin: 0, paddingLeft: '16px', color: '#065F46', lineHeight: 1.5 }}>
                    <li>Vé vào cửa các điểm tham quan theo lịch trình</li>
                    <li>Chi phí ăn uống 3 bữa/ngày theo chuẩn {budgetTier}</li>
                    <li>Xe di chuyển nội tỉnh ({budgetBreakdown.vehicleDescription})</li>
                    <li>Khách sạn {budgetBreakdown.roomsNeeded} phòng đôi ({budgetBreakdown.nights} đêm)</li>
                  </ul>
                </div>

                <div className={`${styles.modalScopeCol} ${styles.modalScopeExcluded}`}>
                  <span className={styles.modalScopeTitle} style={{ color: '#B91C1C' }}>
                    ✕ CHƯA BAO GỒM (DAO ĐỘNG RIÊNG)
                  </span>
                  <ul style={{ margin: 0, paddingLeft: '16px', color: '#991B1B', lineHeight: 1.5 }}>
                    <li>Vé máy bay / xe khách khứ hồi từ tỉnh nhà đến {destination}</li>
                    <li>Chi tiêu cá nhân, đồ uống ngoài thực đơn và quà biếu</li>
                    <li>Phụ thu phòng đơn nếu ở 1 mình/phòng</li>
                    <li>Phụ thu dịp cao điểm lễ Tết nếu trùng ngày</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnCreateTripPrimary}
                onClick={() => setShowBudgetModal(false)}
              >
                Đã hiểu dự toán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PLAN HISTORY DRAWER */}
      {showHistoryDrawer && (
        <div className={styles.drawerWrapper} onClick={() => setShowHistoryDrawer(false)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>
                  Lịch sử tạo lịch trình ({planHistoryList.length})
                </h3>
                <p className={styles.drawerSubtitle}>
                  Tự động lưu lại mỗi khi sinh plan. Nhấn để mở lại bất cứ lúc nào.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {planHistoryList.length > 0 && (
                  <button
                    type="button"
                    className={styles.btnClearAllHistory}
                    onClick={handleClearAllHistory}
                    title="Xóa toàn bộ lịch sử"
                  >
                    Dọn sạch
                  </button>
                )}
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setShowHistoryDrawer(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={styles.drawerBody}>
              {planHistoryList.length === 0 ? (
                <div className={styles.historyEmptyState}>
                  <Clock size={40} strokeWidth={1.5} color="#94A3B8" />
                  <h4>Chưa có lịch sử tạo plan</h4>
                  <p>
                    Khi bạn nhấn nút tạo lịch trình (bằng AI hoặc tất định), kế hoạch sẽ tự động được lưu vào đây để bạn dễ dàng xem lại.
                  </p>
                </div>
              ) : (
                <div className={styles.historyCardList}>
                  {planHistoryList.map((rec) => {
                    const photo =
                      rec.photoUrl ||
                      DESTINATION_LIST.find(
                        (d) =>
                          d.nameVi.toLowerCase() === rec.destination.toLowerCase() ||
                          rec.destination.toLowerCase().includes(d.id)
                      )?.photo ||
                      DESTINATION_LIST[0].photo;

                    return (
                      <div key={rec.id} className={styles.historyCard}>
                        <div className={styles.historyCardTop}>
                          <img
                            src={photo}
                            alt={rec.destination}
                            className={styles.historyCardPhoto}
                          />
                          <div className={styles.historyCardMain}>
                            <h4 className={styles.historyCardTitle}>{rec.title}</h4>
                            <div className={styles.historyCardTime}>
                              <Clock size={12} />
                              <span>{formatTimeAgo(rec.createdAt)}</span>
                            </div>
                            <div className={styles.historyCardCost}>
                              Dự toán: {new Intl.NumberFormat('vi-VN').format(rec.totalEstimatedCost)}đ
                            </div>
                          </div>
                        </div>

                        <div className={styles.historyCardMetaTags}>
                          <span className={styles.historyTag}>
                            {rec.totalDays}N · {rec.peopleCount} người
                          </span>
                          <span className={styles.historyTag}>
                            {rec.budgetTier === 'economy'
                              ? 'Tiết kiệm'
                              : rec.budgetTier === 'luxury'
                              ? 'Cao cấp'
                              : 'Tiêu chuẩn'}
                          </span>
                          {rec.aiMetadata && !rec.aiMetadata.fallbackUsed ? (
                            <span className={styles.historyTagAi}>⚡ AI Live</span>
                          ) : (
                            <span className={styles.historyTag}>Tất định VISTA</span>
                          )}
                          <span className={styles.historyTag}>
                            {rec.itineraryDays.reduce((acc, d) => acc + (d.activities?.length || 0), 0)} điểm đến
                          </span>
                        </div>

                        <div className={styles.historyCardActions}>
                          <button
                            type="button"
                            className={styles.btnRestoreHistory}
                            onClick={() => handleRestoreFromHistory(rec)}
                          >
                            <RotateCcw size={13} />
                            <span>Mở lại lịch trình</span>
                          </button>
                          <button
                            type="button"
                            className={styles.btnDeleteHistoryItem}
                            onClick={(e) => handleDeleteHistoryItem(rec.id, e)}
                            title="Xóa khỏi lịch sử"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. REAL SAVED ITINERARIES DRAWER */}
      {showSavedDrawer && (
        <div className={styles.drawerWrapper} onClick={() => setShowSavedDrawer(false)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>
                  Lịch trình đã lưu của bạn ({savedItinerariesList.length})
                </h3>
                <p className={styles.drawerSubtitle}>
                  Các kế hoạch bạn đã bấm &quot;Lưu lịch trình&quot; để tra cứu
                </p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowSavedDrawer(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.drawerBody}>
              {savedItinerariesList.length === 0 ? (
                <div className={styles.historyEmptyState}>
                  <Bookmark size={40} strokeWidth={1.5} color="#94A3B8" />
                  <h4>Chưa có lịch trình nào được lưu</h4>
                  <p>
                    Khi xem bất kỳ lịch trình nào bạn thích, bấm nút &quot;Lưu lịch trình&quot; để ghim vào danh sách yêu thích cá nhân tại đây.
                  </p>
                </div>
              ) : (
                <div className={styles.historyCardList}>
                  {savedItinerariesList.map((rec) => {
                    const photo =
                      DESTINATION_LIST.find(
                        (d) =>
                          d.nameVi.toLowerCase() === rec.destination.toLowerCase() ||
                          rec.destination.toLowerCase().includes(d.id)
                      )?.photo || DESTINATION_LIST[0].photo;

                    return (
                      <div key={rec.id} className={styles.historyCard}>
                        <div className={styles.historyCardTop}>
                          <img
                            src={photo}
                            alt={rec.destination}
                            className={styles.historyCardPhoto}
                          />
                          <div className={styles.historyCardMain}>
                            <h4 className={styles.historyCardTitle}>{rec.title}</h4>
                            <div className={styles.historyCardTime}>
                              <Calendar size={12} />
                              <span>{rec.startDate} ({rec.durationLabel})</span>
                            </div>
                            <div className={styles.historyCardCost}>
                              Dự toán: {new Intl.NumberFormat('vi-VN').format(rec.totalEstimatedCost)}đ
                            </div>
                          </div>
                        </div>

                        <div className={styles.historyCardMetaTags}>
                          <span className={styles.historyTag}>
                            {rec.totalDays}N · {rec.peopleCount} người
                          </span>
                          <span className={styles.historyTag}>
                            {rec.budgetTier === 'economy'
                              ? 'Tiết kiệm'
                              : rec.budgetTier === 'luxury'
                              ? 'Cao cấp'
                              : 'Tiêu chuẩn'}
                          </span>
                          <span className={styles.historyTag}>
                            {rec.days.reduce((acc, d) => acc + (d.activities?.length || 0), 0)} điểm đến
                          </span>
                        </div>

                        <div className={styles.historyCardActions}>
                          <button
                            type="button"
                            className={styles.btnRestoreHistory}
                            onClick={() => handleRestoreSavedItinerary(rec)}
                          >
                            <Bookmark size={13} />
                            <span>Mở lịch trình này</span>
                          </button>
                          <button
                            type="button"
                            className={styles.btnDeleteHistoryItem}
                            onClick={(e) => handleDeleteSavedItinerary(rec.id, e)}
                            title="Xóa khỏi danh sách lưu"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. REPLACE ACTIVITY SIDE DRAWER */}
      {replaceTargetActivityId && (
        <div
          className={styles.drawerWrapper}
          onClick={() => {
            setReplaceTargetActivityId(null);
            setReplaceSearchQuery('');
          }}
        >
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>Gợi ý địa điểm thay thế</h3>
                <p className={styles.drawerSubtitle}>
                  {targetActivityToReplace
                    ? `Đang đổi cho: "${targetActivityToReplace.title}" (${targetActivityToReplace.timeRange})`
                    : `Kho dữ liệu địa điểm thực tế tại ${destination} (Loại trừ điểm đã có trong lịch)`}
                </p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => {
                  setReplaceTargetActivityId(null);
                  setReplaceSearchQuery('');
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '10px 18px 4px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <input
                type="text"
                placeholder={`🔍 Tìm nhanh địa điểm tại ${destination} (VD: biển, bảo tàng, chùa, hải sản, chợ)...`}
                value={replaceSearchQuery}
                onChange={(e) => {
                  setReplaceSearchQuery(e.target.value);
                  setReplaceBatchIndex(0);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                  ✨ Đã lọc bỏ các điểm trùng trong lịch trình
                </span>
                <button
                  type="button"
                  onClick={() => setReplaceBatchIndex((prev) => prev + 1)}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0284C7',
                    background: '#E0F2FE',
                    border: '1px solid #BAE6FD',
                    borderRadius: '999px',
                    padding: '4px 12px',
                    cursor: 'pointer',
                  }}
                >
                  🔀 Đổi loạt địa điểm khác
                </button>
              </div>
            </div>

            <div className={styles.drawerBody}>
              {replacementPlaces.map((place) => (
                <div
                  key={place.id}
                  className={styles.alternativeCard}
                  onClick={() => handleSelectReplacement(place)}
                >
                  <img
                    src={place.photoUrl}
                    alt={place.title}
                    className={styles.alternativePhoto}
                  />
                  <div className={styles.alternativeInfo}>
                    <span className={styles.alternativeCategory}>{place.category}</span>
                    <h4 className={styles.alternativeTitle}>{place.title}</h4>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0' }}>
                      {place.description}
                    </p>
                    <span className={styles.alternativeCost}>{place.costLabel}</span>
                    <button type="button" className={styles.btnSelectPlace}>
                      Chọn địa điểm này
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. ADD ACTIVITY MODAL WITH REAL PLACES RECOMMENDATIONS & CUSTOM INPUT */}
      {showAddActivityModal && (
        <div className={styles.overlayBackdrop} onClick={() => setShowAddActivityModal(false)}>
          <div className={`${styles.modalBox} ${styles.modalBoxAddActivity}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Thêm hoạt động vào Ngày {activeDay}</h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Địa bàn: <strong>{cleanDestName}</strong> · Đề xuất thực tế &amp; Nhập tùy biến
                </span>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowAddActivityModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Mode Switch: Gợi ý tại thành phố vs Tự do nhập */}
              <div className={styles.addActModeSwitch}>
                <button
                  type="button"
                  className={`${styles.addActModeBtn} ${addActMode === 'suggested' ? styles.addActModeBtnActive : ''}`}
                  onClick={() => setAddActMode('suggested')}
                >
                  <Sparkles size={14} />
                  <span>Đề xuất tại {cleanDestName}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.addActModeBtn} ${addActMode === 'custom' ? styles.addActModeBtnActive : ''}`}
                  onClick={() => setAddActMode('custom')}
                >
                  <MapPin size={14} />
                  <span>Tự nhập theo ý bạn</span>
                </button>
              </div>

              {addActMode === 'suggested' ? (
                /* TAB 1: GỢI Ý ĐỊA ĐIỂM TRONG PHẠM VI THÀNH PHỐ */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Search bar within city */}
                  <div className={styles.addActSearchBar}>
                    <Search size={15} color="#94A3B8" />
                    <input
                      type="text"
                      className={styles.addActSearchInput}
                      placeholder={`Tìm địa điểm, quán ăn tại ${cleanDestName}...`}
                      value={addActSearchQuery}
                      onChange={(e) => setAddActSearchQuery(e.target.value)}
                    />
                    {addActSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAddActSearchQuery('')}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '13px' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Category Filter Pills */}
                  <div className={styles.addActCategoryPills}>
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'Tham quan', label: '🏛️ Tham quan' },
                      { id: 'Ẩm thực', label: '🍜 Ẩm thực' },
                      { id: 'Check-in', label: '📸 Sống ảo & Check-in' },
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        className={`${styles.addActCategoryPill} ${addActCategoryFilter === pill.id ? styles.addActCategoryPillActive : ''}`}
                        onClick={() => setAddActCategoryFilter(pill.id)}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  {/* List of Suggested Places */}
                  <div className={styles.addActSuggestedList}>
                    {citySuggestedPlaces.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748B', fontSize: '13px' }}>
                        Không tìm thấy địa điểm khớp &quot;{addActSearchQuery}&quot; tại {cleanDestName}. Bạn có thể chuyển sang tab &quot;Tự nhập&quot; để thêm bất kỳ địa điểm nào.
                      </div>
                    ) : (
                      <>
                        {citySuggestedPlaces.slice(0, 24).map((place) => {
                          const isSelected = selectedSuggestedPlace?.name === place.name || newActTitle === place.name;
                          const costNum = place.priceMin || 0;
                          const costText = costNum === 0 ? 'Miễn phí vé' : `${new Intl.NumberFormat('vi-VN').format(costNum)}đ`;
                          return (
                            <div
                              key={place.name}
                              className={`${styles.addActPlaceCard} ${isSelected ? styles.addActPlaceCardActive : ''}`}
                              onClick={() => handleSelectSuggestedPlace(place)}
                            >
                              <img
                                src={pickAuthenticPlacePhoto(place.image, citySuggestedPlaces, 0, activeDestObj.photo)}
                                alt={place.name}
                                className={styles.addActPlaceThumbnail}
                                loading="lazy"
                              />
                              <div className={styles.addActPlaceInfo}>
                                <div className={styles.addActPlaceTopRow}>
                                  <h4 className={styles.addActPlaceName}>{place.name}</h4>
                                  <span className={styles.addActPlaceBadge}>{place.category}</span>
                                </div>
                                <p className={styles.addActPlaceDesc}>{place.description}</p>
                                <div className={styles.addActPlaceCostRow}>
                                  <span className={styles.addActPlaceCost}>💰 {costText}</span>
                                  {place.openingHours && (
                                    <span style={{ color: '#94A3B8' }}>· ⏰ {place.openingHours}</span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                className={styles.addActPlaceSelectBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectSuggestedPlace(place);
                                }}
                              >
                                {isSelected ? '✓ Đã chọn' : '+ Chọn'}
                              </button>
                            </div>
                          );
                        })}
                        {citySuggestedPlaces.length > 24 && (
                          <div style={{ textAlign: 'center', padding: '10px 8px', color: '#64748B', fontSize: '12px' }}>
                            Đang hiển thị 24/{citySuggestedPlaces.length} địa điểm tiêu biểu. Gõ ô tìm kiếm ở trên để lọc chính xác điểm bạn muốn.
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {selectedSuggestedPlace && (
                    <div className={styles.addActSelectedPreview}>
                      <span>
                        ✨ Đang chọn: <strong>{selectedSuggestedPlace.name}</strong> ({selectedSuggestedPlace.category})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSuggestedPlace(null);
                          setNewActTitle('');
                          setNewActCost('0');
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0284C7', fontWeight: 600, fontSize: '11.5px' }}
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 2: TỰ DO NHẬP ĐỊA ĐIỂM RIÊNG CỦA NGƯỜI DÙNG */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className={styles.addActAutocompleteWrapper}>
                    <label className={styles.fieldLabel}>Tên hoạt động / địa điểm mong muốn</label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      placeholder="Ví dụ: Cà phê ngắm cảnh sông, Thăm bạn bè, Check-in quán quen..."
                      value={newActTitle}
                      onChange={(e) => {
                        setNewActTitle(e.target.value);
                        setShowActAutocomplete(true);
                      }}
                      onFocus={() => setShowActAutocomplete(true)}
                    />

                    {/* Live Autocomplete suggestions when typing in custom mode */}
                    {showActAutocomplete && autocompleteMatches.length > 0 && (
                      <div className={styles.addActAutocompleteDropdown}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', padding: '4px 8px' }}>
                          💡 GỢI Ý ĐỊA ĐIỂM TẠI {cleanDestName.toUpperCase()}:
                        </div>
                        {autocompleteMatches.map((match) => (
                          <div
                            key={match.name}
                            className={styles.addActAutocompleteItem}
                            onClick={() => handleSelectSuggestedPlace(match)}
                          >
                            <img
                              src={pickAuthenticPlacePhoto(match.image, citySuggestedPlaces, 0, activeDestObj.photo)}
                              alt={match.name}
                              style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>{match.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>
                                {match.category} · {match.priceMin === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(match.priceMin)}đ`}
                              </div>
                            </div>
                            <span style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 700 }}>Chọn</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TÙY CHỈNH CHI TIẾT (KHUNG GIỜ, PHÂN LOẠI, CHI PHÍ) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className={styles.fieldLabel}>Khung giờ trải nghiệm</label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={newActTime}
                      onChange={(e) => setNewActTime(e.target.value)}
                    />
                    <div className={styles.addActQuickPresets}>
                      {[
                        { label: '🌅 08:30', time: '08:30–10:30' },
                        { label: '☀️ 11:30', time: '11:30–13:00' },
                        { label: '🌤️ 14:30', time: '14:30–16:30' },
                        { label: '🌙 19:00', time: '19:00–21:00' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className={styles.addActQuickPresetBtn}
                          onClick={() => setNewActTime(preset.time)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Phân loại hoạt động</label>
                    <select
                      className={styles.modalInput}
                      value={newActCategory}
                      onChange={(e) => setNewActCategory(e.target.value)}
                    >
                      <option value="Tham quan">Tham quan</option>
                      <option value="Ẩm thực">Ẩm thực</option>
                      <option value="Biển & nghỉ dưỡng">Biển & nghỉ dưỡng</option>
                      <option value="Giải trí">Giải trí</option>
                      <option value="Check-in">Check-in</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={styles.fieldLabel}>Chi phí dự tính (VNĐ / người)</label>
                  <input
                    type="number"
                    className={styles.modalInput}
                    value={newActCost}
                    onChange={(e) => setNewActCost(e.target.value)}
                    placeholder="0 (miễn phí)"
                  />
                  <div className={styles.addActQuickPresets}>
                    {[
                      { label: 'Miễn phí', cost: '0' },
                      { label: '30.000đ', cost: '30000' },
                      { label: '50.000đ', cost: '50000' },
                      { label: '100.000đ', cost: '100000' },
                      { label: '200.000đ', cost: '200000' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        className={styles.addActQuickPresetBtn}
                        onClick={() => setNewActCost(preset.cost)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  setShowAddActivityModal(false);
                  setSelectedSuggestedPlace(null);
                  setShowActAutocomplete(false);
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.btnCreateTripPrimary}
                onClick={handleAddActivity}
                disabled={!newActTitle.trim()}
                style={{ opacity: newActTitle.trim() ? 1 : 0.6 }}
              >
                + Thêm vào Ngày {activeDay}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
