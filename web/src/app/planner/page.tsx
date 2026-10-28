'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/common/Navbar';
import type { DestinationMarker } from '@/features/map-location/types';
import { getRealPlacesByProvince } from '@/data/realDestinationsData';
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '520px', background: '#F8FAFC', color: '#64748B', fontSize: '13.5px', fontWeight: 600 }}>
        Đang khởi tạo bản đồ tương tác VISTA MapLibre...
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

// Multi-day distinct itinerary generator (T1, T3)
function generateDistinctDayPlan(
  destName: string,
  totalDays: number,
  isLateDeparture: boolean,
  budgetTier: string,
  interests: string[],
  baseLat: number,
  baseLng: number,
  photoUrl: string
): DayPlan[] {
  const realPlaces = getRealPlacesByProvince(destName);
  const days: DayPlan[] = [];

  // Categorize real places to pick smart daily slots
  const landmarks = realPlaces.filter((p) =>
    /di tích|lịch sử|thắng cảnh|kiến trúc|tâm linh|văn hóa|khám phá|bảo tàng/i.test(p.category)
  );
  const culinary = realPlaces.filter((p) =>
    /ẩm thực|chợ|quán|đặc sản|mua sắm/i.test(p.category) || /chợ|ẩm thực|quán|bún|cơm|bánh/i.test(p.name)
  );
  const natureCraft = realPlaces.filter((p) =>
    /thiên nhiên|sinh thái|làng|nghỉ dưỡng|check-in|ngắm cảnh|phượt|biển/i.test(p.category)
  );
  const eveningSpots = realPlaces.filter((p) =>
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

  // Total Estimated Cost Calculation
  const totalEstimatedCost = useMemo(() => {
    let actSum = 0;
    itineraryDays.forEach((day) => {
      day.activities.forEach((act) => {
        actSum += act.costVnd || 0;
      });
    });
    // Multiplied by group size for per-person ticket items
    const transportPerDay = 180000;
    const hotelPerNight = budgetTier === 'economy' ? 450000 : budgetTier === 'luxury' ? 1800000 : 800000;
    const nights = Math.max(1, daysCount - 1);
    return actSum + transportPerDay * daysCount + hotelPerNight * nights;
  }, [itineraryDays, daysCount, budgetTier]);

  const perPersonCost = useMemo(() => {
    return Math.round(totalEstimatedCost / Math.max(1, peopleCount));
  }, [totalEstimatedCost, peopleCount]);

  // Active day plan
  const currentDayPlan = useMemo(() => {
    return itineraryDays.find((d) => d.dayNumber === activeDay) || itineraryDays[0];
  }, [itineraryDays, activeDay]);

  // Day subtotal calculation
  const currentDaySubtotal = useMemo(() => {
    if (!currentDayPlan) return 1450000;
    let sum = 0;
    currentDayPlan.activities.forEach((a) => (sum += a.costVnd || 0));
    // include daily transport + allocated accommodation
    const transport = 190000;
    const stayAlloc = 400000;
    return sum + transport + stayAlloc;
  }, [currentDayPlan]);

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

  // Dynamic Replacement Spots tailored to active destination
  const replacementPlaces: ReplacementPlace[] = useMemo(() => {
    const destNorm = destination.toLowerCase();
    if (destNorm.includes('huế') || destNorm.includes('hue')) {
      return [
        {
          id: 'rep-hue-1',
          category: 'Di tích & Cảnh quan',
          title: 'Lăng Tự Đức & Hồ Lưu Khiêm',
          description: 'Khu lăng tẩm thơ mộng mang phong cách hoa viên truyền thống Cố Đô.',
          costLabel: '150.000đ / người',
          costVnd: 150000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
        },
        {
          id: 'rep-hue-2',
          category: 'Văn hóa & Check-in',
          title: 'Làng Hương Thủy Xuân',
          description: 'Làng nghề làm hương thủ công truyền thống rực rỡ sắc màu bên chân đồi Vọng Cảnh.',
          costLabel: 'Miễn phí',
          costVnd: 0,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/tay_nguyen_highlands.jpg',
        },
        {
          id: 'rep-hue-3',
          category: 'Ẩm thực Cố Đô',
          title: 'Chợ Đông Ba & Bún bò mụ Rơi',
          description: 'Thưởng thức bún bò Huế chuẩn vị cay nồng đậm đà và các loại bánh bèo nậm lọc.',
          costLabel: '80.000đ / người',
          costVnd: 80000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_south_day.jpg',
        },
        {
          id: 'rep-hue-4',
          category: 'Cảnh quan & Lịch sử',
          title: 'Cầu Trường Tiền & Đi thuyền rồng Sông Hương',
          description: 'Ngắm nhìn dòng sông Hương êm đềm và nghe ca Huế trên sông khi hoàng hôn buông xuống.',
          costLabel: '120.000đ / nhóm',
          costVnd: 120000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_night.jpg',
        },
      ];
    }
    if (destNorm.includes('hội an') || destNorm.includes('quảng nam')) {
      return [
        {
          id: 'rep-ha-1',
          category: 'Sinh thái & Trải nghiệm',
          title: 'Rừng dừa Bảy Mẫu Cẩm Thanh',
          description: 'Trải nghiệm chèo thuyền thúng xoay vòng và câu cua giữa rừng dừa bạt ngàn.',
          costLabel: '150.000đ / nhóm',
          costVnd: 150000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
        },
        {
          id: 'rep-ha-2',
          category: 'Làng nghề & Văn hóa',
          title: 'Làng gốm Thanh Hà & Công viên Đất Nung',
          description: 'Tự tay nhào nặn chiếc bình gốm xinh xắn cùng nghệ nhân làng nghề 500 năm tuổi.',
          costLabel: '40.000đ / người',
          costVnd: 40000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/tay_nguyen_highlands.jpg',
        },
        {
          id: 'rep-ha-3',
          category: 'Ẩm thực Phố Hội',
          title: 'Cơm gà Bà Buội & Bánh mì Phượng',
          description: 'Hai món ăn trứ danh đã trở thành huyền thoại ẩm thực được quốc tế ca ngợi.',
          costLabel: '90.000đ / người',
          costVnd: 90000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_south_day.jpg',
        },
      ];
    }
    if (destNorm.includes('phú quốc')) {
      return [
        {
          id: 'rep-pq-1',
          category: 'Sinh thái & Biển đảo',
          title: 'Làng chài Rạch Vẹm & Vương quốc Sao Biển',
          description: 'Chụp ảnh cùng hàng trăm chú sao biển đỏ rực rỡ dưới làn nước trong vắt.',
          costLabel: 'Miễn phí',
          costVnd: 0,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
        },
        {
          id: 'rep-pq-2',
          category: 'Ẩm thực hải sản',
          title: 'Bún Quậy Kiến Xây & Chợ đêm Dinh Cậu',
          description: 'Tô bún chả tôm mực tươi quậy tại chỗ ăn kèm nước chấm chua ngọt độc đáo.',
          costLabel: '85.000đ / người',
          costVnd: 85000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_day.jpg',
        },
        {
          id: 'rep-pq-3',
          category: 'Thư giãn & Chill',
          title: 'OCSEN Beach Bar ngắm hoàng hôn Bãi Trường',
          description: 'Thưởng thức cocktail trên ghế lười bãi biển nghe nhạc acoustic lãng mạn.',
          costLabel: '120.000đ / nhóm',
          costVnd: 120000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_night.jpg',
        },
      ];
    }
    if (destNorm.includes('hà nội')) {
      return [
        {
          id: 'rep-hn-1',
          category: 'Di tích & Lịch sử',
          title: 'Văn Miếu - Quốc Tử Giám',
          description: 'Trường đại học đầu tiên của Việt Nam với 82 bia tiến sĩ và kiến trúc cổ kính.',
          costLabel: '70.000đ / người',
          costVnd: 70000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_hanoi_day.jpg',
        },
        {
          id: 'rep-hn-2',
          category: 'Ẩm thực phố cổ',
          title: 'Bún chả Hương Liên & Cà phê Trứng Giảng',
          description: 'Thưởng thức đặc sản bún chả than hoa và ly cà phê trứng béo ngậy trứ danh.',
          costLabel: '90.000đ / người',
          costVnd: 90000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_south_day.jpg',
        },
        {
          id: 'rep-hn-3',
          category: 'Bảo tàng & Lịch sử',
          title: 'Tour đêm Di tích Nhà tù Hỏa Lò',
          description: 'Không gian thiêng liêng và xúc động với những câu chuyện lịch sử bất khuất.',
          costLabel: '150.000đ / người',
          costVnd: 150000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_night.jpg',
        },
      ];
    }
    if (destNorm.includes('đà nẵng') || destNorm.includes('da nang')) {
      return [
        {
          id: 'rep-dn-1',
          category: 'Tham quan & Thiên nhiên',
          title: 'Danh thắng Ngũ Hành Sơn & Động Huyền Không',
          description: 'Khám phá động Huyền Không kỳ ảo và viếng chùa Tam Thai cổ kính.',
          costLabel: '40.000đ / nhóm',
          costVnd: 40000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/tay_nguyen_highlands.jpg',
        },
        {
          id: 'rep-dn-2',
          category: 'Ẩm thực truyền thống',
          title: 'Bánh xèo nem lụi Bà Dưỡng',
          description: 'Bánh xèo giòn rụm cuốn rau sống với nước chấm gan thịt trứ danh.',
          costLabel: '180.000đ / nhóm',
          costVnd: 180000,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_south_day.jpg',
        },
        {
          id: 'rep-dn-3',
          category: 'Check-in & Đi dạo',
          title: 'Cầu Rồng & Cầu Tình Yêu Đà Nẵng',
          description: 'Biểu tượng kiến trúc hiện đại rực rỡ sắc màu cạnh tượng cá chép hóa rồng.',
          costLabel: 'Miễn phí',
          costVnd: 0,
          photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_bana_night.jpg',
        },
      ];
    }
    return [
      {
        id: `rep-${destination}-1`,
        category: 'Thắng cảnh & Thiên nhiên',
        title: `Danh thắng tiêu biểu ${destination}`,
        description: `Điểm tham quan nổi bật và được yêu thích hàng đầu tại ${destination}.`,
        costLabel: '50.000đ / người',
        costVnd: 50000,
        photoUrl: activeDestObj.photo,
      },
      {
        id: `rep-${destination}-2`,
        category: 'Ẩm thực bản địa',
        title: `Quán ăn đặc sản truyền thống ${destination}`,
        description: `Thưởng thức hương vị ẩm thực gia truyền nức tiếng của người dân bản xứ.`,
        costLabel: '120.000đ / nhóm',
        costVnd: 120000,
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_south_day.jpg',
      },
      {
        id: `rep-${destination}-3`,
        category: 'Văn hóa & Làng nghề',
        title: `Làng nghề thủ công & Điểm check-in ${destination}`,
        description: `Khám phá nét đẹp văn hóa lâu đời và chụp ảnh kỷ niệm tuyệt đẹp.`,
        costLabel: 'Miễn phí',
        costVnd: 0,
        photoUrl: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_panoramic_day.jpg',
      },
    ];
  }, [destination, activeDestObj]);

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
      // Call live backend endpoint (proxied to port 8081 via next.config rewrite)
      const response = await fetch('/api/v1/ai/quick-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationProvince: destination,
          totalDays: daysCount,
          budgetLevel: budgetLevelApi,
          interests: selectedStyleLabels,
          customPrompt: wishesText,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      if (data && data.days && Array.isArray(data.days) && data.days.length > 0) {
        const transformedDays: DayPlan[] = data.days.map((dayItem: Record<string, unknown>, idx: number) => {
          const dayNum = (dayItem.dayNumber as number) || idx + 1;
          const latOffset = (aIdx: number) => activeDestObj.lat + Math.sin(dayNum * 1.8 + aIdx * 1.2) * 0.02;
          const lngOffset = (aIdx: number) => activeDestObj.lng + Math.cos(dayNum * 1.8 + aIdx * 1.2) * 0.02;

          let rawActivities = (dayItem.activities as Record<string, unknown>[]) || [];

          // T1: If day 1 and late evening departure, ensure evening start
          if (dayNum === 1 && isLateEveningDeparture) {
            rawActivities = [
              {
                timeSlot: 'EVENING',
                title: `Nhận phòng khách sạn & Thư giãn (${destination})`,
                note: `Check-in khách sạn, cất hành lý và chuẩn bị cho buổi tối đầu tiên tại ${destination}.`,
                estimatedCostVnd: 0,
              },
              {
                timeSlot: 'NIGHT',
                title: `Ăn tối muộn & Dạo phố đêm lung linh`,
                note: `Thưởng thức ẩm thực đêm đặc sản và cảm nhận vẻ đẹp lung linh của thành phố.`,
                estimatedCostVnd: 200000,
              },
            ];
          }

          const activities: Activity[] = rawActivities.map((act: Record<string, unknown>, actIdx: number) => {
            const costVal = Number(act.estimatedCost || act.estimatedCostVnd) || 0;
            const timeSlot = act.timeSlot || (actIdx === 0 ? 'MORNING' : actIdx === 1 ? 'NOON' : actIdx === 2 ? 'AFTERNOON' : 'EVENING');
            const timeRange =
              dayNum === 1 && isLateEveningDeparture
                ? (actIdx === 0 ? '20:30–21:30' : '21:45–23:15')
                : actIdx === 0
                  ? '08:00–10:30'
                  : actIdx === 1
                    ? '11:30–13:00'
                    : actIdx === 2
                      ? '14:30–17:00'
                      : '18:30–21:00';

            return {
              id: String(act.destinationId || `act-${dayNum}-${actIdx + 1}`),
              timeSlot: String(timeSlot),
              timeRange,
              category: String(act.category || (actIdx === 1 ? 'Ẩm thực' : 'Tham quan & Trải nghiệm')),
              title: String(act.destinationName || act.placeName || `Trải nghiệm điểm đến ${dayNum}.${actIdx + 1}`),
              description: String(act.note || act.activityDescription || `Khám phá vẻ đẹp và không khí đặc trưng tại ${destination}.`),
              location: `${destination}, Việt Nam`,
              costVnd: costVal,
              costLabel: costVal === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(costVal)}đ / nhóm`,
              tip: actIdx === 0 ? 'Khởi hành đúng giờ để có trải nghiệm trọn vẹn.' : undefined,
              photoUrl: activeDestObj.photo,
              transferTimeAfter: actIdx < rawActivities.length - 1 ? 'Di chuyển khoảng 15–20 phút' : undefined,
              latitude: typeof act.latitude === 'number' ? act.latitude : latOffset(actIdx),
              longitude: typeof act.longitude === 'number' ? act.longitude : lngOffset(actIdx),
            };
          });

          return {
            dayNumber: dayNum,
            dateStr: `Ngày ${dayNum}`,
            title: dayItem.title || dayItem.dateLabel || `Ngày ${dayNum} · Trải nghiệm & Khám phá ${destination}`,
            activities,
          };
        });

        setItineraryDays(transformedDays);
        setActiveDay(1);
        setHasPlanGenerated(true);
        triggerToast(`Đã tạo lịch trình thông minh AI cho ${destination} (${daysCount} ngày)!`);
        return;
      }
      throw new Error('Empty response from AI planner endpoint');
    } catch (err) {
      console.warn('AI live call fallback to local multi-day distinct generator:', err);
      // Smart distinct multi-day generator (T1, T3)
      const generated = generateDistinctDayPlan(
        destination,
        daysCount,
        isLateEveningDeparture,
        budgetTier,
        selectedStyleLabels,
        activeDestObj.lat,
        activeDestObj.lng,
        activeDestObj.photo
      );

      setItineraryDays(generated);
      setActiveDay(1);
      setHasPlanGenerated(true);
      triggerToast(`Đã tạo lịch trình thông minh tối ưu cho ${destination} (${daysCount} ngày)!`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── SAVE ITINERARY REAL PERSISTENCE ──────────────────────────────────────
  const handleSaveToggle = () => {
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
        triggerToast(`Đã lưu và đồng bộ lịch trình vào chuyến đi "${linkedTripTitle}"!`);
      } else {
        triggerToast(`Đã lưu lịch trình "${destination}" vào bộ sưu tập cá nhân.`);
      }
    } catch {
      setIsSaved(true);
      triggerToast('Đã lưu lịch trình thành công.');
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
              costVnd: place.costVnd,
              costLabel: place.costLabel,
              photoUrl: place.photoUrl,
            };
          }
          return act;
        }),
      }))
    );
    setReplaceTargetActivityId(null);
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
      {/* ─── 1. GLOBAL HEADER (100% UNIFIED WITH HOMEPAGE) ─── */}
      <Navbar activeModule="planner" />

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
          {isGenerating && (
            <div className={styles.generatingCard}>
              <div className={styles.generatingHeader}>
                <div className={styles.spinnerBlue} />
                <span className={styles.generatingText}>
                  Đang sắp xếp trải nghiệm cho chuyến đi của bạn…
                </span>
              </div>
              <div className={styles.skeletonBar} style={{ height: '110px' }} />
              <div className={styles.skeletonBar} style={{ height: '44px' }} />
              <div className={styles.skeletonBar} style={{ height: '130px' }} />
              <div className={styles.skeletonBar} style={{ height: '130px' }} />
            </div>
          )}

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
                  <div className={styles.expenseLeft}>
                    <span className={styles.expenseLabel}>Dự toán cả nhóm</span>
                    <span className={styles.expenseTotal}>
                      {new Intl.NumberFormat('vi-VN').format(totalEstimatedCost)}đ
                    </span>
                    <span className={styles.expensePerPerson}>
                      Khoảng {new Intl.NumberFormat('vi-VN').format(perPersonCost)}đ/người
                    </span>
                    <span className={styles.expenseEstimateBadge}>Ước tính</span>
                  </div>

                  <button
                    type="button"
                    className={styles.btnViewBudgetDetail}
                    onClick={() => setShowBudgetModal(true)}
                  >
                    <span>Xem chi tiết</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ─── AI TRAVEL INSIGHTS CARD (T6) ─── */}
              <div className={styles.aiInsightsCard}>
                <div className={styles.aiInsightsHeader}>
                  <div className={styles.aiInsightsTitleRow}>
                    <span className={styles.aiInsightsBadge}>GEMINI AI</span>
                    <h3 className={styles.aiInsightsMainTitle}>Phân tích & Đánh giá chuyến đi {destination}</h3>
                  </div>
                  <span className={styles.aiInsightsConfidence}>Độ phù hợp: 96%</span>
                </div>

                <div className={styles.aiInsightsGrid}>
                  <div className={styles.aiInsightItem}>
                    <span className={styles.aiInsightLabel}>
                      🌤️ Dự báo thời tiết
                    </span>
                    <span className={styles.aiInsightValue}>
                      26°C – 31°C · Nắng nhẹ ráo đẹp, biển êm, thuận lợi cho tham quan và di chuyển.
                    </span>
                  </div>

                  <div className={styles.aiInsightItem}>
                    <span className={styles.aiInsightLabel}>
                      ⚡ Nhịp độ & Phân bổ
                    </span>
                    <span className={styles.aiInsightValue}>
                      {isLateEveningDeparture
                        ? 'Tối ưu giờ xuất phát muộn: Ngày 1 bắt đầu sau 20h; các ngày sau nhịp độ hài hòa 3–4 điểm.'
                        : 'Nhịp độ hài hòa (3–4 hoạt động/ngày), khoảng cách di chuyển trung bình 15–20 phút.'}
                    </span>
                  </div>

                  <div className={styles.aiInsightItem}>
                    <span className={styles.aiInsightLabel}>
                      💡 Lời khuyên bản địa
                    </span>
                    <span className={styles.aiInsightValue}>
                      {budgetTier === 'economy'
                        ? 'Nên ưu tiên các điểm tham quan mở và ẩm thực chợ đêm để tối ưu ngân sách.'
                        : 'Nên đặt trước vé thắng cảnh và bàn ăn tại các quán nổi tiếng để tránh chờ đợi.'}
                    </span>
                  </div>
                </div>
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
                            </div>

                            {/* Activity Right Cost & Actions */}
                            <div className={styles.activityRight}>
                              <span className={`${styles.costBadge} ${act.costVnd === 0 ? styles.costFree : ''}`}>
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
                        <span className={styles.dailyBudgetTitle}>Phân bổ chi phí dự kiến Ngày {activeDay}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0088CC' }}>
                          {new Intl.NumberFormat('vi-VN').format(currentDaySubtotal)}đ / nhóm
                        </span>
                      </div>
                      <div className={styles.dailyBudgetGrid}>
                        <div className={styles.budgetCategoryItem}>
                          <span className={styles.budgetCategoryLabel}>Hoạt động & Ăn uống</span>
                          <span className={styles.budgetCategoryValue}>
                            {new Intl.NumberFormat('vi-VN').format(
                              currentDayPlan.activities.reduce((acc, curr) => acc + (curr.costVnd || 0), 0)
                            )}đ
                          </span>
                        </div>
                        <div className={styles.budgetCategoryItem}>
                          <span className={styles.budgetCategoryLabel}>Di chuyển</span>
                          <span className={styles.budgetCategoryValue}>190.000đ</span>
                        </div>
                        <div className={styles.budgetCategoryItem}>
                          <span className={styles.budgetCategoryLabel}>Lưu trú phân bổ</span>
                          <span className={styles.budgetCategoryValue}>400.000đ</span>
                        </div>
                        <div className={styles.budgetCategoryItem} style={{ textAlign: 'right' }}>
                          <span className={styles.budgetCategoryLabel}>Bình quân</span>
                          <span className={styles.budgetCategoryValue} style={{ color: '#149D83' }}>
                            {new Intl.NumberFormat('vi-VN').format(Math.round(currentDaySubtotal / Math.max(1, peopleCount)))}đ / người
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
          <div className={styles.modalBox} style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Dự toán chi phí chi tiết</h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Chuyến đi {destination} · {daysCount} ngày · {peopleCount} người
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFD', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#14283F' }}>Vé tham quan & Hoạt động</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                    {new Intl.NumberFormat('vi-VN').format(
                      itineraryDays.reduce((acc, d) => acc + d.activities.reduce((s, a) => s + (a.costVnd || 0), 0), 0)
                    )}đ
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFD', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#14283F' }}>Ăn uống & Đặc sản</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                    {new Intl.NumberFormat('vi-VN').format(350000 * daysCount * peopleCount)}đ
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFD', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#14283F' }}>Di chuyển nội thành (Taxi / Thuê xe)</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                    {new Intl.NumberFormat('vi-VN').format(180000 * daysCount)}đ
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFD', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#14283F' }}>
                    Khách sạn lưu trú ({Math.max(1, daysCount - 1)} đêm {budgetTier === 'economy' ? 'tiết kiệm' : budgetTier === 'luxury' ? 'cao cấp' : 'tiêu chuẩn'})
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#14283F' }}>
                    {new Intl.NumberFormat('vi-VN').format(
                      (budgetTier === 'economy' ? 450000 : budgetTier === 'luxury' ? 1800000 : 800000) * Math.max(1, daysCount - 1)
                    )}đ
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #E3EAF2', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <strong style={{ fontSize: '15px', color: '#14283F' }}>Tổng dự toán cả nhóm:</strong>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Khoảng {new Intl.NumberFormat('vi-VN').format(perPersonCost)}đ / người</div>
                </div>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#0088CC' }}>
                  {new Intl.NumberFormat('vi-VN').format(totalEstimatedCost)}đ
                </span>
              </div>

              <p className={styles.fieldHint} style={{ margin: 0 }}>
                * Lưu ý: Dự toán này chưa bao gồm vé máy bay khứ hồi và các khoản mua sắm cá nhân.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnCreateTripPrimary}
                onClick={() => setShowBudgetModal(false)}
              >
                Đã hiểu
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
        <div className={styles.drawerWrapper} onClick={() => setReplaceTargetActivityId(null)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>Gợi ý địa điểm thay thế</h3>
                <p className={styles.drawerSubtitle}>Các lựa chọn hấp dẫn khác tại {destination}</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setReplaceTargetActivityId(null)}
              >
                ✕
              </button>
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
