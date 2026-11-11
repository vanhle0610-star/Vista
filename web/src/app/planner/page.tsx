'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SkeletonAiGenerating, SkeletonBox } from '@/components/common/Skeleton';
import type { DestinationMarker } from '@/features/map-location/types';
import { getRealPlacesByProvince } from '@/data/realDestinationsData';
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
} from 'lucide-react';

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
  travelDurationFromPreviousMinutes?: number;
  bufferMinutes?: number;
}

interface DayPlan {
  dayNumber: number;
  dateStr: string;
  title: string;
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

export interface DestinationOption {
  id: string;
  nameVi: string;
  province: string;
  region: 'Bắc' | 'Trung' | 'Nam';
  lat: number;
  lng: number;
  photo: string;
}

// 34 Provinces integrated from database seed (T4)
const DESTINATION_LIST: DestinationOption[] = [
  // Miền Trung & Tây Nguyên
  { id: 'danang', nameVi: 'Đà Nẵng', province: 'Đà Nẵng', region: 'Trung', lat: 16.0544, lng: 108.2022, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_real.jpg' },
  { id: 'hue', nameVi: 'Thừa Thiên Huế', province: 'Thừa Thiên Huế', region: 'Trung', lat: 16.4637, lng: 107.5909, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hue_real.jpg' },
  { id: 'quangnam', nameVi: 'Hội An (Quảng Nam)', province: 'Quảng Nam', region: 'Trung', lat: 15.8801, lng: 108.3380, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hoian_real.jpg' },
  { id: 'khanhhoa', nameVi: 'Nha Trang (Khánh Hòa)', province: 'Khánh Hòa', region: 'Trung', lat: 12.2388, lng: 109.1967, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_real.jpg' },
  { id: 'lamdong', nameVi: 'Đà Lạt (Lâm Đồng)', province: 'Lâm Đồng', region: 'Trung', lat: 11.9404, lng: 108.4583, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/dalat_real.jpg' },
  { id: 'thanhhoa', nameVi: 'Thanh Hóa', province: 'Thanh Hóa', region: 'Trung', lat: 19.8075, lng: 105.7764, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/ninhbinh_real.jpg' },
  { id: 'nghean', nameVi: 'Nghệ An', province: 'Nghệ An', region: 'Trung', lat: 18.6734, lng: 105.6813, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hue_real.jpg' },
  { id: 'hatinh', nameVi: 'Hà Tĩnh', province: 'Hà Tĩnh', region: 'Trung', lat: 18.3432, lng: 105.9059, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hue_real.jpg' },
  { id: 'quangtri', nameVi: 'Quảng Trị', province: 'Quảng Trị', region: 'Trung', lat: 16.7497, lng: 107.1854, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hue_real.jpg' },
  { id: 'quangngai', nameVi: 'Quảng Ngãi', province: 'Quảng Ngãi', region: 'Trung', lat: 15.1205, lng: 108.7923, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hoian_real.jpg' },
  { id: 'gialai', nameVi: 'Gia Lai (Pleiku)', province: 'Gia Lai', region: 'Trung', lat: 13.9833, lng: 108.0000, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/dalat_real.jpg' },
  { id: 'daklak', nameVi: 'Đắk Lắk (Buôn Ma Thuột)', province: 'Đắk Lắk', region: 'Trung', lat: 12.6667, lng: 108.0500, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/dalat_real.jpg' },

  // Miền Bắc
  { id: 'hanoi', nameVi: 'Hà Nội', province: 'Hà Nội', region: 'Bắc', lat: 21.0285, lng: 105.8542, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hanoi_real.jpg' },
  { id: 'quangninh', nameVi: 'Vịnh Hạ Long (Quảng Ninh)', province: 'Quảng Ninh', region: 'Bắc', lat: 20.9505, lng: 107.0734, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_real.jpg' },
  { id: 'ninhbinh', nameVi: 'Ninh Bình', province: 'Ninh Bình', region: 'Bắc', lat: 20.2506, lng: 105.9745, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/ninhbinh_real.jpg' },
  { id: 'haiphong', nameVi: 'Hải Phòng', province: 'Hải Phòng', region: 'Bắc', lat: 20.8449, lng: 106.6881, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_real.jpg' },
  { id: 'laocai', nameVi: 'Sa Pa (Lào Cai)', province: 'Lào Cai', region: 'Bắc', lat: 22.3364, lng: 103.8438, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/sapa_real.jpg' },
  { id: 'laichau', nameVi: 'Lai Châu', province: 'Lai Châu', region: 'Bắc', lat: 22.3964, lng: 103.4619, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_lungcu_hero.jpg' },
  { id: 'dienbien', nameVi: 'Điện Biên', province: 'Điện Biên', region: 'Bắc', lat: 21.3860, lng: 103.0230, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_lungcu_hero.jpg' },
  { id: 'sonla', nameVi: 'Mộc Châu (Sơn La)', province: 'Sơn La', region: 'Bắc', lat: 20.8456, lng: 104.6496, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/sapa_real.jpg' },
  { id: 'caobang', nameVi: 'Cao Bằng', province: 'Cao Bằng', region: 'Bắc', lat: 22.6657, lng: 105.9739, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_lungcu_hero.jpg' },
  { id: 'langson', nameVi: 'Lạng Sơn', province: 'Lạng Sơn', region: 'Bắc', lat: 21.8537, lng: 106.7615, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_lungcu_hero.jpg' },
  { id: 'tuyenquang', nameVi: 'Tuyên Quang', province: 'Tuyên Quang', region: 'Bắc', lat: 21.8234, lng: 105.2140, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/sapa_real.jpg' },
  { id: 'thainguyen', nameVi: 'Thái Nguyên', province: 'Thái Nguyên', region: 'Bắc', lat: 21.5928, lng: 105.8442, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/dalat_real.jpg' },
  { id: 'phutho', nameVi: 'Phú Thọ', province: 'Phú Thọ', region: 'Bắc', lat: 21.3228, lng: 105.4019, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/ninhbinh_real.jpg' },
  { id: 'bacninh', nameVi: 'Bắc Ninh', province: 'Bắc Ninh', region: 'Bắc', lat: 21.1861, lng: 106.0763, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hanoi_real.jpg' },
  { id: 'hungyen', nameVi: 'Hưng Yên', province: 'Hưng Yên', region: 'Bắc', lat: 20.6464, lng: 106.0511, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hanoi_real.jpg' },

  // Miền Nam & ĐBSCL
  { id: 'saigon', nameVi: 'TP. Hồ Chí Minh', province: 'Hồ Chí Minh', region: 'Nam', lat: 10.7769, lng: 106.7009, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_real.jpg' },
  { id: 'phuquoc', nameVi: 'Phú Quốc (Kiên Giang)', province: 'Kiên Giang', region: 'Nam', lat: 10.2899, lng: 103.9840, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/phuquoc_real.jpg' },
  { id: 'cantho', nameVi: 'Cần Thơ', province: 'Cần Thơ', region: 'Nam', lat: 10.0452, lng: 105.7469, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/cantho_cairang.jpg' },
  { id: 'tayninh', nameVi: 'Tây Ninh', province: 'Tây Ninh', region: 'Nam', lat: 11.3100, lng: 106.0983, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/tayninh_nuibaden.jpg' },
  { id: 'dongnai', nameVi: 'Đồng Nai', province: 'Đồng Nai', region: 'Nam', lat: 10.9574, lng: 106.8427, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_real.jpg' },
  { id: 'vinhlong', nameVi: 'Vĩnh Long', province: 'Vĩnh Long', region: 'Nam', lat: 10.2537, lng: 105.9722, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_real.jpg' },
  { id: 'dongthap', nameVi: 'Đồng Tháp', province: 'Đồng Tháp', region: 'Nam', lat: 10.4638, lng: 105.6328, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/dongthap_tramchim.jpg' },
  { id: 'angiang', nameVi: 'An Giang', province: 'An Giang', region: 'Nam', lat: 10.3831, lng: 105.4358, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/angiang_trasu.jpg' },
  { id: 'camau', nameVi: 'Cà Mau', province: 'Cà Mau', region: 'Nam', lat: 9.1769, lng: 105.1524, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/camau_real.jpg' },
];

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

// Initial Curated Da Nang Plan (Production standard)
const INITIAL_DANANG_DAYS: DayPlan[] = [
  {
    dayNumber: 1,
    dateStr: '14/11/2026',
    title: 'Ngày 1 · Chạm biển, khám phá Bán đảo Sơn Trà',
    activities: [
      {
        id: 'act-1-1',
        timeSlot: 'MORNING',
        timeRange: '08:00–10:00',
        category: 'Tham quan',
        title: 'Chùa Linh Ứng – Bãi Bụt (Bán đảo Sơn Trà)',
        description: 'Ngắm cảnh biển từ bán đảo Sơn Trà và khám phá không gian thanh tịnh.',
        location: 'Bán đảo Sơn Trà, Đà Nẵng',
        costVnd: 0,
        costLabel: 'Miễn phí',
        tip: 'Ưu tiên trang phục lịch sự khi vào khuôn viên chùa.',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 25 phút',
        timeSlotReason: 'Khung giờ sáng (08:00 – 10:00) tiết trời mát mẻ, nắng chưa gắt, leo núi Sơn Trà không bị mệt và ngắm toàn cảnh vịnh biển trong vắt.',
        whyVisitReason: 'Ngôi chùa linh thiêng với tượng Phật Bà Quan Âm cao 67m hướng ra biển, là điểm ngắm trọn vẹn thành phố từ trên cao đẹp nhất.',
      },
      {
        id: 'act-1-2',
        timeSlot: 'NOON',
        timeRange: '11:00–12:30',
        category: 'Ẩm thực',
        title: 'Bữa trưa với đặc sản Đà Nẵng',
        description: 'Thưởng thức mì Quảng hoặc bánh tráng cuốn thịt heo tại quán địa phương.',
        location: 'Quận Hải Châu, Đà Nẵng',
        costVnd: 240000,
        costLabel: '240.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 15 phút',
        timeSlotReason: 'Thời điểm giữa trưa (11:00 – 12:30) vừa vặn sau chặng ngắm cảnh sáng, ghé quán ăn nạp năng lượng và nghỉ ngơi mát mẻ.',
        whyVisitReason: 'Thưởng thức mì Quảng ếch hoặc bánh tráng cuốn thịt heo hai đầu da chuẩn vị Đà Thành, món ăn trứ danh ai đến cũng phải thử.',
      },
      {
        id: 'act-1-3',
        timeSlot: 'AFTERNOON',
        timeRange: '15:30–17:30',
        category: 'Biển & nghỉ dưỡng',
        title: 'Một chiều thảnh thơi ở biển Mỹ Khê',
        description: 'Dạo biển, thư giãn và ngắm hoàng hôn cùng bạn đồng hành.',
        location: 'Bãi biển Mỹ Khê, Đà Nẵng',
        costVnd: 120000,
        costLabel: '120.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_hanoi_day.jpg',
        transferTimeAfter: 'Di chuyển khoảng 20 phút',
        timeSlotReason: 'Khung giờ chiều muộn (15:30 – 17:30) nắng đã dịu hẳn, gió biển thổi lồng lộng, thời điểm lý tưởng nhất để dạo cát và đón hoàng hôn.',
        whyVisitReason: 'Được tạp chí Forbes vinh danh là một trong những bãi biển quyến rũ nhất hành tinh với bãi cát trắng mịn trải dài và sóng êm.',
      },
      {
        id: 'act-1-4',
        timeSlot: 'EVENING',
        timeRange: '19:00–21:00',
        category: 'Khám phá buổi tối',
        title: 'Dạo bờ sông Hàn, Cầu Rồng & Chợ đêm',
        description: 'Khám phá không khí thành phố về đêm và thưởng thức món ăn đường phố.',
        location: 'Bờ Đông Sông Hàn, Đà Nẵng',
        costVnd: 500000,
        costLabel: '500.000đ / nhóm',
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_night.jpg',
        timeSlotReason: 'Buổi tối (19:00 – 21:00) phố lên đèn rực rỡ, không khí chợ đêm nhộn nhịp nhất và dễ dàng xem Cầu Rồng phun lửa/nước nếu đi cuối tuần.',
        whyVisitReason: 'Biểu tượng hiện đại đầy tự hào của Đà Nẵng, nơi bạn vừa hòa mình vào nhịp sống trẻ trung vừa tha hồ thưởng thức hải sản đường phố.',
      },
    ],
  },
  {
    dayNumber: 2,
    dateStr: '15/11/2026',
    title: 'Ngày 2 · Chinh phục Bà Nà Hills & Cầu Vàng',
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
    dateStr: '16/11/2026',
    title: 'Ngày 3 · Danh thắng Ngũ Hành Sơn & Mua sắm Chợ Hàn',
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
    dateStr: '15/11/2026',
    title: 'Ngày 2 · Nam Đảo: Cáp treo Hòn Thơm, Bãi Sao & Cầu Hôn',
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
    dateStr: '16/11/2026',
    title: 'Ngày 3 · Di tích lịch sử, Làng nghề & Chill Bãi Trường',
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
  hasElderly?: boolean
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
      const nCost = noonPlace.priceMin || 150000;
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
          description: noonPlace.description,
          location: `${noonPlace.name}, ${destName}`,
          costVnd: nCost,
          costLabel: `${new Intl.NumberFormat('vi-VN').format(nCost)}đ / nhóm`,
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
      dateStr: `Ngày ${d}`,
      title,
      activities,
    });
  }

  return days;
}

export default function PlannerPage() {
  const router = useRouter();

  // Workflow View states
  const [activeView, setActiveView] = useState<'timeline' | 'map'>('timeline');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [hasPlanGenerated, setHasPlanGenerated] = useState<boolean>(true);
  const [aiGenerationMetadata, setAiGenerationMetadata] = useState<AiGenerationMetadata>({
    provider: 'offline',
    fallbackUsed: true,
  });
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
  const [destSearchQuery, setDestSearchQuery] = useState<string>('');
  const [showDestDropdown, setShowDestDropdown] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(getTodayIso());
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

  // T1: Check if departure date is today and local time >= 20:00 (8:00 PM)
  const isLateEveningDeparture = useMemo(() => {
    if (startDate === getTodayIso()) {
      const currentHour = new Date().getHours();
      return currentHour >= 20;
    }
    return false;
  }, [startDate]);

  // Active Itinerary Data
  const [itineraryDays, setItineraryDays] = useState<DayPlan[]>(INITIAL_DANANG_DAYS);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [detectedArrivalTime, setDetectedArrivalTime] = useState<string | null>(null);
  const [detectedDepartureTime, setDetectedDepartureTime] = useState<string | null>(null);
  const [detectedElderly, setDetectedElderly] = useState<boolean>(false);
  const [detectedChildren, setDetectedChildren] = useState<boolean>(false);
  const [coPilotInput, setCoPilotInput] = useState<string>('');
  const [coPilotReply, setCoPilotReply] = useState<string | null>(null);
  const [isCoPilotBusy, setIsCoPilotBusy] = useState<boolean>(false);
  const [showTripDna, setShowTripDna] = useState<boolean>(false);
  const [showAiInsights, setShowAiInsights] = useState<boolean>(false);
  const [showCoPilot, setShowCoPilot] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('vista_saved_itineraries');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed.length + 3;
        }
      } catch {
        // ignore
      }
    }
    return 3;
  });
  const [openTipId, setOpenTipId] = useState<string | null>('act-1-1');
  const [activeOverflowId, setActiveOverflowId] = useState<string | null>(null);

  // Overlays
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState<boolean>(false);
  const [showCreateTripModal, setShowCreateTripModal] = useState<boolean>(false);
  const [showSavedDrawer, setShowSavedDrawer] = useState<boolean>(false);
  const [replaceTargetActivityId, setReplaceTargetActivityId] = useState<string | null>(null);
  const [replaceSearchQuery, setReplaceSearchQuery] = useState<string>('');
  const [replaceBatchIndex, setReplaceBatchIndex] = useState<number>(0);
  const [showAddActivityModal, setShowAddActivityModal] = useState<boolean>(false);
  const [selectedMapPin, setSelectedMapPin] = useState<number>(1);

  // Modal form states
  const [newTripTitle, setNewTripTitle] = useState<string>('Chuyến đi Đà Nẵng 3N2Đ');
  const [newTripVisibility, setNewTripVisibility] = useState<string>('private');
  const [newActTitle, setNewActTitle] = useState<string>('');
  const [newActCategory, setNewActCategory] = useState<string>('Tham quan');
  const [newActTime, setNewActTime] = useState<string>('14:00–15:30');
  const [newActCost, setNewActCost] = useState<string>('0');

  // Linked Trip State (Bidirectional Connection with /trips)
  const [linkedTripId, setLinkedTripId] = useState<string | null>(null);
  const [linkedTripTitle, setLinkedTripTitle] = useState<string | null>(null);

  // Handle URL params on mount
  useEffect(() => {
    const initParams = async () => {
      await Promise.resolve();
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tripIdParam = params.get('tripId');
        const destParam = params.get('dest') || params.get('destination');

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
            } else if (tripIdParam === 'trip-phuquoc-2026') {
              setLinkedTripId('trip-phuquoc-2026');
              setLinkedTripTitle('Nghỉ dưỡng hoàng hôn Phú Quốc');
              setDestination('Phú Quốc');
              setItineraryDays(INITIAL_PHUQUOC_DAYS);
            } else if (tripIdParam === 'trip-hagiang-2026') {
              setLinkedTripId('trip-hagiang-2026');
              setLinkedTripTitle('Chinh phục Hà Giang – Mèo Vạc');
              setDestination('Hà Giang');
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
            if (matched.id === 'phuquoc') {
              setItineraryDays(INITIAL_PHUQUOC_DAYS);
            } else if (matched.id === 'danang') {
              setItineraryDays(INITIAL_DANANG_DAYS);
            } else {
              const plan = generateDistinctDayPlan(
                matched.nameVi,
                3,
                new Date().getHours() >= 20,
                'standard',
                ['beach', 'cuisine'],
                matched.lat,
                matched.lng,
                matched.photo
              );
              setItineraryDays(plan);
            }
            setActiveDay(1);
          }
        }
      }
    };
    void initParams();
  }, []);

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
    let totalActPerPerson = 0;
    itineraryDays.forEach((day) => {
      day.activities.forEach((act) => {
        totalActPerPerson += act.costVnd || 0;
      });
    });
    const totalActivities = totalActPerPerson * count;

    // 2. Dining & Food (ăn uống đặc sản theo ngày)
    // economy: 180k/người/ngày, standard: 350k/người/ngày, luxury: 750k/người/ngày
    const diningPerPersonDay =
      budgetTier === 'economy' ? 180000 : budgetTier === 'luxury' ? 750000 : 350000;
    const totalDining = diningPerPersonDay * count * daysCount;

    // 3. Lodging (Khách sạn / Homestay) - Quy chuẩn 2 người / phòng đôi
    const roomsNeeded = Math.ceil(count / 2);
    const roomRatePerNight =
      budgetTier === 'economy' ? 450000 : budgetTier === 'luxury' ? 2200000 : 850000;
    const totalLodging = roomsNeeded * roomRatePerNight * nights;

    // 4. Local Transit (Phương tiện di chuyển nội tỉnh theo quy mô nhóm)
    let vehicleDescription = '';
    let dailyVehicleRate = 0;
    if (count <= 2) {
      vehicleDescription = 'Xe máy (1 xe)';
      dailyVehicleRate = 160000;
    } else if (count <= 4) {
      vehicleDescription = 'Xe ô tô 4-5 chỗ tự lái/taxi';
      dailyVehicleRate = 750000;
    } else if (count <= 7) {
      vehicleDescription = 'Xe du lịch 7 chỗ';
      dailyVehicleRate = 1100000;
    } else if (count <= 16) {
      vehicleDescription = 'Xe du lịch 16 chỗ (Ford Transit)';
      dailyVehicleRate = 1800000;
    } else {
      vehicleDescription = 'Xe du lịch 29-35 chỗ chuyên tuyến';
      dailyVehicleRate = 2600000;
    }
    const totalLocalTransport = dailyVehicleRate * daysCount;

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
    };
  }, [peopleCount, daysCount, budgetTier, itineraryDays, destination]);

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
    return itineraryDays.find((d) => d.dayNumber === activeDay) || itineraryDays[0];
  }, [itineraryDays, activeDay]);

  // Day subtotal calculation
  const currentDaySubtotal = useMemo(() => {
    if (!currentDayPlan) return 1450000;
    let actSum = 0;
    currentDayPlan.activities.forEach((a) => (actSum += (a.costVnd || 0) * budgetBreakdown.count));
    const dailyDining = budgetBreakdown.diningPerPersonDay * budgetBreakdown.count;
    const transport = budgetBreakdown.dailyVehicleRate;
    const stayAlloc = Math.round(budgetBreakdown.totalLodging / Math.max(1, daysCount));
    return actSum + dailyDining + transport + stayAlloc;
  }, [currentDayPlan, budgetBreakdown, daysCount]);

  // Destination filtered list
  const filteredDestinations = useMemo(() => {
    if (!destSearchQuery.trim()) return DESTINATION_LIST;
    return DESTINATION_LIST.filter((d) =>
      d.nameVi.toLowerCase().includes(destSearchQuery.toLowerCase())
    );
  }, [destSearchQuery]);

  // Active destination object
  const activeDestObj = useMemo(() => {
    return DESTINATION_LIST.find((d) => d.nameVi === destination) || DESTINATION_LIST[0];
  }, [destination]);

  // Map markers for active day (T5)
  const mapMarkers: DestinationMarker[] = useMemo(() => {
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
  }, [currentDayPlan, destination, activeDestObj, activeDay]);

  // Active activity currently selected for replacement
  const targetActivityToReplace = useMemo(() => {
    if (!replaceTargetActivityId) return null;
    for (const day of itineraryDays) {
      const found = day.activities.find((a) => a.id === replaceTargetActivityId);
      if (found) return found;
    }
    return null;
  }, [replaceTargetActivityId, itineraryDays]);

  // Dynamic Replacement Spots tailored to active destination, slot context, elderly persona, and excluding already-used places
  const replacementPlaces: ReplacementPlace[] = useMemo(() => {
    const allRealPlaces = getRealPlacesByProvince(destination);

    // 1. Tập hợp các địa điểm đã có mặt trong lịch trình hiện tại để KHÔNG bao giờ gợi ý trùng
    const usedTitles = new Set<string>();
    itineraryDays.forEach((d) => {
      d.activities.forEach((a) => {
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
        photoUrl: place.image || activeDestObj.photo,
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

      const pace = detectedPace || 'MODERATE';
      const travelMode = detectedTravelMode || 'DRIVING';

      const data: AiItinerarySuggestionResponse = await requestAiItinerary({
        destinationProvince: destination,
        totalDays: daysCount,
        budgetLevel: budgetLevelApi,
        interests: wishesText.trim()
          ? [...selectedStyleLabels, wishesText.trim()].slice(0, 10)
          : selectedStyleLabels,
        startDate,
        peopleCount,
        travelWith: companionType,
        specialRequests: wishesText.trim() || undefined,
        arrivalTime: detectedArrival,
        departureTime: detectedDeparture,
        pace,
        travelMode,
      }, linkedTripId);

      setAiGenerationMetadata({
        provider: data.provider ?? 'unknown',
        fallbackUsed: Boolean(data.fallbackUsed || data.isMockData),
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
                title: `Nhận phòng khách sạn & Thư giãn (${destination})`,
                note: `Check-in khách sạn, cất hành lý và chuẩn bị cho buổi tối đầu tiên tại ${destination}.`,
                estimatedCostVnd: 0,
                rationale: `Khởi đầu nhẹ nhàng sau chuyến di chuyển, dành thời gian nghỉ ngơi nạp lại năng lượng.`,
              },
              {
                timeSlot: 'NIGHT',
                title: `Ăn tối muộn & Dạo phố đêm lung linh`,
                note: `Thưởng thức ẩm thực đêm đặc sản và cảm nhận vẻ đẹp lung linh của thành phố.`,
                estimatedCostVnd: 200000,
                rationale: `Trải nghiệm ẩm thực đêm đặc trưng, không khí dịu mát và ngắm cảnh đêm rực rỡ.`,
              },
            ];
          }

          const realPlaces = getRealPlacesByProvince(destination);

          const activities: Activity[] = rawActivities.map((act: Record<string, unknown>, actIdx: number) => {
            const costVal = Number(act.estimatedCost || act.estimatedCostVnd) || 0;
            const rawSlot = String(act.timeSlot || '').toUpperCase();
            const catStr = String(act.category || '').toLowerCase();
            const placeTitle = String(act.destinationName || act.placeName || `Trải nghiệm điểm đến ${dayNum}.${actIdx + 1}`);
            const titleStr = placeTitle.toLowerCase();
            const isFoodStop = catStr.includes('ẩm thực') || catStr.includes('ăn') || catStr.includes('chợ') || titleStr.includes('ẩm thực') || titleStr.includes('chợ') || titleStr.includes('bún') || titleStr.includes('cơm') || titleStr.includes('bánh');

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
            if (costStatus === 'UNVERIFIED') {
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

            const matchedPlace = realPlaces.find((p) => {
              const pName = p.name.toLowerCase();
              return pName.includes(titleStr) || titleStr.includes(pName);
            });
            const photoUrl = matchedPlace?.image || activeDestObj.photo;
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

            return {
              id: String(act.destinationId || `act-${dayNum}-${actIdx + 1}`),
              timeSlot: String(timeSlot),
              timeRange,
              category: String(act.category || (timeSlot === 'NOON' ? 'Ẩm thực & Đặc sản' : 'Tham quan & Trải nghiệm')),
              title: placeTitle,
              description: String(act.note || act.activityDescription || `Khám phá vẻ đẹp và không khí đặc trưng tại ${destination}.`),
              location: `${destination}, Việt Nam`,
              costVnd: costVal,
              costStatus,
              costLabel,
              tip: actIdx === 0 ? 'Khởi hành đúng giờ để có trải nghiệm trọn vẹn.' : undefined,
              photoUrl,
              transferTimeAfter,
              latitude: actLat,
              longitude: actLng,
              rationale: act.rationale ? String(act.rationale) : undefined,
              timeSlotReason: act.timeSlotReason ? String(act.timeSlotReason) : defaultTimeSlotReason,
              whyVisitReason: act.whyVisitReason ? String(act.whyVisitReason) : defaultWhyVisitReason,
              warning: (act as any).warning ? String((act as any).warning) : undefined,
            };
          });

          return {
            dayNumber: dayNum,
            dateStr: `Ngày ${dayNum}`,
            title: String(dayItem.title || dayItem.dateLabel || `Ngày ${dayNum} · Trải nghiệm & Khám phá ${destination}`),
            activities,
          };
        });

        setItineraryDays(transformedDays);
        setActiveDay(1);
        setHasPlanGenerated(true);
        const sourceLabel = data.provider === 'local'
          ? 'Local AI'
          : data.provider === 'gemini'
            ? 'Gemini AI'
            : 'phương án an toàn';
        triggerToast(`Đã tạo lịch trình bằng ${sourceLabel} cho ${destination} (${daysCount} ngày)!`);
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
      triggerToast(`Đã tạo lịch trình thông minh tối ưu cho ${destination} (${daysCount} ngày)!`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── INTERACTIVE AI CO-PILOT (CONVERSATIONAL REPLANNING) ──────────────────
  const handleCoPilotCommand = async (customText?: string) => {
    const rawCmd = (customText ?? coPilotInput).trim();
    if (!rawCmd) return;

    setIsCoPilotBusy(true);
    if (!customText) setCoPilotInput('');

    const norm = rawCmd
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase();

    // 1. Xác định ngày mục tiêu (mặc định là activeDay hiện tại)
    let targetDay = activeDay;
    const dayMatch = norm.match(/ngay\s*(\d+)/);
    if (dayMatch) {
      const parsedDay = parseInt(dayMatch[1], 10);
      if (parsedDay >= 1 && parsedDay <= itineraryDays.length) {
        targetDay = parsedDay;
      }
    }

    // 2. Xác định buổi mục tiêu
    let targetSlot: 'MORNING' | 'NOON' | 'AFTERNOON' | 'EVENING' = 'AFTERNOON';
    if (norm.includes('sang') || norm.includes('ngu nuong') || norm.includes('day muon') || norm.includes('morning')) {
      targetSlot = 'MORNING';
    } else if (norm.includes('trua') || norm.includes('an trua') || norm.includes('noon') || norm.includes('chay') || norm.includes('hai san') || norm.includes('quan an') || norm.includes('dac san')) {
      targetSlot = 'NOON';
    } else if (norm.includes('toi') || norm.includes('dem') || norm.includes('an toi') || norm.includes('evening') || norm.includes('cho dem')) {
      targetSlot = 'EVENING';
    } else if (norm.includes('chieu') || norm.includes('afternoon')) {
      targetSlot = 'AFTERNOON';
    }

    // 3. Kịch bản A: Yêu cầu ngủ nướng / lùi giờ buổi sáng
    if (norm.includes('ngu nuong') || norm.includes('day muon') || norm.includes('lui gio') || norm.includes('khoi hanh muon')) {
      setItineraryDays((prev) =>
        prev.map((d) => {
          if (d.dayNumber !== targetDay || d.activities.length === 0) return d;
          const updatedActs = [...d.activities];
          updatedActs[0] = {
            ...updatedActs[0],
            timeRange: '09:30–11:15',
            timeSlotReason: 'Đã lùi giờ khởi hành sang 09:30 theo yêu cầu để cả đoàn thoải mái ngủ nướng, ăn sáng thong thả.',
          };
          return { ...d, activities: updatedActs };
        })
      );
      setActiveDay(targetDay);
      setCoPilotReply(`✅ Đã điều chỉnh khung giờ sáng Ngày ${targetDay} lùi xuống 09:30–11:15 để cả đoàn thoải mái ngủ nướng và ăn sáng thư thả!`);
      triggerToast(`Trợ lý AI đã lùi giờ sáng Ngày ${targetDay} xuống 09:30!`);
      setIsCoPilotBusy(false);
      return;
    }

    // 4. Kịch bản B: Đổi địa điểm theo nhu cầu tự nhiên (nhẹ nhàng cho người già, quán ăn đặc sản, biển, cafe...)
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
    const wantBeachOrRiver = /bien|dao mat|ngam canh|song|cau|du thuyen/.test(norm);

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
        if (/bien|bai|song|cau|dao|du thuyen/.test(pNorm)) score += 240;
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
        ? 'Không gian bằng phẳng, thoáng mát, rất nhẹ nhàng và có nhiều chỗ nghỉ chân lý tưởng cho người lớn tuổi.'
        : wantFood
          ? 'Điểm thưởng thức ẩm thực bản địa nổi tiếng, hương vị đậm đà và không gian ngồi thoải mái.'
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
            photoUrl: bestCand.image || oldAct.photoUrl,
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
        `✅ Đã đổi hoạt động ${slotNameVi} Ngày ${targetDay} sang "${bestCand.name}" (${bestCand.category}) — ${customWhy}`
      );
      triggerToast(`Đã cập nhật ${slotNameVi} Ngày ${targetDay} sang ${bestCand.name}!`);
    }

    setIsCoPilotBusy(false);
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
      setSavedCount(list.length + 3);
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

  // ─── CREATE REAL GROUP TRIP ───────────────────────────────────────────────
  const handleCreateTripSubmit = () => {
    const tripId = `trip-${Date.now()}`;
    const activityCount = itineraryDays.reduce((acc, d) => acc + d.activities.length, 0);
    let plannerOwner = {
      name: 'Thành viên VISTA',
      avatar: 'TV',
      color: '#0284c7',
      role: 'Trưởng nhóm',
      userId: 'u-me',
      email: '',
    };
    try {
      const userStr = localStorage.getItem('vista_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        const rawName = (u.displayName || u.email || 'Thành viên VISTA').replace(/\s*\(Bạn\)/g, '').trim();
        const parts = rawName.split(/\s+/);
        const initials = (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : rawName.slice(0, 2)).toUpperCase();
        plannerOwner = {
          name: rawName,
          avatar: initials || 'TV',
          color: '#0284c7',
          role: 'Trưởng nhóm',
          userId: u.id || 'u-me',
          email: u.email || '',
        };
      }
    } catch {}

    const newTrip = {
      id: tripId,
      title: newTripTitle || `Chuyến đi ${destination} ${daysCount} ngày`,
      destination: destination.includes('Việt Nam') ? destination : `${destination}, Việt Nam`,
      durationBadge: `${daysCount} ngày`,
      startDate: startDate || '20/11',
      endDate: '24/11/2026',
      status: 'PLANNING',
      role: 'OWNER',
      ownerId: plannerOwner.userId,
      budgetTotal: totalEstimatedCost || 20000000,
      budgetSpent: 0,
      progressPercent: 0,
      members: [plannerOwner],
      image: activeDestObj.photo || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
      treasuryPath: `/trips/${tripId}/treasury`,
      alertType: 'BLUE',
      alertText: `Lịch trình AI ${daysCount} ngày (${activityCount} hoạt động) đã sẵn sàng`,
      alertLinkText: 'Xem',
      quickActions: [
        { label: 'Lịch trình', href: `/planner?tripId=${tripId}&dest=${encodeURIComponent(destination)}` },
        { label: 'Phân công', actionType: 'ASSIGN' },
        { label: 'Ghi chú', actionType: 'NOTE' },
      ],
      itineraryDays,
      createdAt: Date.now(),
    };

    try {
      const storedTrips = localStorage.getItem('vista_custom_trips');
      const list = storedTrips ? JSON.parse(storedTrips) : [];
      list.unshift(newTrip);
      localStorage.setItem('vista_custom_trips', JSON.stringify(list));
    } catch {
      // ignore
    }

    setShowCreateTripModal(false);
    triggerToast('Tạo chuyến đi nhóm thành công! Đang chuyển đến không gian Chuyến đi…');
    setTimeout(() => {
      router.push(`/trips?created=${tripId}`);
    }, 1000);
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

  // ─── ADD CUSTOM ACTIVITY HANDLER ──────────────────────────────────────────
  const handleAddActivity = () => {
    if (!newActTitle.trim()) return;
    const costNum = parseInt(newActCost, 10) || 0;
    const newAct: Activity = {
      id: `act-${Date.now()}`,
      timeSlot: 'AFTERNOON',
      timeRange: newActTime || '14:00–15:30',
      category: newActCategory,
      title: newActTitle,
      description: `Hoạt động do bạn tự thêm vào lịch trình trải nghiệm ${destination}.`,
      location: destination,
      costVnd: costNum,
      costLabel: costNum === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(costNum)}đ / nhóm`,
      photoUrl: activeDestObj.photo,
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
    markDirty();
    triggerToast(`Đã thêm hoạt động vào Ngày ${activeDay}.`);
  };

  return (
    <div className={styles.plannerPage}>
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

      {/* ─── 2. COMPACT PAGE INTRODUCTION ─── */}
      <section className={styles.introContainer} aria-label="Giới thiệu VISTA AI Planner">
        <div className={styles.introLeft}>
          <span className={styles.eyebrow}>VISTA AI PLANNER</span>
          <h1 className={styles.pageTitle}>Chuyến đi hay, bắt đầu từ đây.</h1>
          <p className={styles.pageSubtitle}>
            Chọn điều bạn thích, VISTA gợi ý lịch trình phù hợp với bạn.
          </p>
        </div>

        <div className={styles.introRightActions}>
          {/* Real Saved Itineraries Button */}
          <button
            type="button"
            className={styles.btnSavedItineraries}
            onClick={() => setShowSavedDrawer(true)}
            title="Xem danh sách các lịch trình đã lưu"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span>Lịch trình đã lưu</span>
            <span className={styles.savedBadge}>{savedCount}</span>
          </button>
        </div>
      </section>

      {/* ─── 3. TWO-COLUMN PLANNING WORKSPACE ─── */}
      <main className={styles.workspaceContainer}>
        {/* ════════════════════════════════════════════════════════════════════
            LEFT COLUMN — TRIP PREFERENCES FORM CARD
            ════════════════════════════════════════════════════════════════════ */}
        <aside className={styles.preferencesCard} aria-label="Thiết lập chuyến đi">
          {/* Card Header */}
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <h2 className={styles.cardHeaderTitle}>Thiết lập chuyến đi</h2>
              <p className={styles.cardHeaderDesc}>Một vài thông tin để lên lịch trình vừa ý.</p>
            </div>
          </div>

          {/* GROUP A — ĐIỂM ĐẾN & THỜI GIAN */}
          <div className={styles.formGroup}>
            <div className={styles.groupTitle}>Nhóm A — Điểm đến & Thời gian</div>

            {/* 1. Điểm đến */}
            <div className={styles.destinationSelectWrapper}>
              <label className={styles.fieldLabel} htmlFor="dest-search-input">
                Điểm đến
              </label>
              <div
                className={`${styles.destinationInputWrapper} ${showDestDropdown ? styles.destinationInputWrapperActive : ''}`}
                onClick={() => setShowDestDropdown(true)}
              >
                <svg className={styles.destinationIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  id="dest-search-input"
                  type="text"
                  className={styles.destinationInput}
                  placeholder="Bạn muốn đi đâu?"
                  value={showDestDropdown ? destSearchQuery : destination}
                  onChange={(e) => {
                    setDestSearchQuery(e.target.value);
                    setShowDestDropdown(true);
                  }}
                  onFocus={() => {
                    setShowDestDropdown(true);
                    setDestSearchQuery('');
                  }}
                />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Destination Dropdown (T4: 34 provinces grouped with search) */}
              {showDestDropdown && (
                <div className={styles.destinationDropdown}>
                  <div style={{ padding: '6px 12px', fontSize: '11px', color: '#64748B', fontWeight: 600, borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    Có {filteredDestinations.length} điểm đến khả dụng (Đã tích hợp 34 tỉnh thành)
                  </div>
                  {filteredDestinations.map((d) => (
                    <div
                      key={d.id}
                      className={`${styles.destinationItem} ${destination === d.nameVi ? styles.destinationItemActive : ''}`}
                      onClick={() => {
                        const chosen = d.nameVi;
                        setDestination(chosen);
                        setShowDestDropdown(false);
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

            {/* 2. Ngày khởi hành (T1: Quick chips, forbid past dates, evening notice) */}
            <div>
              <label className={styles.fieldLabel} htmlFor="start-date-input">
                Ngày khởi hành
              </label>
              <div className={styles.dateInputWrapper}>
                <svg className={styles.dateIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <input
                  id="start-date-input"
                  type="date"
                  min={getTodayIso()}
                  className={styles.dateInput}
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

              {/* Quick Date Chips (T1) */}
              <div className={styles.quickDateRow}>
                <button
                  type="button"
                  className={`${styles.quickDateChip} ${startDate === getTodayIso() ? styles.quickDateChipActive : ''}`}
                  onClick={() => {
                    setStartDate(getTodayIso());
                    markDirty();
                  }}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  className={`${styles.quickDateChip} ${startDate === getFutureDateIso(1) ? styles.quickDateChipActive : ''}`}
                  onClick={() => {
                    setStartDate(getFutureDateIso(1));
                    markDirty();
                  }}
                >
                  Ngày mai
                </button>
                <button
                  type="button"
                  className={`${styles.quickDateChip} ${startDate === getWeekendIso() ? styles.quickDateChipActive : ''}`}
                  onClick={() => {
                    setStartDate(getWeekendIso());
                    markDirty();
                  }}
                >
                  Cuối tuần
                </button>
              </div>

              {/* Smart late evening alert (T1) */}
              {isLateEveningDeparture && (
                <div className={styles.smartTimeNotice}>
                  <span className={styles.smartTimeNoticeIcon}>🌙</span>
                  <span>
                    <strong>Khởi hành muộn (sau 20:00):</strong> VISTA AI đã tự động sắp xếp Ngày 1 bắt đầu từ buổi tối: nhận phòng khách sạn, dạo phố đêm & thưởng thức bữa tối muộn, loại bỏ các hoạt động sáng/chiều không khả thi.
                  </span>
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

          {/* GROUP B — PHONG CÁCH CHUYẾN ĐI (T2: Compact & Refined 12 Style Pills) */}
          <div className={styles.formGroup}>
            <div className={styles.groupTitle}>Nhóm B — Phong cách chuyến đi</div>
            <label className={styles.fieldLabel} style={{ marginBottom: '2px' }}>
              Bạn thích trải nghiệm gì?
            </label>
            <p className={styles.fieldSubLabel}>Có thể chọn nhiều sở thích.</p>

            <div className={styles.stylesPillsGrid}>
              {displayedStyles.map((st) => {
                const isSelected = selectedStyles.includes(st.id);
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
                      <div className={styles.stylePillCheckCircle}>
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

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

          {/* GROUP C — BẠN ĐỒNG HÀNH & NGÂN SÁCH */}
          <div className={styles.formGroup}>
            <div className={styles.groupTitle}>Nhóm C — Bạn đồng hành & Ngân sách</div>

            {/* 1. Số người */}
            <div>
              <label className={styles.fieldLabel}>Số người</label>
              <div className={styles.counterControl}>
                <button
                  type="button"
                  className={styles.counterBtn}
                  disabled={peopleCount <= 1}
                  onClick={() => {
                    setPeopleCount((p) => Math.max(1, p - 1));
                    markDirty();
                  }}
                  aria-label="Giảm số người"
                >
                  –
                </button>
                <span className={styles.counterValue}>{peopleCount} người</span>
                <button
                  type="button"
                  className={styles.counterBtn}
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

            {/* 2. Mức chi tiêu */}
            <div>
              <label className={styles.fieldLabel}>Mức chi tiêu</label>
              <div className={styles.budgetTiersGrid}>
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`${styles.budgetTierBtn} ${budgetTier === b.id ? styles.budgetTierBtnActive : ''}`}
                    onClick={() => {
                      setBudgetTier(b.id);
                      markDirty();
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <p className={styles.fieldHint}>
                Chi phí được ước tính theo số người và thời lượng chuyến đi.
              </p>
            </div>

            {/* 3. Yêu cầu thêm (Accordion Collapsible) */}
            <div>
              <button
                type="button"
                className={styles.accordionToggle}
                onClick={() => setShowWishes((prev) => !prev)}
              >
                <span>Thêm mong muốn riêng</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showWishes ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showWishes && (
                <textarea
                  className={styles.wishesTextarea}
                  placeholder="Ví dụ: ít đi bộ, ưu tiên món chay, có trẻ nhỏ…"
                  value={wishesText}
                  onChange={(e) => {
                    setWishesText(e.target.value);
                    markDirty();
                  }}
                />
              )}
            </div>
          </div>

          {/* Form Action */}
          {hasUnsavedChanges && (
            <div className={styles.dirtyIndicator}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
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
              <div className={styles.spinnerBlue} style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
            <span>{hasPlanGenerated ? (hasUnsavedChanges ? 'Cập nhật lịch trình' : 'Tạo lại lịch trình') : 'Tạo lịch trình'}</span>
          </button>

          <p className={styles.formActionSubtext}>
            Thay đổi thiết lập để tạo lại gợi ý phù hợp hơn.
          </p>
        </aside>

        {/* ════════════════════════════════════════════════════════════════════
            RIGHT COLUMN — REAL GENERATED ITINERARY WORKSPACE
            ════════════════════════════════════════════════════════════════════ */}
        <section className={styles.itineraryWorkspace} aria-label="Lịch trình gợi ý">
          {/* ─── REAL GENERATING LOADING SKELETON ─── */}
          {isGenerating && <SkeletonAiGenerating />}

          {/* ─── EMPTY STATE (WHEN NOT YET GENERATED) ─── */}
          {!isGenerating && !hasPlanGenerated && (
            <div className={styles.emptyStateCard}>
              <img
                src={activeDestObj.photo}
                alt="Khám phá Việt Nam"
                className={styles.emptyStateImage}
              />
              <h3 className={styles.emptyStateTitle}>Chuyến đi của bạn sẽ bắt đầu ở đây.</h3>
              <p className={styles.emptyStateDesc}>
                Chọn điểm đến và sở thích, VISTA sẽ gợi ý lịch trình phù hợp với trải nghiệm và mức chi tiêu của bạn.
              </p>

              <div className={styles.sampleItineraries}>
                <span className={styles.sampleLabel}>Lịch trình mẫu</span>
                <div className={styles.sampleChipsRow}>
                  <button
                    type="button"
                    className={styles.sampleChip}
                    onClick={() => {
                      setDestination('Đà Nẵng');
                      setDuration('3n2d');
                      handleGenerateClick();
                    }}
                  >
                    Đà Nẵng 3N2Đ — Biển & Đặc sản
                  </button>
                  <button
                    type="button"
                    className={styles.sampleChip}
                    onClick={() => {
                      setDestination('Hội An');
                      setDuration('2n1d');
                      handleGenerateClick();
                    }}
                  >
                    Hội An 2N1Đ — Di sản phố cổ
                  </button>
                  <button
                    type="button"
                    className={styles.sampleChip}
                    onClick={() => {
                      setDestination('Hà Nội');
                      setDuration('2n1d');
                      handleGenerateClick();
                    }}
                  >
                    Hà Nội 2N1Đ — Tinh hoa thủ đô
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── GENERATED ITINERARY VIEW (LIVE PRODUCT) ─── */}
          {!isGenerating && hasPlanGenerated && (
            <>
              {/* A. TRIP SUMMARY CARD */}
              <div className={styles.summaryCard}>
                <div className={styles.summaryTopRow}>
                  {/* Left Destination Summary */}
                  <div className={styles.summaryLeft}>
                    <img
                      src={activeDestObj.photo}
                      alt={destination}
                      className={styles.destinationPhoto}
                    />
                    <div className={styles.summaryDetails}>
                      <h2 className={styles.summaryTitle}>{destination}, đi là mê</h2>
                      <p className={styles.summaryMeta}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        <span>{startDate} · {daysCount} ngày {Math.max(1, daysCount - 1)} đêm · {peopleCount} người</span>
                      </p>
                      <div className={styles.summaryTags}>
                        {selectedStyles.map((sId) => {
                          const found = TRAVEL_STYLES.find((t) => t.id === sId);
                          const IconCmp = found?.icon;
                          return (
                            <span key={sId} className={styles.tagPill}>
                              {IconCmp && (
                                <span style={{ color: found?.color, display: 'inline-flex', marginRight: 4 }}>
                                  <IconCmp size={12} strokeWidth={2.4} />
                                </span>
                              )}
                              {found ? found.label : sId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className={styles.summaryRightActions}>
                    <div className={styles.summaryActionButtons}>
                      <button
                        type="button"
                        className={`${styles.btnSecondary} ${isSaved ? styles.btnSecondarySaved : ''}`}
                        onClick={handleSaveToggle}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill={isSaved ? '#0088CC' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{isSaved ? 'Đã lưu' : 'Lưu lịch trình'}</span>
                      </button>

                      <button
                        type="button"
                        className={styles.btnCreateTripPrimary}
                        onClick={() => {
                          setNewTripTitle(`Chuyến đi ${destination} ${daysCount} ngày`);
                          setShowCreateTripModal(true);
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Tạo chuyến đi</span>
                      </button>
                    </div>
                    <p className={styles.summaryActionHint}>
                      Chuyển lịch trình thành chuyến đi để mời bạn bè và quản lý chi tiêu.
                    </p>
                  </div>
                </div>

                {/* Compact Expense Summary Bar */}
                <div className={styles.summaryExpenseBar}>
                  <div className={styles.expenseMainSection}>
                    <div className={styles.expenseLeft}>
                      <span className={styles.expenseLabel}>Dự toán cơ sở ({budgetBreakdown.count} người)</span>
                      <span className={styles.expenseTotal}>
                        {new Intl.NumberFormat('vi-VN').format(totalEstimatedCost)}đ
                      </span>
                      <span className={styles.expensePerPerson}>
                        ~{new Intl.NumberFormat('vi-VN').format(perPersonCost)}đ / người
                      </span>
                      <span className={styles.expenseEstimateBadge}>Cơ sở tại điểm đến</span>
                    </div>

                    {/* Fluctuating Range Bar */}
                    <div className={styles.expenseFluctuationRow}>
                      <span className={styles.expenseFluctuationLabel}>
                        ⚡ Khoản chi dao động thực tế:
                      </span>
                      <span className={styles.expenseFluctuationValue}>
                        {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.minFluctuation)}đ – {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.maxFluctuation)}đ
                      </span>
                      <span className={styles.expenseFluctuationSub}>
                        (~{new Intl.NumberFormat('vi-VN').format(budgetBreakdown.perPersonMin)}đ – {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.perPersonMax)}đ / người)
                      </span>
                    </div>

                    {/* Scope tags */}
                    <div className={styles.expenseScopeTags}>
                      <span className={styles.scopeTagIncluded}>
                        ✓ Đã gồm: Vé tham quan, ăn uống {daysCount}N, xe {budgetBreakdown.vehicleDescription}, {budgetBreakdown.roomsNeeded} phòng
                      </span>
                      <span className={styles.scopeTagExcluded}>
                        ✕ Chưa gồm: {budgetBreakdown.intercityType} ({new Intl.NumberFormat('vi-VN').format(budgetBreakdown.intercityMinGroup)}đ – {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.intercityMaxGroup)}đ), phụ thu cuối tuần
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.btnViewBudgetDetail}
                    onClick={() => setShowBudgetModal(true)}
                  >
                    <span>Xem chi tiết & khoản dao động</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ─── A. HỒ SƠ CHUYẾN ĐI (TRIP BRIEFING & DNA - COLLAPSIBLE BAR) ─── */}
              <div className={styles.tripDnaCard} style={{ padding: showTripDna ? '16px 20px' : '12px 18px' }}>
                <div
                  className={styles.tripDnaHeader}
                  style={{ cursor: 'pointer', marginBottom: showTripDna ? '12px' : 0, userSelect: 'none' }}
                  onClick={() => setShowTripDna((prev) => !prev)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={showTripDna}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowTripDna((prev) => !prev);
                    }
                  }}
                >
                  <div className={styles.tripDnaTitle} style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0088CC" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    <span>Hồ sơ Chuyến đi & Yêu cầu của bạn</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                      ({destination} · {daysCount} ngày · {peopleCount} người)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={styles.tripDnaBadge}>
                      Đã cá nhân hóa
                    </span>
                    <span className={styles.collapsibleTogglePill}>
                      {showTripDna ? 'Thu gọn ▴' : 'Xem chi tiết ▾'}
                    </span>
                  </div>
                </div>

                {(detectedElderly || detectedChildren || detectedArrivalTime || detectedDepartureTime) && (
                  <div className={styles.semanticBadgesRow} style={{ marginTop: '8px', paddingTop: '8px' }}>
                    <span className={styles.semanticRowTitle}>🧠 AI đã tự động nhận diện:</span>
                    {detectedElderly && (
                      <span className={styles.semanticBadgeElderly}>
                        👴 Thân thiện Người lớn tuổi (Tránh leo dốc · Đệm nghỉ 30p)
                      </span>
                    )}
                    {detectedChildren && (
                      <span className={styles.semanticBadgeChildren}>
                        👶 An toàn & Thoải mái cho Trẻ nhỏ
                      </span>
                    )}
                    {detectedArrivalTime && (
                      <span className={styles.semanticBadgeTime}>
                        🛬 Hạ cánh Ngày 1 lúc {detectedArrivalTime} (Bỏ trống sáng)
                      </span>
                    )}
                    {detectedDepartureTime && (
                      <span className={styles.semanticBadgeTime}>
                        🛫 Khởi hành về Ngày cuối lúc {detectedDepartureTime}
                      </span>
                    )}
                  </div>
                )}

                {showTripDna && (
                  <>
                    <div className={styles.tripDnaGrid} style={{ marginTop: '12px' }}>
                      <div className={styles.tripDnaItem}>
                        <span className={styles.tripDnaLabel}>📍 Điểm đến</span>
                        <span className={styles.tripDnaVal}>{destination}</span>
                        <span className={styles.tripDnaSub}>{activeDestObj.region ? `Khu vực Miền ${activeDestObj.region}` : 'Việt Nam'}</span>
                      </div>

                      <div className={styles.tripDnaItem}>
                        <span className={styles.tripDnaLabel}>📅 Khởi hành & Thời gian</span>
                        <span className={styles.tripDnaVal}>{startDate}</span>
                        <span className={styles.tripDnaSub}>{daysCount} ngày ({Math.max(1, daysCount - 1)} đêm)</span>
                      </div>

                      <div className={styles.tripDnaItem}>
                        <span className={styles.tripDnaLabel}>👥 Thành viên & Quy mô</span>
                        <span className={styles.tripDnaVal}>{peopleCount} người</span>
                        <span className={styles.tripDnaSub}>
                          {peopleCount === 1 ? 'Solo Traveler' : peopleCount === 2 ? 'Cặp đôi (Couple)' : peopleCount <= 4 ? 'Gia đình nhỏ / Bạn bè' : 'Đoàn đông người'}
                        </span>
                      </div>

                      <div className={styles.tripDnaItem}>
                        <span className={styles.tripDnaLabel}>💰 Hạn mức ngân sách</span>
                        <span className={styles.tripDnaVal}>
                          {budgetTier === 'economy' ? 'Tiết kiệm' : budgetTier === 'luxury' ? 'Cao cấp' : 'Tiêu chuẩn'}
                        </span>
                        <span className={styles.tripDnaSub}>
                          ~{new Intl.NumberFormat('vi-VN').format(totalEstimatedCost)}đ / cả đoàn
                        </span>
                      </div>
                    </div>

                    {selectedStyles.length > 0 && (
                      <div className={styles.tripDnaTagsRow}>
                        <strong style={{ color: '#475569', fontSize: '11.5px', textTransform: 'uppercase' }}>Tổ hợp sở thích:</strong>
                        {selectedStyles.map((sId) => {
                          const found = TRAVEL_STYLES.find((t) => t.id === sId);
                          return (
                            <span key={sId} className={styles.tripDnaTagChip}>
                              {found ? found.label : sId}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {wishesText.trim() && (
                      <div className={styles.tripDnaNotesBox}>
                        <span style={{ fontSize: '14px' }}>💬</span>
                        <div>
                          <strong>Mong muốn đặc biệt:</strong> &ldquo;{wishesText.trim()}&rdquo;
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ─── B. LUẬN ĐIỂM CHIẾN LƯỢC TỪ AI (AI STRATEGIC DOSSIER - COLLAPSIBLE BAR) ─── */}
              <div className={styles.aiInsightsCard} style={{ padding: showAiInsights ? '18px 20px' : '12px 18px' }}>
                <div
                  className={styles.aiInsightsHeader}
                  style={{ cursor: 'pointer', marginBottom: showAiInsights ? '10px' : 0, userSelect: 'none' }}
                  onClick={() => setShowAiInsights((prev) => !prev)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={showAiInsights}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowAiInsights((prev) => !prev);
                    }
                  }}
                >
                  <div className={styles.aiInsightsTitleRow}>
                    <span
                      className={`${styles.aiInsightsBadge} ${
                        aiGenerationMetadata.provider === 'local'
                          ? styles.aiProviderLocal
                          : aiGenerationMetadata.provider === 'gemini'
                            ? styles.aiProviderCloud
                            : styles.aiProviderOffline
                      }`}
                    >
                      {aiGenerationMetadata.provider === 'local'
                        ? '✨ TRỢ LÝ DU LỊCH CLAUDE AI'
                        : aiGenerationMetadata.provider === 'gemini'
                          ? '✨ TRỢ LÝ DU LỊCH GEMINI AI'
                          : '✨ TRỢ LÝ DU LỊCH VISTA'}
                    </span>
                    <h3 className={styles.aiInsightsMainTitle} style={{ fontSize: '14px', margin: 0 }}>
                      Vì sao lộ trình này hoàn hảo cho chuyến đi {destination}?
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span className={styles.aiInsightsConfidence}>Độ phù hợp: 98%</span>
                    <span className={styles.collapsibleTogglePill}>
                      {showAiInsights ? 'Ẩn phân tích ▴' : 'Xem lý do ▾'}
                    </span>
                  </div>
                </div>

                {showAiInsights && (
                  <>
                    {aiGenerationMetadata.fallbackUsed && (
                      <div className={styles.aiFallbackWarning} role="status">
                        💡 Kế hoạch được sắp xếp thông minh theo sở thích, thời gian và số lượng người đi của bạn.
                      </div>
                    )}

                    {aiCitations.length > 0 && (
                      <div className={styles.aiCitations} aria-label="Nguồn dữ liệu RAG">
                        <strong>Điểm đến uy tín đã đối chiếu:</strong>
                        {aiCitations.slice(0, 5).map((citation) => (
                          <span key={citation.chunkId} className={styles.aiCitationChip}>
                            {citation.title}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 4 Thẻ Phân tích dễ hiểu, đời thường cho Khách du lịch */}
                    <div className={styles.aiStrategicGrid} style={{ marginTop: '14px' }}>
                      {/* Card 1: Tuyến đường & Phân cụm */}
                      <div className={`${styles.aiStrategicCard} ${styles.aiStrategicRoute}`}>
                        <div className={styles.aiStrategicCardHeader}>
                          <span>🚗</span>
                          <span>Cung đường tiện lợi & Đỡ say xe</span>
                        </div>
                        <div className={styles.aiStrategicCardBody}>
                          {aiCustomInsights.strategic || `Các điểm tham quan trong ngày được chọn trên cùng một cung đường tiện lợi, giúp bạn di chuyển nhanh chóng, tiết kiệm tiền taxi và không bị mệt hay say xe. Nhịp độ đan xen giữa danh lam thắng cảnh nổi tiếng và khám phá đời sống địa phương.`}
                        </div>
                      </div>

                      {/* Card 2: Thể lực & Đối tượng đoàn */}
                      <div className={`${styles.aiStrategicCard} ${styles.aiStrategicCompanion}`}>
                        <div className={styles.aiStrategicCardHeader}>
                          <span>💪</span>
                          <span>Nhịp độ thảnh thơi, vừa sức cả đoàn</span>
                        </div>
                        <div className={styles.aiStrategicCardBody}>
                          {aiCustomInsights.companionFit || aiCustomInsights.pacing || `Lịch trình được cân đối vừa sức cho đoàn ${peopleCount} người: Buổi sáng dồi dào năng lượng đi ngắm cảnh ngoài trời; buổi chiều tối dành cho ẩm thực và dạo mát thư giãn, đảm bảo mọi người luôn tràn đầy hứng khởi.`}
                        </div>
                      </div>

                      {/* Card 3: Dòng tiền & Ngân sách */}
                      <div className={`${styles.aiStrategicCard} ${styles.aiStrategicBudget}`}>
                        <div className={styles.aiStrategicCardHeader}>
                          <span>💵</span>
                          <span>Chi tiêu hợp lý, không lo phát sinh</span>
                        </div>
                        <div className={styles.aiStrategicCardBody}>
                          {aiCustomInsights.budgetOptimization || `Cân đối tài chính thông minh: Kết hợp hài hòa giữa các điểm tham quan có vé danh tiếng và ẩm thực đặc sản bản địa uy tín, đảm bảo trải nghiệm đầy đủ mà chi phí dự kiến luôn nằm trong mức ~${new Intl.NumberFormat('vi-VN').format(totalEstimatedCost)}đ cho toàn đoàn.`}
                        </div>
                      </div>

                      {/* Card 4: Thích ứng Thời tiết & Bản địa */}
                      <div className={`${styles.aiStrategicCard} ${styles.aiStrategicWeather}`}>
                        <div className={styles.aiStrategicCardHeader}>
                          <span>🌤️</span>
                          <span>Đón thời tiết đẹp & Mẹo ăn chơi</span>
                        </div>
                        <div className={styles.aiStrategicCardBody}>
                          <strong>Thời tiết khởi hành ({startDate}): </strong>
                          {aiCustomInsights.weather || `${destWeatherInsight.temp} · ${destWeatherInsight.text}`}
                          <br />
                          <span style={{ display: 'inline-block', marginTop: '4px' }}>
                            <strong>💡 Mẹo nhỏ: </strong>{aiCustomInsights.advice || `Nên ưu tiên tham quan ngoài trời vào buổi sáng sớm hoặc hoàng hôn để có ánh sáng đẹp nhất và không khí mát lành.`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* B. VIEW SWITCH BAR */}
              <div className={styles.viewSwitchBar}>
                <div className={styles.segmentedControl}>
                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${activeView === 'timeline' ? styles.segmentBtnActive : ''}`}
                    onClick={() => setActiveView('timeline')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                    <span>Lịch trình</span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${activeView === 'map' ? styles.segmentBtnActive : ''}`}
                    onClick={() => setActiveView('map')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
                    <span>Bản đồ</span>
                  </button>
                </div>

                <button
                  type="button"
                  className={styles.btnRegenerateSubtle}
                  onClick={handleGenerateClick}
                  title="Tạo lại gợi ý mới"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                  <span>Tạo lại gợi ý</span>
                </button>
              </div>

              {/* ─── INTERACTIVE AI CO-PILOT (COLLAPSIBLE BAR) ─── */}
              <div className={styles.coPilotPanel} style={{ padding: showCoPilot ? '16px 18px' : '11px 16px' }}>
                <div
                  className={styles.coPilotHeader}
                  style={{ cursor: 'pointer', marginBottom: showCoPilot ? '12px' : 0, userSelect: 'none' }}
                  onClick={() => setShowCoPilot((prev) => !prev)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={showCoPilot}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowCoPilot((prev) => !prev);
                    }
                  }}
                >
                  <div className={styles.coPilotHeaderLeft}>
                    <span className={styles.coPilotAvatar} style={{ width: '30px', height: '30px', fontSize: '15px' }}>🤖</span>
                    <div>
                      <h4 className={styles.coPilotTitle} style={{ margin: 0 }}>
                        Trợ lý AI Đồng hành — Trò chuyện tinh chỉnh lịch trình tức thì
                      </h4>
                      {showCoPilot && (
                        <p className={styles.coPilotSub} style={{ marginTop: '2px' }}>
                          Yêu cầu đổi quán ăn, lùi giờ ngủ nướng hoặc chọn điểm nhẹ nhàng cho Ngày {activeDay} mà không làm mất các điểm đã ưng ý.
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span className={styles.coPilotActiveDayBadge}>Đang chọn: Ngày {activeDay}</span>
                    <span className={styles.collapsibleTogglePill}>
                      {showCoPilot ? 'Thu gọn ▴' : 'Mở trợ lý ▾'}
                    </span>
                  </div>
                </div>

                {coPilotReply && (
                  <div className={styles.coPilotReplyBubble} style={{ marginTop: showCoPilot ? 0 : '10px' }}>
                    <span>{coPilotReply}</span>
                  </div>
                )}

                {showCoPilot && (
                  <>
                    <div className={styles.coPilotQuickChips}>
                      <button
                        type="button"
                        className={styles.coPilotChip}
                        onClick={() =>
                          handleCoPilotCommand(
                            `Đổi buổi chiều Ngày ${activeDay} sang điểm nhẹ nhàng bằng phẳng cho người lớn tuổi`
                          )
                        }
                      >
                        👴 Đổi chiều Ngày {activeDay} nhẹ nhàng cho người lớn tuổi
                      </button>
                      <button
                        type="button"
                        className={styles.coPilotChip}
                        onClick={() =>
                          handleCoPilotCommand(`Đổi quán ăn trưa Ngày ${activeDay} sang đặc sản bản địa khác`)
                        }
                      >
                        🍜 Đổi quán ăn trưa Ngày {activeDay}
                      </button>
                      <button
                        type="button"
                        className={styles.coPilotChip}
                        onClick={() =>
                          handleCoPilotCommand(`Sáng Ngày ${activeDay} cho đoàn ngủ nướng khởi hành lúc 09:30`)
                        }
                      >
                        😴 Ngủ nướng sáng Ngày {activeDay} (đi lúc 09:30)
                      </button>
                      <button
                        type="button"
                        className={styles.coPilotChip}
                        onClick={() =>
                          handleCoPilotCommand(`Đổi buổi tối Ngày ${activeDay} sang dạo biển hoặc ngắm cầu đêm`)
                        }
                      >
                        🌊 Đổi điểm dạo mát tối Ngày {activeDay}
                      </button>
                    </div>

                    <form
                      className={styles.coPilotInputRow}
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCoPilotCommand();
                      }}
                    >
                      <input
                        type="text"
                        className={styles.coPilotInput}
                        placeholder={`Gõ yêu cầu cho Ngày ${activeDay} (VD: "Chiều Ngày ${activeDay} đổi sang đi bảo tàng hoặc cafe ngắm biển", "Đổi bữa trưa sang hải sản")...`}
                        value={coPilotInput}
                        onChange={(e) => setCoPilotInput(e.target.value)}
                        disabled={isCoPilotBusy}
                      />
                      <button
                        type="submit"
                        className={styles.coPilotSendBtn}
                        disabled={isCoPilotBusy || !coPilotInput.trim()}
                      >
                        {isCoPilotBusy ? 'Đang xử lý...' : '✨ Tinh chỉnh ngay'}
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* C. DYNAMIC DAY NAVIGATION TABS */}
              <div className={styles.dayTabsNav} role="tablist">
                {itineraryDays.map((d) => (
                  <button
                    key={d.dayNumber}
                    type="button"
                    className={`${styles.dayTabBtn} ${activeDay === d.dayNumber ? styles.dayTabBtnActive : ''}`}
                    onClick={() => setActiveDay(d.dayNumber)}
                    role="tab"
                    aria-selected={activeDay === d.dayNumber}
                  >
                    <span>Ngày {d.dayNumber}</span>
                    {activeDay === d.dayNumber && <span className={styles.dayTabDot} />}
                  </button>
                ))}
              </div>

              {/* D. DAILY OVERVIEW BAR */}
              <div className={styles.dailyOverviewBar}>
                <h3 className={styles.dailyOverviewTitle}>
                  {currentDayPlan.title}
                </h3>
                <div className={styles.dailyOverviewMetrics}>
                  <span>{currentDayPlan.activities.length} hoạt động · Chi phí dự kiến </span>
                  <span className={styles.dailySubtotalHighlight}>
                    {new Intl.NumberFormat('vi-VN').format(currentDaySubtotal)}đ / nhóm
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#94A3B8', marginLeft: '4px' }}>
                    (tiểu kế Ngày {activeDay})
                  </span>
                </div>
              </div>

              {/* ─── 4. ACTIVITY TIMELINE VIEW ─── */}
              {activeView === 'timeline' && (
                <div className={styles.timelineWrapper}>
                  {/* Chặng đón tiếp & Nhận phòng Ngày 1 khi đến muộn (buổi chiều) */}
                  {activeDay === 1 && (detectedArrivalTime || (currentDayPlan.activities.length > 0 && currentDayPlan.activities[0].timeSlot !== 'MORNING')) && (
                    <div className={styles.welcomeBannerCard}>
                      <div className={styles.welcomeBannerIcon}>🛬</div>
                      <div className={styles.welcomeBannerBody}>
                        <div className={styles.welcomeBannerHeader}>
                          <span className={styles.welcomeBannerTag}>Chặng đón tiếp & Nhận phòng</span>
                          <span className={styles.welcomeBannerTime}>
                            {detectedArrivalTime ? `${detectedArrivalTime} – ${currentDayPlan.activities[0]?.timeRange?.split('–')[0] || '14:30'}` : '14:00 – 14:30'}
                          </span>
                        </div>
                        <h4 className={styles.welcomeBannerTitle}>
                          Đến {destination} & Check-in Khách sạn
                        </h4>
                        <p className={styles.welcomeBannerDesc}>
                          Buổi sáng ngày đầu để trống lịch tham quan theo yêu cầu riêng để đoàn di chuyển đến nơi. Quý khách có mặt lúc {detectedArrivalTime || '14:00'}, di chuyển về khách sạn nhận phòng, sắp xếp hành lý và nghỉ ngơi trước khi khởi hành tham quan buổi chiều.
                        </p>
                      </div>
                    </div>
                  )}

                  {currentDayPlan.activities.map((act) => {
                    const isTipOpen = openTipId === act.id;
                    const isOverflowOpen = activeOverflowId === act.id;

                    return (
                      <React.Fragment key={act.id}>
                        <div className={styles.timelineItem}>
                          {/* Narrow Time Rail */}
                          <div className={styles.timeRail}>{act.timeRange}</div>

                          {/* Vertical Connector */}
                          <div className={styles.timelineConnector}>
                            <div className={styles.timelineNode} />
                            <div className={styles.timelineLine} />
                          </div>

                          {/* Activity Card */}
                          <div className={styles.activityCard}>
                            <img
                              src={act.photoUrl}
                              alt={act.title}
                              className={styles.activityPhoto}
                            />

                            <div className={styles.activityMain}>
                              <span className={styles.activityCategory}>{act.category}</span>
                              <h4 className={styles.activityTitle}>{act.title}</h4>
                              <p className={styles.activityDesc}>{act.description}</p>

                              {/* Khối lý do đề xuất AI: Gộp gọn gàng, tiết kiệm diện tích */}
                              {(act.timeSlotReason || act.whyVisitReason || act.rationale) && (
                                <div className={styles.activityReasonDossier}>
                                  <div className={styles.reasonUnifiedHeader}>
                                    <span className={styles.reasonUnifiedTag}>💡 Lý do đề xuất</span>
                                    <div className={styles.reasonUnifiedContent}>
                                      {act.timeSlotReason && (
                                        <span className={styles.reasonPart}>
                                          <strong>Khung giờ:</strong> {act.timeSlotReason}{' '}
                                        </span>
                                      )}
                                      {act.whyVisitReason && (
                                        <span className={styles.reasonPart}>
                                          <strong>· Điểm nổi bật:</strong> {act.whyVisitReason}
                                        </span>
                                      )}
                                      {!act.timeSlotReason && !act.whyVisitReason && act.rationale && (
                                        <span>{act.rationale}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className={styles.activityMetaRow}>
                                <span className={styles.locationLink}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                  {act.location}
                                </span>

                                <a
                                  href={
                                    act.latitude && act.longitude
                                      ? `https://www.google.com/maps/search/?api=1&query=${act.latitude},${act.longitude}`
                                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.title + ' ' + (act.location || destination))}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.googleMapsLink}
                                  title="Mở chỉ đường trên Google Maps"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                                  <span>Google Maps</span>
                                </a>

                                {act.tip && (
                                  <button
                                    type="button"
                                    className={styles.tipToggleBtn}
                                    onClick={() => setOpenTipId(isTipOpen ? null : act.id)}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                    <span>Lưu ý ({isTipOpen ? 'thu gọn' : 'xem'})</span>
                                  </button>
                                )}
                              </div>

                              {act.tip && isTipOpen && (
                                <div className={styles.activityTipBox}>
                                  <strong>Mẹo nhỏ: </strong>
                                  {act.tip}
                                </div>
                              )}

                              {/* Thẻ cảnh báo giờ mở cửa hoặc quy định */}
                              {act.warning && (
                                <div className={styles.activityWarningBox}>
                                  <span>⚠️ {act.warning}</span>
                                </div>
                              )}
                            </div>

                            {/* Activity Right Cost & Actions */}
                            <div className={styles.activityRight}>
                              <span className={`${styles.costBadge} ${act.costStatus === 'UNVERIFIED' ? styles.costUnverified : act.costVnd === 0 ? styles.costFree : ''}`}>
                                {act.costLabel}
                              </span>

                              <div className={styles.activityActionButtons}>
                                <button
                                  type="button"
                                  className={styles.btnReplacePlace}
                                  onClick={() => setReplaceTargetActivityId(act.id)}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                                  <span>Thay địa điểm</span>
                                </button>

                                <div style={{ position: 'relative' }}>
                                  <button
                                    type="button"
                                    className={styles.btnOverflowMenu}
                                    onClick={() => setActiveOverflowId(isOverflowOpen ? null : act.id)}
                                    aria-label="Thao tác khác"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                  </button>

                                  {isOverflowOpen && (
                                    <div className={styles.overflowDropdown}>
                                      <button
                                        type="button"
                                        className={styles.overflowItem}
                                        onClick={() => {
                                          triggerToast('Mở điều chỉnh khung giờ hoạt động.');
                                          setActiveOverflowId(null);
                                        }}
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                        Chỉnh giờ
                                      </button>
                                      <button
                                        type="button"
                                        className={`${styles.overflowItem} ${styles.overflowItemDanger}`}
                                        onClick={() => handleDeleteActivity(act.id)}
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                        Xóa hoạt động
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Transfer Connector Line */}
                        {act.transferTimeAfter && (
                          <div className={styles.transferRow}>
                            <div />
                            <div className={styles.transferConnectorLine}>
                              <div className={styles.transferLineDashed} />
                            </div>
                            <div className={styles.transferInfo}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                              <span>{act.transferTimeAfter}</span>
                              <span className={styles.estimateTag}>Ước tính</span>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Chặng tiễn đoàn & Trả phòng Ngày cuối khi bay về sớm */}
                  {activeDay === itineraryDays.length && (detectedDepartureTime || (currentDayPlan.activities.length > 0 && currentDayPlan.activities[currentDayPlan.activities.length - 1].timeSlot !== 'EVENING')) && (
                    <div className={styles.welcomeBannerCard} style={{ marginTop: '16px', borderColor: '#FED7AA', background: '#FFFDF9' }}>
                      <div className={styles.welcomeBannerIcon} style={{ background: '#FFF7ED', color: '#EA580C' }}>🛫</div>
                      <div className={styles.welcomeBannerBody}>
                        <div className={styles.welcomeBannerHeader}>
                          <span className={styles.welcomeBannerTag} style={{ background: '#FFEDD5', color: '#C2410C' }}>Chặng tiễn đoàn & Trả phòng</span>
                          <span className={styles.welcomeBannerTime}>
                            {detectedDepartureTime || '11:00'}
                          </span>
                        </div>
                        <h4 className={styles.welcomeBannerTitle}>
                          Check-out Khách sạn & Khởi hành về
                        </h4>
                        <p className={styles.welcomeBannerDesc}>
                          Hoàn tất trả phòng khách sạn và di chuyển ra sân bay / ga tàu theo lịch trình lúc {detectedDepartureTime || '11:00'}. Chiều tối để trống theo yêu cầu để quý khách bay về an toàn, khép lại chuyến khám phá {destination} trọn vẹn!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* End of timeline actions & Daily budget breakdown */}
                  <div className={styles.timelineFooter}>
                    <button
                      type="button"
                      className={styles.btnAddActivityDashed}
                      onClick={() => setShowAddActivityModal(true)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      <span>Thêm hoạt động vào Ngày {activeDay}</span>
                    </button>

                    {/* Expandable Daily Budget Breakdown */}
                    <div className={styles.dailyBudgetBox}>
                      <div className={styles.dailyBudgetHeader}>
                        <span className={styles.dailyBudgetTitle}>Phân bổ chi phí dự kiến Ngày {activeDay} ({budgetBreakdown.count} người)</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0088CC' }}>
                          {new Intl.NumberFormat('vi-VN').format(currentDaySubtotal)}đ / cả đoàn
                        </span>
                      </div>
                      <div className={styles.dailyBudgetGrid}>
                        <div className={styles.budgetCategoryItem}>
                          <span className={styles.budgetCategoryLabel}>Vé & Hoạt động ({budgetBreakdown.count} người)</span>
                          <span className={styles.budgetCategoryValue}>
                            {new Intl.NumberFormat('vi-VN').format(
                              currentDayPlan.activities.reduce((acc, curr) => acc + (curr.costVnd || 0), 0) * budgetBreakdown.count
                            )}đ
                          </span>
                        </div>
                        <div className={styles.budgetCategoryItem}>
                          <span className={styles.budgetCategoryLabel}>Ăn uống 3 bữa ({budgetBreakdown.count} người)</span>
                          <span className={styles.budgetCategoryValue}>
                            {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.diningPerPersonDay * budgetBreakdown.count)}đ
                          </span>
                        </div>
                        <div className={styles.budgetCategoryItem}>
                          <span className={styles.budgetCategoryLabel}>Di chuyển ({budgetBreakdown.vehicleDescription})</span>
                          <span className={styles.budgetCategoryValue}>
                            {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.dailyVehicleRate)}đ
                          </span>
                        </div>
                        <div className={styles.budgetCategoryItem}>
                          <span className={styles.budgetCategoryLabel}>Lưu trú phân bổ ({budgetBreakdown.roomsNeeded} phòng)</span>
                          <span className={styles.budgetCategoryValue}>
                            {new Intl.NumberFormat('vi-VN').format(Math.round(budgetBreakdown.totalLodging / Math.max(1, daysCount)))}đ
                          </span>
                        </div>
                        <div className={styles.budgetCategoryItem} style={{ textAlign: 'right' }}>
                          <span className={styles.budgetCategoryLabel}>Bình quân</span>
                          <span className={styles.budgetCategoryValue} style={{ color: '#149D83' }}>
                            {new Intl.NumberFormat('vi-VN').format(Math.round(currentDaySubtotal / budgetBreakdown.count))}đ / người
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── 5. REAL MAP VIEW INTEGRATION (T5) ─── */}
              {activeView === 'map' && (
                <div className={styles.mapViewContainer}>
                  <div className={styles.realMapAdapterWrapper}>
                    <MapViewAdapter
                      destinations={mapMarkers}
                      selectedDestinationId={currentDayPlan.activities[selectedMapPin - 1]?.id}
                      onSelectDestination={(dest) => {
                        if (!dest) return;
                        const fIdx = currentDayPlan.activities.findIndex((a) => a.id === dest.id);
                        if (fIdx >= 0) setSelectedMapPin(fIdx + 1);
                      }}
                      initialCenter={{
                        latitude: currentDayPlan.activities[0]?.latitude || activeDestObj.lat,
                        longitude: currentDayPlan.activities[0]?.longitude || activeDestObj.lng,
                        zoom: 12.5,
                      }}
                      showSelectedCard={false}
                    />
                  </div>

                  {/* Selected Place Preview Card on Map */}
                  {currentDayPlan.activities[selectedMapPin - 1] && (
                    <div className={styles.mapPreviewCard}>
                      <img
                        src={currentDayPlan.activities[selectedMapPin - 1].photoUrl}
                        alt={currentDayPlan.activities[selectedMapPin - 1].title}
                        className={styles.mapPreviewPhoto}
                      />
                      <div className={styles.mapPreviewDetails}>
                        <span className={styles.mapPreviewCategory}>
                          Điểm {selectedMapPin} · {currentDayPlan.activities[selectedMapPin - 1].category}
                        </span>
                        <h4 className={styles.mapPreviewTitle}>
                          {currentDayPlan.activities[selectedMapPin - 1].title}
                        </h4>
                        <span className={styles.mapPreviewCost}>
                          {currentDayPlan.activities[selectedMapPin - 1].costLabel}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {currentDayPlan.activities[selectedMapPin - 1].timeRange} · {currentDayPlan.activities[selectedMapPin - 1].location}
                        </span>
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
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                          <span>Chỉ đường Google Maps</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Map Legend */}
                  <div className={styles.mapLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#0088CC' }} />
                      <span>Tham quan</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#F59E0B' }} />
                      <span>Ẩm thực</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#149D83' }} />
                      <span>Nghỉ dưỡng</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#6366F1' }} />
                      <span>Khám phá đêm</span>
                    </div>
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
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '8px' }}>
                  1. Chi phí cơ sở tại điểm đến (Đã tính trong lịch trình)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#F8FAFD', borderRadius: '8px', border: '1px solid #EAF0F6' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#14283F', display: 'block' }}>Vé tham quan & Hoạt động</span>
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                        {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalActPerPerson)}đ/người × {budgetBreakdown.count} người
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                      {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalActivities)}đ
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#F8FAFD', borderRadius: '8px', border: '1px solid #EAF0F6' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#14283F', display: 'block' }}>Ăn uống ({daysCount} ngày)</span>
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                        {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.diningPerPersonDay)}đ/người/ngày × {daysCount}N × {budgetBreakdown.count} người
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                      {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalDining)}đ
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#F8FAFD', borderRadius: '8px', border: '1px solid #EAF0F6' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#14283F', display: 'block' }}>Di chuyển nội thành ({daysCount} ngày)</span>
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                        {budgetBreakdown.vehicleDescription} ({new Intl.NumberFormat('vi-VN').format(budgetBreakdown.dailyVehicleRate)}đ/ngày)
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                      {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalLocalTransport)}đ
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#F8FAFD', borderRadius: '8px', border: '1px solid #EAF0F6' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#14283F', display: 'block' }}>
                        Khách sạn lưu trú ({budgetBreakdown.nights} đêm {budgetTier === 'economy' ? 'tiết kiệm' : budgetTier === 'luxury' ? 'cao cấp' : 'tiêu chuẩn'})
                      </span>
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                        {budgetBreakdown.roomsNeeded} phòng đôi × {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.roomRatePerNight)}đ × {budgetBreakdown.nights} đêm
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                      {new Intl.NumberFormat('vi-VN').format(budgetBreakdown.totalLodging)}đ
                    </span>
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

      {/* 4. REAL SAVED ITINERARIES DRAWER */}
      {showSavedDrawer && (
        <div className={styles.drawerWrapper} onClick={() => setShowSavedDrawer(false)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>Lịch trình đã lưu của bạn</h3>
                <p className={styles.drawerSubtitle}>Các kế hoạch đã được lưu lại để xem hoặc chỉnh sửa</p>
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
              <div
                className={styles.alternativeCard}
                onClick={() => {
                  setDestination('Đà Nẵng');
                  setDuration('3n2d');
                  setItineraryDays(INITIAL_DANANG_DAYS);
                  setShowSavedDrawer(false);
                  triggerToast('Đã tải lịch trình Đà Nẵng 3N2Đ!');
                }}
              >
                <img src='https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_day.jpg' alt="Đà Nẵng" className={styles.alternativePhoto} />
                <div className={styles.alternativeInfo}>
                  <span className={styles.alternativeCategory}>3 ngày 2 đêm · 2 người</span>
                  <h4 className={styles.alternativeTitle}>Đà Nẵng, đi là mê</h4>
                  <span className={styles.alternativeCost}>Dự toán: 4.850.000đ</span>
                  <button type="button" className={styles.btnSelectPlace}>Mở lại lịch trình này</button>
                </div>
              </div>

              <div
                className={styles.alternativeCard}
                onClick={() => {
                  setDestination('Hội An');
                  setDuration('2n1d');
                  setShowSavedDrawer(false);
                  handleGenerateClick();
                }}
              >
                <img src='https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg' alt="Hội An" className={styles.alternativePhoto} />
                <div className={styles.alternativeInfo}>
                  <span className={styles.alternativeCategory}>2 ngày 1 đêm · 2 người</span>
                  <h4 className={styles.alternativeTitle}>Phố cổ Hội An & Thả hoa đăng</h4>
                  <span className={styles.alternativeCost}>Dự toán: 2.800.000đ</span>
                  <button type="button" className={styles.btnSelectPlace}>Mở lại lịch trình này</button>
                </div>
              </div>

              <div
                className={styles.alternativeCard}
                onClick={() => {
                  setDestination('Hà Nội');
                  setDuration('2n1d');
                  setShowSavedDrawer(false);
                  handleGenerateClick();
                }}
              >
                <img src='https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_hanoi_day.jpg' alt="Hà Nội" className={styles.alternativePhoto} />
                <div className={styles.alternativeInfo}>
                  <span className={styles.alternativeCategory}>2 ngày 1 đêm · 2 người</span>
                  <h4 className={styles.alternativeTitle}>Khám phá 36 phố phường Hà Nội</h4>
                  <span className={styles.alternativeCost}>Dự toán: 3.200.000đ</span>
                  <button type="button" className={styles.btnSelectPlace}>Mở lại lịch trình này</button>
                </div>
              </div>
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

      {/* 6. ADD ACTIVITY MODAL */}
      {showAddActivityModal && (
        <div className={styles.overlayBackdrop} onClick={() => setShowAddActivityModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Thêm hoạt động vào Ngày {activeDay}</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowAddActivityModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <label className={styles.fieldLabel}>Tên hoạt động / địa điểm</label>
                <input
                  type="text"
                  className={styles.wishesTextarea}
                  style={{ minHeight: 'auto', padding: '10px 12px' }}
                  placeholder="Ví dụ: Thưởng thức cà phê ngắm cảnh sông"
                  value={newActTitle}
                  onChange={(e) => setNewActTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className={styles.fieldLabel}>Khung giờ</label>
                  <input
                    type="text"
                    className={styles.wishesTextarea}
                    style={{ minHeight: 'auto', padding: '10px 12px' }}
                    value={newActTime}
                    onChange={(e) => setNewActTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>Phân loại</label>
                  <select
                    className={styles.wishesTextarea}
                    style={{ minHeight: 'auto', padding: '10px 12px' }}
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
                <label className={styles.fieldLabel}>Chi phí ước tính (VNĐ)</label>
                <input
                  type="number"
                  className={styles.wishesTextarea}
                  style={{ minHeight: 'auto', padding: '10px 12px' }}
                  value={newActCost}
                  onChange={(e) => setNewActCost(e.target.value)}
                  placeholder="0 (miễn phí)"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowAddActivityModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.btnCreateTripPrimary}
                onClick={handleAddActivity}
              >
                Thêm vào lịch trình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
