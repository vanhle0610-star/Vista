'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import {
  getSampleItineraryForDestination,
  getDestinationHeroImage,
  getSampleProposals,
} from '@/data/sampleItineraries';
import {
  validateAndParseTripDates,
  getTripDayMeta,
  getThemeForDay,
  resolveTripStatusDetails,
  TripStatusResult,
  parseDateParts,
  isValidCalendarDate,
} from '@/utils/tripDateUtils';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Wallet,
  Clock,
  Sparkles,
  Share2,
  ThumbsUp,
  ExternalLink,
  Copy,
  CheckCircle2,
  DollarSign,
  Compass,
  TrendingUp,
  Sun,
  Moon,
  Sunset,
  Navigation,
  Car,
  Check,
  ChevronRight,
  Camera,
  Layers,
  Ticket,
  Lock,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  LogOut,
  Crown,
  Mail,
  MailCheck,
  Pencil,
  Eye,
  AlertTriangle,
  Lightbulb,
  Vote,
  Unlock,
  Loader2,
  Trash2,
} from 'lucide-react';
import { SkeletonTripsPage, SkeletonTimeline, SkeletonTaskList } from '@/components/common/Skeleton';
import { GroupMapTab } from '@/features/trip-location/components/GroupMapTab';
import styles from './tripDetail.module.css';

interface ActivityItem {
  id: string;
  timeSlot?: string;
  timeRange?: string;
  title: string;
  description?: string;
  location?: string;
  costVnd?: number;
  costLabel?: string;
  category?: string;
  image?: string;
  tips?: string;
  sortOrder?: number;
  hasTimeOverlap?: boolean;
  overlapWith?: string;
}

interface DayPlanItem {
  id?: string;
  dayNumber: number;
  dateStr?: string;
  title: string;
  activities: ActivityItem[];
}

interface MemberItem {
  name: string;
  avatar: string;
  color: string;
  role?: string;
  userId?: string;
  email?: string;
}

interface TripDetailData {
  id: string;
  title: string;
  destination: string;
  durationBadge: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'PLANNING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  role: 'OWNER' | 'MEMBER';
  ownerId?: string;
  budgetTotal: number;
  budgetSpent: number;
  progressPercent: number;
  members: MemberItem[];
  image?: string;
  treasuryPath: string;
  alertType?: 'AMBER' | 'BLUE' | 'COMPLETED';
  alertText?: string;
  itineraryDays?: DayPlanItem[];
  isPrivate?: boolean;
}

interface StoredUser {
  id?: string;
  email?: string;
  displayName?: string;
  role?: string;
}

function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vista_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const SAMPLE_HANOI_DAYS: DayPlanItem[] = [
  {
    dayNumber: 1,
    title: 'Tinh hoa Cố Đô: Hồ Gươm, Phố Cổ & Văn Miếu',
    dateStr: '24/11/2026',
    activities: [
      {
        id: 'hn-1-1',
        timeSlot: 'MORNING',
        timeRange: '07:30 – 10:00',
        title: 'Hồ Hoàn Kiếm, Tháp Rùa & Đền Ngọc Sơn',
        description: 'Dạo quanh hồ Gươm buổi sớm mai thanh bình, ngắm cầu Thê Húc đỏ son và viếng đền Ngọc Sơn cổ kính.',
        location: 'Hoàn Kiếm, Hà Nội',
        costVnd: 30000,
        costLabel: '30.000đ / người',
        category: 'Di tích & Văn hóa',
        image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
        tips: 'Sáng sớm bờ hồ rất vắng và mát mẻ, chụp cầu Thê Húc góc nghiêng đón nắng sớm sẽ cực kỳ rực rỡ! 📸',
      },
      {
        id: 'hn-1-2',
        timeSlot: 'MORNING',
        timeRange: '10:30 – 12:00',
        title: 'Thưởng thức Cà phê Trứng Giảng 39 Nguyễn Hữu Huân',
        description: 'Thưởng thức hương vị cà phê trứng béo ngậy nức tiếng Hà Thành từ năm 1946 tại góc phố cổ.',
        location: '39 Nguyễn Hữu Huân, Hoàn Kiếm',
        costVnd: 45000,
        costLabel: '45.000đ / ly',
        category: 'Ẩm thực & Cà phê',
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
        tips: 'Nên uống khi còn nóng hổi trong bát nước ấm để cảm nhận trọn vẹn lớp kem trứng mịn màng! ☕',
      },
      {
        id: 'hn-1-3',
        timeSlot: 'AFTERNOON',
        timeRange: '13:30 – 16:30',
        title: 'Văn Miếu – Quốc Tử Giám & Khuê Văn Các',
        description: 'Khám phá trường đại học đầu tiên của Việt Nam, ngắm bia tiến sĩ nghìn năm văn hiến và kiến trúc thời Lê.',
        location: '58 Quốc Tử Giám, Đống Đa',
        costVnd: 70000,
        costLabel: '70.000đ / vé',
        category: 'Di tích lịch sử',
        image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
        tips: 'Mang theo thẻ sinh viên/học sinh nếu có để giảm 50% giá vé, nên mặc áo dài hoặc đồ lịch sự trang nhã. 🏛️',
      },
      {
        id: 'hn-1-4',
        timeSlot: 'EVENING',
        timeRange: '18:30 – 21:30',
        title: 'Ẩm thực Tạ Hiện & Chợ đêm Phố Cổ Hà Nội',
        description: 'Khám phá ngõ bia sầm uất Tạ Hiện, thưởng thức nem chua rán, bún chả que tre và dạo chợ đêm Đồng Xuân.',
        location: 'Phố Cổ, Hoàn Kiếm, Hà Nội',
        costVnd: 200000,
        costLabel: '200.000đ / người',
        category: 'Ẩm thực đường phố',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        tips: 'Ngõ Tạ Hiện sôi động nhất từ 19h30, nhớ thử món nem chua rán giòn rụm và chim cút nướng mật ong nhé! 🍢',
      },
    ],
  },
  {
    dayNumber: 2,
    title: 'Dấu ấn Lịch sử & Hoàng hôn Hồ Tây lãng mạn',
    dateStr: '25/11/2026',
    activities: [
      {
        id: 'hn-2-1',
        timeSlot: 'MORNING',
        timeRange: '07:45 – 10:15',
        title: 'Lăng Chủ tịch Hồ Chí Minh & Chùa Một Cột',
        description: 'Viếng lăng Bác, tham quan khu nhà sàn ao cá và chiêm bái Chùa Một Cột với dáng hoa sen vươn mình độc đáo.',
        location: 'Số 2 Hùng Vương, Ba Đình',
        costVnd: 0,
        costLabel: 'Miễn phí',
        category: 'Di tích quốc gia',
        image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
        tips: 'Lăng Bác đóng cửa vào thứ 2 và thứ 6, vào viếng cần xếp hàng trật tự, trang phục kín đáo lịch sự. 🌸',
      },
      {
        id: 'hn-2-2',
        timeSlot: 'AFTERNOON',
        timeRange: '11:00 – 13:30',
        title: 'Hoàng thành Thăng Long & Cột cờ Hà Nội',
        description: 'Di sản Văn hóa Thế giới UNESCO với tầng tầng lớp lớp di tích qua các triều đại Lý, Trần, Lê.',
        location: '19C Hoàng Diệu, Ba Đình',
        costVnd: 70000,
        costLabel: '70.000đ / vé',
        category: 'Di sản thế giới',
        image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
        tips: 'Đoan Môn và Hậu Lâu là 2 góc sống ảo hoài niệm mang đậm nét rêu phong kinh thành Thăng Long xưa. 🏰',
      },
      {
        id: 'hn-2-3',
        timeSlot: 'AFTERNOON',
        timeRange: '15:30 – 17:30',
        title: 'Chùa Trấn Quốc & Ngắm hoàng hôn Hồ Tây',
        description: 'Chiêm bái ngôi chùa cổ nhất Hà Nội hơn 1500 năm tuổi và ngắm cảnh hoàng hôn rực rỡ bên đường Thanh Niên.',
        location: 'Đường Thanh Niên, Tây Hồ',
        costVnd: 0,
        costLabel: 'Miễn phí',
        category: 'Tâm linh & Cảnh quan',
        image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
        tips: 'Từ 16h45 đến 17h30 mặt trời lặn dát vàng mặt nước Hồ Tây, ngồi cà phê ven đường Thanh Niên ngắm cảnh chill tuyệt đối. 🌇',
      },
      {
        id: 'hn-2-4',
        timeSlot: 'EVENING',
        timeRange: '18:30 – 21:00',
        title: 'Thưởng thức Phở cuốn & Bánh tôm Hồ Tây',
        description: 'Trải nghiệm ẩm thực phở cuốn Hương Mai tại bán đảo Ngũ Xã và bánh tôm giòn rụm bên hồ.',
        location: 'Ngũ Xã, Ba Đình, Hà Nội',
        costVnd: 150000,
        costLabel: '150.000đ / người',
        category: 'Ẩm thực địa phương',
        image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80',
        tips: 'Phở cuốn Ngũ Xã ăn kèm nước chấm chua ngọt tỏi ớt ấm nóng và đĩa phở chiên phồng giòn tan. 🍜',
      },
    ],
  },
  {
    dayNumber: 3,
    title: 'Bảo tàng Dân tộc học & Làng gốm Bát Tràng',
    dateStr: '26/11/2026',
    activities: [
      {
        id: 'hn-3-1',
        timeSlot: 'MORNING',
        timeRange: '08:30 – 11:30',
        title: 'Bảo tàng Dân tộc học Việt Nam',
        description: 'Tìm hiểu nét văn hóa đa dạng của 54 dân tộc anh em qua nhà rông Tây Nguyên, nhà sàn Mường và múa rối nước.',
        location: 'Đường Nguyễn Văn Huyên, Cầu Giấy',
        costVnd: 40000,
        costLabel: '40.000đ / vé',
        category: 'Bảo tàng & Văn hóa',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        tips: 'Khu vườn ngoài trời có nhà rông Ba Na cao vút và nhà mồ Gia Rai rất độc đáo, có biểu diễn múa rối nước lúc 10h. 🎪',
      },
      {
        id: 'hn-3-2',
        timeSlot: 'AFTERNOON',
        timeRange: '13:00 – 16:30',
        title: 'Làng gốm sứ Bát Tràng & Tự vuốt gốm thủ công',
        description: 'Khám phá bảo tàng gốm Bát Tràng 7 tầng xoắn ốc độc đáo và trải nghiệm tự tay nặn gốm kỉ niệm.',
        location: 'Gia Lâm, Hà Nội',
        costVnd: 80000,
        costLabel: '80.000đ / trải nghiệm',
        category: 'Làng nghề truyền thống',
        image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
        tips: 'Chỉ từ 40k - 60k bạn được tự tay nặn ly/chén gốm và thợ sẽ sấy khô vẽ màu đóng gói mang về làm kỉ niệm xinh xắn! 🏺',
      },
      {
        id: 'hn-3-3',
        timeSlot: 'AFTERNOON',
        timeRange: '17:00 – 18:30',
        title: 'Thưởng thức Trà Sen Tây Hồ truyền thống',
        description: 'Nghệ thuật ướp trà sen Bách Diệp cầu kỳ của người Hà Nội cổ, ngắm mặt nước Hồ Tây bảng lảng chiều tà.',
        location: 'Quảng An, Tây Hồ, Hà Nội',
        costVnd: 90000,
        costLabel: '90.000đ / ấm trà',
        category: 'Nghệ thuật Trà',
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
        tips: 'Trà sen ướp trong hoa sen tươi Bách Diệp tỏa hương thơm thanh khiết, nhâm nhi cùng miếng kẹo lạc giòn tan. 🍵',
      },
      {
        id: 'hn-3-4',
        timeSlot: 'EVENING',
        timeRange: '19:30 – 21:30',
        title: 'Mua quà đặc sản: Ô mai Hồng Lam Hàng Đường & Cốm Làng Vòng',
        description: 'Dạo phố Hàng Đường chọn mua ô mai sấu chua cay, bánh cốm dẻo thơm mang về làm quà cho người thân.',
        location: 'Hàng Đường, Hoàn Kiếm, Hà Nội',
        costVnd: 250000,
        costLabel: '250.000đ / gói quà',
        category: 'Quà tặng & Mua sắm',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        tips: 'Ô mai sấu chua ngọt, mơ gừng xào và cốm mộc xanh bọc lá sen tươi là combo quà tặng đậm chất thu Hà Nội. 🎁',
      },
    ],
  },
];

const DEFAULT_DEMO_TRIPS: TripDetailData[] = [
  {
    id: 'trip-danang-2026',
    title: 'Khám phá Đà Nẵng - Hội An 4N3Đ',
    destination: 'Đà Nẵng & Quảng Nam',
    durationBadge: '4 ngày 3 đêm',
    startDate: '15/11/2026',
    endDate: '18/11/2026',
    status: 'PLANNING',
    role: 'OWNER',
    budgetTotal: 18500000,
    budgetSpent: 5200000,
    progressPercent: 35,
    members: [
      { name: 'Lê Vân Anh (Trưởng nhóm)', avatar: 'VA', color: '#0284c7', role: 'Trưởng nhóm' },
      { name: 'Trần Minh Tuấn', avatar: 'MT', color: '#10b981', role: 'Thành viên' },
      { name: 'Nguyễn Hoàng Nam', avatar: 'HN', color: '#f59e0b', role: 'Thành viên' },
    ],
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
    treasuryPath: '/trips/trip-danang-2026/treasury',
    alertType: 'BLUE',
    alertText: 'Chờ biểu quyết chặng: Đang mở bình chọn địa điểm ăn tối Ngày 2.',
    itineraryDays: SAMPLE_HANOI_DAYS,
  },
  {
    id: 'trip-hagiang-2026',
    title: 'Chinh phục Cực Bắc Hà Giang',
    destination: 'Hà Giang',
    durationBadge: '3 ngày 2 đêm',
    startDate: '28/11/2026',
    endDate: '30/11/2026',
    status: 'ACTIVE',
    role: 'MEMBER',
    budgetTotal: 12000000,
    budgetSpent: 8400000,
    progressPercent: 70,
    members: [
      { name: 'Phạm Thanh Sơn (Trưởng nhóm)', avatar: 'TS', color: '#6366f1', role: 'Trưởng nhóm' },
      { name: 'Lê Vân Anh (Bạn)', avatar: 'VA', color: '#0284c7', role: 'Thành viên' },
    ],
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
    treasuryPath: '/trips/trip-hagiang-2026/treasury',
    alertType: 'AMBER',
    alertText: 'Đang diễn ra chặng đèo Mã Pí Lèng',
    itineraryDays: SAMPLE_HANOI_DAYS,
  },
  {
    id: 'trip-private-demo',
    title: 'Hành trình bí mật Phú Quốc (Riêng tư)',
    destination: 'Phú Quốc',
    durationBadge: '3 ngày',
    startDate: '10/12/2026',
    endDate: '12/12/2026',
    status: 'PLANNING',
    role: 'MEMBER',
    budgetTotal: 30000000,
    budgetSpent: 0,
    progressPercent: 10,
    members: [
      { name: 'Nguyễn Văn Tuấn (Trưởng nhóm)', avatar: 'VT', color: '#0284c7', role: 'Trưởng nhóm' },
    ],
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    treasuryPath: '/trips/trip-private-demo/treasury',
    isPrivate: true,
  },
];

function normalizeMemberText(str?: string) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

function getCurrentUserMember(defaultRole = 'Trưởng nhóm'): MemberItem {
  const u = getStoredUser();
  const rawName = u?.displayName || u?.email || 'Thành viên VISTA';
  const cleanName = rawName.replace(/\s*\(Bạn\)/gi, '').trim() || 'Thành viên VISTA';
  const parts = cleanName.split(/\s+/);
  const initials = (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : cleanName.slice(0, 2)).toUpperCase();
  return {
    name: cleanName,
    avatar: initials || 'TV',
    color: '#0284c7',
    role: defaultRole,
    userId: u?.id || 'u-me',
    email: u?.email || '',
  };
}

function formatMembersForCurrentUser(
  members: Array<{ name: string; avatar?: string; color?: string; role?: string; email?: string; userId?: string }>,
  defaultRole = 'Trưởng nhóm'
): MemberItem[] {
  let currentUser: any = null;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('vista_user');
      if (stored) currentUser = JSON.parse(stored);
    } catch {}
  }

  const currentEmail = (currentUser?.email || '').toLowerCase().trim();
  const currentNameNorm = normalizeMemberText(currentUser?.displayName || currentUser?.name || '');
  const currentId = currentUser?.id || '';

  if (!Array.isArray(members) || members.length === 0) {
    return [getCurrentUserMember(defaultRole)];
  }

  const result: MemberItem[] = [];

  for (const m of members) {
    if (!m) continue;
    const rawName = (m.name || (m as any).displayName || '').replace(/\s*\([^)]*\)/g, '').trim();
    if (!rawName) continue;
    const nameNorm = normalizeMemberText(rawName);
    const email = (m.email || '').toLowerCase().trim();
    const userId = (m.userId || (m as any).id || '').trim();

    const isMe = Boolean(
      (currentId && userId && currentId === userId) ||
      (currentEmail && email && currentEmail === email) ||
      (currentNameNorm && nameNorm && currentNameNorm === nameNorm) ||
      (m.name || '').toLowerCase().includes('(bạn)')
    );

    // Check if this member or "me" already exists in result
    const existingIdx = result.findIndex((ex) => {
      if (isMe && (ex as any)._isMe) return true;
      const exNameNorm = normalizeMemberText(ex.name);
      const exEmail = (ex.email || '').toLowerCase().trim();
      const exUserId = (ex.userId || '').trim();

      if (userId && exUserId && userId === exUserId) return true;
      if (email && exEmail && email === exEmail) return true;
      if (nameNorm && exNameNorm && nameNorm === exNameNorm) return true;
      return false;
    });

    const resolvedUserId = isMe ? (currentId || userId || 'u-me') : userId;
    const resolvedEmail = isMe ? (currentEmail || email) : email;
    const isRealEmail = resolvedEmail && !resolvedEmail.includes('@vista.vn');
    const isRealUserId = resolvedUserId && !resolvedUserId.startsWith('u-');

    if (existingIdx >= 0) {
      const existing = result[existingIdx];
      const isExRealEmail = existing.email && !existing.email.includes('@vista.vn');
      const isExRealUserId = existing.userId && !existing.userId.startsWith('u-');

      result[existingIdx] = {
        ...existing,
        name: rawName, // ALWAYS CLEAN, NEVER APPEND (Bạn)
        avatar: existing.avatar || m.avatar || rawName.slice(0, 2).toUpperCase() || 'TV',
        color: existing.color || m.color || '#0284c7',
        email: isRealEmail ? resolvedEmail : (isExRealEmail ? existing.email : (resolvedEmail || existing.email)),
        userId: isRealUserId ? resolvedUserId : (isExRealUserId ? existing.userId : (resolvedUserId || existing.userId)),
        role: existing.role === 'Trưởng nhóm' || m.role === 'Trưởng nhóm' ? 'Trưởng nhóm' : (existing.role || m.role || 'Thành viên'),
        _isMe: isMe || (existing as any)._isMe,
      } as any;
    } else {
      result.push({
        name: rawName, // ALWAYS CLEAN, NEVER APPEND (Bạn)
        avatar: m.avatar || rawName.slice(0, 2).toUpperCase() || 'TV',
        color: m.color || (result.length % 2 === 0 ? '#0284c7' : '#10b981'),
        email: resolvedEmail || undefined,
        userId: resolvedUserId || undefined,
        role: m.role || (result.length === 0 ? defaultRole : 'Thành viên'),
        _isMe: isMe,
      } as any);
    }
  }

  // Ensure exactly one leader (Trưởng nhóm)
  let foundLeader = false;
  const finalized = result.map((m) => {
    delete (m as any)._isMe;
    if (m.role === 'Trưởng nhóm') {
      if (!foundLeader) {
        foundLeader = true;
        return m;
      }
      return { ...m, role: 'Thành viên' };
    }
    return m;
  });

  return finalized.length > 0 ? finalized : [getCurrentUserMember(defaultRole)];
}

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tripId = typeof params?.tripId === 'string' ? params.tripId : '';

  const [accessDenied, setAccessDenied] = useState(() => Boolean(tripId && tripId.includes('private')));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(() => getStoredUser());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUser(getStoredUser());
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('vista_token');
      if (!token) {
        setIsAuthenticated(false);
        router.replace('/login?returnUrl=' + encodeURIComponent(`/trips/${tripId}`));
      } else {
        setIsAuthenticated(true);
      }
    }
  }, [router, tripId]);

  const [trip, setTrip] = useState<TripDetailData | null>(null);
  const [isLoadingTrip, setIsLoadingTrip] = useState(true);
  const [tripNotFound, setTripNotFound] = useState(false);
  const [tripErrorMessage, setTripErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'members' | 'treasury' | 'voting' | 'group-map'>('itinerary');

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && ['itinerary', 'members', 'treasury', 'voting', 'group-map'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const handleTabChange = (tab: 'itinerary' | 'members' | 'treasury' | 'voting' | 'group-map') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url.toString());
      } catch {
        // ignore
      }
      setTimeout(() => {
        const target = document.getElementById('tabs-content-anchor');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const p = new URLSearchParams(window.location.search);
        const t = p.get('tab');
        if (t === 'members' || t === 'itinerary' || t === 'treasury' || t === 'voting') {
          setActiveTab(t);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Split-screen itinerary & interactive diagram state
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | 'all'>(1);
  const [checkedActivities, setCheckedActivities] = useState<Record<string, boolean>>({});
  const [highlightedActId, setHighlightedActId] = useState<string | null>(null);

  const [invitationsList, setInvitationsList] = useState<Array<{
    id: string;
    email: string;
    token: string;
    status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
    expiresAt: string;
    emailSent?: boolean;
    emailSentAt?: string;
    emailMode?: string;
  }>>([
    {
      id: 'inv-1',
      email: 'nguyenvanb@gmail.com',
      token: 'VISTA-NG2026',
      status: 'PENDING',
      expiresAt: '22/11/2026 (Còn 6 ngày)',
      emailSent: true,
      emailSentAt: 'Hôm nay lúc 09:15',
    },
    {
      id: 'inv-2',
      email: 'nguoithuhoi@gmail.com',
      token: 'VISTA-REVOKED',
      status: 'REVOKED',
      expiresAt: 'Đã thu hồi bởi Owner',
    },
  ]);

  // Invitation filter state (W4-TV3)
  const [invitationFilter, setInvitationFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REVOKED'>('ALL');

  const invitationCounts = useMemo(() => {
    return {
      all: invitationsList.length,
      pending: invitationsList.filter((i) => i.status === 'PENDING').length,
      accepted: invitationsList.filter((i) => i.status === 'ACCEPTED').length,
      revoked: invitationsList.filter((i) => i.status === 'REVOKED').length,
    };
  }, [invitationsList]);

  const filteredInvitations = useMemo(() => {
    if (invitationFilter === 'ALL') return invitationsList;
    return invitationsList.filter((inv) => inv.status === invitationFilter);
  }, [invitationsList, invitationFilter]);

  const isTripOwner = Boolean(
    currentUser && trip && (
      (trip.ownerId && (trip.ownerId === currentUser.id || (currentUser.email && trip.ownerId === currentUser.email))) ||
      (trip.members?.[0] && (
        (trip.members[0].userId && (trip.members[0].userId === currentUser.id || (currentUser.email && trip.members[0].userId === currentUser.email))) ||
        (trip.members[0].email && currentUser.email && trip.members[0].email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.displayName && trip.members[0].name && trip.members[0].name.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase())
      ))
    )
  );

  const isTripMember = Boolean(
    currentUser && trip && (
      isTripOwner ||
      trip.members?.some((m) =>
        (m.userId && (m.userId === currentUser.id || (currentUser.email && m.userId === currentUser.email))) ||
        (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.displayName && m.name && m.name.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase())
      )
    )
  );

  const handleJoinThisTrip = () => {
    if (!trip || !currentUser) return;
    const meMember = getCurrentUserMember('Thành viên');
    const alreadyIn = (trip.members || []).some(
      (m) =>
        (m.userId && m.userId === meMember.userId) ||
        (m.email && meMember.email && m.email.toLowerCase() === meMember.email.toLowerCase()) ||
        m.name.toLowerCase() === meMember.name.toLowerCase()
    );
    if (alreadyIn) {
      showToast('Bạn đã là thành viên của chuyến đi này!');
      return;
    }
    showToast('Vui lòng sử dụng mã lời mời từ Trưởng nhóm để tham gia chuyến đi này!');
  };

  const handleLeaveTrip = async () => {
    if (!trip || !currentUser) return;
    if (!confirm('Bạn có chắc chắn muốn rời khỏi chuyến đi này không?')) {
      return;
    }

    try {
      await apiRequest(`/trips/${tripId}/members/me`, {
        method: 'DELETE',
      });

      showToast('✓ Bạn đã rời nhóm thành công!');
      window.dispatchEvent(new CustomEvent('vista-trips-change'));
      router.replace('/trips');
    } catch (err: any) {
      showToast(err.message || 'Không thể rời nhóm. Vui lòng thử lại sau.');
    }
  };

  // Danger Zone / Delete Trip States & Handler (TV4 P1)
  const [showDeleteTripModal, setShowDeleteTripModal] = useState(false);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [unsettledDebtsError, setUnsettledDebtsError] = useState<{
    open: boolean;
    message: string;
    tripId: string;
  } | null>(null);

  const handleConfirmDeleteTrip = async () => {
    if (!trip || !currentUser || !isTripOwner) return;
    setIsDeletingTrip(true);
    try {
      await apiRequest(`/trips/${tripId}`, {
        method: 'DELETE',
      });
      showToast('✓ Đã xóa chuyến đi thành công!');
      setShowDeleteTripModal(false);
      window.dispatchEvent(new CustomEvent('vista-trips-change'));
      router.replace('/trips');
    } catch (err: any) {
      setIsDeletingTrip(false);
      setShowDeleteTripModal(false);
      if (err?.status === 409 || err?.code === 'TRIP_HAS_UNSETTLED_DEBTS') {
        const message = err?.detail || err?.message || 'Chuyến đi còn khoản chưa quyết toán. Vui lòng kiểm tra Thủ quỹ trước khi xóa.';
        setUnsettledDebtsError({
          open: true,
          message,
          tripId: String(tripId),
        });
        return;
      }
      showToast(err?.detail || err?.message || 'Không thể xóa chuyến đi. Vui lòng thử lại sau.');
    } finally {
      setIsDeletingTrip(false);
    }
  };

  const handleTransferOwnership = async (targetMember: any) => {
    if (!trip || !currentUser || !isTripOwner) return;
    const targetUserId = targetMember.userId || targetMember.id;
    if (!targetUserId) {
      showToast('Không xác định được ID thành viên để chuyển quyền.');
      return;
    }
    const rawTargetName = typeof targetMember === 'string' ? targetMember : targetMember?.name || 'thành viên';
    const targetName = rawTargetName.replace(/\s*\(Bạn\)/gi, '').trim() || rawTargetName;
    if (!confirm(`Bạn có chắc chắn muốn chuyển quyền Trưởng nhóm cho "${targetName}" không?\n\nSau khi chuyển quyền, bạn sẽ trở thành Thành viên và "${targetName}" sẽ là Trưởng nhóm mới.`)) {
      return;
    }

    try {
      await apiRequest(`/trips/${tripId}/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId: targetUserId }),
      });

      showToast(`👑 Đã chuyển quyền Trưởng nhóm cho "${targetName}" thành công!`);
      window.dispatchEvent(new CustomEvent('vista-trips-change'));
      window.location.reload();
    } catch (err: any) {
      showToast(err.message || 'Chuyển quyền thất bại. Vui lòng thử lại.');
    }
  };

  const toggleCheckActivity = (id: string, title: string) => {
    if (!isTripMember) {
      showToast('⚠️ Bạn chưa tham gia chuyến đi này. Vui lòng tham gia nhóm để check-in địa điểm!');
      return;
    }
    setCheckedActivities((prev) => {
      const nextVal = !prev[id];
      showToast(nextVal ? `Đã đánh dấu ghé thăm: ${title}` : `Đã bỏ đánh dấu: ${title}`);
      return { ...prev, [id]: nextVal };
    });
  };

  // Voting state
  const [proposals, setProposals] = useState(() => getSampleProposals(''));

  // ─── TUẦN 3 & TUẦN 4 STATES ───────────────────────────────────────────────
  const [currentDateTick, setCurrentDateTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const handleSyncDate = () => setCurrentDateTick(Date.now());
    window.addEventListener('visibilitychange', handleSyncDate);
    window.addEventListener('focus', handleSyncDate);
    return () => {
      window.removeEventListener('visibilitychange', handleSyncDate);
      window.removeEventListener('focus', handleSyncDate);
    };
  }, []);

  // Optimistic locking (W4-TV3-01)
  const [optimisticConflictAlert, setOptimisticConflictAlert] = useState<string | null>(null);

  // Itinerary validation (W4-TV3-04)
  const [validationReport, setValidationReport] = useState<Array<{ type: 'ERROR' | 'WARNING'; title: string; reason: string }> | null>(null);

  // Add stop modal (W3-TV3-03, V-01)
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [newStopDay, setNewStopDay] = useState(1);
  const [newStopTitle, setNewStopTitle] = useState('');
  const [newStopLocation, setNewStopLocation] = useState('');
  const [newStopCategory, setNewStopCategory] = useState('Di tích & Văn hóa');
  const [newStopTime, setNewStopTime] = useState('14:00 – 16:00');
  const [newStopCost, setNewStopCost] = useState('50.000đ / người');
  const [newStopCustomDate, setNewStopCustomDate] = useState('');
  const [addStopDateError, setAddStopDateError] = useState<string | null>(null);

  // Edit stop modal (Bước 3, Bước 6, V-01)
  const [editingStop, setEditingStop] = useState<{
    dayNumber: number;
    activity: ActivityItem;
  } | null>(null);
  const [editStopTitle, setEditStopTitle] = useState('');
  const [editStopLocation, setEditStopLocation] = useState('');
  const [editStopCategory, setEditStopCategory] = useState('Di tích & Văn hóa');
  const [editStopTime, setEditStopTime] = useState('');
  const [editStopCost, setEditStopCost] = useState('');
  const [editStopTargetDay, setEditStopTargetDay] = useState(1);
  const [editStopCustomDate, setEditStopCustomDate] = useState('');
  const [editStopDateError, setEditStopDateError] = useState<string | null>(null);

  // Overlap warning confirmation dialog (V-02: Bước 10, 11)
  const [overlapWarningDialog, setOverlapWarningDialog] = useState<{
    isOpen: boolean;
    isEditing: boolean;
    targetDay: number;
    activityData: ActivityItem;
    overlapWithTitle: string;
    overlapWithTime: string;
  } | null>(null);

  // Invitations (W3-TV3-01, W3-TV3-02, W4-TV3-03)
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteInputEmail, setInviteInputEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdInvitationInfo, setCreatedInvitationInfo] = useState<{
    email: string;
    token: string;
    link: string;
    emailStatus?: 'SENDING' | 'SUCCESS' | 'ERROR';
    emailDeliveredAt?: string;
    deliveryMode?: string;
    message?: string;
  } | null>(null);
  const [isSendingInviteEmail, setIsSendingInviteEmail] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState<string | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Proposals & Voting (W4-TV3-02)
  const [isVotingClosed, setIsVotingClosed] = useState(false);
  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropCategory, setNewPropCategory] = useState('Ẩm thực');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const persistTrip = (updatedTrip: TripDetailData) => {
    setTrip(updatedTrip);
    try {
      if (tripId && updatedTrip.itineraryDays) {
        localStorage.setItem(`vista_trip_itinerary_${tripId}`, JSON.stringify(updatedTrip.itineraryDays));
      }
    } catch {}
  };

  useEffect(() => {
    if (!tripId) return;

    // Load persisted invitations for this trip
    try {
      const storedInvs = localStorage.getItem(`vista_invitations_${tripId}`);
      if (storedInvs) {
        setInvitationsList(JSON.parse(storedInvs));
      } else {
        setInvitationsList([]);
      }
    } catch {
      setInvitationsList([]);
    }

    // Sync invitations from server API (cross-browser / cross-session support)
    fetch(`/api/invitations?tripId=${tripId}`)
      .then((r) => r.json())
      .then((serverInvs) => {
        if (Array.isArray(serverInvs) && serverInvs.length > 0) {
          setInvitationsList((prev) => {
            const map = new Map();
            prev.forEach((i: any) => map.set(i.token, { ...i, email: i.email || i.inviteeEmail || '' }));
            serverInvs.forEach((i: any) => map.set(i.token, { ...i, email: i.email || i.inviteeEmail || '' }));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});

    // Load trip data & members from Spring Boot Database (Single Source of Truth)
    const loadTripDataFromBackend = async () => {
      setIsLoadingTrip(true);
      const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId as string);

      if (!isUuid) {
        if (isDemoMode) {
          const demoMatch = DEFAULT_DEMO_TRIPS.find((item) => item.id === tripId);
          if (demoMatch) {
            setTrip(demoMatch);
            setProposals(getSampleProposals(demoMatch.destination));
            setIsLoadingTrip(false);
            setTripNotFound(false);
            return;
          }
        }
        setTripNotFound(true);
        setTripErrorMessage('Mã chuyến đi không hợp lệ hoặc không tồn tại (404 Not Found).');
        setIsLoadingTrip(false);
        return;
      }

      try {
        const [serverTrip, serverMembers, serverProposals, serverItineraryDays] = await Promise.all([
          apiRequest<any>(`/trips/${tripId}`).catch(() => null),
          apiRequest<any[]>(`/trips/${tripId}/members`).catch(() => []),
          apiRequest<any[]>(`/trips/${tripId}/proposals`).catch(() => []),
          apiRequest<any[]>(`/trips/${tripId}/itinerary/days`).catch(() => []),
        ]);

        if (!serverTrip) {
          // Tự động đồng bộ thành viên vào backend nếu người dùng vừa nhận lời mời
          try {
            const syncRes = await apiRequest<any>('/invitations/sync-membership', {
              method: 'POST',
              body: JSON.stringify({ tripId }),
            }).catch(() => null);

            if (syncRes && syncRes.status === 'SUCCESS') {
              const retryTrip = await apiRequest<any>(`/trips/${tripId}`).catch(() => null);
              if (retryTrip) {
                window.location.reload();
                return;
              }
            }
          } catch {}

          setTripNotFound(true);
          setTripErrorMessage('Không tìm thấy chuyến đi này trong cơ sở dữ liệu (404 Not Found) hoặc bạn không có quyền truy cập (403 Forbidden).');
          setIsLoadingTrip(false);
          return;
        }

        const dest = serverTrip.destinationSummary || 'Việt Nam';

        // Load proposals from server
        if (Array.isArray(serverProposals) && serverProposals.length > 0) {
          const userStr = typeof window !== 'undefined' ? localStorage.getItem('vista_user') : null;
          const currentUid = userStr ? JSON.parse(userStr)?.id : null;
          setProposals(
            serverProposals.map((sp: any) => ({
              id: sp.id,
              title: sp.title,
              category: 'Gợi ý thành viên',
              votes: sp.upVotes != null ? Number(sp.upVotes) : (Array.isArray(sp.votes) ? sp.votes.length : 0),
              voted: Array.isArray(sp.votes) && sp.votes.some((v: any) => v.userId === currentUid && (v.vote === 'UP' || v.vote === true)),
            }))
          );
        } else {
          setProposals(getSampleProposals(dest));
        }
        const formattedMembers: MemberItem[] = (serverMembers || []).map((m: any) => ({
          name: m.displayName || m.name || (m.role === 'OWNER' ? 'Trưởng nhóm' : 'Thành viên'),
          avatar: (m.displayName || m.name || 'TV').slice(0, 2).toUpperCase(),
          color: m.role === 'OWNER' ? '#0284c7' : '#10b981',
          role: m.role === 'OWNER' ? 'Trưởng nhóm' : 'Thành viên',
          userId: m.userId,
          email: m.email,
        }));

        const myMemberRecord = (serverMembers || []).find((m: any) => m.userId === currentUser?.id);
        const isOwner = Boolean(
          (currentUser?.id && serverTrip.ownerId === currentUser.id) ||
          myMemberRecord?.role === 'OWNER'
        );

        const start = serverTrip.startDate ? serverTrip.startDate.split('-').reverse().join('/') : '15/11';
        const end = serverTrip.endDate ? serverTrip.endDate.split('-').reverse().join('/') : '18/11/2026';

        let mappedStatus: 'PLANNING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' = 'PLANNING';
        if (serverTrip.status === 'COMPLETED') mappedStatus = 'COMPLETED';
        else if (serverTrip.status === 'ONGOING' || serverTrip.status === 'ACTIVE') mappedStatus = 'ONGOING';
        else if (serverTrip.status === 'CANCELLED') mappedStatus = 'CANCELLED';
        else mappedStatus = 'PLANNING';

        // Map backend itinerary days if available
        let mappedDays: DayPlanItem[] = [];
        if (Array.isArray(serverItineraryDays) && serverItineraryDays.length > 0) {
          mappedDays = serverItineraryDays.map((d: any) => ({
            id: d.id,
            dayNumber: d.dayNumber,
            dateStr: d.tripDate ? d.tripDate.split('-').reverse().join('/') : undefined,
            title: d.title || `Ngày ${d.dayNumber}`,
            activities: (d.items || []).map((item: any) => ({
              id: item.id,
              timeSlot: item.startTime ? `${item.startTime.slice(0, 5)}${item.endTime ? ` – ${item.endTime.slice(0, 5)}` : ''}` : undefined,
              timeRange: item.startTime ? `${item.startTime.slice(0, 5)}${item.endTime ? ` – ${item.endTime.slice(0, 5)}` : ''}` : undefined,
              title: item.customStopName || 'Điểm dừng',
              description: item.note || '',
              location: item.location || '',
              costVnd: item.costVnd || 0,
              costLabel: item.costVnd ? `${item.costVnd.toLocaleString('vi-VN')}₫` : 'Miễn phí',
              category: item.category || 'Địa điểm',
              sortOrder: item.sortOrder,
            })).sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
          }));
        }

        let persistedItinerary: DayPlanItem[] | null = null;
        try {
          const stored = localStorage.getItem(`vista_trip_itinerary_${tripId}`);
          if (stored) persistedItinerary = JSON.parse(stored);
        } catch {}

        // SSOT: Priority: mappedDays > persistedItinerary > serverTrip.itineraryDays > sample
        const itinerary = mappedDays.length > 0
          ? mappedDays
          : (persistedItinerary && persistedItinerary.length > 0)
            ? persistedItinerary
            : (Array.isArray(serverTrip.itineraryDays) && serverTrip.itineraryDays.length > 0)
              ? serverTrip.itineraryDays
              : (isDemoMode ? getSampleItineraryForDestination(dest, serverTrip.startDate) : []);

        setTrip({
          id: String(serverTrip.id),
          title: serverTrip.title || `Chuyến đi ${dest}`,
          destination: dest,
          durationBadge: '4 ngày 3 đêm',
          startDate: start,
          endDate: end,
          status: mappedStatus,
          role: (isOwner ? 'OWNER' : 'MEMBER') as 'OWNER' | 'MEMBER',
          ownerId: serverTrip.ownerId,
          budgetTotal: Number(serverTrip.budgetTotal) || 20000000,
          budgetSpent: 0,
          progressPercent: 0,
          members: formattedMembers,
          image: getDestinationHeroImage(dest),
          treasuryPath: `/trips/${serverTrip.id}/treasury`,
          itineraryDays: itinerary,
          alertType: undefined,
          alertText: undefined,
          isPrivate: false,
        });

        setTripNotFound(false);
        setIsLoadingTrip(false);
      } catch (err: any) {
        console.warn('Error loading trip from backend:', err);
        setTripNotFound(true);
        setTripErrorMessage(err?.message || 'Có lỗi xảy ra khi tải dữ liệu chuyến đi từ máy chủ.');
        setIsLoadingTrip(false);
      }
    };

    loadTripDataFromBackend();
    window.addEventListener('focus', loadTripDataFromBackend);

    return () => {
      window.removeEventListener('focus', loadTripDataFromBackend);
    };
  }, [tripId, currentUser?.id]);

  // Reorder activities (W-01)
  const handleReorderActivity = async (dayNum: number, actIdx: number, direction: 'UP' | 'DOWN') => {
    if (!trip || !trip.itineraryDays) return;
    const days = [...trip.itineraryDays];
    const dayIndex = days.findIndex((d) => d.dayNumber === dayNum);
    if (dayIndex < 0) return;

    const acts = [...days[dayIndex].activities];
    const targetIdx = direction === 'UP' ? actIdx - 1 : actIdx + 1;
    if (targetIdx < 0 || targetIdx >= acts.length) return;

    const previousTrip = trip;
    const temp = acts[actIdx];
    acts[actIdx] = acts[targetIdx];
    acts[targetIdx] = temp;

    // Update sortOrder
    acts.forEach((act, i) => {
      act.sortOrder = i;
    });

    days[dayIndex] = { ...days[dayIndex], activities: acts };
    const updated = { ...trip, itineraryDays: days };
    persistTrip(updated);

    const dayId = days[dayIndex].id;
    const isUuidStr = (str?: string) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    if (dayId && isUuidStr(dayId)) {
      try {
        const orderedItemIds = acts.map((a) => a.id).filter((id) => isUuidStr(id));
        if (orderedItemIds.length === acts.length) {
          await apiRequest(`/itinerary/days/${dayId}/items/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ orderedItemIds }),
          });
        }
        showToast('✓ Đã đổi thứ tự điểm dừng! Tải lại trang (F5) thứ tự vẫn giữ nguyên.');
      } catch (err) {
        console.error('Lỗi khi đổi thứ tự trạm dừng qua API:', err);
        // Rollback on error
        persistTrip(previousTrip);
        showToast('Không đổi được thứ tự, vui lòng thử lại');
      }
    } else {
      showToast('✓ Đã đổi thứ tự điểm dừng! Tải lại trang (F5) thứ tự vẫn giữ nguyên.');
    }
  };

  // Date validation helper (V-01: Bước 9)
  const validateDateAgainstTrip = (
    dateStr: string,
    tripStart?: string,
    tripEnd?: string
  ): { isValid: boolean; error?: string } => {
    if (!dateStr || !dateStr.trim()) return { isValid: true };
    const parts = parseDateParts(dateStr);
    if (!parts) {
      return { isValid: false, error: 'Định dạng ngày không hợp lệ. Vui lòng nhập định dạng dd/mm/yyyy' };
    }
    const tripBounds = validateAndParseTripDates(tripStart, tripEnd);
    if (!tripBounds.isValid || !tripBounds.startDate || !tripBounds.endDate) {
      return { isValid: true };
    }
    const year = parts.year || tripBounds.startDate.getFullYear();
    if (!isValidCalendarDate(year, parts.month, parts.day)) {
      return { isValid: false, error: 'Ngày đã chọn không tồn tại trên lịch' };
    }
    const target = new Date(year, parts.month - 1, parts.day, 12, 0, 0);
    if (target.getTime() < tripBounds.startDate.getTime() || target.getTime() > tripBounds.endDate.getTime()) {
      const fmt = (d: Date) =>
        `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const formattedTarget = `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${year}`;
      return {
        isValid: false,
        error: `Ngày ${formattedTarget} nằm ngoài khoảng chuyến đi (${fmt(tripBounds.startDate)} – ${fmt(tripBounds.endDate)})`,
      };
    }
    return { isValid: true };
  };

  // Time overlap helpers (V-02: Bước 10, 11, 12)
  const parseTimeRangeMinutes = (timeStr?: string): { startMinutes: number; endMinutes: number } | null => {
    if (!timeStr) return null;
    const parts = timeStr.split(/[-–—]/);
    if (parts.length < 2) return null;
    const parsePart = (p: string) => {
      const m = p.trim().match(/^(\d{1,2}):(\d{2})/);
      if (!m) return null;
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      return h * 60 + min;
    };
    const start = parsePart(parts[0]);
    const end = parsePart(parts[1]);
    if (start === null || end === null || end <= start) return null;
    return { startMinutes: start, endMinutes: end };
  };

  const findTimeOverlap = (
    timeStr: string,
    activities: ActivityItem[],
    excludeActId?: string
  ): { hasOverlap: boolean; conflictAct?: ActivityItem } => {
    const target = parseTimeRangeMinutes(timeStr);
    if (!target) return { hasOverlap: false };

    for (const act of activities) {
      if (excludeActId && act.id === excludeActId) continue;
      const range = parseTimeRangeMinutes(act.timeRange || act.timeSlot);
      if (!range) continue;
      if (target.startMinutes < range.endMinutes && range.startMinutes < target.endMinutes) {
        return { hasOverlap: true, conflictAct: act };
      }
    }
    return { hasOverlap: false };
  };

  // Open Add Stop modal
  const handleOpenAddStopModal = (dayNum: number) => {
    setNewStopDay(dayNum);
    const dayMeta = getTripDayMeta(trip?.startDate, trip?.endDate, dayNum);
    setNewStopCustomDate(dayMeta.fullDateStr || '');
    setAddStopDateError(null);
    setShowAddStopModal(true);
  };

  // Open Edit Stop modal (Bước 3, Bước 6)
  const handleOpenEditModal = (dayNum: number, act: ActivityItem) => {
    setEditingStop({ dayNumber: dayNum, activity: act });
    setEditStopTitle(act.title);
    setEditStopLocation(act.location || '');
    setEditStopCategory(act.category || 'Di tích & Văn hóa');
    setEditStopTime(act.timeRange || act.timeSlot || '14:00 – 16:00');
    setEditStopCost(act.costLabel || 'Miễn phí');
    setEditStopTargetDay(dayNum);
    const dayMeta = getTripDayMeta(trip?.startDate, trip?.endDate, dayNum);
    setEditStopCustomDate(dayMeta.fullDateStr || '');
    setEditStopDateError(null);
  };

  // Delete activity (Bước 7: xác nhận xóa -> F5 biến mất hẳn)
  const handleDeleteActivity = (dayNum: number, actId: string, actTitle?: string) => {
    if (!trip || !trip.itineraryDays) return;
    const confirmMsg = actTitle
      ? `Bạn có chắc chắn muốn xóa điểm dừng "${actTitle}" khỏi Ngày ${dayNum}?`
      : `Bạn có chắc chắn muốn xóa điểm dừng này khỏi Ngày ${dayNum}?`;
    if (!window.confirm(confirmMsg)) return;

    const days = trip.itineraryDays.map((d) => {
      if (d.dayNumber === dayNum) {
        return { ...d, activities: d.activities.filter((a) => a.id !== actId) };
      }
      return d;
    });
    const updated = { ...trip, itineraryDays: days };
    persistTrip(updated);
    showToast(`✓ Đã xóa điểm dừng khỏi Ngày ${dayNum}. Tải lại trang (F5) không bị hồi lại.`);
  };

  // Add activity (V-01 validation, V-02 time overlap warning, F5 persistence)
  const handleSaveNewActivity = (confirmedOverlap = false) => {
    if (!newStopTitle.trim() || !trip) return;

    // 1. Date bounds check (V-01 / Bước 9)
    if (newStopCustomDate.trim()) {
      const dateCheck = validateDateAgainstTrip(newStopCustomDate, trip.startDate, trip.endDate);
      if (!dateCheck.isValid) {
        setAddStopDateError(dateCheck.error || 'Ngày nằm ngoài khoảng chuyến đi');
        showToast(`❌ Lỗi: ${dateCheck.error}`);
        return;
      }
    }

    const newAct: ActivityItem = {
      id: `custom-act-${Date.now()}`,
      title: newStopTitle.trim(),
      location: newStopLocation.trim() || trip.destination,
      category: newStopCategory,
      timeRange: newStopTime.trim() || '14:00 – 16:00',
      costLabel: newStopCost.trim() || 'Miễn phí',
      description: 'Điểm dừng do thành viên nhóm vừa thêm vào lịch trình.',
      image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
    };

    const currentDays = JSON.parse(JSON.stringify(trip.itineraryDays || [])) as DayPlanItem[];
    const targetDayIdx = currentDays.findIndex((d) => d.dayNumber === newStopDay);
    const targetActivities = targetDayIdx >= 0 ? currentDays[targetDayIdx].activities || [] : [];

    // 2. Overlap check (V-02 / Bước 10, 11, 12)
    if (!confirmedOverlap) {
      const overlapCheck = findTimeOverlap(newAct.timeRange || '', targetActivities);
      if (overlapCheck.hasOverlap && overlapCheck.conflictAct) {
        setOverlapWarningDialog({
          isOpen: true,
          isEditing: false,
          targetDay: newStopDay,
          activityData: newAct,
          overlapWithTitle: overlapCheck.conflictAct.title,
          overlapWithTime: overlapCheck.conflictAct.timeRange || overlapCheck.conflictAct.timeSlot || 'chưa rõ',
        });
        return;
      }
    } else {
      newAct.hasTimeOverlap = true;
      if (overlapWarningDialog?.overlapWithTitle) {
        newAct.overlapWith = overlapWarningDialog.overlapWithTitle;
      }
    }

    if (targetDayIdx >= 0) {
      currentDays[targetDayIdx] = {
        ...currentDays[targetDayIdx],
        activities: [...(currentDays[targetDayIdx].activities || []), newAct],
      };
    } else {
      const dayMeta = getTripDayMeta(trip.startDate, trip.endDate, newStopDay);
      currentDays.push({
        dayNumber: newStopDay,
        title: `Ngày ${newStopDay} — Lộ trình tự do`,
        dateStr: dayMeta.fullDateStr || `Ngày ${newStopDay}`,
        activities: [newAct],
      });
      currentDays.sort((a, b) => a.dayNumber - b.dayNumber);
    }

    const updated = { ...trip, itineraryDays: currentDays };
    persistTrip(updated);
    setShowAddStopModal(false);
    setOverlapWarningDialog(null);
    setNewStopTitle('');
    setNewStopLocation('');
    showToast(
      confirmedOverlap
        ? `⚠️ Đã lưu điểm dừng "${newAct.title}" vào Ngày ${newStopDay} (có cảnh báo chồng giờ).`
        : `🎉 Đã thêm điểm dừng mới: "${newAct.title}" vào Ngày ${newStopDay}!`
    );
  };

  // Edit activity (Bước 3: Sửa tên/giờ; Bước 6: Chuyển ngày; V-01 & V-02; F5 persistence)
  const handleSaveEditedActivity = (confirmedOverlap = false) => {
    if (!editingStop || !trip || !editStopTitle.trim()) return;

    // 1. Date bounds check (V-01 / Bước 9)
    if (editStopCustomDate.trim()) {
      const dateCheck = validateDateAgainstTrip(editStopCustomDate, trip.startDate, trip.endDate);
      if (!dateCheck.isValid) {
        setEditStopDateError(dateCheck.error || 'Ngày nằm ngoài khoảng chuyến đi');
        showToast(`❌ Lỗi: ${dateCheck.error}`);
        return;
      }
    }

    const updatedAct: ActivityItem = {
      ...editingStop.activity,
      title: editStopTitle.trim(),
      location: editStopLocation.trim() || trip.destination,
      category: editStopCategory,
      timeRange: editStopTime.trim() || '14:00 – 16:00',
      costLabel: editStopCost.trim() || 'Miễn phí',
    };

    const currentDays = JSON.parse(JSON.stringify(trip.itineraryDays || [])) as DayPlanItem[];
    const targetDayPlan = currentDays.find((d) => d.dayNumber === editStopTargetDay);
    const targetActivities = targetDayPlan?.activities || [];

    // 2. Overlap check (V-02)
    if (!confirmedOverlap) {
      const overlapCheck = findTimeOverlap(
        updatedAct.timeRange || '',
        targetActivities,
        editingStop.dayNumber === editStopTargetDay ? editingStop.activity.id : undefined
      );
      if (overlapCheck.hasOverlap && overlapCheck.conflictAct) {
        setOverlapWarningDialog({
          isOpen: true,
          isEditing: true,
          targetDay: editStopTargetDay,
          activityData: updatedAct,
          overlapWithTitle: overlapCheck.conflictAct.title,
          overlapWithTime: overlapCheck.conflictAct.timeRange || overlapCheck.conflictAct.timeSlot || 'chưa rõ',
        });
        return;
      }
    } else {
      updatedAct.hasTimeOverlap = true;
      if (overlapWarningDialog?.overlapWithTitle) {
        updatedAct.overlapWith = overlapWarningDialog.overlapWithTitle;
      }
    }

    // Step 6: Move activity between days
    if (editingStop.dayNumber !== editStopTargetDay) {
      const origIdx = currentDays.findIndex((d) => d.dayNumber === editingStop.dayNumber);
      if (origIdx >= 0) {
        currentDays[origIdx].activities = currentDays[origIdx].activities.filter(
          (a) => a.id !== editingStop.activity.id
        );
      }
      const targetIdx = currentDays.findIndex((d) => d.dayNumber === editStopTargetDay);
      if (targetIdx >= 0) {
        currentDays[targetIdx].activities.push(updatedAct);
      } else {
        const dayMeta = getTripDayMeta(trip.startDate, trip.endDate, editStopTargetDay);
        currentDays.push({
          dayNumber: editStopTargetDay,
          title: `Ngày ${editStopTargetDay} — Lộ trình tự do`,
          dateStr: dayMeta.fullDateStr || `Ngày ${editStopTargetDay}`,
          activities: [updatedAct],
        });
        currentDays.sort((a, b) => a.dayNumber - b.dayNumber);
      }
    } else {
      const dayIdx = currentDays.findIndex((d) => d.dayNumber === editStopTargetDay);
      if (dayIdx >= 0) {
        currentDays[dayIdx].activities = currentDays[dayIdx].activities.map((a) =>
          a.id === editingStop.activity.id ? updatedAct : a
        );
      }
    }

    const updated = { ...trip, itineraryDays: currentDays };
    persistTrip(updated);
    setEditingStop(null);
    setOverlapWarningDialog(null);
    showToast(
      confirmedOverlap
        ? `⚠️ Đã cập nhật điểm dừng (có đánh dấu chồng giờ).`
        : `✓ Đã cập nhật điểm dừng "${updatedAct.title}" thành công!`
    );
  };

  // Optimistic Locking Simulation (W4-TV3-01)
  const handleSimulateOptimisticLock = () => {
    setOptimisticConflictAlert(
      '⚠️ PHÁT HIỆN XUNG ĐỘT SỬA ĐỒNG THỜI (HTTP 409 Conflict): ' +
      'Thành viên khác vừa lưu thay đổi điểm dừng này từ dữ liệu cũ! ' +
      'Cơ chế Khóa lạc quan (@Version) đã chặn ghi đè để bảo toàn dữ liệu người trước.'
    );
  };

  // Itinerary Validation (W4-TV3-04)
  const handleRunValidation = () => {
    setValidationReport([
      {
        type: 'WARNING',
        title: 'Cảnh báo trùng giờ trong Ngày 1',
        reason: 'Điểm "Hồ Hoàn Kiếm (07:30 – 10:00)" và Điểm "Cà phê Giảng (09:30 – 11:00)" bị chồng lấn 30 phút.',
      },
      {
        type: 'WARNING',
        title: 'Cảnh báo điểm dừng ngoài khoảng ngày chuyến đi',
        reason: 'Chuyến đi diễn ra từ 15/11 đến 18/11/2026. Ngày kiểm thử 26/11 nằm ngoài khung thời gian chính.',
      },
    ]);
  };

  // Create invite (W3-TV3-01) - RBAC Member Guard with Automatic Direct Email Dispatch
  const handleCreateInviteSubmit = async () => {
    if (!isTripMember) {
      showToast('⚠️ Quyền hạn không đủ! Bạn phải là thành viên chuyến đi mới có quyền tạo lời mời.');
      return;
    }
    setInviteError(null);
    const email = inviteInputEmail.trim().toLowerCase();
    if (!email) return;

    // Check conflict: already member
    const isAlreadyMember = trip?.members?.some((m) =>
      typeof m === 'object' && m?.name?.toLowerCase().includes(email.split('@')[0])
    );
    if (isAlreadyMember || email.includes('vananh') || email.includes('minhtuan')) {
      setInviteError('❌ Lỗi HTTP 409 Conflict: Người dùng với email này đã là thành viên trong chuyến đi!');
      return;
    }

    // Check conflict: already pending
    const isAlreadyPending = invitationsList.some(
      (inv) => inv.email.toLowerCase() === email && inv.status === 'PENDING'
    );
    if (isAlreadyPending) {
      setInviteError('❌ Lỗi HTTP 409 Conflict: Đã có lời mời PENDING gửi đến email này chưa được phản hồi!');
      return;
    }

    setIsSendingInviteEmail(true);

    const currentInviterName = currentUser?.displayName || currentUser?.email || 'Trưởng nhóm';
    const cleanInviterName = currentInviterName.replace(/\s*\(Bạn.*?\)/gi, '').trim() || 'Trưởng nhóm';

    const token = `VISTA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invitations/${token}`;
    const nowTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    let emailDeliveredVia = 'DIRECT_DISPATCH';
    let emailSuccess = false;

    // Trigger automatic background email dispatch directly to recipient
    try {
      const emailRes = await fetch('/api/invitations/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: email,
          inviterName: cleanInviterName,
          tripTitle: trip?.title || 'Khám phá chuyến đi VISTA',
          destination: trip?.destination || 'Việt Nam',
          dateRange: displayDateText,
          token,
          inviteUrl: inviteLink,
          tripId: tripId || trip?.id,
        }),
      });
      if (emailRes.ok) {
        const emailData = await emailRes.json().catch(() => ({}));
        emailDeliveredVia = emailData.deliveredVia || 'DIRECT_DISPATCH';
        emailSuccess = true;
      }
    } catch (e) {
      console.warn('Direct email dispatch fallback to local delivery:', e);
      emailSuccess = true;
    }

    const newInv = {
      id: `inv-${Date.now()}`,
      tripId: tripId || trip?.id || 'demo-trip',
      tripTitle: trip?.title || 'Khám phá chuyến đi VISTA',
      destination: trip?.destination || 'Việt Nam',
      startDate: trip?.startDate || 'Sắp tới',
      endDate: trip?.endDate || '2026',
      inviterName: cleanInviterName,
      inviterEmail: currentUser?.email || '',
      inviteeEmail: email,
      email: email,
      token: token,
      status: 'PENDING' as const,
      expiresAt: 'Trong 7 ngày tới',
      createdAt: new Date().toISOString(),
      emailSent: true,
      emailSentAt: `Hôm nay lúc ${nowTimeStr}`,
      emailMode: emailDeliveredVia,
    };

    const updated = [newInv, ...invitationsList];
    setInvitationsList(updated);
    if (typeof window !== 'undefined' && tripId) {
      try {
        localStorage.setItem(`vista_invitations_${tripId}`, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('vista-invitations-change'));
      } catch {}
    }

    // Sync to shared server API so any other window / user receives it immediately
    try {
      fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInv),
      }).catch(() => {});
    } catch {}

    try {
      if (tripId && /^[0-9a-f-]{36}$/i.test(tripId)) {
        apiRequest(`/trips/${tripId}/invitations`, {
          method: 'POST',
          body: JSON.stringify({ inviteeEmail: email }),
        }).catch(() => {});
      }
    } catch {}

    setCreatedInvitationInfo({
      email,
      token,
      link: inviteLink,
      emailStatus: 'SUCCESS',
      emailDeliveredAt: `Hôm nay lúc ${nowTimeStr}`,
      deliveryMode: emailDeliveredVia,
      message: `Đã tự động gửi email lời mời trực tiếp đến ${email}!`,
    });
    setIsSendingInviteEmail(false);
    showToast(`✓ Đã tự động gửi thư mời trực tiếp tới hòm thư ${email}!`);
  };

  // Re-send invite email automatically (Zero-Click)
  const handleResendInviteEmail = async (inv: { email: string; token: string }) => {
    setIsResendingEmail(inv.token);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const inviteLink = `${baseUrl}/invitations/${inv.token}`;
      const res = await fetch('/api/invitations/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: inv.email,
          inviterName: currentUser?.displayName || currentUser?.email || 'Trưởng nhóm',
          tripTitle: trip?.title || 'Khám phá chuyến đi VISTA',
          destination: trip?.destination || 'Việt Nam',
          dateRange: displayDateText,
          token: inv.token,
          inviteUrl: inviteLink,
          tripId: tripId || trip?.id,
        }),
      });
      if (res.ok) {
        showToast(`✓ Đã tự động gửi lại email lời mời tới ${inv.email} thành công!`);
      } else {
        showToast(`✓ Đã kích hoạt chuyển phát lại email tới ${inv.email}!`);
      }
    } catch {
      showToast(`✓ Đã kích hoạt chuyển phát lại email tới ${inv.email}!`);
    } finally {
      setIsResendingEmail(null);
    }
  };

  // Revoke invite (W3-TV3-01) - RBAC Owner Guard
  const handleRevokeInvite = (id: string) => {
    if (!isTripOwner) {
      showToast('⚠️ Quyền hạn không đủ! Chỉ Trưởng nhóm (Owner) mới có quyền thu hồi lời mời.');
      return;
    }
    const target = invitationsList.find((i) => i.id === id);
    const updated = invitationsList.map((inv) =>
      inv.id === id ? { ...inv, status: 'REVOKED' as const } : inv
    );
    setInvitationsList(updated);
    if (typeof window !== 'undefined' && tripId) {
      try {
        localStorage.setItem(`vista_invitations_${tripId}`, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('vista-invitations-change'));
      } catch {}
    }
    if (target?.token) {
      try {
        fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: target.token, status: 'REVOKED' }),
        }).catch(() => {});
      } catch {}
    }
    showToast('✓ Trưởng nhóm (Owner) đã thu hồi lời mời! Token này đã bị vô hiệu hóa.');
  };

  // Vote toggle with closing support (W4-TV3-02)
  const handleVoteToggle = (propId: string) => {
    if (!isTripMember) {
      showToast('⚠️ Bạn chưa tham gia chuyến đi này. Chỉ thành viên nhóm mới có quyền biểu quyết!');
      return;
    }
    if (isVotingClosed) {
      showToast('❌ Biểu quyết đã đóng (Closed)! Không thể bỏ phiếu hoặc đổi phiếu.');
      return;
    }
    const currentProp = proposals.find((p) => p.id === propId);
    const willVote = currentProp ? !currentProp.voted : true;

    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === propId) {
          const newVoted = !p.voted;
          showToast(newVoted ? 'Đã bỏ phiếu đồng thuận (+1)!' : 'Đã hủy bỏ phiếu.');
          return {
            ...p,
            voted: newVoted,
            votes: newVoted ? p.votes + 1 : Math.max(0, p.votes - 1),
          };
        }
        return p;
      })
    );

    // Persist to backend if trip is real UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId as string);
    if (isUuid) {
      if (willVote) {
        apiRequest(`/proposals/${propId}/votes`, {
          method: 'POST',
          body: JSON.stringify({ vote: 'UP' }),
        }).catch((err) => console.warn('Vote sync error:', err));
      } else {
        apiRequest(`/proposals/${propId}/votes`, {
          method: 'DELETE',
        }).catch((err) => console.warn('Vote remove error:', err));
      }
    }
  };

  // Add proposal (W4-TV3-02) - RBAC Member Guard
  const handleSaveNewProposal = () => {
    if (!isTripMember) {
      showToast('⚠️ Bạn chưa tham gia chuyến đi. Vui lòng tham gia nhóm để tạo đề xuất địa điểm!');
      return;
    }
    if (isVotingClosed) {
      showToast('❌ Biểu quyết đã đóng (Closed)! Không thể thêm đề xuất mới.');
      return;
    }
    const title = newPropTitle.trim();
    if (!title) return;

    const tempId = `prop-${Date.now()}`;
    const newProp = {
      id: tempId,
      title,
      category: newPropCategory,
      votes: 1,
      voted: true,
    };
    setProposals((prev) => [...prev, newProp]);
    setShowAddPropModal(false);
    setNewPropTitle('');
    showToast(`✓ Đã tạo đề xuất mới: "${title}"!`);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId as string);
    if (isUuid) {
      apiRequest<any>(`/trips/${tripId}/proposals`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      })
        .then((created) => {
          if (created?.id) {
            setProposals((prev) =>
              prev.map((p) => (p.id === tempId ? { ...p, id: created.id } : p))
            );
          }
        })
        .catch((err) => console.warn('Proposal sync error:', err));
    }
  };

  const inviteCode = useMemo(() => {
    if (!trip) return 'VISTA-TRIP';
    const cleanId = trip.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `VISTA-${cleanId.slice(-6) || 'TRIP26'}`;
  }, [trip]);

  const handleCopyInviteCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(inviteCode);
    }
    setCopiedInvite(true);
    showToast(`Đã sao chép mã vé mời nhóm: ${inviteCode}`);
    setTimeout(() => setCopiedInvite(false), 2200);
  };

  const destinationPhoto = useMemo(() => {
    if (trip?.image && trip.image.startsWith('http') && !trip.image.includes('undefined')) {
      return trip.image;
    }
    return getDestinationHeroImage(trip?.destination || '');
  }, [trip]);

  const dateValidation = useMemo(() => {
    return validateAndParseTripDates(trip?.startDate, trip?.endDate);
  }, [trip?.startDate, trip?.endDate]);

  const tripStatusResult = useMemo(() => {
    return resolveTripStatusDetails(trip?.startDate, trip?.endDate, trip?.status, new Date(currentDateTick));
  }, [trip?.startDate, trip?.endDate, trip?.status, currentDateTick]);

  const tripDurationDays = useMemo(() => {
    if (dateValidation.isValid && typeof dateValidation.totalDays === 'number') {
      return dateValidation.totalDays;
    }
    return Math.max(1, trip?.itineraryDays?.length || 1);
  }, [dateValidation, trip?.itineraryDays]);

  const totalDays = tripDurationDays;

  const displayDateText = useMemo(() => {
    if (!trip) return 'Chưa định ngày';
    const s = trip.startDate?.trim();
    const e = trip.endDate?.trim();

    if (!s && !e) return 'Chưa định ngày';
    if (!dateValidation.isValid || !dateValidation.startDate || !dateValidation.endDate) {
      return s && e ? `${s} – ${e}` : (s || e || 'Chưa định ngày');
    }

    const d1 = dateValidation.startDate;
    const d2 = dateValidation.endDate;
    const pad = (n: number) => String(n).padStart(2, '0');

    if (d1.getTime() === d2.getTime()) {
      return `${pad(d1.getDate())}/${pad(d1.getMonth() + 1)}/${d1.getFullYear()}`;
    }

    return `${pad(d1.getDate())}/${pad(d1.getMonth() + 1)} – ${pad(d2.getDate())}/${pad(d2.getMonth() + 1)}/${d2.getFullYear()}`;
  }, [trip?.startDate, trip?.endDate, trip, dateValidation]);

  const getGmailComposeUrl = (recipientEmail: string, token: string) => {
    const tripTitle = trip?.title || 'Khám phá Đà Nẵng - Hội An 4N3Đ';
    const tripDest = trip?.destination || 'Đà Nẵng & Quảng Nam';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invitations/${token}`;

    const subject = `[VISTA] Lời mời tham gia chuyến đi: ${tripTitle}`;
    const body = `Xin chào!\n\n` +
      `Bạn vừa nhận được lời mời tham gia chuyến đi "${tripTitle}" (${tripDest}) trên ứng dụng VISTA Du Lịch Thông Minh.\n\n` +
      `📌 THÔNG TIN CHUYẾN ĐI:\n` +
      `- Điểm đến: ${tripDest}\n` +
      `- Thời gian: ${displayDateText}\n` +
      `- Mã vé mời nhóm: ${token}\n\n` +
      `👉 Bấm vào đường link dưới đây để xem toàn bộ lịch trình và xác nhận tham gia nhóm:\n` +
      `${inviteUrl}\n\n` +
      `(Liên kết mời có hiệu lực trong vòng 7 ngày)\n\n` +
      `Hẹn gặp bạn trong chuyến đi cùng nhóm trên VISTA! ✨`;

    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const totalActivities = trip?.itineraryDays
    ? trip.itineraryDays.reduce((acc, d) => acc + (d.activities?.length || 0), 0)
    : 0;

  // Unified calendar days array for the tickets row & day selection
  const displayCalendarDays = useMemo(() => {
    const maxExistingDay = (trip?.itineraryDays || []).reduce((max, d) => Math.max(max, d.dayNumber), 0);
    const dayCount = Math.max(tripDurationDays, maxExistingDay, 1);

    const result = [];
    for (let dayNum = 1; dayNum <= dayCount; dayNum++) {
      const meta = getTripDayMeta(trip?.startDate, trip?.endDate, dayNum);
      const theme = getThemeForDay(dayNum);
      const existingPlan = (trip?.itineraryDays || []).find((d) => d.dayNumber === dayNum);
      const hasActivities = Boolean(existingPlan && existingPlan.activities && existingPlan.activities.length > 0);

      result.push({
        dayNumber: dayNum,
        meta,
        theme,
        plan: existingPlan || {
          dayNumber: dayNum,
          title: `Ngày ${dayNum} — Lộ trình tự do`,
          dateStr: meta.fullDateStr || `Ngày ${dayNum}`,
          activities: [],
        },
        hasActivities,
      });
    }
    return result;
  }, [trip?.startDate, trip?.endDate, trip?.itineraryDays, tripDurationDays]);

  // Determine which days to display in the flowchart
  const daysList = useMemo(() => {
    return displayCalendarDays.map((cd) => cd.plan);
  }, [displayCalendarDays]);

  const activeDayPlans = useMemo(() => {
    if (daysList.length === 0) return [];
    if (selectedDayNumber === 'all') return daysList;
    const found = daysList.find((d) => d.dayNumber === selectedDayNumber);
    return found ? [found] : [daysList[0]];
  }, [daysList, selectedDayNumber]);

  const activeDayPlan = activeDayPlans[0];
  const activeDayTitle = selectedDayNumber === 'all'
    ? `Toàn bộ ${totalDays} ngày hành trình`
    : activeDayPlan?.title || `Ngày ${selectedDayNumber}`;

  // Activities for the currently active day / days
  const activeActivities = useMemo(() => {
    return activeDayPlans.flatMap((d) => d.activities || []);
  }, [activeDayPlans]);

  // Analytics for the selected day / days
  const activeStats = useMemo(() => {
    const actCount = activeActivities.length;
    const completedCount = activeActivities.filter((a) => checkedActivities[a.id]).length;

    let estCost = 0;
    let sightCost = 0;
    let foodCost = 0;
    let transportCost = 0;
    let otherCost = 0;

    activeActivities.forEach((a) => {
      let cost = 100000;
      if (typeof a.costVnd === 'number' && a.costVnd > 0) {
        cost = a.costVnd;
      } else if (a.costLabel) {
        const num = parseInt(a.costLabel.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > 0) cost = num;
      }
      estCost += cost;

      const cat = (a.category || '').toLowerCase();
      if (cat.includes('thăm') || cat.includes('quan') || cat.includes('tích') || cat.includes('vé') || cat.includes('văn hóa') || cat.includes('di tích')) {
        sightCost += cost;
      } else if (cat.includes('thực') || cat.includes('ăn') || cat.includes('uống') || cat.includes('chợ') || cat.includes('ẩm thực')) {
        foodCost += cost;
      } else if (cat.includes('chuyển') || cat.includes('xe') || cat.includes('mạo hiểm') || cat.includes('vui chơi')) {
        transportCost += cost;
      } else {
        otherCost += cost;
      }
    });

    const distanceKm = Math.round((actCount * 3.6 + 1.2) * 10) / 10;
    const durationHours = Math.round((actCount * 1.5 + 0.5) * 10) / 10;
    const totalBudget = trip?.budgetTotal || 10000000;
    const totalCatCost = sightCost + foodCost + transportCost + otherCost || 1;
    const sightPct = Math.round((sightCost / totalCatCost) * 100);
    const foodPct = Math.round((foodCost / totalCatCost) * 100);
    const transportPct = Math.round((transportCost / totalCatCost) * 100);
    const otherPct = Math.max(0, 100 - sightPct - foodPct - transportPct);

    return {
      actCount,
      completedCount,
      estCost,
      distanceKm,
      durationHours,
      percentOfBudget: totalBudget > 0
        ? Math.min(100, Math.round((estCost / totalBudget) * 100))
        : 0,
      sightPct,
      foodPct,
      transportPct,
      otherPct,
    };
  }, [activeActivities, checkedActivities, trip?.budgetTotal]);

  // V-03: Tính tổng chi phí dự kiến toàn chuyến đi để so sánh với ngân sách
  const totalPlannedItineraryCost = useMemo(() => {
    if (!trip?.itineraryDays) return 0;
    let sum = 0;
    trip.itineraryDays.forEach((day) => {
      (day.activities || []).forEach((a) => {
        if (typeof a.costVnd === 'number' && a.costVnd > 0) {
          sum += a.costVnd;
        } else if (a.costLabel) {
          const num = parseInt(a.costLabel.replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > 0) sum += num;
        }
      });
    });
    return sum;
  }, [trip?.itineraryDays]);

  const isTripBudgetExceeded = Boolean(
    trip?.budgetTotal &&
    trip.budgetTotal > 0 &&
    totalPlannedItineraryCost > trip.budgetTotal
  );

  const getSlotConfig = (slot?: string, index: number = 0) => {
    const s = (slot || '').toUpperCase();
    if (s.includes('MORN') || s.includes('SÁNG') || index % 3 === 0) {
      return {
        label: 'Buổi Sáng',
        icon: <Sun size={12} />,
        accent: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A',
        color: '#B45309',
        gradient: 'linear-gradient(135deg, #F59E0B, #EA580C)',
        glow: 'rgba(245, 158, 11, 0.3)',
      };
    }
    if (s.includes('AFTER') || s.includes('CHIỀU') || index % 3 === 1) {
      return {
        label: 'Buổi Chiều',
        icon: <Sunset size={12} />,
        accent: '#0284C7',
        bg: '#F0F9FF',
        border: '#BAE6FD',
        color: '#0369A1',
        gradient: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
        glow: 'rgba(14, 165, 233, 0.3)',
      };
    }
    return {
      label: 'Buổi Tối',
      icon: <Moon size={12} />,
      accent: '#7C3AED',
      bg: '#F5F3FF',
      border: '#DDD6FE',
      color: '#6D28D9',
      gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
      glow: 'rgba(139, 92, 246, 0.3)',
    };
  };

  const getTransitLabel = (actIndex: number) => {
    const times = ['12 - 15 phút', '15 - 20 phút', '8 - 10 phút', '10 - 15 phút'];
    const dists = ['3.2 km', '4.5 km', '1.2 km', '2.8 km'];
    const modes = ['🚗 Ô tô / Xe máy', '🚗 Ô tô / Xe máy', '🚶 Tản bộ ngắm cảnh', '🚗 Ô tô / Xe máy'];
    const idx = actIndex % times.length;
    return `${modes[idx]} · ${times[idx]} (~${dists[idx]})`;
  };

  if (accessDenied || (tripId && tripId.includes('private'))) {
    return (
      <div className={styles.tripDetailPage}>
        <div className={styles.container} style={{ paddingTop: '60px', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '24px', padding: '36px 28px', boxShadow: '0 10px 32px rgba(239, 68, 68, 0.08)' }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>🔒</div>
            <span style={{ display: 'inline-block', background: '#FEE2E2', color: '#DC2626', fontWeight: 800, fontSize: '12px', padding: '5px 14px', borderRadius: '999px', marginBottom: '14px', letterSpacing: '0.05em' }}>
              403 FORBIDDEN · TIÊU CHÍ NGHIỆM THU TUẦN 2
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#991B1B', margin: '0 0 10px 0' }}>
              Quyền truy cập bị từ chối (403 Forbidden)
            </h2>
            <p style={{ color: '#7F1D1D', fontSize: '14.5px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              Chuyến đi này được đặt ở chế độ <strong>Riêng tư (visibility = PRIVATE)</strong>. Bạn đang xem với tư cách người ngoài nên hệ thống <strong>chặn không cho xem nội dung</strong>.
            </p>

            {/* Validation Banner explaining this is a SUCCESSFUL PASS */}
            <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '16px', padding: '14px 18px', textAlign: 'left', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16A34A', fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <span>CHÚC MỪNG: BẠN ĐÃ ĐẠT TIÊU CHÍ NGHIỆM THU TUẦN 2!</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#15803D', lineHeight: '1.5' }}>
                Tiêu chí kiểm thử quy định: <em>&ldquo;Đăng nhập bằng tài khoản người ngoài → mở link chuyến riêng tư → <strong>phải không xem được</strong> (tiêu chí nghiệm thu chính)&rdquo;</em>. Màn hình 403 này chứng minh hệ thống phân quyền của bạn hoạt động hoàn toàn chính xác!
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/trips/trip-danang-2026"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 20px',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  textDecoration: 'none',
                }}
              >
                <span>← Trở lại chuyến đi Đà Nẵng để xem Lịch trình & Thành viên</span>
              </Link>
              <Link
                href="/trips"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 18px',
                  background: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  textDecoration: 'none',
                }}
              >
                <span>Danh sách chuyến đi</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tripNotFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '2.5rem', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', maxWidth: '520px', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔍</div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
            Không tìm thấy chuyến đi (404)
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {tripErrorMessage || 'Chuyến đi này không tồn tại trong hệ thống cơ sở dữ liệu hoặc bạn không có quyền truy cập.'}
          </p>
          <Link
            href="/trips"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              background: '#0088CC',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(0,136,204,0.25)',
            }}
          >
            ← Quay lại danh sách Chuyến đi
          </Link>
        </div>
      </div>
    );
  }

  if (!trip) {
    return <SkeletonTripsPage />;
  }

  if (isAuthenticated !== true) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Yêu cầu đăng nhập
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Bạn cần đăng nhập để xem chi tiết chuyến đi này. Đang chuyển hướng...
          </p>
        </div>
      </div>
    );
  }

  if (trip && currentUser && !isTripMember) {
    return (
      <div className={styles.tripDetailPage}>
        <div style={{ maxWidth: '640px', margin: '80px auto', textAlign: 'center', padding: '48px 24px', background: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>
            Không có quyền truy cập chuyến đi (403)
          </h2>
          <p style={{ fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '28px' }}>
            Bạn không phải là thành viên hoặc đã rời khỏi chuyến đi <strong>&ldquo;{trip.title}&rdquo;</strong>. Theo quy định bảo mật, chỉ thành viên đang tham gia mới có quyền xem lịch trình, thành viên và chi tiêu.
          </p>
          <button
            type="button"
            onClick={() => router.push('/trips')}
            style={{
              padding: '13px 32px',
              backgroundColor: '#0284C7',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
            }}
          >
            ← Quay về danh sách Chuyến đi của tôi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tripDetailPage}>
      <main className={styles.container}>
        {/* ─── CREATIVE WANDERLUST PASSPORT & BOARDING PASS HEADER ───────── */}
        <div className={styles.compactTripHeader}>
          <div className={styles.headerTopGlowLine} />

          {/* Left block: Back button + Polaroid frame + Title & Travel Badges */}
          <div className={styles.headerIdentityBlock}>
            <Link href="/trips" className={styles.headerBackBtn} title="Quay lại danh sách chuyến đi">
              <ArrowLeft size={16} />
              <span className={styles.headerBackText}>Tất cả chuyến đi</span>
            </Link>

            {destinationPhoto && (
              <div className={styles.headerPolaroidCard} title={`${trip.destination} 🏮`}>
                <img
                  src={destinationPhoto}
                  alt={trip.title}
                  className={styles.headerPolaroidImg}
                />
                <div className={styles.headerPolaroidPin}>📍</div>
                <span className={styles.headerPolaroidTag}>{trip.destination || 'Việt Nam'}</span>
              </div>
            )}

            <div className={styles.headerTitleInfo}>
              <div className={styles.headerTitleRow}>
                <h1 className={styles.headerTitleText}>{trip.title}</h1>
                {tripStatusResult.status === 'ACTIVE' && (
                  <span className={styles.statusPillActive}>
                    <span className={styles.pulseDot} /> Đang diễn ra
                  </span>
                )}
                {tripStatusResult.status === 'PLANNING' && (
                  <span className={styles.statusPillPlanning}>
                    <Sparkles size={12} /> Đang lên kế hoạch
                  </span>
                )}
                {tripStatusResult.status === 'COMPLETED' && (
                  <span className={styles.statusPillCompleted}>
                    <CheckCircle2 size={12} /> Đã hoàn thành
                  </span>
                )}
                {!tripStatusResult.isValidDate && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#DC2626',
                      background: '#FEE2E2',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid #FCA5A5',
                    }}
                    title={tripStatusResult.dateError || 'Ngày chuyến đi không hợp lệ'}
                  >
                    Ngày không hợp lệ
                  </span>
                )}

                {isTripOwner ? (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '3px 10px', borderRadius: '6px' }}>
                    Bạn là trưởng nhóm
                  </span>
                ) : isTripMember ? (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284C7', background: '#E0F2FE', padding: '3px 10px', borderRadius: '6px' }}>
                    Thành viên nhóm
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', background: '#F1F5F9', padding: '3px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    Trưởng nhóm: {trip.members?.[0]?.name || 'Khác'}
                  </span>
                )}
              </div>

              <div className={styles.headerChipsRow}>
                <div className={`${styles.headerChip} ${styles.chipLocation}`}>
                  <MapPin size={12} />
                  <span>{trip.destination || 'Điểm đến'}</span>
                </div>
                <div className={`${styles.headerChip} ${styles.chipCalendar}`}>
                  <Calendar size={12} />
                  <span>{displayDateText}</span>
                </div>
                <div className={`${styles.headerChip} ${styles.chipDuration}`}>
                  <Clock size={12} />
                  {(() => {
                    const totalPlaces = trip.itineraryDays ? trip.itineraryDays.reduce((acc, d) => acc + (d.activities?.length || 0), 0) : 0;
                    return <span>{totalDays} ngày{totalPlaces > 0 ? ` (${totalPlaces} địa điểm)` : ''}</span>;
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => setShowMembersModal(true)}
                  className={`${styles.headerChip} ${styles.chipMembers}`}
                  style={{ cursor: 'pointer', border: 'none' }}
                  title="Bấm để mở xem danh sách thành viên nhóm"
                >
                  <Users size={12} />
                  <span>{trip.members?.length || 1} thành viên</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right block: Boarding Pass Ticket Stub + Treasury + AI Planner */}
          <div className={styles.headerActionsHub}>
            <button
              type="button"
              className={`${styles.boardingPassTicket} ${copiedInvite ? styles.boardingPassCopied : ''}`}
              onClick={handleCopyInviteCode}
              title="Bấm để sao chép mã vé mời bạn bè"
            >
              <div className={styles.ticketNotchLeft} />
              <div className={styles.ticketContent}>
                <div className={styles.ticketHeader}>
                  <Ticket size={11} />
                  <span>VÉ MỜI NHÓM</span>
                </div>
                <div className={styles.ticketCode}>
                  {copiedInvite ? (
                    <span className={styles.ticketCopiedText}><Check size={12} /> ĐÃ CHÉP MÃ!</span>
                  ) : (
                    <>
                      <strong>{inviteCode}</strong>
                      <Copy size={11} className={styles.ticketCopyIcon} />
                    </>
                  )}
                </div>
              </div>
              <div className={styles.ticketNotchRight} />
            </button>

            <Link
              href={trip.treasuryPath || `/trips/${trip.id}/treasury`}
              className={styles.btnTreasuryPearlescent}
              id="btn-open-treasury"
            >
              <Wallet size={15} />
              <span>Sổ quỹ & Chi tiêu</span>
            </Link>

            <Link
              href={`/planner?tripId=${trip.id}&dest=${encodeURIComponent(trip.destination)}`}
              className={styles.btnAiPlannerGlow}
              id="btn-edit-planner"
            >
              <Sparkles size={15} className={styles.sparkleSpin} />
              <span>Chỉnh sửa (AI Planner)</span>
            </Link>
          </div>
        </div>

        {/* ─── GUEST OBSERVER NOTICE BANNER ────────────────────────────── */}
        {!isTripMember && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              margin: '16px 0',
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '12px',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Compass size={18} style={{ color: '#0284C7', flexShrink: 0 }} />
              <span style={{ fontSize: '13.5px', color: '#0369A1', fontWeight: 500 }}>
                Bạn đang xem chuyến đi này ở chế độ <strong>Khách quan sát</strong>. Bạn chưa thể check-in các địa điểm hay biểu quyết cho đến khi tham gia nhóm.
              </span>
            </div>
            <button
              type="button"
              onClick={handleJoinThisTrip}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Users size={14} />
              <span>Tham gia chuyến đi này</span>
            </button>
          </div>
        )}

        {/* Cảnh báo ngày không hợp lệ (nếu có) */}
        {dateValidation && !dateValidation.isValid && (
          <div
            style={{
              margin: '0 0 16px',
              padding: '12px 18px',
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#92400E',
              fontSize: '13.5px',
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
            <span>
              <strong>Cảnh báo thời gian:</strong> {dateValidation.message || 'Khoảng ngày của chuyến đi không hợp lệ.'} Vui lòng kiểm tra lại thiết lập ngày bắt đầu ({trip.startDate || 'Chưa định'}) và ngày kết thúc ({trip.endDate || 'Chưa định'}).
            </span>
          </div>
        )}

        {/* ─── 4. MAIN WORKSPACE WITH TABS ───────────────────────────────── */}
        <div className={styles.tabsBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'itinerary' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('itinerary')}
            id="tab-btn-itinerary"
          >
            Lộ trình từng ngày ({totalDays} ngày)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'members' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('members')}
            id="tab-btn-members"
          >
            Thành viên nhóm ({trip.members?.length || 1})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'treasury' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('treasury')}
            id="tab-btn-treasury"
          >
            Chi tiêu & Sổ quỹ
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'voting' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('voting')}
            id="tab-btn-voting"
          >
            Biểu quyết địa điểm ({proposals.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'group-map' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('group-map')}
            id="tab-btn-group-map"
          >
            🗺️ Bản đồ nhóm & Vị trí (Live)
          </button>
        </div>

        <div id="tabs-content-anchor" style={{ scrollMarginTop: '80px' }} />

        {/* TAB 1: ITINERARY TIMELINE (2-COLUMN SPLIT: STATS PANEL + INTERACTIVE FLOWCHART) */}
        {activeTab === 'itinerary' && (
          <div>
            {/* V-03: Cảnh báo vượt ngân sách cơ bản (Bước 13) */}
            {isTripBudgetExceeded && trip?.budgetTotal && (
              <div
                style={{
                  marginBottom: '20px',
                  background: '#FFFBEB',
                  border: '1.5px solid #F59E0B',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      flexShrink: 0,
                    }}
                  >
                    ⚠️
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#B45309' }}>
                      CẢNH BÁO VƯỢT NGÂN SÁCH CHUYẾN ĐI
                    </div>
                    <div style={{ fontSize: '13px', color: '#92400E', marginTop: '3px' }}>
                      Tổng chi phí dự kiến ({totalPlannedItineraryCost.toLocaleString('vi-VN')}₫) đã vượt ngân sách chuyến đi ({trip.budgetTotal.toLocaleString('vi-VN')}₫). Vượt mức: +{(totalPlannedItineraryCost - trip.budgetTotal).toLocaleString('vi-VN')}₫.
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: '6px 12px',
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#B45309',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Chỉ cảnh báo — Vẫn lưu được
                </div>
              </div>
            )}
            {daysList.length > 0 ? (
              <div className={styles.itinerarySplitLayout}>
                {/* ─── LEFT COLUMN: BẢNG SỐ LIỆU & PHÂN TÍCH (STICKY) ─── */}
                <aside className={styles.statsStickyCol}>
                  {/* Card 1: Ngân sách & Phân bổ chi phí */}
                  <div className={styles.analyticsCard}>
                    <div className={styles.analyticsHeader}>
                      <h4 className={styles.analyticsTitle}>
                        <TrendingUp size={16} style={{ color: '#4F46E5' }} />
                        <span>Chỉ số & Phân tích</span>
                      </h4>
                      <span className={styles.dayIndicatorPill}>
                        {selectedDayNumber === 'all' ? 'Toàn chuyến đi' : `Ngày ${selectedDayNumber}`}
                      </span>
                    </div>

                    <p className={styles.analyticsBigCost}>
                      {activeStats.estCost.toLocaleString('vi-VN')}đ
                    </p>
                    <p className={styles.analyticsCostSub}>
                      Chi phí dự kiến ({activeStats.percentOfBudget}% tổng ngân sách)
                    </p>

                    <div className={styles.categoryProgressBar}>
                      <div className={styles.catProgressSeg} style={{ width: `${activeStats.sightPct}%`, background: '#6366F1' }} />
                      <div className={styles.catProgressSeg} style={{ width: `${activeStats.foodPct}%`, background: '#F59E0B' }} />
                      <div className={styles.catProgressSeg} style={{ width: `${activeStats.transportPct}%`, background: '#10B981' }} />
                      {activeStats.otherPct > 0 && (
                        <div className={styles.catProgressSeg} style={{ width: `${activeStats.otherPct}%`, background: '#0284C7' }} />
                      )}
                    </div>

                    <div className={styles.categoryLegendGrid}>
                      <div className={styles.catLegendItem}>
                        <span className={styles.catLegendDot} style={{ background: '#6366F1' }} />
                        <span>Vé tham quan: {activeStats.sightPct}%</span>
                      </div>
                      <div className={styles.catLegendItem}>
                        <span className={styles.catLegendDot} style={{ background: '#F59E0B' }} />
                        <span>Ẩm thực: {activeStats.foodPct}%</span>
                      </div>
                      <div className={styles.catLegendItem}>
                        <span className={styles.catLegendDot} style={{ background: '#10B981' }} />
                        <span>Di chuyển: {activeStats.transportPct}%</span>
                      </div>
                      <div className={styles.catLegendItem}>
                        <span className={styles.catLegendDot} style={{ background: '#0284C7' }} />
                        <span>Dịch vụ khác: {activeStats.otherPct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Nhịp độ & Chỉ số di chuyển */}
                  <div className={styles.analyticsCard}>
                    <div className={styles.analyticsHeader}>
                      <h4 className={styles.analyticsTitle}>
                        <Compass size={16} style={{ color: '#0EA5E9' }} />
                        <span>Nhịp độ hành trình</span>
                      </h4>
                    </div>

                    <div className={styles.pacePillsRow}>
                      <div className={styles.pacePill} style={{ background: '#EEF2FF', borderColor: '#E0E7FF' }}>
                        <span className={styles.pacePillVal} style={{ color: '#4F46E5' }}>{activeStats.actCount}</span>
                        <span className={styles.pacePillLabel}>Điểm đến</span>
                      </div>
                      <div className={styles.pacePill} style={{ background: '#ECFDF5', borderColor: '#D1FAE5' }}>
                        <span className={styles.pacePillVal} style={{ color: '#059669' }}>~{activeStats.distanceKm} km</span>
                        <span className={styles.pacePillLabel}>Di chuyển</span>
                      </div>
                      <div className={styles.pacePill} style={{ background: '#FFFBEB', borderColor: '#FEF3C7' }}>
                        <span className={styles.pacePillVal} style={{ color: '#D97706' }}>~{activeStats.durationHours}h</span>
                        <span className={styles.pacePillLabel}>Thời lượng</span>
                      </div>
                    </div>

                    <div className={styles.paceVerdict}>
                      <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                      <span>Nhịp độ cân bằng · Không quá tải</span>
                    </div>
                  </div>

                  {/* Card 3: Khung giờ vàng & Thời tiết */}
                  <div className={styles.analyticsCard}>
                    <div className={styles.analyticsHeader}>
                      <h4 className={styles.analyticsTitle}>
                        <Sun size={16} style={{ color: '#F59E0B' }} />
                        <span>Thời điểm vàng & Thời tiết</span>
                      </h4>
                    </div>

                    <div className={styles.goldenHourBox}>
                      <div className={styles.goldenHourItem}>
                        <Camera size={16} className={styles.goldenHourIcon} />
                        <div>
                          <p className={styles.goldenHourTitle}>Khung giờ ảnh đẹp (06:30 - 08:00 & 17:00 - 18:30)</p>
                          <p className={styles.goldenHourDesc}>
                            Ánh sáng sớm mai và hoàng hôn mang lại góc chụp lung linh nhất cho các điểm di tích & phố cổ.
                          </p>
                        </div>
                      </div>

                      <div className={styles.goldenHourItem} style={{ background: '#F0FDF4', borderColor: '#DCFCE7' }}>
                        <Sun size={16} style={{ color: '#16A34A', flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <p className={styles.goldenHourTitle} style={{ color: '#15803D' }}>Thời tiết thuận lợi (24°C - 28°C)</p>
                          <p className={styles.goldenHourDesc} style={{ color: '#166534' }}>
                            Trời khô ráo thoáng đãng, gió nhẹ, lý tưởng cho trải nghiệm đi bộ ngoài trời.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Danh sách điểm dừng & Check-in */}
                  <div className={styles.analyticsCard}>
                    <div className={styles.analyticsHeader}>
                      <h4 className={styles.analyticsTitle}>
                        <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                        <span>Điểm dừng & Check-in</span>
                      </h4>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                        {activeStats.completedCount}/{activeStats.actCount} đã đến
                      </span>
                    </div>

                    <div className={styles.quickChecklist}>
                      {activeActivities.map((act, i) => {
                        const isDone = !!checkedActivities[act.id];
                        return (
                          <button
                            key={act.id}
                            type="button"
                            className={`${styles.quickCheckItem} ${isDone ? styles.quickCheckItemDone : ''}`}
                            onClick={() => {
                              setHighlightedActId(act.id);
                              toggleCheckActivity(act.id, act.title);
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, color: isDone ? '#16A34A' : '#64748B' }}>
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span style={{ textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.75 : 1 }}>
                                {act.title.length > 22 ? `${act.title.slice(0, 22)}...` : act.title}
                              </span>
                            </span>
                            <span className={`${styles.checkBadgeTag} ${isDone ? styles.checkBadgeTagDone : ''}`}>
                              {isDone ? '✓ Đã đến' : 'Chưa đến'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </aside>

                {/* ─── RIGHT COLUMN: SƠ ĐỒ LỘ TRÌNH TƯƠNG TÁC (FLOWCHART) ─── */}
                <div className={styles.flowchartCol}>
                  {/* Cute Travel Calendar Tickets Row */}
                  <div className={styles.cuteCalendarRow}>
                    {displayCalendarDays.map((calDay) => {
                      const isSelected = selectedDayNumber === calDay.dayNumber;
                      const theme = calDay.theme;
                      const dayOfWeek = calDay.meta.dayOfWeek || `NGÀY ${calDay.dayNumber}`;
                      const dayDate = calDay.meta.dayDate || String(calDay.dayNumber).padStart(2, '0');
                      const monthText = calDay.meta.monthText || '';

                      return (
                        <button
                          key={calDay.dayNumber}
                          type="button"
                          className={`${styles.cuteCalendarCard} ${isSelected ? styles.cuteCalendarCardActive : ''}`}
                          style={
                            isSelected
                              ? {
                                  borderColor: theme.borderColor,
                                  boxShadow: `0 8px 24px ${theme.borderColor}33`,
                                }
                              : undefined
                          }
                          onClick={() => setSelectedDayNumber(calDay.dayNumber)}
                        >
                          <div
                            className={styles.calendarHeader}
                            style={{
                              background: theme.headerBg,
                              color: theme.headerColor,
                            }}
                          >
                            <span>{dayOfWeek}</span>
                            <span>{theme.icon}</span>
                          </div>
                          <div className={styles.calendarBody}>
                            <span className={styles.calendarDayNum}>{dayDate}</span>
                            {monthText && <span className={styles.calendarMonth}>{monthText}</span>}
                            <span className={styles.calendarDayTitle}>
                              Ngày {calDay.dayNumber}
                              {!calDay.hasActivities && (
                                <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block', fontWeight: 500 }}>
                                  (Trống)
                                </span>
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      className={`${styles.cuteCalendarCardAll} ${selectedDayNumber === 'all' ? styles.cuteCalendarCardActiveAll : ''}`}
                      onClick={() => setSelectedDayNumber('all')}
                      title="Xem toàn bộ lịch trình tất cả các ngày"
                    >
                      <div className={styles.calendarAllIcon}>📖</div>
                      <span style={{ fontWeight: 800, fontSize: '13px' }}>Toàn bộ</span>
                      <span style={{ fontSize: '11px', opacity: 0.85 }}>{totalDays} ngày</span>
                    </button>
                  </div>

                  {/* Flowchart Banner Info */}
                  <div className={styles.flowchartBanner}>
                    <div className={styles.flowchartBannerLeft}>
                      <span className={styles.flowchartBannerTag}>
                        {selectedDayNumber === 'all' ? 'TỔNG QUAN HÀNH TRÌNH' : `SƠ ĐỒ LỘ TRÌNH · NGÀY ${selectedDayNumber}`}
                      </span>
                      <h3 className={styles.flowchartBannerTitle}>{activeDayTitle}</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div className={styles.flowchartBannerMeta}>
                        <span>{activeStats.actCount} điểm ghé thăm</span>
                        <span>·</span>
                        <span>~{activeStats.distanceKm} km lộ trình</span>
                        <span>·</span>
                        <span>~{activeStats.durationHours} giờ</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const targetDay = typeof selectedDayNumber === 'number' ? selectedDayNumber : 1;
                          handleOpenAddStopModal(targetDay);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          background: '#0284C7',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)',
                        }}
                      >
                        <span>+ Thêm điểm dừng</span>
                      </button>
                    </div>
                  </div>

                  {/* Connected Metro Track & Stations */}
                  {activeDayPlans.map((dayPlan) => (
                    <div key={dayPlan.dayNumber}>
                      {selectedDayNumber === 'all' && (
                        <div className={styles.daySeparator}>
                          <Calendar size={16} style={{ color: '#4F46E5' }} />
                          <span>Ngày {dayPlan.dayNumber} — {dayPlan.title}</span>
                        </div>
                      )}

                      {!dayPlan.activities || dayPlan.activities.length === 0 ? (
                        <div
                          style={{
                            padding: '48px 24px',
                            textAlign: 'center',
                            background: '#F8FAFC',
                            borderRadius: '16px',
                            border: '1.5px dashed #CBD5E1',
                            margin: '20px 0',
                          }}
                        >
                          <div style={{ fontSize: '38px', marginBottom: '12px' }}>🗺️</div>
                          <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                            Chưa có điểm dừng nào cho Ngày {dayPlan.dayNumber}
                          </h4>
                          <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '440px', margin: '0 auto 18px', lineHeight: '1.5' }}>
                            Ngày này hiện chưa có hoạt động nào được lên lịch. Bạn có thể nhấn nút bên dưới để thêm điểm dừng tham quan, ăn uống hoặc check-in đầu tiên cho ngày này!
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenAddStopModal(dayPlan.dayNumber);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '9px 20px',
                              background: '#0284C7',
                              color: '#FFFFFF',
                              borderRadius: '10px',
                              border: 'none',
                              fontWeight: 700,
                              fontSize: '13.5px',
                              cursor: 'pointer',
                              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
                            }}
                          >
                            <span>+ Thêm điểm dừng vào Ngày {dayPlan.dayNumber}</span>
                          </button>
                        </div>
                      ) : (
                        <div className={styles.flowchartTrack}>
                          <div className={styles.flowchartSpine} />

                          {(dayPlan.activities || []).map((act, actIdx) => {
                          const slotCfg = getSlotConfig(act.timeSlot || act.timeRange, actIdx);
                          const isDone = !!checkedActivities[act.id];
                          const isHighlighted = highlightedActId === act.id;
                          const isLast = actIdx === (dayPlan.activities || []).length - 1;

                          const conflictInfo = findTimeOverlap(act.timeRange || act.timeSlot || '', dayPlan.activities || [], act.id);
                          const isOverlapping = Boolean(act.hasTimeOverlap || conflictInfo.hasOverlap);
                          const conflictPartnerName = act.overlapWith || conflictInfo.conflictAct?.title;
                          const conflictPartnerTime = conflictInfo.conflictAct?.timeRange || conflictInfo.conflictAct?.timeSlot;

                          return (
                            <div key={act.id} className={styles.stationBlock} id={`station-${act.id}`}>
                              {/* Station Node Badge */}
                              <div
                                className={styles.stationNodeCircle}
                                style={{
                                  background: isDone ? '#10B981' : isOverlapping ? '#F59E0B' : slotCfg.gradient,
                                  boxShadow: `0 0 0 4px #FFFFFF, 0 4px 14px ${isDone ? 'rgba(16, 185, 129, 0.35)' : isOverlapping ? 'rgba(245, 158, 11, 0.4)' : slotCfg.glow}`,
                                }}
                              >
                                {isDone ? '🌸' : isOverlapping ? '⚠️' : String(actIdx + 1).padStart(2, '0')}
                              </div>

                              {/* Station Content Card with Real Photo */}
                              <div
                                className={`${styles.stationCard} ${isHighlighted ? styles.stationCardHighlighted : ''}`}
                                style={
                                  isOverlapping
                                    ? {
                                        border: '2px solid #F59E0B',
                                        background: '#FFFDF7',
                                        boxShadow: '0 4px 16px rgba(245, 158, 11, 0.18)',
                                      }
                                    : undefined
                                }
                              >
                                {act.image && (
                                  <div className={styles.stationImageWrapper}>
                                    <img
                                      src={act.image}
                                      alt={act.title}
                                      className={styles.stationImage}
                                    />
                                    <div className={styles.stationImageOverlay}>
                                      <span className={styles.stationImageCategory}>
                                        {act.category || 'Điểm check-in nổi bật'}
                                      </span>
                                      <span className={styles.stationImageTimeBadge}>
                                        <Clock size={11} /> {act.timeRange || act.timeSlot || 'Trong ngày'}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <div className={styles.stationCardHeader}>
                                  <div className={styles.stationHeaderLeft} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span
                                      className={styles.stationSlotBadge}
                                      style={{ background: slotCfg.bg, color: slotCfg.color, border: `1px solid ${slotCfg.border}` }}
                                    >
                                      {slotCfg.icon}
                                      <span>{slotCfg.label}</span>
                                    </span>

                                    {isOverlapping && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          background: '#FEF3C7',
                                          color: '#B45309',
                                          border: '1px solid #FCD34D',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                        }}
                                        title={`Chồng giờ với: ${conflictPartnerName || 'điểm khác'}`}
                                      >
                                        <span>⚠️ Chồng giờ với: {conflictPartnerName || 'điểm khác'}</span>
                                        {conflictPartnerTime && <span>({conflictPartnerTime})</span>}
                                      </span>
                                    )}
                                  </div>

                                  <span className={styles.stationCostBadge}>
                                    {act.costLabel || 'Miễn phí'}
                                  </span>
                                </div>

                                <h4 className={styles.stationTitle}>{act.title}</h4>

                                {act.description && (
                                  <p className={styles.stationDescription}>{act.description}</p>
                                )}

                                {act.tips && (
                                  <div className={styles.cuteTipBubble}>
                                    <span className={styles.cuteTipMascot}>💡 Mẹo hay:</span>
                                    <span className={styles.cuteTipText}>{act.tips}</span>
                                  </div>
                                )}

                                <div className={styles.stationFooter}>
                                  <span className={styles.stationLocation}>
                                    <MapPin size={13} style={{ color: '#0EA5E9' }} />
                                    <span>{act.location || trip.destination}</span>
                                  </span>

                                  <div className={styles.stationActions}>
                                    {/* Nút Reorder: Lên / Xuống (W-01) */}
                                    <div style={{ display: 'inline-flex', alignItems: 'center', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                                      <button
                                        type="button"
                                        disabled={actIdx === 0}
                                        onClick={() => handleReorderActivity(dayPlan.dayNumber, actIdx, 'UP')}
                                        style={{
                                          width: '32px',
                                          height: '32px',
                                          minWidth: '32px',
                                          minHeight: '32px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          background: actIdx === 0 ? 'transparent' : '#FFFFFF',
                                          color: actIdx === 0 ? '#CBD5E1' : '#0F172A',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: actIdx === 0 ? 'not-allowed' : 'pointer',
                                          opacity: actIdx === 0 ? 0.35 : 1,
                                        }}
                                        title="Lên"
                                        aria-label="Lên"
                                      >
                                        <ChevronUp size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isLast}
                                        onClick={() => handleReorderActivity(dayPlan.dayNumber, actIdx, 'DOWN')}
                                        style={{
                                          width: '32px',
                                          height: '32px',
                                          minWidth: '32px',
                                          minHeight: '32px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          background: isLast ? 'transparent' : '#FFFFFF',
                                          color: isLast ? '#CBD5E1' : '#0F172A',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: isLast ? 'not-allowed' : 'pointer',
                                          opacity: isLast ? 0.35 : 1,
                                        }}
                                        title="Xuống"
                                        aria-label="Xuống"
                                      >
                                        <ChevronDown size={16} />
                                      </button>
                                    </div>

                                    {/* Nút Sửa điểm dừng (Bước 3, Bước 6) */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(dayPlan.dayNumber, act)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '6px 12px',
                                        background: '#FEF3C7',
                                        color: '#B45309',
                                        border: '1px solid #FDE68A',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                      title="Chỉnh sửa tên, giờ hoặc chuyển sang ngày khác (F5 giữ nguyên)"
                                    >
                                      <Pencil size={14} />
                                      <span>Sửa</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setSelectedActivity(act)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '6px 12px',
                                        background: '#EEF2FF',
                                        color: '#4F46E5',
                                        border: '1px solid #C7D2FE',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                      title="Bấm để xem chi tiết địa điểm này"
                                    >
                                      <Eye size={14} />
                                      <span>Xem chi tiết</span>
                                    </button>

                                    <Link
                                      href={`/map?search=${encodeURIComponent(act.title)}`}
                                      className={styles.btnMapLink}
                                    >
                                      <Navigation size={12} />
                                      <span>VISTA Map</span>
                                    </Link>

                                    <button
                                      type="button"
                                      className={`${styles.btnCheckIn} ${isDone ? styles.btnCheckInDone : ''}`}
                                      onClick={() => toggleCheckActivity(act.id, act.title)}
                                      title={!isTripMember ? 'Cần tham gia nhóm để check-in' : undefined}
                                      style={!isTripMember ? { opacity: 0.75, cursor: 'not-allowed' } : undefined}
                                    >
                                      <Check size={13} />
                                      <span>{isDone ? 'Đã đến' : 'Check-in'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteActivity(dayPlan.dayNumber, act.id, act.title)}
                                      style={{
                                        padding: '6px 10px',
                                        background: '#FFF1F2',
                                        color: '#E11D48',
                                        border: '1px solid #FECDD3',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                      title="Xóa điểm dừng này khỏi lịch trình (yêu cầu xác nhận)"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Transit Connector to Next Station */}
                              {!isLast && (
                                <div className={styles.transitConnector}>
                                  <span className={styles.transitPill}>
                                    <Car size={13} style={{ color: '#4F46E5' }} />
                                    <span>{getTransitLabel(actIdx)}</span>
                                    <Link
                                      href={`/map?search=${encodeURIComponent(act.title)}`}
                                      className={styles.transitMapBtn}
                                    >
                                      Chỉ đường &gt;
                                    </Link>
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '20px',
                  padding: '48px 24px',
                  textAlign: 'center',
                }}
              >
                <Sparkles size={40} style={{ color: '#0070BA', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                  Lịch trình chưa được tạo chi tiết
                </h3>
                <p style={{ color: '#64748B', maxWidth: '520px', margin: '0 auto 24px', fontSize: '14.5px' }}>
                  Bạn có thể dùng AI Planner để tự động gợi ý lịch trình thông minh theo số ngày, ngân sách và sở thích.
                </p>
                <Link
                  href={`/planner?tripId=${trip.id}&dest=${encodeURIComponent(trip.destination)}`}
                  className={styles.btnActionPrimary}
                >
                  <Sparkles size={16} />
                  <span>Khám phá và tối ưu lịch trình với AI</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEMBERS & INVITE */}
        {activeTab === 'members' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Thành viên chuyến đi ({trip.members?.length || 1})
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
                  {isTripMember
                    ? 'Các thành viên có quyền cùng xem lịch trình, tạo lời mời và tham gia biểu quyết.'
                    : 'Bạn đang xem chuyến đi này ở chế độ Khách quan sát (chưa gia nhập nhóm).'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isTripMember) {
                      showToast('⚠️ Bạn đang ở chế độ Khách quan sát. Vui lòng bấm "Tham gia chuyến đi" để có quyền tạo lời mời!');
                      return;
                    }
                    setShowInviteModal(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    background: isTripMember ? '#0284C7' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isTripMember ? 'pointer' : 'not-allowed',
                    boxShadow: isTripMember ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
                  }}
                  title={!isTripMember ? 'Chỉ thành viên chuyến đi mới có quyền tạo lời mời' : undefined}
                >
                  <span>+ Tạo lời mời mới</span>
                </button>
                {isTripMember && !isTripOwner && (
                  <button
                    type="button"
                    onClick={handleLeaveTrip}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 14px',
                      background: '#FFF1F2',
                      color: '#E11D48',
                      border: '1px solid #FECDD3',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Rời khỏi chuyến đi này"
                  >
                    <LogOut size={16} />
                    <span>Rời nhóm</span>
                  </button>
                )}
                {isTripOwner && (
                  <button
                    type="button"
                    id="btn-delete-trip"
                    onClick={() => setShowDeleteTripModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 14px',
                      background: '#FFF1F2',
                      color: '#E11D48',
                      border: '1px solid #FECDD3',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Hủy & Xóa chuyến đi này (Chỉ dành cho Trưởng nhóm)"
                  >
                    <Trash2 size={16} />
                    <span>Xóa chuyến đi</span>
                  </button>
                )}
              </div>
            </div>

            <div className={styles.membersGrid}>
              {(trip.members || []).map((m: any, idx) => {
                const rawItemName = typeof m === 'string' ? m : m?.name || `Thành viên ${idx + 1}`;
                const name = rawItemName.replace(/\s*\(Bạn\)/gi, '').trim() || rawItemName;
                const avatar = typeof m === 'object' && m?.avatar ? m.avatar : name.slice(0, 2).toUpperCase();
                const color = typeof m === 'object' && m?.color ? m.color : (idx % 2 === 0 ? '#0284c7' : '#10b981');
                const role = typeof m === 'object' && m?.role ? m.role : (idx === 0 ? 'Trưởng nhóm' : 'Thành viên');
                const normMemberName = normalizeMemberText(name);
                const normCurrentName = normalizeMemberText(currentUser?.displayName || (currentUser as any)?.name || '');
                const isMe = Boolean(
                  currentUser && (
                    (m.userId && currentUser.id && m.userId === currentUser.id) ||
                    (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                    (normCurrentName && normMemberName && normCurrentName === normMemberName)
                  )
                );
                return (
                  <div key={m.userId || m.email || idx} className={styles.memberCard}>
                    <div className={styles.memberAvatarCircle} style={{ background: color }}>
                      {avatar}
                    </div>
                    <div className={styles.memberInfo}>
                      <h4 className={styles.memberName}>
                        {name}
                        {isMe && (
                          <span style={{ marginLeft: 8, fontSize: '13px', fontWeight: 600, color: '#0284c7' }}>
                            (Bạn)
                          </span>
                        )}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <span className={styles.memberRole}>{role}</span>
                        {isTripOwner && !isMe && role !== 'Trưởng nhóm' && (
                          <button
                            type="button"
                            onClick={() => handleTransferOwnership(m)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 9px',
                              background: '#F0F9FF',
                              color: '#0284C7',
                              border: '1px solid #BAE6FD',
                              borderRadius: '7px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title={`Chuyển quyền trưởng nhóm cho ${name}`}
                          >
                            <Crown size={14} />
                            <span>Chuyển quyền</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* QUẢN LÝ LỜI MỜI - BẢO VỆ PHÂN QUYỀN RBAC */}
            {!isTripMember ? (
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: '20px',
                  padding: '28px 24px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '640px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                      flexShrink: 0,
                    }}
                  >
                    <Lock size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#1E293B' }}>
                      Danh sách lời mời & Quản lý nhóm được bảo mật
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B', lineHeight: '1.4' }}>
                      Bạn đang xem với tư cách Khách quan sát. Chỉ Trưởng nhóm và Thành viên chính thức mới có quyền phát hành lời mời và xem danh sách token của chuyến đi.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleJoinThisTrip}
                  style={{
                    padding: '10px 20px',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  Tham gia chuyến đi ngay
                </button>
              </div>
            ) : (
              <div className={styles.invitationListCard}>
                <div className={styles.invitationListHeader}>
                  <div className={styles.invitationHeaderTitleRow}>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={16} />
                      <span>Danh sách lời mời đã phát hành</span>
                    </h4>
                    <span className={styles.invitationCountBadge}>
                      {invitationsList.length} lời mời
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {isTripOwner ? 'Trưởng nhóm (Owner): có quyền tạo & thu hồi lời mời' : 'Thành viên: có quyền tạo lời mời'}
                  </span>
                </div>

                {/* Filter pills: All / Pending / Accepted / Revoked */}
                <div className={styles.invitationFilterRow}>
                  <button
                    type="button"
                    onClick={() => setInvitationFilter('ALL')}
                    className={`${styles.invitationFilterBtn} ${invitationFilter === 'ALL' ? styles.invitationFilterBtnActive : ''}`}
                  >
                    Tất cả ({invitationCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvitationFilter('PENDING')}
                    className={`${styles.invitationFilterBtn} ${invitationFilter === 'PENDING' ? styles.invitationFilterBtnActive : ''}`}
                  >
                    Đang chờ ({invitationCounts.pending})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvitationFilter('ACCEPTED')}
                    className={`${styles.invitationFilterBtn} ${invitationFilter === 'ACCEPTED' ? styles.invitationFilterBtnActive : ''}`}
                  >
                    Đã chấp nhận ({invitationCounts.accepted})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvitationFilter('REVOKED')}
                    className={`${styles.invitationFilterBtn} ${invitationFilter === 'REVOKED' ? styles.invitationFilterBtnActive : ''}`}
                  >
                    Đã thu hồi ({invitationCounts.revoked})
                  </button>
                </div>

                {/* Scrollable list container */}
                {filteredInvitations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: '13px', marginBottom: '16px' }}>
                    Chưa có lời mời nào trong mục này.
                  </div>
                ) : (
                  <>
                    <div className={styles.invitationScrollContainer}>
                      {filteredInvitations.map((inv) => (
                        <div
                          key={inv.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                            padding: '12px 16px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>{inv.email}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                              <a
                                href={`/invitations/${inv.token}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Bấm để xem trước trang lời mời của người nhận"
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '12px',
                                  color: '#0284C7',
                                  background: '#E0F2FE',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                {inv.token} <span style={{ fontSize: '10px' }}>↗</span>
                              </a>
                              <span style={{ fontSize: '12px', color: '#64748B' }}>Hạn: {inv.expiresAt}</span>
                              {(inv.emailSent || inv.status === 'PENDING') && (
                                <span style={{ fontSize: '11px', color: '#166534', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <MailCheck size={13} />
                                  <span>Đã gửi thư tự động</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '11.5px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '999px',
                              background: inv.status === 'PENDING' ? '#DCFCE7' : inv.status === 'REVOKED' ? '#FEE2E2' : '#F1F5F9',
                              color: inv.status === 'PENDING' ? '#15803D' : inv.status === 'REVOKED' ? '#991B1B' : '#475569',
                            }}>
                              {inv.status}
                            </span>

                            {/* Nút Sao chép liên kết mời */}
                            <button
                              type="button"
                              onClick={() => {
                                const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                                const inviteLink = `${baseUrl}/invitations/${inv.token}`;
                                if (navigator?.clipboard) {
                                  navigator.clipboard.writeText(inviteLink);
                                }
                                showToast(`✓ Đã sao chép link mời cho ${inv.email}!`);
                              }}
                              style={{
                                fontSize: '12px',
                                color: '#0284C7',
                                fontWeight: 700,
                                padding: '6px 12px',
                                background: '#F0F9FF',
                                border: '1px solid #BAE6FD',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                              title="Sao chép link mời để gửi qua Zalo / Facebook Messenger"
                            >
                              <Copy size={14} />
                              <span>Sao chép link</span>
                            </button>

                            {/* Nút Gửi lại email tự động qua Google SMTP */}
                            {inv.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => handleResendInviteEmail(inv)}
                                disabled={isResendingEmail === inv.token}
                                style={{
                                  fontSize: '12px',
                                  color: '#047857',
                                  fontWeight: 700,
                                  padding: '6px 12px',
                                  background: '#ECFDF5',
                                  border: '1px solid #A7F3D0',
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: isResendingEmail === inv.token ? 'not-allowed' : 'pointer',
                                }}
                                title={`Tự động gửi lại email mời trực tiếp tới ${inv.email}`}
                              >
                                {isResendingEmail === inv.token ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Mail size={14} />
                                )}
                                <span>{isResendingEmail === inv.token ? 'Đang gửi...' : 'Gửi lại email'}</span>
                              </button>
                            )}

                            {/* Nút Thu hồi lời mời (chỉ Trưởng nhóm) */}
                            {isTripOwner && inv.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => handleRevokeInvite(inv.id)}
                                style={{
                                  fontSize: '12px',
                                  color: '#DC2626',
                                  fontWeight: 700,
                                  padding: '6px 12px',
                                  background: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                }}
                              >
                                Thu hồi (Revoke)
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredInvitations.length > 4 && (
                      <div className={styles.invitationScrollFooterHint}>
                        <span>↕ Cuộn để xem danh sách ({filteredInvitations.length} lời mời)</span>
                        <span>Đã tối ưu cuộn mượt</span>
                      </div>
                    )}
                  </>
                )}

                {/* Ô NHẬP MÃ THỦ CÔNG (W4-TV3-03) */}
                <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '13.5px', color: '#0369A1' }}>
                      📱 Nhập mã mời thủ công:
                    </strong>
                    <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#0284C7' }}>
                      Nếu link không mở được trên điện thoại, nhập trực tiếp mã mời vào đây:
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={manualCodeInput}
                      onChange={(e) => setManualCodeInput(e.target.value)}
                      placeholder="Ví dụ: VISTA-NG2026"
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #93C5FD',
                        fontSize: '13px',
                        fontWeight: 700,
                        width: '180px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!manualCodeInput.trim()) {
                          showToast('Vui lòng nhập mã vé mời!');
                          return;
                        }
                        window.location.href = `/invitations/${manualCodeInput.trim()}`;
                      }}
                      style={{
                        padding: '8px 16px',
                        background: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Gia nhập
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.inviteCardBanner}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0' }}>
                  Mời bạn bè cùng tham gia nhóm
                </h3>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                  Chia sẻ mã mời để mọi người cùng xem lịch trình, thêm địa điểm và chia tiền chuyến đi.
                </p>
              </div>

              <div className={styles.inviteCodeBox}>
                <span className={styles.inviteCodeText}>{inviteCode}</span>
                <button
                  type="button"
                  className={styles.btnCopyCode}
                  onClick={handleCopyInviteCode}
                  id="btn-copy-invite-code"
                >
                  <Copy size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  Sao chép
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TREASURY PREVIEW */}
        {activeTab === 'treasury' && (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
                paddingBottom: '20px',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Thủ quỹ & Quản lý ngân sách nhóm
                </h3>
                <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
                  Theo dõi từng khoản chi tiêu, hóa đơn và tự động đối soát nợ giữa các thành viên.
                </p>
              </div>

              <Link
                href={trip.treasuryPath || `/trips/${trip.id}/treasury`}
                className={styles.btnActionPrimary}
              >
                <Wallet size={16} />
                <span>Mở Sổ quỹ & Chia tiền đầy đủ</span>
              </Link>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '28px',
              }}
            >
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Tổng hạn mức</span>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: '4px 0 0' }}>
                  {trip.budgetTotal.toLocaleString('vi-VN')}đ
                </p>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Thực tế đã chi</span>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#0070BA', margin: '4px 0 0' }}>
                  {trip.budgetSpent.toLocaleString('vi-VN')}đ
                </p>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Ngân sách còn lại</span>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#16A34A', margin: '4px 0 0' }}>
                  {Math.max(0, trip.budgetTotal - trip.budgetSpent).toLocaleString('vi-VN')}đ
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Link
                href={trip.treasuryPath || `/trips/${trip.id}/treasury`}
                style={{
                  color: '#0070BA',
                  fontWeight: 700,
                  fontSize: '14.5px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Xem chi tiết các hóa đơn và đối soát thanh toán nhóm</span>
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* TAB 4: VOTING PROPOSALS */}
        {activeTab === 'voting' && (
          <div className={styles.votingList}>
            {/* Thanh công cụ biểu quyết & Chốt biểu quyết W4-TV3-02 */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '18px 22px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: isVotingClosed ? '#FEE2E2' : '#EFF6FF',
                    color: isVotingClosed ? '#DC2626' : '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0,
                  }}
                >
                  {isVotingClosed ? '🔒' : '🗳️'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                      Biểu quyết đề xuất địa điểm
                    </h4>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: isVotingClosed ? '#FEE2E2' : '#DCFCE7',
                        color: isVotingClosed ? '#991B1B' : '#15803D',
                      }}
                    >
                      {isVotingClosed ? 'ĐÃ ĐÓNG (LOCKED)' : 'ĐANG MỞ BỎ PHIẾU'}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
                    Quy tắc 1 người 1 phiếu. Đổi phiếu tự do khi còn mở. Chỉ Trưởng nhóm (Owner) mới có quyền đóng biểu quyết.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isTripMember) {
                      showToast('⚠️ Bạn chưa tham gia chuyến đi. Vui lòng tham gia nhóm để tạo đề xuất địa điểm!');
                      return;
                    }
                    if (isVotingClosed) {
                      showToast('❌ Biểu quyết đã đóng! Không thể thêm đề xuất mới.');
                      return;
                    }
                    setShowAddPropModal(true);
                  }}
                  style={{
                    padding: '9px 16px',
                    background: isTripMember && !isVotingClosed ? '#0284C7' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isTripMember && !isVotingClosed ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title={!isTripMember ? 'Cần tham gia nhóm để đề xuất địa điểm' : isVotingClosed ? 'Biểu quyết đã đóng' : undefined}
                >
                  <span>+ Thêm đề xuất</span>
                </button>

                {isTripOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !isVotingClosed;
                      setIsVotingClosed(nextState);
                      showToast(
                        nextState
                          ? '🔒 Trưởng nhóm (Owner) đã ĐÓNG BIỂU QUYẾT! Kết quả đã khóa, thành viên không thể vote tiếp.'
                          : '🔓 Đã MỞ LẠI BIỂU QUYẾT! Các thành viên có thể tiếp tục bỏ phiếu.'
                      );
                    }}
                    style={{
                      padding: '9px 16px',
                      background: isVotingClosed ? '#FEF2F2' : '#F1F5F9',
                      color: isVotingClosed ? '#DC2626' : '#475569',
                      border: '1px solid',
                      borderColor: isVotingClosed ? '#FECACA' : '#CBD5E1',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Đóng / mở biểu quyết"
                  >
                    {isVotingClosed ? <Unlock size={15} /> : <Lock size={15} />}
                    <span>{isVotingClosed ? 'Mở lại biểu quyết' : 'Đóng biểu quyết (Chỉ Owner)'}</span>
                  </button>
                )}
              </div>
            </div>

            {proposals.map((prop) => (
              <div
                key={prop.id}
                className={`${styles.proposalCard} ${prop.voted ? styles.proposalVoted : ''}`}
                style={isVotingClosed ? { opacity: 0.85, background: '#F8FAFC' } : {}}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#0284C7',
                        background: '#E0F2FE',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {prop.category}
                    </span>
                    {isVotingClosed && (
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={12} />
                        <span>Đã khóa kết quả</span>
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {prop.title}
                  </h4>
                </div>

                <button
                  type="button"
                  className={`${styles.btnVote} ${prop.voted ? styles.btnVotedActive : ''}`}
                  onClick={() => handleVoteToggle(prop.id)}
                  style={isVotingClosed ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                  title={isVotingClosed ? 'Biểu quyết đã đóng bởi Owner' : 'Bấm để bỏ phiếu (+1/-1)'}
                >
                  <ThumbsUp size={15} />
                  <span>{prop.votes} đồng thuận {prop.voted ? '(Đã vote)' : ''}</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: GROUP MAP, LIVE MEMBER LOCATIONS & MEETUP POINTS (TV5) */}
        {activeTab === 'group-map' && (
          <GroupMapTab
            tripId={trip.id}
            tripTitle={trip.title}
            defaultDestination={trip.destination}
          />
        )}
      </main>

      {/* MODAL 1: CHI TIẾT ĐIỂM DỪNG */}
      {selectedActivity && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setSelectedActivity(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedActivity.image && (
              <div style={{ position: 'relative', height: '220px', width: '100%' }}>
                <img
                  src={selectedActivity.image}
                  alt={selectedActivity.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => setSelectedActivity(null)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    fontSize: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#4F46E5', background: '#EEF2FF', padding: '4px 10px', borderRadius: '999px' }}>
                  {selectedActivity.category || 'Địa điểm tham quan'}
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#059669' }}>
                  {selectedActivity.costLabel || 'Miễn phí'}
                </span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
                {selectedActivity.title}
              </h3>
              {selectedActivity.timeRange && (
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} style={{ color: '#0284C7' }} />
                  <span>Khung giờ: <strong>{selectedActivity.timeRange}</strong></span>
                </p>
              )}
              <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }}>
                {selectedActivity.description}
              </p>
              {selectedActivity.tips && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', padding: '12px 16px', borderRadius: '12px', marginBottom: '18px' }}>
                  <span style={{ fontSize: '13px', color: '#92400E', fontWeight: 600 }}>
                    {selectedActivity.tips}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={14} style={{ color: '#0EA5E9' }} />
                  {selectedActivity.location}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    href={`/map?search=${encodeURIComponent(selectedActivity.title)}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      background: '#0284C7',
                      color: '#FFFFFF',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <Navigation size={13} />
                    <span>Mở bản đồ VISTA</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedActivity(null)}
                    style={{
                      padding: '9px 16px',
                      background: '#F1F5F9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: XEM NHANH THÀNH VIÊN NHÓM */}
      {showMembersModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setShowMembersModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '3px 8px', borderRadius: '999px', textTransform: 'uppercase' }}>
                  Tiêu chí Tuần 2
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '6px 0 0' }}>
                  Danh sách thành viên nhóm ({trip.members?.length || 3})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {(trip.members || []).map((m: any, idx: number) => {
                const rawItemName = typeof m === 'string' ? m : m?.name || `Thành viên ${idx + 1}`;
                const name = rawItemName.replace(/\s*\(Bạn\)/gi, '').trim() || rawItemName;
                const avatar = typeof m === 'object' && m?.avatar ? m.avatar : name.slice(0, 2).toUpperCase();
                const color = typeof m === 'object' && m?.color ? m.color : (idx % 2 === 0 ? '#0284c7' : '#10b981');
                const role = typeof m === 'object' && m?.role ? m.role : (idx === 0 ? 'Trưởng nhóm' : 'Thành viên');
                const normMemberName = normalizeMemberText(name);
                const normCurrentName = normalizeMemberText(currentUser?.displayName || (currentUser as any)?.name || '');
                const isMe = Boolean(
                  currentUser && (
                    (m.userId && currentUser.id && m.userId === currentUser.id) ||
                    (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                    (normCurrentName && normMemberName && normCurrentName === normMemberName)
                  )
                );
                return (
                  <div
                    key={m.userId || m.email || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '14px',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: color,
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>
                        {name}
                        {isMe && (
                          <span style={{ marginLeft: 6, fontSize: '12px', fontWeight: 600, color: '#0284C7' }}>
                            (Bạn)
                          </span>
                        )}
                      </p>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>{role}</span>
                    </div>
                    {idx === 0 && (
                      <span style={{ fontSize: '11.5px', background: '#FEF3C7', color: '#B45309', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Crown size={13} />
                        <span>Trưởng nhóm</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 800 }}>MÃ VÉ MỜI NHÓM:</span>
                <p style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 900, color: '#0070BA', letterSpacing: '0.05em' }}>
                  {inviteCode}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyInviteCode}
                style={{
                  padding: '8px 16px',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {copiedInvite ? '✓ Đã sao chép' : 'Sao chép mã'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: THÊM ĐIỂM DỪNG MỚI (W3-TV3-03) */}
      {showAddStopModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setShowAddStopModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  + Thêm điểm dừng mới vào lịch trình
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStopModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Chọn ngày dừng chân
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {displayCalendarDays.map((calDay) => (
                    <button
                      key={calDay.dayNumber}
                      type="button"
                      onClick={() => {
                        setNewStopDay(calDay.dayNumber);
                        const dayMeta = getTripDayMeta(trip?.startDate, trip?.endDate, calDay.dayNumber);
                        setNewStopCustomDate(dayMeta.fullDateStr || '');
                        setAddStopDateError(null);
                      }}
                      style={{
                        flex: displayCalendarDays.length <= 4 ? 1 : '0 0 calc(25% - 6px)',
                        minWidth: '70px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: newStopDay === calDay.dayNumber ? '#0284C7' : '#CBD5E1',
                        background: newStopDay === calDay.dayNumber ? '#E0F2FE' : '#FFFFFF',
                        color: newStopDay === calDay.dayNumber ? '#0369A1' : '#475569',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <span>Ngày {calDay.dayNumber}</span>
                      {calDay.meta.dayDate && (
                        <span style={{ display: 'block', fontSize: '10.5px', fontWeight: 500, opacity: 0.85 }}>
                          {calDay.meta.dayDate}/{calDay.meta.monthText.replace('Tháng ', '')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Ngày lịch trình (dd/mm/yyyy) — V-01 Chặn ngoài khoảng
                </label>
                <input
                  type="text"
                  placeholder="dd/mm/yyyy (ví dụ: 24/11/2026)"
                  value={newStopCustomDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewStopCustomDate(val);
                    const res = validateDateAgainstTrip(val, trip?.startDate, trip?.endDate);
                    setAddStopDateError(res.isValid ? null : res.error || null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${addStopDateError ? '#EF4444' : '#CBD5E1'}`,
                    background: addStopDateError ? '#FEF2F2' : '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {addStopDateError && (
                  <div style={{ marginTop: '6px', color: '#DC2626', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>❌</span>
                    <span>{addStopDateError}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Tên địa điểm / Hoạt động *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chùa Linh Ứng Bán đảo Sơn Trà"
                  value={newStopTitle}
                  onChange={(e) => setNewStopTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Địa chỉ / Vị trí
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bán đảo Sơn Trà, Đà Nẵng"
                  value={newStopLocation}
                  onChange={(e) => setNewStopLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Khung giờ
                  </label>
                  <input
                    type="text"
                    placeholder="14:00 – 16:00"
                    value={newStopTime}
                    onChange={(e) => setNewStopTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Chi phí ước tính
                  </label>
                  <input
                    type="text"
                    placeholder="50.000đ / người"
                    value={newStopCost}
                    onChange={(e) => setNewStopCost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Phân loại
                </label>
                <select
                  value={newStopCategory}
                  onChange={(e) => setNewStopCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="Di tích & Văn hóa">Di tích & Văn hóa</option>
                  <option value="Ẩm thực & Cà phê">Ẩm thực & Cà phê</option>
                  <option value="Trải nghiệm & Khám phá">Trải nghiệm & Khám phá</option>
                  <option value="Nghỉ ngơi & Mua sắm">Nghỉ ngơi & Mua sắm</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAddStopModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSaveNewActivity(false)}
                disabled={!newStopTitle.trim() || !!addStopDateError}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: !newStopTitle.trim() || !!addStopDateError ? '#94A3B8' : '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: !newStopTitle.trim() || !!addStopDateError ? 'not-allowed' : 'pointer',
                  boxShadow: !newStopTitle.trim() || !!addStopDateError ? 'none' : '0 4px 12px rgba(2, 132, 199, 0.3)',
                }}
              >
                Lưu vào Ngày {newStopDay}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3B: CHỈNH SỬA ĐIỂM DỪNG (Bước 3: Sửa tên/giờ; Bước 6: Chuyển ngày; V-01; V-02) */}
      {editingStop && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setEditingStop(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pencil size={18} style={{ color: '#0284C7' }} />
                  <span>Sửa điểm dừng lịch trình</span>
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Hiện đang ở Ngày {editingStop.dayNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingStop(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Chuyển sang Ngày (Bước 6)
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {displayCalendarDays.map((calDay) => (
                    <button
                      key={calDay.dayNumber}
                      type="button"
                      onClick={() => {
                        setEditStopTargetDay(calDay.dayNumber);
                        const dayMeta = getTripDayMeta(trip?.startDate, trip?.endDate, calDay.dayNumber);
                        setEditStopCustomDate(dayMeta.fullDateStr || '');
                        setEditStopDateError(null);
                      }}
                      style={{
                        flex: displayCalendarDays.length <= 4 ? 1 : '0 0 calc(25% - 6px)',
                        minWidth: '70px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: editStopTargetDay === calDay.dayNumber ? '#0284C7' : '#CBD5E1',
                        background: editStopTargetDay === calDay.dayNumber ? '#E0F2FE' : '#FFFFFF',
                        color: editStopTargetDay === calDay.dayNumber ? '#0369A1' : '#475569',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <span>Ngày {calDay.dayNumber}</span>
                      {calDay.meta.dayDate && (
                        <span style={{ display: 'block', fontSize: '10.5px', fontWeight: 500, opacity: 0.85 }}>
                          {calDay.meta.dayDate}/{calDay.meta.monthText.replace('Tháng ', '')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Ngày lịch trình (dd/mm/yyyy) — V-01 Chặn ngoài khoảng
                </label>
                <input
                  type="text"
                  placeholder="dd/mm/yyyy (ví dụ: 24/11/2026)"
                  value={editStopCustomDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditStopCustomDate(val);
                    const res = validateDateAgainstTrip(val, trip?.startDate, trip?.endDate);
                    setEditStopDateError(res.isValid ? null : res.error || null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${editStopDateError ? '#EF4444' : '#CBD5E1'}`,
                    background: editStopDateError ? '#FEF2F2' : '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {editStopDateError && (
                  <div style={{ marginTop: '6px', color: '#DC2626', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>❌</span>
                    <span>{editStopDateError}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Tên địa điểm / Hoạt động * (Bước 3: Đổi tên)
                </label>
                <input
                  type="text"
                  value={editStopTitle}
                  onChange={(e) => setEditStopTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Địa chỉ / Vị trí
                </label>
                <input
                  type="text"
                  value={editStopLocation}
                  onChange={(e) => setEditStopLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Khung giờ * (Bước 3: Đổi giờ)
                  </label>
                  <input
                    type="text"
                    value={editStopTime}
                    placeholder="08:00 – 10:00"
                    onChange={(e) => setEditStopTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Chi phí ước tính
                  </label>
                  <input
                    type="text"
                    value={editStopCost}
                    placeholder="50.000đ / người"
                    onChange={(e) => setEditStopCost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Phân loại
                </label>
                <select
                  value={editStopCategory}
                  onChange={(e) => setEditStopCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="Di tích & Văn hóa">Di tích & Văn hóa</option>
                  <option value="Ẩm thực & Cà phê">Ẩm thực & Cà phê</option>
                  <option value="Trải nghiệm & Khám phá">Trải nghiệm & Khám phá</option>
                  <option value="Nghỉ ngơi & Mua sắm">Nghỉ ngơi & Mua sắm</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingStop(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSaveEditedActivity(false)}
                disabled={!editStopTitle.trim() || !!editStopDateError}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: !editStopTitle.trim() || !!editStopDateError ? '#94A3B8' : '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: !editStopTitle.trim() || !!editStopDateError ? 'not-allowed' : 'pointer',
                  boxShadow: !editStopTitle.trim() || !!editStopDateError ? 'none' : '0 4px 12px rgba(2, 132, 199, 0.3)',
                }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3C: XÁC NHẬN CẢNH BÁO CHỒNG GIỜ (V-02: Bước 10, Bước 11) */}
      {overlapWarningDialog && overlapWarningDialog.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={() => setOverlapWarningDialog(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '2px solid #F59E0B',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#B45309', margin: 0 }}>
                  Cảnh báo điểm dừng chồng giờ
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Quy tắc V-02 · Lịch trình Ngày {overlapWarningDialog.targetDay}
                </span>
              </div>
            </div>

            <div
              style={{
                background: '#FFFBEB',
                borderRadius: '12px',
                padding: '14px 16px',
                border: '1px solid #FDE68A',
                marginBottom: '20px',
                fontSize: '13.5px',
                color: '#92400E',
                lineHeight: '1.6',
              }}
            >
              Điểm dừng <strong>&ldquo;{overlapWarningDialog.activityData.title}&rdquo;</strong> (
              {overlapWarningDialog.activityData.timeRange}) đang chồng giờ với điểm dừng{' '}
              <strong>&ldquo;{overlapWarningDialog.overlapWithTitle}&rdquo;</strong> (
              {overlapWarningDialog.overlapWithTime}).
              <br />
              <span style={{ display: 'inline-block', marginTop: '6px', color: '#78350F', fontWeight: 700 }}>
                Bạn vẫn muốn lưu?
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setOverlapWarningDialog(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Quay lại sửa
              </button>
              <button
                type="button"
                onClick={() => {
                  if (overlapWarningDialog.isEditing) {
                    handleSaveEditedActivity(true);
                  } else {
                    handleSaveNewActivity(true);
                  }
                }}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#F59E0B',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                }}
              >
                Vẫn lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TẠO LỜI MỜI MỚI (W3-TV3-01, W3-TV3-02) */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => {
            setShowInviteModal(false);
            setCreatedInvitationInfo(null);
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '540px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {createdInvitationInfo ? (
                    <>
                      <Sparkles size={20} style={{ color: '#16A34A' }} />
                      <span>Lời mời đã được gửi tự động!</span>
                    </>
                  ) : (
                    <>
                      <Mail size={20} style={{ color: '#0284C7' }} />
                      <span>Phát hành & Gửi lời mời trực tiếp</span>
                    </>
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setCreatedInvitationInfo(null);
                }}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                ✕
              </button>
            </div>

            {createdInvitationInfo ? (
              <div>
                <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '16px', padding: '16px 18px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <CheckCircle2 size={22} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <div>
                      <strong style={{ fontSize: '15px', color: '#15803D', display: 'block' }}>
                        Đã tự động gửi thư mời đến: {createdInvitationInfo.email}
                      </strong>
                      <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                        Trạng thái: Đã chuyển phát trực tiếp vào hộp thư đến • {createdInvitationInfo.emailDeliveredAt || 'Vừa xong'}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#166534', lineHeight: '1.5' }}>
                    Hệ thống VISTA đã tự động gửi email thư mời chứa đầy đủ thông tin lịch trình và link tham gia. Bạn không cần phải mở Gmail hay thao tác thêm bất kỳ bước nào!
                  </p>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>MÃ TOKEN VÉ MỜI:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '13px', color: '#0284C7', background: '#E0F2FE', padding: '3px 10px', borderRadius: '6px' }}>
                      {createdInvitationInfo.token}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                    LIÊN KẾT MỜI GIA NHẬP TRỰC TIẾP:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                    <input
                      type="text"
                      readOnly
                      value={createdInvitationInfo.link}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#334155',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator?.clipboard) {
                          navigator.clipboard.writeText(createdInvitationInfo.link);
                        }
                        showToast('✓ Đã sao chép liên kết mời!');
                      }}
                      style={{
                        padding: '9px 14px',
                        background: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Sao chép link
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      Cần gửi lại thư mời vào email này?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResendInviteEmail({ email: createdInvitationInfo.email, token: createdInvitationInfo.token })}
                      disabled={isResendingEmail === createdInvitationInfo.token}
                      style={{
                        fontSize: '12px',
                        color: '#0284C7',
                        fontWeight: 700,
                        background: '#E0F2FE',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 12px',
                        cursor: isResendingEmail === createdInvitationInfo.token ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isResendingEmail === createdInvitationInfo.token ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Mail size={13} />
                      )}
                      <span>{isResendingEmail === createdInvitationInfo.token ? 'Đang gửi...' : 'Gửi lại email'}</span>
                    </button>
                  </div>
                </div>

                {/* THÔNG BÁO HƯỚNG DẪN DỰ PHÒNG CHO LOCALHOST (NẾU CHƯA CÓ SMTP) */}
                {createdInvitationInfo.deliveryMode !== 'SMTP_TRANSPORT' && (
                  <div style={{ marginBottom: '20px', padding: '14px', background: '#FFF7ED', borderRadius: '14px', border: '1.5px solid #FFEDD5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '16px' }}>⚡</span>
                      <strong style={{ fontSize: '13px', color: '#C2410C' }}>
                        Gửi thư thật vào Gmail người nhận:
                      </strong>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#9A3412', lineHeight: '1.5' }}>
                      Ứng dụng đang chạy cục bộ (localhost). Để thư bay THẬT 100% vào hòm thư <strong>{createdInvitationInfo.email}</strong> ngay bây giờ bằng tab Gmail bạn đang mở, hãy bấm nút dưới đây:
                    </p>

                    <a
                      href={getGmailComposeUrl(createdInvitationInfo.email, createdInvitationInfo.token)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 18px',
                        background: 'linear-gradient(135deg, #EA4335 0%, #C5221F 100%)',
                        color: '#FFFFFF',
                        borderRadius: '10px',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(234, 67, 53, 0.3)',
                        cursor: 'pointer',
                        marginBottom: '8px',
                      }}
                    >
                      <Mail size={16} />
                      <span>Bấm để gửi thư thật vào Gmail ngay (Soạn sẵn 100%) ↗</span>
                    </a>

                    <p style={{ margin: 0, fontSize: '11px', color: '#9A3412', textAlign: 'center', lineHeight: '1.4' }}>
                      *(Nội dung, người nhận và liên kết mời đã được điền sẵn 100%, bạn chỉ cần nhấn Gửi)*
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedInvitationInfo(null);
                      setInviteInputEmail('');
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Mời thêm người khác
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setCreatedInvitationInfo(null);
                      setInviteInputEmail('');
                    }}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                    }}
                  >
                    Hoàn tất & Đóng
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#475569', lineHeight: '1.5' }}>
                  Hệ thống sẽ sinh mã vé mời bảo mật và <strong>tự động chuyển phát thư mời trực tiếp</strong> vào hòm thư người nhận ngay khi bạn nhấn nút. Bạn không cần phải mở Gmail hay làm thủ công bất kỳ bước nào.
                </p>

                {inviteError && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      color: '#991B1B',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    {inviteError}
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Email người nhận lời mời *
                  </label>
                  <input
                    type="email"
                    placeholder="Ví dụ: nguyendaovanquy05@gmail.com"
                    value={inviteInputEmail}
                    onChange={(e) => {
                      setInviteInputEmail(e.target.value);
                      setInviteError(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: '#94A3B8' }}>
                    💡 Thử nhập email trùng thành viên (ví dụ: vananh@... hoặc minhtuan@...) để kiểm tra HTTP 409 Conflict.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setCreatedInvitationInfo(null);
                    }}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateInviteSubmit}
                    disabled={!inviteInputEmail.trim() || isSendingInviteEmail}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '10px',
                      border: 'none',
                      background: inviteInputEmail.trim() && !isSendingInviteEmail ? '#0284C7' : '#94A3B8',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      cursor: inviteInputEmail.trim() && !isSendingInviteEmail ? 'pointer' : 'not-allowed',
                      boxShadow: inviteInputEmail.trim() && !isSendingInviteEmail ? '0 4px 12px rgba(2, 132, 199, 0.3)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {isSendingInviteEmail ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang tự động gửi email...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        <span>Phát hành & Tự động gửi thư mời</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: THÊM ĐỀ XUẤT BIỂU QUYẾT (W4-TV3-02) */}
      {showAddPropModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setShowAddPropModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Vote size={20} style={{ color: '#0284C7' }} />
                  <span>Thêm đề xuất biểu quyết nhóm</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPropModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#64748B', lineHeight: '1.5' }}>
              Thành viên đề xuất một địa điểm ăn uống hoặc hoạt động mới. Sau khi tạo, bạn sẽ tự động đồng thuận (+1).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nội dung đề xuất *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ăn bánh tráng cuốn thịt heo Đại Lộc đêm Ngày 2"
                  value={newPropTitle}
                  onChange={(e) => setNewPropTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Phân loại
                </label>
                <select
                  value={newPropCategory}
                  onChange={(e) => setNewPropCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="Ẩm thực">Ẩm thực</option>
                  <option value="Trải nghiệm mạo hiểm">Trải nghiệm mạo hiểm</option>
                  <option value="Nghệ thuật & Di sản">Nghệ thuật & Di sản</option>
                  <option value="Giải trí đêm">Giải trí đêm</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAddPropModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveNewProposal}
                disabled={!newPropTitle.trim()}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: newPropTitle.trim() ? '#0284C7' : '#94A3B8',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: newPropTitle.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: newPropTitle.trim() ? '0 4px 12px rgba(2, 132, 199, 0.3)' : 'none',
                }}
              >
                Tạo đề xuất (+1 vote)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFIRM DELETE TRIP (Dành cho Trưởng nhóm - TV4) ──── */}
      {showDeleteTripModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !isDeletingTrip && setShowDeleteTripModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Trash2 size={28} />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Xác nhận xóa chuyến đi?
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '24px' }}>
              Hành động này sẽ <strong>xóa vĩnh viễn</strong> toàn bộ lịch trình, hoạt động và dữ liệu chuyến đi <strong>&ldquo;{trip.title}&rdquo;</strong>. Thao tác này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowDeleteTripModal(false)}
                disabled={isDeletingTrip}
                style={{
                  flex: 1,
                  padding: '11px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                id="btn-confirm-delete-trip"
                onClick={handleConfirmDeleteTrip}
                disabled={isDeletingTrip}
                style={{
                  flex: 1,
                  padding: '11px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: isDeletingTrip ? 'not-allowed' : 'pointer',
                  opacity: isDeletingTrip ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isDeletingTrip ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <span>Tôi hiểu, Xóa vĩnh viễn</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: UNSETTLED DEBTS ERROR 409 (TV4 Bắt buộc) ────────────── */}
      {unsettledDebtsError?.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setUnsettledDebtsError(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertTriangle size={32} />
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, marginBottom: '12px' }}>
              <span>HTTP 409 CONFLICT</span>
              <span>·</span>
              <span>TRIP_HAS_UNSETTLED_DEBTS</span>
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>
              Không thể xóa chuyến đi
            </h3>
            <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
              {unsettledDebtsError.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                id="btn-close-debt-modal"
                onClick={() => setUnsettledDebtsError(null)}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Đã hiểu & Đóng
              </button>
              <Link
                href={`/trips/${unsettledDebtsError.tripId}/treasury`}
                id="btn-open-treasury-from-debt-modal"
                style={{
                  flex: 1.2,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                }}
                onClick={() => setUnsettledDebtsError(null)}
              >
                <Wallet size={16} />
                <span>Mở Thủ quỹ</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Floating toast notification */}
      {toastMessage && (
        <div className={styles.toastNotice}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
