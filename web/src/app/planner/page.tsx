'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/common/Navbar';
import styles from './planner.module.css';

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

const DESTINATION_LIST = [
  { id: 'danang', nameVi: 'Đà Nẵng', province: 'Đà Nẵng', photo: '/images/danang_bana_day.jpg' },
  { id: 'hanoi', nameVi: 'Hà Nội', province: 'Hà Nội', photo: '/images/halong_hanoi_day.jpg' },
  { id: 'saigon', nameVi: 'TP. Hồ Chí Minh', province: 'Hồ Chí Minh', photo: '/images/saigon_south_day.jpg' },
  { id: 'hoian', nameVi: 'Hội An', province: 'Quảng Nam', photo: '/images/vietnam_panoramic_day.jpg' },
  { id: 'phuquoc', nameVi: 'Phú Quốc', province: 'Kiên Giang', photo: '/images/vietnam_panoramic_day.jpg' },
  { id: 'nhatrang', nameVi: 'Nha Trang', province: 'Khánh Hòa', photo: '/images/vietnam_panoramic_day.jpg' },
  { id: 'halong', nameVi: 'Vịnh Hạ Long', province: 'Quảng Ninh', photo: '/images/halong_hanoi_day.jpg' },
  { id: 'dalat', nameVi: 'Đà Lạt', province: 'Lâm Đồng', photo: '/images/tay_nguyen_highlands.jpg' },
  { id: 'ninhbinh', nameVi: 'Ninh Bình', province: 'Ninh Bình', photo: '/images/vietnam_panoramic_night.jpg' },
  { id: 'sapa', nameVi: 'Sa Pa', province: 'Lào Cai', photo: '/images/tay_nguyen_highlands.jpg' },
];

const TRAVEL_STYLES = [
  { id: 'beach', label: 'Biển & nghỉ dưỡng', icon: 'waves' },
  { id: 'culture', label: 'Văn hóa & di sản', icon: 'landmark' },
  { id: 'cuisine', label: 'Ẩm thực địa phương', icon: 'utensils' },
  { id: 'nature', label: 'Thiên nhiên', icon: 'tree' },
  { id: 'entertainment', label: 'Vui chơi & giải trí', icon: 'ferris-wheel' },
  { id: 'photo', label: 'Check-in & chụp ảnh', icon: 'camera' },
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
        photoUrl: '/images/danang_bana_day.jpg',
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
        photoUrl: '/images/vietnam_panoramic_day.jpg',
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
        photoUrl: '/images/halong_hanoi_day.jpg',
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
        photoUrl: '/images/danang_bana_night.jpg',
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
        photoUrl: '/images/danang_bana_day.jpg',
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
        photoUrl: '/images/saigon_south_day.jpg',
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
        photoUrl: '/images/tay_nguyen_highlands.jpg',
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
        photoUrl: '/images/danang_bana_night.jpg',
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
        photoUrl: '/images/vietnam_panoramic_day.jpg',
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
        photoUrl: '/images/saigon_south_day.jpg',
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
        photoUrl: '/images/danang_bana_day.jpg',
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
        photoUrl: '/images/danang_bana_night.jpg',
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
        photoUrl: '/images/vietnam_panoramic_day.jpg',
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
        photoUrl: '/images/danang_bana_day.jpg',
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
        photoUrl: '/images/tay_nguyen_highlands.jpg',
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
        photoUrl: '/images/danang_bana_night.jpg',
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
        photoUrl: '/images/vietnam_panoramic_day.jpg',
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
        photoUrl: '/images/saigon_south_day.jpg',
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
        photoUrl: '/images/halong_hanoi_day.jpg',
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
        photoUrl: '/images/danang_bana_night.jpg',
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
        photoUrl: '/images/halong_hanoi_day.jpg',
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
        photoUrl: '/images/vietnam_panoramic_day.jpg',
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
        photoUrl: '/images/tay_nguyen_highlands.jpg',
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
        photoUrl: '/images/vietnam_panoramic_night.jpg',
      },
    ],
  },
];

// Alternative spots for Replace Drawer
const REPLACEMENT_PLACES = [
  {
    id: 'alt-1',
    category: 'Tham quan & Thiên nhiên',
    title: 'Danh thắng Ngũ Hành Sơn',
    description: 'Khám phá động Huyền Không kỳ ảo và viếng chùa Tam Thai cổ kính.',
    costLabel: '80.000đ / nhóm',
    costVnd: 80000,
    photoUrl: '/images/tay_nguyen_highlands.jpg',
  },
  {
    id: 'alt-2',
    category: 'Ẩm thực truyền thống',
    title: 'Bánh xèo nem lụi Bà Dưỡng',
    description: 'Bánh xèo giòn rụm cuốn rau sống với nước chấm gan thịt trứ danh.',
    costLabel: '180.000đ / nhóm',
    costVnd: 180000,
    photoUrl: '/images/saigon_south_day.jpg',
  },
  {
    id: 'alt-3',
    category: 'Check-in & Đi dạo',
    title: 'Cầu Rồng & Cầu Tình Yêu Đà Nẵng',
    description: 'Biểu tượng kiến trúc hiện đại rực rỡ sắc màu cạnh tượng cá chép hóa rồng.',
    costLabel: 'Miễn phí',
    costVnd: 0,
    photoUrl: '/images/danang_bana_night.jpg',
  },
];

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
  const [startDate, setStartDate] = useState<string>('14/11/2026');
  const [duration, setDuration] = useState<string>('3n2d');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['beach', 'cuisine']);
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [budgetTier, setBudgetTier] = useState<string>('standard');
  const [showWishes, setShowWishes] = useState<boolean>(false);
  const [wishesText, setWishesText] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Active Itinerary Data
  const [itineraryDays, setItineraryDays] = useState<DayPlan[]>(INITIAL_DANANG_DAYS);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState<number>(3);
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

  // Load saved itineraries count and handle URL params on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vista_saved_itineraries');
      if (stored) {
        const parsed: SavedItineraryRecord[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedCount(parsed.length + 3);
        }
      }
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const destParam = params.get('dest') || params.get('destination');
      if (destParam) {
        const norm = destParam.toLowerCase();
        if (norm === 'phuquoc' || norm.includes('phú quốc')) {
          setDestination('Phú Quốc');
          setItineraryDays(INITIAL_PHUQUOC_DAYS);
          setActiveDay(1);
          setNewTripTitle('Chuyến đi Phú Quốc 3N2Đ');
        } else if (norm === 'hanoi' || norm.includes('hà nội')) {
          setDestination('Hà Nội');
          setNewTripTitle('Chuyến đi Hà Nội 3N2Đ');
        }
      }
    }
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

  // ─── REAL AI ITINERARY GENERATION ─────────────────────────────────────────
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
      // Call live backend endpoint
      const response = await fetch('http://localhost:8080/api/v1/ai/quick-plan', {
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

      if (data && data.days && Array.isArray(data.days)) {
        const transformedDays: DayPlan[] = data.days.map((dayItem: any, idx: number) => {
          const dayNum = dayItem.dayNumber || idx + 1;
          const activities: Activity[] = (dayItem.activities || []).map((act: any, actIdx: number) => {
            const costVal = Number(act.estimatedCost || act.estimatedCostVnd) || 0;
            return {
              id: act.destinationId || `act-${dayNum}-${actIdx + 1}`,
              timeSlot: act.timeSlot || (actIdx === 0 ? 'MORNING' : actIdx === 1 ? 'NOON' : actIdx === 2 ? 'AFTERNOON' : 'EVENING'),
              timeRange:
                actIdx === 0
                  ? '08:00–10:30'
                  : actIdx === 1
                  ? '11:30–13:00'
                  : actIdx === 2
                  ? '14:30–17:00'
                  : '18:30–21:00',
              category: act.category || 'Tham quan & Trải nghiệm',
              title: act.destinationName || act.placeName || 'Địa điểm hấp dẫn',
              description: act.note || act.activityDescription || 'Trải nghiệm đặc sắc không thể bỏ qua tại điểm đến.',
              location: `${destination}, Việt Nam`,
              costVnd: costVal,
              costLabel: costVal === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(costVal)}đ / nhóm`,
              tip: actIdx === 0 ? 'Ưu tiên khởi hành sớm để tránh nắng gắt.' : undefined,
              photoUrl: activeDestObj.photo,
              transferTimeAfter: actIdx < (dayItem.activities || []).length - 1 ? 'Di chuyển khoảng 15–20 phút' : undefined,
            };
          });

          return {
            dayNumber: dayNum,
            dateStr: `Ngày ${dayNum}`,
            title: dayItem.title || dayItem.dateLabel || `Ngày ${dayNum} · Trải nghiệm ${destination}`,
            activities,
          };
        });

        setItineraryDays(transformedDays);
        setActiveDay(1);
        setHasPlanGenerated(true);
        triggerToast(`Đã tạo lịch trình thông minh cho ${destination} (${daysCount} ngày)!`);
      }
    } catch (err) {
      console.warn('Backend live call fallback:', err);
      // Fallback local realistic generator if backend is momentarily unreachable
      const fallbackDays: DayPlan[] = [];
      for (let d = 1; d <= daysCount; d++) {
        fallbackDays.push({
          dayNumber: d,
          dateStr: `Ngày ${d}`,
          title: `Ngày ${d} · Khám phá & Trải nghiệm ${destination}`,
          activities: [
            {
              id: `act-fb-${d}-1`,
              timeSlot: 'MORNING',
              timeRange: '08:00–10:30',
              category: 'Tham quan',
              title: `Danh thắng nổi tiếng (${destination})`,
              description: `Khởi đầu ngày mới với cảnh quan thanh bình và chụp ảnh lưu niệm tại ${destination}.`,
              location: destination,
              costVnd: 0,
              costLabel: 'Miễn phí',
              photoUrl: activeDestObj.photo,
              transferTimeAfter: 'Di chuyển khoảng 20 phút',
            },
            {
              id: `act-fb-${d}-2`,
              timeSlot: 'NOON',
              timeRange: '11:30–13:00',
              category: 'Ẩm thực',
              title: `Thưởng thức đặc sản nức tiếng ${destination}`,
              description: 'Nếm thử hương vị ẩm thực địa phương gia truyền tươi ngon đậm đà.',
              location: destination,
              costVnd: 200000,
              costLabel: '200.000đ / nhóm',
              photoUrl: '/images/saigon_south_day.jpg',
              transferTimeAfter: 'Di chuyển khoảng 15 phút',
            },
            {
              id: `act-fb-${d}-3`,
              timeSlot: 'AFTERNOON',
              timeRange: '14:30–17:00',
              category: 'Biển & nghỉ dưỡng',
              title: `Trải nghiệm thư giãn & Check-in tại ${destination}`,
              description: 'Tận hưởng khoảnh khắc hoàng hôn và khám phá nhịp sống người dân bản địa.',
              location: destination,
              costVnd: 100000,
              costLabel: '100.000đ / nhóm',
              photoUrl: '/images/halong_hanoi_day.jpg',
              transferTimeAfter: 'Di chuyển khoảng 20 phút',
            },
            {
              id: `act-fb-${d}-4`,
              timeSlot: 'EVENING',
              timeRange: '18:30–21:00',
              category: 'Khám phá buổi tối',
              title: `Dạo phố đêm, chợ đêm & ẩm thực đường phố`,
              description: 'Hòa mình vào không khí sầm uất về đêm và chọn mua quà lưu niệm thủ công.',
              location: destination,
              costVnd: 350000,
              costLabel: '350.000đ / nhóm',
              photoUrl: '/images/danang_bana_night.jpg',
            },
          ],
        });
      }
      setItineraryDays(fallbackDays);
      setActiveDay(1);
      setHasPlanGenerated(true);
      triggerToast(`Đã tạo lịch trình thành công cho ${destination}!`);
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
      triggerToast(`Đã lưu lịch trình "${destination}" vào bộ sưu tập cá nhân.`);
    } catch {
      setIsSaved(true);
      triggerToast('Đã lưu lịch trình thành công.');
    }
  };

  // ─── CREATE REAL GROUP TRIP ───────────────────────────────────────────────
  const handleCreateTripSubmit = () => {
    const newTrip = {
      id: `trip-${Date.now()}`,
      title: newTripTitle || `Chuyến đi ${destination} ${daysCount} ngày`,
      destination,
      startDate,
      endDate: `16/11/2026`,
      status: 'PLANNING',
      budgetTotal: totalEstimatedCost,
      budgetSpent: 0,
      visibility: newTripVisibility,
      members: [
        { name: 'Hoàng An (Bạn)', avatar: 'HA', role: 'Trưởng nhóm' },
      ],
      image: activeDestObj.photo,
      itineraryDays,
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
    triggerToast('Tạo chuyến đi nhóm thành công! Đang chuyển đến không gian quản lý…');
    setTimeout(() => {
      router.push('/trips');
    }, 1200);
  };

  // ─── REPLACE ACTIVITY HANDLER ─────────────────────────────────────────────
  const handleSelectReplacement = (place: (typeof REPLACEMENT_PLACES)[0]) => {
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

              {/* Destination Dropdown */}
              {showDestDropdown && (
                <div className={styles.destinationDropdown}>
                  {filteredDestinations.map((d) => (
                    <div
                      key={d.id}
                      className={`${styles.destinationItem} ${destination === d.nameVi ? styles.destinationItemActive : ''}`}
                      onClick={() => {
                        const chosen = d.nameVi;
                        setDestination(chosen);
                        setShowDestDropdown(false);
                        if (d.id === 'phuquoc' || chosen === 'Phú Quốc') {
                          setItineraryDays(INITIAL_PHUQUOC_DAYS);
                          setActiveDay(1);
                          setNewTripTitle(`Chuyến đi Phú Quốc ${daysCount} ngày`);
                          triggerToast('Đã tải lịch trình thông minh cho Phú Quốc!');
                        } else if (d.id === 'danang' || chosen === 'Đà Nẵng') {
                          setItineraryDays(INITIAL_DANANG_DAYS);
                          setActiveDay(1);
                          setNewTripTitle(`Chuyến đi Đà Nẵng ${daysCount} ngày`);
                          triggerToast('Đã tải lịch trình thông minh cho Đà Nẵng!');
                        } else {
                          markDirty();
                        }
                      }}
                    >
                      <span>{d.nameVi}</span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>{d.province}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Ngày khởi hành */}
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
                  type="text"
                  className={styles.dateInput}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    markDirty();
                  }}
                  placeholder="dd/mm/yyyy"
                />
              </div>
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

          {/* GROUP B — PHONG CÁCH CHUYẾN ĐI */}
          <div className={styles.formGroup}>
            <div className={styles.groupTitle}>Nhóm B — Phong cách chuyến đi</div>
            <label className={styles.fieldLabel} style={{ marginBottom: '2px' }}>
              Bạn thích trải nghiệm gì?
            </label>
            <p className={styles.fieldSubLabel}>Có thể chọn nhiều sở thích.</p>

            <div className={styles.stylesGrid}>
              {TRAVEL_STYLES.map((st) => {
                const isSelected = selectedStyles.includes(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    className={`${styles.styleCard} ${isSelected ? styles.styleCardActive : ''}`}
                    onClick={() => toggleStyle(st.id)}
                  >
                    <div className={styles.styleCardIcon}>
                      {st.id === 'beach' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12c3-3 6-3 9 0s6 3 9 0"/><path d="M2 17c3-3 6-3 9 0s6 3 9 0"/></svg>
                      )}
                      {st.id === 'culture' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
                      )}
                      {st.id === 'cuisine' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                      )}
                      {st.id === 'nature' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 19l4-15 4 15"/><path d="M5 19h14"/></svg>
                      )}
                      {st.id === 'entertainment' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>
                      )}
                      {st.id === 'photo' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      )}
                    </div>
                    <span className={styles.styleCardText}>{st.label}</span>
                    {isSelected && (
                      <svg className={styles.styleCheckmark} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>{startDate} · {daysCount} ngày {Math.max(1, daysCount - 1)} đêm · {peopleCount} người</span>
                      </p>
                      <div className={styles.summaryTags}>
                        {selectedStyles.map((sId) => {
                          const found = TRAVEL_STYLES.find((t) => t.id === sId);
                          return (
                            <span key={sId} className={styles.tagPill}>
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

              {/* B. VIEW SWITCH BAR */}
              <div className={styles.viewSwitchBar}>
                <div className={styles.segmentedControl}>
                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${activeView === 'timeline' ? styles.segmentBtnActive : ''}`}
                    onClick={() => setActiveView('timeline')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    <span>Lịch trình</span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${activeView === 'map' ? styles.segmentBtnActive : ''}`}
                    onClick={() => setActiveView('map')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                    <span>Bản đồ</span>
                  </button>
                </div>

                <button
                  type="button"
                  className={styles.btnRegenerateSubtle}
                  onClick={handleGenerateClick}
                  title="Tạo lại gợi ý mới"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
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
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                  {act.location}
                                </span>

                                {act.tip && (
                                  <button
                                    type="button"
                                    className={styles.tipToggleBtn}
                                    onClick={() => setOpenTipId(isTipOpen ? null : act.id)}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
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
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                  <span>Thay địa điểm</span>
                                </button>

                                <div style={{ position: 'relative' }}>
                                  <button
                                    type="button"
                                    className={styles.btnOverflowMenu}
                                    onClick={() => setActiveOverflowId(isOverflowOpen ? null : act.id)}
                                    aria-label="Thao tác khác"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
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
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                        Chỉnh giờ
                                      </button>
                                      <button
                                        type="button"
                                        className={`${styles.overflowItem} ${styles.overflowItemDanger}`}
                                        onClick={() => handleDeleteActivity(act.id)}
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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

              {/* ─── 5. DYNAMIC MAP VIEW ─── */}
              {activeView === 'map' && (
                <div className={styles.mapViewContainer}>
                  <div className={styles.mapSvgWrapper}>
                    <svg
                      viewBox="0 0 900 600"
                      width="100%"
                      height="100%"
                      style={{ background: '#E0F2FE' }}
                      preserveAspectRatio="xMidYMid slice"
                    >
                      <path
                        d="M 0,0 L 260,0 C 270,120 300,180 340,240 C 370,280 430,320 460,400 C 490,480 520,540 560,600 L 0,600 Z"
                        fill="#F8FAFC"
                        stroke="#CBD5E1"
                        strokeWidth="2"
                      />

                      <path
                        d="M 330,130 C 370,80 470,70 520,110 C 560,140 550,210 500,240 C 450,260 380,240 340,200 Z"
                        fill="#E2E8F0"
                        stroke="#94A3B8"
                        strokeWidth="2"
                      />
                      <text x="380" y="150" fill="#64748B" fontSize="13" fontWeight="700">
                        Khu vực {destination}
                      </text>

                      <path
                        d="M 270,180 C 285,250 290,320 310,390 C 320,440 330,510 340,600"
                        fill="none"
                        stroke="#BAE6FD"
                        strokeWidth="14"
                        strokeLinecap="round"
                      />

                      <polyline
                        points="460,140 280,280 450,380 320,420"
                        fill="none"
                        stroke="#0088CC"
                        strokeWidth="3.5"
                        strokeDasharray="6 4"
                      />

                      {currentDayPlan.activities.map((act, idx) => {
                        const coords = [
                          { x: 460, y: 140, col: '#0088CC' },
                          { x: 280, y: 280, col: '#F59E0B' },
                          { x: 450, y: 380, col: '#149D83' },
                          { x: 320, y: 420, col: '#6366F1' },
                        ][idx % 4];

                        return (
                          <g
                            key={act.id}
                            transform={`translate(${coords.x}, ${coords.y})`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedMapPin(idx + 1)}
                          >
                            <circle r="18" fill={coords.col} stroke="#FFFFFF" strokeWidth="3" />
                            <text textAnchor="middle" dy="5" fill="#FFFFFF" fontSize="13" fontWeight="700">
                              {idx + 1}
                            </text>
                            <text x="24" y="5" fill="#14283F" fontSize="12" fontWeight="700">
                              {act.title.length > 24 ? act.title.substring(0, 24) + '…' : act.title}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

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
                            {currentDayPlan.activities[selectedMapPin - 1].timeRange}
                          </span>
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
                      <div className={styles.legendItem}>
                        <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#0088CC" strokeWidth="2.5" strokeDasharray="4 2" /></svg>
                        <span>Tuyến đi</span>
                      </div>
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
                <img src="/images/danang_bana_day.jpg" alt="Đà Nẵng" className={styles.alternativePhoto} />
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
                <img src="/images/vietnam_panoramic_day.jpg" alt="Hội An" className={styles.alternativePhoto} />
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
                <img src="/images/halong_hanoi_day.jpg" alt="Hà Nội" className={styles.alternativePhoto} />
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
              {REPLACEMENT_PLACES.map((place) => (
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
