'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import {
  Sparkles,
  Ticket,
  Plus,
  Briefcase,
  Calendar,
  Compass,
  CheckCircle2,
  Search,
  ChevronDown,
  LayoutGrid,
  List,
  MapPin,
  MoreHorizontal,
  Bell,
  Shuffle,
  Camera,
  Check,
  Star,
  X,
  ThumbsUp,
  CheckSquare,
  Users,
  Trash2,
  ClipboardList,
  FileText,
  ShieldAlert,
  Crown,
  Info,
  Lock,
  ArrowRight,
  Clipboard,
  KeyRound,
  AlertTriangle,
  Wallet,
  Loader2,
  CreditCard,
} from 'lucide-react';
import { SkeletonCardGrid } from '@/components/common/Skeleton';
import {
  POPULAR_DESTINATIONS,
  getSampleItineraryForDestination,
  getDestinationHeroImage,
} from '@/data/sampleItineraries';
import { seedSampleItineraryToTrip, toIsoDateOffset } from '@/utils/itinerarySeed';
import { resolveTripStatus } from '@/utils/tripDateUtils';
import styles from './trips.module.css';

interface TripMember {
  name: string;
  avatar: string;
  color: string;
  role?: string;
  userId?: string;
  email?: string;
}

interface TripItem {
  id: string;
  title: string;
  destination: string;
  durationBadge: string;
  startDate: string;
  endDate: string;
  rawStartDate?: string;
  rawEndDate?: string;
  status: 'ACTIVE' | 'PLANNING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  role: 'OWNER' | 'MEMBER';
  ownerId?: string;
  budgetTotal: number;
  budgetSpent: number;
  progressPercent: number;
  members: TripMember[];
  image: string;
  treasuryPath: string;
  rating?: number;
  alertType?: 'AMBER' | 'BLUE' | 'COMPLETED';
  alertText?: string;
  alertLinkText?: string;
  quickActions: Array<{ label: string; href?: string; actionType?: string }>;
  itineraryDays?: Array<{
    dayNumber?: number;
    dateStr?: string;
    title?: string;
    activities?: Array<{ id?: string; title?: string }>;
  }>;
}

function parseTripLocalDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }
  if (clean.includes('/')) {
    const parts = clean.split('/').map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const y = parts.length >= 3 && parts[2] > 1900 ? parts[2] : new Date().getFullYear();
      const dt = new Date(y, parts[1] - 1, parts[0], 12, 0, 0);
      return isNaN(dt.getTime()) ? null : dt;
    }
  }
  return null;
}

function formatTicketDateRange(start?: string, end?: string): string {
  const s = parseTripLocalDate(start);
  const e = parseTripLocalDate(end);
  if (!s && !e) return '';
  if (s && !e) {
    return `${String(s.getDate()).padStart(2, '0')}/${String(s.getMonth() + 1).padStart(2, '0')}/${s.getFullYear()}`;
  }
  if (!s && e) {
    return `${String(e.getDate()).padStart(2, '0')}/${String(e.getMonth() + 1).padStart(2, '0')}/${e.getFullYear()}`;
  }
  if (!s || !e) return '';
  const sd = String(s.getDate()).padStart(2, '0');
  const sm = String(s.getMonth() + 1).padStart(2, '0');
  const ed = String(e.getDate()).padStart(2, '0');
  const em = String(e.getMonth() + 1).padStart(2, '0');
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return s.getDate() === e.getDate()
      ? `${sd}/${sm}/${s.getFullYear()}`
      : `${sd}–${ed}/${sm}/${s.getFullYear()}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${sd}/${sm} – ${ed}/${em}/${s.getFullYear()}`;
  }
  return `${sd}/${sm}/${s.getFullYear()} – ${ed}/${em}/${e.getFullYear()}`;
}

interface TimelineNodeItem {
  dayNumber: number;
  dateLabel: string;
  stopLabel: string;
  isToday: boolean;
  isPast: boolean;
}

function buildTripTimelineData(trip: TripItem, now: Date) {
  const startDt = parseTripLocalDate(trip.rawStartDate || trip.startDate);
  const endDt = parseTripLocalDate(trip.rawEndDate || trip.endDate);
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

  let totalDays: number | null = null;
  if (startDt && endDt && endDt.getTime() >= startDt.getTime()) {
    totalDays = Math.round((endDt.getTime() - startDt.getTime()) / 86400000) + 1;
  } else if (Array.isArray(trip.itineraryDays) && trip.itineraryDays.length > 0) {
    totalDays = trip.itineraryDays.length;
  }

  let currentDayIndex: number | null = null;
  if (startDt && endDt && todayNoon.getTime() >= startDt.getTime() && todayNoon.getTime() <= endDt.getTime()) {
    currentDayIndex = Math.round((todayNoon.getTime() - startDt.getTime()) / 86400000) + 1;
  }

  const rawDays = Array.isArray(trip.itineraryDays) ? trip.itineraryDays : [];
  const nodes: TimelineNodeItem[] = rawDays.map((d, idx) => {
    const dayNum = d.dayNumber || idx + 1;
    let dateLabel = '';
    if (startDt) {
      const dt = new Date(startDt);
      dt.setDate(startDt.getDate() + (dayNum - 1));
      dateLabel = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
    } else if (d.dateStr) {
      dateLabel = d.dateStr;
    } else {
      dateLabel = `Ngày ${dayNum}`;
    }
    const firstAct = Array.isArray(d.activities) && d.activities.length > 0 ? d.activities[0]?.title : '';
    const stopLabel = firstAct || d.title || `Ngày ${dayNum}`;
    return {
      dayNumber: dayNum,
      dateLabel,
      stopLabel,
      isToday: currentDayIndex !== null && currentDayIndex === dayNum,
      isPast: currentDayIndex !== null && dayNum < currentDayIndex,
    };
  });

  return {
    totalDays,
    currentDayIndex,
    isTodayInTrip: currentDayIndex !== null,
    dateRangeText: formatTicketDateRange(trip.rawStartDate || trip.startDate, trip.rawEndDate || trip.endDate),
    nodes,
  };
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

const DEFAULT_DEMO_TRIPS: TripItem[] = [
  {
    id: 'trip-danang-2026',
    title: 'Khám phá Đà Nẵng - Hội An 4N3Đ',
    destination: 'Đà Nẵng & Quảng Nam',
    durationBadge: '4 ngày 3 đêm',
    startDate: '15/11',
    endDate: '18/11/2026',
    status: 'PLANNING',
    role: 'OWNER',
    budgetTotal: 18500000,
    budgetSpent: 5200000,
    progressPercent: 35,
    members: [
      { name: 'Quý Nguyễn (Bạn)', avatar: 'QN', color: '#0284c7' },
      { name: 'Trần Minh Tuấn', avatar: 'MT', color: '#10b981' },
      { name: 'Lê Vân Anh', avatar: 'VA', color: '#f59e0b' },
    ],
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
    treasuryPath: '/trips/trip-danang-2026/treasury',
    alertType: 'BLUE',
    alertText: 'Chờ biểu quyết chặng: Đang mở bình chọn địa điểm ăn tối Ngày 2.',
    alertLinkText: 'Bình chọn',
    quickActions: [
      { label: 'Lịch trình', href: '/trips/trip-danang-2026' },
      { label: 'Thủ quỹ', href: '/trips/trip-danang-2026/treasury' },
      { label: 'Thành viên', href: '/trips/trip-danang-2026' },
    ],
  },
  {
    id: 'trip-hagiang-2026',
    title: 'Chinh phục Cực Bắc Hà Giang',
    destination: 'Hà Giang',
    durationBadge: '3 ngày 2 đêm',
    startDate: '28/11',
    endDate: '30/11/2026',
    status: 'ACTIVE',
    role: 'MEMBER',
    budgetTotal: 12000000,
    budgetSpent: 8400000,
    progressPercent: 70,
    members: [
      { name: 'Phạm Thanh Sơn', avatar: 'TS', color: '#6366f1' },
      { name: 'Quý Nguyễn (Bạn)', avatar: 'QN', color: '#0284c7' },
    ],
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
    treasuryPath: '/trips/trip-hagiang-2026/treasury',
    alertType: 'AMBER',
    alertText: 'Đang diễn ra chặng đèo Mã Pí Lèng',
    quickActions: [
      { label: 'Xem chi tiết', href: '/trips/trip-hagiang-2026' },
      { label: 'Sổ chi tiêu', href: '/trips/trip-hagiang-2026/treasury' },
    ],
  },
  {
    id: 'trip-phuquoc-2026',
    title: 'Nghỉ dưỡng biển đảo ngọc Phú Quốc 3N2Đ',
    destination: 'Phú Quốc, Kiên Giang',
    durationBadge: '3 ngày 2 đêm',
    startDate: '10/09',
    endDate: '12/09/2026',
    status: 'COMPLETED',
    role: 'MEMBER',
    budgetTotal: 15000000,
    budgetSpent: 14200000,
    progressPercent: 100,
    members: [
      { name: 'Nguyễn Văn Tuấn', avatar: 'VT', color: '#0284c7' },
      { name: 'Quý Nguyễn (Bạn)', avatar: 'QN', color: '#10b981' },
    ],
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    treasuryPath: '/trips/trip-phuquoc-2026/treasury',
    alertType: 'COMPLETED',
    alertText: 'Chuyến đi đã hoàn tất xuất sắc',
    quickActions: [
      { label: 'Xem tổng kết', href: '/trips/trip-danang-2026' },
      { label: 'Sổ quỹ', href: '/trips/trip-danang-2026/treasury' },
    ],
  },
];

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDefaultEndString(): string {
  const now = new Date();
  now.setDate(now.getDate() + 4);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentUserMember(defaultRole = 'Trưởng nhóm'): TripMember {
  const u = getStoredUser();
  const rawName = u?.displayName || u?.email || 'Thành viên VISTA';
  const cleanName = rawName.replace(/\s*\(Bạn\)/g, '').trim() || 'Thành viên VISTA';
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

function normalizeMemberText(str?: string) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

function formatMembersForCurrentUser(
  members: Array<{ name: string; avatar?: string; color?: string; role?: string; email?: string; userId?: string }>,
  defaultRole = 'Trưởng nhóm'
): TripMember[] {
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

  const result: TripMember[] = [];

  for (const m of members) {
    if (!m) continue;
    const rawName = (m.name || '').replace(/\s*\([^)]*\)/g, '').trim();
    if (!rawName) continue;
    const nameNorm = normalizeMemberText(rawName);
    const email = (m.email || '').toLowerCase().trim();
    const userId = (m.userId || '').trim();

    const isMe = Boolean(
      (currentId && userId && currentId === userId) ||
      (currentEmail && email && currentEmail === email) ||
      (currentNameNorm && nameNorm && currentNameNorm === nameNorm) ||
      (m.name || '').toLowerCase().includes('(bạn)')
    );

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
        name: rawName, // Clean name
        avatar: existing.avatar || m.avatar || (rawName.slice(0, 2)).toUpperCase() || 'TV',
        color: existing.color || m.color || '#0284c7',
        email: isRealEmail ? resolvedEmail : (isExRealEmail ? existing.email : (resolvedEmail || existing.email)),
        userId: isRealUserId ? resolvedUserId : (isExRealUserId ? existing.userId : (resolvedUserId || existing.userId)),
        role: existing.role === 'Trưởng nhóm' || m.role === 'Trưởng nhóm' ? 'Trưởng nhóm' : (existing.role || m.role || 'Thành viên'),
        _isMe: isMe || (existing as any)._isMe,
      } as any;
    } else {
      result.push({
        name: rawName, // Clean name
        avatar: m.avatar || (rawName.slice(0, 2)).toUpperCase() || 'TV',
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

type DateFilterType = 'all' | 'upcoming' | 'month-10' | 'month-11' | 'month-12' | 'year-2026' | 'past';

const DATE_FILTER_OPTIONS: Array<{ key: DateFilterType; label: string; desc?: string }> = [
  { key: 'all', label: 'Tất cả thời gian', desc: 'Hiển thị mọi hành trình' },
  { key: 'upcoming', label: 'Sắp tới & Đang diễn ra', desc: 'Các chuyến đi đang hoặc sắp đi' },
  { key: 'month-10', label: 'Tháng 10 / 2026', desc: 'Hành trình trong tháng 10' },
  { key: 'month-11', label: 'Tháng 11 / 2026', desc: 'Hành trình trong tháng 11' },
  { key: 'month-12', label: 'Tháng 12 / 2026', desc: 'Hành trình cuối năm' },
  { key: 'year-2026', label: 'Năm 2026', desc: 'Tất cả chuyến đi năm 2026' },
  { key: 'past', label: 'Đã hoàn thành', desc: 'Các chuyến đi đã kết thúc' },
];

function matchesDateFilter(trip: TripItem, filter: DateFilterType, now: Date = new Date()): boolean {
  if (filter === 'all') return true;
  const text = `${trip.startDate || ''} ${trip.endDate || ''}`.toLowerCase();
  const effectiveStatus = resolveTripStatus(trip.startDate, trip.endDate, trip.status, now);

  if (filter === 'upcoming') {
    return effectiveStatus === 'PLANNING' || effectiveStatus === 'ONGOING' || effectiveStatus === 'ACTIVE';
  }
  if (filter === 'past') {
    return effectiveStatus === 'COMPLETED' || text.includes('2025');
  }
  if (filter === 'month-10') {
    return text.includes('/10') || text.includes('-10-') || text.includes('10/2026') || text.includes('10/26');
  }
  if (filter === 'month-11') {
    return text.includes('/11') || text.includes('-11-') || text.includes('11/2026') || text.includes('11/26');
  }
  if (filter === 'month-12') {
    return text.includes('/12') || text.includes('-12-') || text.includes('12/2026') || text.includes('12/26');
  }
  if (filter === 'year-2026') {
    return text.includes('2026') || text.includes('/26');
  }
  return true;
}

interface TripTask {
  id: string;
  title: string;
  assignee: string;
  done: boolean;
}

interface TripNote {
  id: string;
  content: string;
  category: string;
  done: boolean;
}

function getDefaultTasks(dest: string): TripTask[] {
  return [
    { id: 'task-1', title: 'Đặt vé máy bay / phương tiện di chuyển', assignee: 'Trưởng nhóm', done: true },
    { id: 'task-2', title: 'Đặt phòng khách sạn / nơi lưu trú', assignee: 'Thành viên', done: true },
    { id: 'task-3', title: `Lên danh sách các điểm ăn uống & đặc sản tại ${dest}`, assignee: 'Thành viên', done: false },
    { id: 'task-4', title: 'Chuẩn bị thuốc dự phòng & vật dụng y tế', assignee: 'Thành viên', done: false },
  ];
}

function getDefaultNotes(): TripNote[] {
  return [
    { id: 'note-1', content: 'Mang Căn cước công dân / Hộ chiếu bản gốc', category: 'Giấy tờ', done: true },
    { id: 'note-2', content: 'Sạc dự phòng, cáp sạc điện thoại và máy ảnh', category: 'Công nghệ', done: true },
    { id: 'note-3', content: 'Áo khoác gió nhẹ, kem chống nắng, kính râm', category: 'Trang phục', done: false },
    { id: 'note-4', content: 'Thuốc say xe, thuốc dị ứng, băng gạc cá nhân', category: 'Y tế', done: false },
  ];
}

const VIETNAM_POPULAR_CITIES = [
  {
    region: '🏖️ Miền Trung & Duyên Hải (Biển & Di sản)',
    cities: [
      { name: 'Đà Nẵng', defaultTitle: 'Khám phá Đà Nẵng - Cầu Vàng - Sơn Trà' },
      { name: 'Quy Nhơn, Bình Định', defaultTitle: 'Khám phá Quy Nhơn - Kỳ Co - Eo Gió' },
      { name: 'Nha Trang, Khánh Hòa', defaultTitle: 'Nghỉ dưỡng biển đảo Nha Trang' },
      { name: 'Hội An, Quảng Nam', defaultTitle: 'Dạo bước Phố cổ Hội An' },
      { name: 'Huế, Thừa Thiên Huế', defaultTitle: 'Hành trình Cố đô Huế di sản' },
      { name: 'Phú Yên', defaultTitle: 'Xứ hoa vàng cỏ xanh Phú Yên' },
      { name: 'Phan Thiết - Mũi Né, Bình Thuận', defaultTitle: 'Chuyến đi Phan Thiết - Mũi Né' },
      { name: 'Phong Nha, Quảng Bình', defaultTitle: 'Khám phá Vương quốc hang động Quảng Bình' },
    ],
  },
  {
    region: '🏔️ Miền Bắc & Đông/Tây Bắc (Kỳ quan & Văn hóa)',
    cities: [
      { name: 'Hà Nội', defaultTitle: 'Du lịch Thủ đô Hà Nội 36 phố phường' },
      { name: 'Hạ Long, Quảng Ninh', defaultTitle: 'Du ngoạn kỳ quan Vịnh Hạ Long' },
      { name: 'Sa Pa, Lào Cai', defaultTitle: 'Chinh phục Sa Pa & Đỉnh Fansipan' },
      { name: 'Ninh Bình', defaultTitle: 'Khám phá Quần thể danh thắng Tràng An' },
      { name: 'Hà Giang', defaultTitle: 'Phượt Cao nguyên đá Hà Giang' },
      { name: 'Cát Bà, Hải Phòng', defaultTitle: 'Khám phá đảo ngọc Cát Bà - Vịnh Lan Hạ' },
      { name: 'Mộc Châu, Sơn La', defaultTitle: 'Săn mây cao nguyên Mộc Châu' },
    ],
  },
  {
    region: '🌲 Tây Nguyên (Khí hậu ôn hòa & Đại ngàn)',
    cities: [
      { name: 'Đà Lạt, Lâm Đồng', defaultTitle: 'Check-in thành phố sương mù Đà Lạt' },
      { name: 'Măng Đen, Kon Tum', defaultTitle: 'Nghỉ dưỡng sinh thái Măng Đen' },
      { name: 'Buôn Ma Thuột, Đắk Lắk', defaultTitle: 'Trải nghiệm văn hóa Buôn Ma Thuột' },
    ],
  },
  {
    region: '🌴 Miền Nam & Hải Đảo (Sôi động & Thiên đường nhiệt đới)',
    cities: [
      { name: 'Phú Quốc, Kiên Giang', defaultTitle: 'Nghỉ dưỡng đảo ngọc Phú Quốc' },
      { name: 'TP. Hồ Chí Minh', defaultTitle: 'Sài Gòn City Tour & Ẩm thực đêm' },
      { name: 'Vũng Tàu, Bà Rịa - Vũng Tàu', defaultTitle: 'Cuối tuần tại bãi biển Vũng Tàu' },
      { name: 'Côn Đảo, Bà Rịa - Vũng Tàu', defaultTitle: 'Hành trình tâm linh & biển đảo Côn Đảo' },
      { name: 'Cần Thơ', defaultTitle: 'Khám phá sông nước Tây Đô Cần Thơ' },
      { name: 'An Giang', defaultTitle: 'Khám phá Thất Sơn Bảy Núi An Giang' },
    ],
  },
];

const QUICK_FEATURED_CITIES = [
  'Đà Nẵng',
  'Đà Lạt, Lâm Đồng',
  'Phú Quốc, Kiên Giang',
  'Nha Trang, Khánh Hòa',
  'Hà Nội',
  'Quy Nhơn, Bình Định',
  'Hạ Long, Quảng Ninh',
  'Sa Pa, Lào Cai',
  'Huế, Thừa Thiên Huế',
  'Hà Giang',
];
export default function TripsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
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
        router.replace('/login?returnUrl=/trips');
      } else {
        setIsAuthenticated(true);
        if (!document.cookie.includes('vista_token=')) {
          document.cookie = `vista_token=${token}; path=/; max-age=604800; SameSite=Lax`;
        }
      }
    }
  }, [router]);

  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'planning' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [activeMenuTripId, setActiveMenuTripId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedTripForAction, setSelectedTripForAction] = useState<TripItem | null>(null);

  const [tripTasks, setTripTasks] = useState<Record<string, TripTask[]>>({});
  const [tripNotes, setTripNotes] = useState<Record<string, TripNote[]>>({});

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Trưởng nhóm');

  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('Đồ dùng');

  const isUserTrip = (t: TripItem) => {
    if (!currentUser) return false;
    const isOwner = Boolean(
      (t.ownerId && (t.ownerId === currentUser.id || (currentUser.email && t.ownerId === currentUser.email))) ||
      (t.members?.[0] && (
        (t.members[0].userId && (t.members[0].userId === currentUser.id || (currentUser.email && t.members[0].userId === currentUser.email))) ||
        (t.members[0].email && currentUser.email && t.members[0].email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.displayName && t.members[0].name && t.members[0].name.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase())
      ))
    );
    if (isOwner) return true;
    return Boolean(
      t.members?.some((m) =>
        (m.userId && (m.userId === currentUser.id || (currentUser.email && m.userId === currentUser.email))) ||
        (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.displayName && m.name && m.name.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase())
      )
    );
  };

  const isTripOwnerUser = (t: TripItem) => {
    if (!currentUser) return false;
    return Boolean(
      (t.ownerId && (t.ownerId === currentUser.id || (currentUser.email && t.ownerId === currentUser.email))) ||
      (t.members?.[0] && (
        (t.members[0].userId && (t.members[0].userId === currentUser.id || (currentUser.email && t.members[0].userId === currentUser.email))) ||
        (t.members[0].email && currentUser.email && t.members[0].email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.displayName && t.members[0].name && t.members[0].name.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase())
      ))
    );
  };

  const handleOpenAssignModal = async (t: TripItem) => {
    if (!isUserTrip(t)) {
      showToast(`⚠️ Bạn không thuộc chuyến đi "${t.title}". Chỉ thành viên nhóm mới có quyền xem phân công nhiệm vụ!`);
      return;
    }
    setSelectedTripForAction(t);
    // Initialize default assignee to team members
    const firstOther = t.members?.find((m) => {
      const isMe = (m.userId && m.userId === currentUser?.id) ||
        (currentUser?.displayName && m.name && m.name.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase());
      return !isMe;
    });
    setNewTaskAssignee(firstOther?.name || 'Cả nhóm');

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id)) {
      try {
        const backendTasks = await apiRequest<any[]>(`/trips/${t.id}/tasks`);
        const mapped: TripTask[] = (backendTasks || []).map((bt) => ({
          id: String(bt.id),
          title: bt.title,
          assignee: bt.assigneeId
            ? (t.members?.find((m) => m.userId === bt.assigneeId)?.name || 'Thành viên')
            : 'Cả nhóm',
          done: Boolean(bt.isCompleted),
        }));
        setTripTasks((prev) => ({ ...prev, [t.id]: mapped }));
      } catch (err) {
        console.warn('Failed to load backend tasks:', err);
      }
    }
    setShowAssignModal(true);
  };

  const handleOpenNoteModal = (t: TripItem) => {
    if (!isUserTrip(t)) {
      showToast(`⚠️ Bạn không thuộc chuyến đi "${t.title}". Chỉ thành viên nhóm mới có quyền xem ghi chú & hành lý nội bộ!`);
      return;
    }
    setSelectedTripForAction(t);
    try {
      const stored = localStorage.getItem(`vista_trip_notes_${t.id}`);
      if (stored) {
        setTripNotes((prev) => ({ ...prev, [t.id]: JSON.parse(stored) }));
      } else {
        const def = getDefaultNotes();
        setTripNotes((prev) => ({ ...prev, [t.id]: def }));
        localStorage.setItem(`vista_trip_notes_${t.id}`, JSON.stringify(def));
      }
    } catch {
      const def = getDefaultNotes();
      setTripNotes((prev) => ({ ...prev, [t.id]: def }));
    }
    setShowNoteModal(true);
  };

  const handleToggleTask = async (tripId: string, taskId: string) => {
    if (!selectedTripForAction || !isUserTrip(selectedTripForAction)) {
      showToast('⚠️ Bạn không thuộc chuyến đi này. Thao tác bị từ chối!');
      return;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId) &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      try {
        await apiRequest(`/trips/${tripId}/tasks/${taskId}/toggle`, {
          method: 'PATCH',
        });
        setTripTasks((prev) => {
          const current = prev[tripId] || [];
          const updated = current.map((item) =>
            item.id === taskId ? { ...item, done: !item.done } : item
          );
          return { ...prev, [tripId]: updated };
        });
        return;
      } catch (err: any) {
        console.error('Failed to toggle task on backend:', err);
        showToast('Không thể cập nhật trạng thái nhiệm vụ.');
      }
    }
  };

  const handleAddTask = async (e: React.FormEvent, tripId: string) => {
    e.preventDefault();
    if (!selectedTripForAction) return;
    if (!isUserTrip(selectedTripForAction)) {
      showToast('⚠️ Bạn không thuộc chuyến đi này. Quyền truy cập bị từ chối!');
      return;
    }
    if (!isTripOwnerUser(selectedTripForAction)) {
      showToast('⚠️ Bạn đang có vai trò Thành viên. Chỉ Trưởng nhóm mới có quyền tạo và giao nhiệm vụ mới!');
      return;
    }
    if (!newTaskTitle.trim()) return;

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId)) {
      try {
        const targetMember = selectedTripForAction.members?.find(
          (m) => m.name === newTaskAssignee
        );
        const created = await apiRequest<any>(`/trips/${tripId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTaskTitle.trim(),
            assigneeId: targetMember?.userId || null,
          }),
        });

        const newTask: TripTask = {
          id: String(created.id),
          title: created.title,
          assignee: newTaskAssignee || 'Cả nhóm',
          done: Boolean(created.isCompleted),
        };

        setTripTasks((prev) => ({
          ...prev,
          [tripId]: [...(prev[tripId] || []), newTask],
        }));
        setNewTaskTitle('');
        showToast(`Đã giao việc cho: ${newTask.assignee}!`);
        return;
      } catch (err: any) {
        console.error('Failed to create task on backend:', err);
        showToast(`Lỗi tạo nhiệm vụ: ${err?.message || 'Không thể kết nối máy chủ'}`);
        return;
      }
    }
  };

  const handleDeleteTask = async (tripId: string, taskId: string) => {
    if (!selectedTripForAction) return;
    if (!isUserTrip(selectedTripForAction)) {
      showToast('⚠️ Bạn không thuộc chuyến đi này!');
      return;
    }
    if (!isTripOwnerUser(selectedTripForAction)) {
      showToast('⚠️ Chỉ Trưởng nhóm mới có quyền xóa nhiệm vụ phân công!');
      return;
    }

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId) &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      try {
        await apiRequest(`/trips/${tripId}/tasks/${taskId}`, {
          method: 'DELETE',
        });
        setTripTasks((prev) => {
          const current = prev[tripId] || [];
          const updated = current.filter((item) => item.id !== taskId);
          return { ...prev, [tripId]: updated };
        });
        showToast('Đã xóa nhiệm vụ!');
        return;
      } catch (err: any) {
        console.error('Failed to delete task on backend:', err);
        showToast('Không thể xóa nhiệm vụ.');
      }
    }
  };

  const handleToggleNote = (tripId: string, noteId: string) => {
    if (!selectedTripForAction || !isUserTrip(selectedTripForAction)) {
      showToast('⚠️ Bạn không thuộc chuyến đi này. Thao tác bị từ chối!');
      return;
    }
    setTripNotes((prev) => {
      const current = prev[tripId] || [];
      const updated = current.map((item) =>
        item.id === noteId ? { ...item, done: !item.done } : item
      );
      try {
        localStorage.setItem(`vista_trip_notes_${tripId}`, JSON.stringify(updated));
      } catch {}
      return { ...prev, [tripId]: updated };
    });
  };

  const handleAddNote = (e: React.FormEvent, tripId: string) => {
    e.preventDefault();
    if (!selectedTripForAction || !isUserTrip(selectedTripForAction)) {
      showToast('⚠️ Bạn không thuộc chuyến đi này. Không thể thêm ghi chú!');
      return;
    }
    if (!newNoteContent.trim()) return;
    const newNote: TripNote = {
      id: `note-${Date.now()}`,
      content: newNoteContent.trim(),
      category: newNoteCategory,
      done: false,
    };
    setTripNotes((prev) => {
      const current = prev[tripId] || [];
      const updated = [...current, newNote];
      try {
        localStorage.setItem(`vista_trip_notes_${tripId}`, JSON.stringify(updated));
      } catch {}
      return { ...prev, [tripId]: updated };
    });
    setNewNoteContent('');
    showToast('Đã thêm ghi chú mới!');
  };

  const handleDeleteNote = (tripId: string, noteId: string) => {
    if (!selectedTripForAction || !isUserTrip(selectedTripForAction)) {
      showToast('⚠️ Bạn không thuộc chuyến đi này!');
      return;
    }
    setTripNotes((prev) => {
      const current = prev[tripId] || [];
      const updated = current.filter((item) => item.id !== noteId);
      try {
        localStorage.setItem(`vista_trip_notes_${tripId}`, JSON.stringify(updated));
      } catch {}
      return { ...prev, [tripId]: updated };
    });
  };
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [todayStr] = useState<string>(() => getTodayString());

  // New trip form state
  const [newTitle, setNewTitle] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityName, setCustomCityName] = useState('');
  const [newBudget, setNewBudget] = useState('20000000');
  const [newStartDate, setNewStartDate] = useState<string>(() => getTodayString());
  const [newEndDate, setNewEndDate] = useState<string>(() => getDefaultEndString());
  const [autoSeedItinerary, setAutoSeedItinerary] = useState(true);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const calculateDuration = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return '4 ngày 3 đêm';
      const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const nights = Math.max(0, diffDays - 1);
      return `${diffDays} ngày ${nights} đêm`;
    } catch {
      return '4 ngày 3 đêm';
    }
  };

  const handleSelectCity = (cityName: string, defaultTitleSuggestion?: string) => {
    if (cityName === 'CUSTOM') {
      setIsCustomCity(true);
      return;
    }
    setIsCustomCity(false);
    setNewDestination(cityName);

    const dur = calculateDuration(newStartDate, newEndDate);
    if (!newTitle.trim() || newTitle.includes('Khám phá') || newTitle.includes('Chuyến đi') || newTitle.includes('Du lịch') || newTitle.includes('Nghỉ dưỡng')) {
      const cityNameShort = cityName.split(',')[0];
      const suggested = defaultTitleSuggestion || `Khám phá ${cityNameShort} (${dur})`;
      setNewTitle(suggested);
    }
  };

  // Proposals for voting demo
  const [proposals, setProposals] = useState([
    { id: 1, name: 'Cáp treo & Làng Pháp Bà Nà Hills', votes: 4, userVoted: true, category: 'Tham quan' },
    { id: 2, name: 'Thả hoa đăng trên sông Hoài Hội An', votes: 3, userVoted: false, category: 'Văn hóa' },
    { id: 3, name: 'Hải sản Bé Mặn đêm biển Mỹ Khê', votes: 4, userVoted: true, category: 'Ẩm thực' },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowJoinModal(false);
        setShowVoteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJoinCode(text.trim().toUpperCase());
      }
    } catch {
      showToast('Vui lòng dán thủ công bằng tổ hợp phím Ctrl + V');
    }
  };

  const [tripsList, setTripsList] = useState<TripItem[]>([]);
  const [isSyncingTrips, setIsSyncingTrips] = useState<boolean>(true);
  const [incomingInvitations, setIncomingInvitations] = useState<any[]>([]);

  // Danger Zone / Delete Trip States & Handler (TV4 P1)
  const [tripToDelete, setTripToDelete] = useState<TripItem | null>(null);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [unsettledDebtsError, setUnsettledDebtsError] = useState<{
    open: boolean;
    message: string;
    tripId: string;
    tripTitle?: string;
  } | null>(null);

  const handleConfirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    const targetTrip = tripToDelete;
    setIsDeletingTrip(true);
    try {
      await apiRequest(`/trips/${targetTrip.id}`, {
        method: 'DELETE',
      });
      showToast(`✓ Đã xóa chuyến đi "${targetTrip.title}" thành công!`);
      setTripsList((prev) => prev.filter((t) => t.id !== targetTrip.id));
      setTripToDelete(null);
      window.dispatchEvent(new CustomEvent('vista-trips-change'));
    } catch (err: any) {
      setIsDeletingTrip(false);
      setTripToDelete(null);
      if (err?.status === 409 || err?.code === 'TRIP_HAS_UNSETTLED_DEBTS') {
        const message = err?.detail || err?.message || 'Chuyến đi còn khoản chưa quyết toán. Vui lòng kiểm tra Thủ quỹ trước khi xóa.';
        setUnsettledDebtsError({
          open: true,
          message,
          tripId: String(targetTrip.id),
          tripTitle: targetTrip.title,
        });
        return;
      }
      showToast(err?.detail || err?.message || 'Không thể xóa chuyến đi. Vui lòng thử lại sau.');
    } finally {
      setIsDeletingTrip(false);
    }
  };

  // Load trips exclusively from PostgreSQL Database via Spring Boot API
  const fetchTripsFromBackend = async () => {
    setIsSyncingTrips(true);
    try {
      const token = localStorage.getItem('vista_token');
      if (!token) {
        setTripsList([]);
        setIsSyncingTrips(false);
        return;
      }
      const serverTrips = await apiRequest<any[]>('/trips');
      if (Array.isArray(serverTrips)) {
        const mapped: TripItem[] = serverTrips.map((st) => {
          const dest = st.destinationSummary || 'Việt Nam';
          const isOwner = Boolean(currentUser?.id && st.ownerId === currentUser.id);
          const start = st.startDate || '';
          const end = st.endDate || '';
          let durationBadge = '';
          if (start && end) {
            const sDt = parseTripLocalDate(start);
            const eDt = parseTripLocalDate(end);
            if (sDt && eDt && eDt.getTime() >= sDt.getTime()) {
              const diffDays = Math.max(1, Math.round((eDt.getTime() - sDt.getTime()) / (1000 * 60 * 60 * 24)) + 1);
              durationBadge = `${diffDays} ngày`;
            }
          }

          const mappedMembers: TripMember[] = Array.isArray(st.members) && st.members.length > 0
            ? st.members.map((m: any) => ({
                name: m.displayName || m.name || (m.role === 'OWNER' ? 'Trưởng nhóm' : 'Thành viên'),
                avatar: (m.displayName || m.name || 'TV').slice(0, 2).toUpperCase(),
                color: m.role === 'OWNER' ? '#0284c7' : '#10b981',
                role: m.role === 'OWNER' ? 'Trưởng nhóm' : 'Thành viên',
                userId: m.userId,
                email: m.email,
              }))
            : [
                {
                  name: isOwner ? (currentUser?.displayName || 'Trưởng nhóm') : 'Trưởng nhóm',
                  avatar: (currentUser?.displayName || 'TN').slice(0, 2).toUpperCase(),
                  color: '#0284c7',
                  role: 'Trưởng nhóm',
                  userId: st.ownerId,
                },
              ];

          let cachedItinerary: TripItem['itineraryDays'] | undefined = Array.isArray(st.itineraryDays) && st.itineraryDays.length > 0
            ? st.itineraryDays
            : undefined;
          if (!cachedItinerary && typeof window !== 'undefined') {
            try {
              const rawCached = localStorage.getItem(`vista_trip_itinerary_${st.id}`);
              if (rawCached) {
                const parsed = JSON.parse(rawCached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  cachedItinerary = parsed;
                }
              }
            } catch {}
          }

          const realImage = st.coverImageUrl || st.imageUrl || st.image || '';
          const resolvedImage = realImage || (st.destinationSummary ? getDestinationHeroImage(dest) : '');

          return {
            id: String(st.id),
            title: st.title || `Chuyến đi ${dest}`,
            destination: dest,
            durationBadge,
            startDate: start ? start.split('-').reverse().join('/') : '',
            endDate: end ? end.split('-').reverse().join('/') : '',
            rawStartDate: start,
            rawEndDate: end,
            status: st.status === 'COMPLETED' ? 'COMPLETED' : (st.status === 'ONGOING' || st.status === 'ACTIVE') ? 'ONGOING' : st.status === 'CANCELLED' ? 'CANCELLED' : 'PLANNING',
            role: isOwner ? 'OWNER' : 'MEMBER',
            ownerId: st.ownerId,
            budgetTotal: Number(st.budgetTotal) || 0,
            budgetSpent: 0,
            progressPercent: 0,
            members: mappedMembers,
            image: resolvedImage,
            treasuryPath: `/trips/${st.id}/treasury`,
            itineraryDays: cachedItinerary,
            quickActions: [
              { label: 'Lịch trình', href: `/trips/${st.id}` },
              { label: 'Thủ quỹ', href: `/trips/${st.id}/treasury` },
            ],
          };
        });
        setTripsList(mapped);
      }
    } catch (err) {
      console.warn('Could not load trips from backend:', err);
    } finally {
      setIsSyncingTrips(false);
    }
  };

  useEffect(() => {
    fetchTripsFromBackend();

    const onTripsChange = () => fetchTripsFromBackend();
    window.addEventListener('vista-trips-change', onTripsChange);
    window.addEventListener('focus', onTripsChange);

    return () => {
      window.removeEventListener('vista-trips-change', onTripsChange);
      window.removeEventListener('focus', onTripsChange);
    };
  }, [currentUser?.id]);

  // Load incoming invitations for currently logged in user from Spring Boot API
  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const token = localStorage.getItem('vista_token');
        if (!token) return;
        const list = await apiRequest<any[]>('/invitations/my-pending');
        if (Array.isArray(list)) {
          setIncomingInvitations(list);
        }
      } catch {}
    };

    fetchInvites();
  }, [currentUser?.email]);

  const handleAcceptIncomingInvite = async (inv: any) => {
    try {
      await apiRequest(`/invitations/${inv.id}/accept-by-id`, {
        method: 'POST',
      });

      setIncomingInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      showToast(`🎉 Bạn đã gia nhập "${inv.tripTitle}" thành công!`);
      await fetchTripsFromBackend();

      if (inv.tripId) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('vista_last_trip_id', inv.tripId);
        }
        router.push(`/trips/${inv.tripId}`);
      }
    } catch (err: any) {
      showToast(err.message || 'Có lỗi xảy ra khi chấp nhận lời mời');
    }
  };

  const handleDeclineIncomingInvite = async (inv: any) => {
    try {
      await apiRequest(`/invitations/${inv.id}/decline-by-id`, {
        method: 'POST',
      });
      setIncomingInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      showToast('Đã từ chối lời mời.');
    } catch (err: any) {
      showToast(err.message || 'Có lỗi khi từ chối lời mời');
    }
  };

  // isUserTrip defined above
  const currentDate = useMemo(() => new Date(currentDateTick), [currentDateTick]);

  const myTripsList = tripsList.filter(isUserTrip);
  const myCount = myTripsList.length;
  const totalCount = tripsList.length;
  const planningCount = tripsList.filter((t) => resolveTripStatus(t.startDate, t.endDate, t.status, currentDate) === 'PLANNING').length;
  const activeCount = tripsList.filter((t) => {
    const st = resolveTripStatus(t.startDate, t.endDate, t.status, currentDate);
    return st === 'ACTIVE' || st === 'ONGOING';
  }).length;
  const completedCount = tripsList.filter((t) => resolveTripStatus(t.startDate, t.endDate, t.status, currentDate) === 'COMPLETED').length;

  const filteredTrips = tripsList.filter((trip) => {
    const effectiveStatus = resolveTripStatus(trip.startDate, trip.endDate, trip.status, currentDate);
    if (activeTab === 'mine' && !isUserTrip(trip)) return false;
    if (activeTab === 'planning' && effectiveStatus !== 'PLANNING') return false;
    if (activeTab === 'active' && effectiveStatus !== 'ACTIVE' && effectiveStatus !== 'ONGOING') return false;
    if (activeTab === 'completed' && effectiveStatus !== 'COMPLETED') return false;

    if (!matchesDateFilter(trip, dateFilter, currentDate)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        trip.title.toLowerCase().includes(q) ||
        trip.destination.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingTrip) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('vista_token') : null;
    if (!token) {
      showToast('Vui lòng đăng nhập để tạo chuyến đi!');
      router.replace('/login?returnUrl=/trips');
      return;
    }

    const destinationToSave = isCustomCity ? customCityName.trim() : newDestination.trim();
    if (!newTitle.trim() || !destinationToSave) {
      showToast('Vui lòng chọn thành phố điểm đến và nhập tên chuyến đi!');
      return;
    }

    if (todayStr && newStartDate < todayStr) {
      showToast('Ngày bắt đầu không được chọn trong quá khứ!');
      return;
    }
    if (newEndDate < newStartDate) {
      showToast('Ngày kết thúc phải diễn ra sau hoặc cùng ngày với ngày bắt đầu!');
      return;
    }

    const parsedBudget = Number(newBudget) > 0 ? Number(newBudget) : 20000000;
    setIsCreatingTrip(true);

    try {
      const createdTrip = await apiRequest<any>('/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          startDate: newStartDate,
          endDate: newEndDate,
          destinationSummary: destinationToSave,
          budgetTotal: parsedBudget,
          currency: 'VND',
        }),
      });

      const realTripId = createdTrip.id;
      if (typeof window !== 'undefined') {
        localStorage.setItem('vista_last_trip_id', realTripId);

        // Tự động kiểm tra nếu có kế hoạch AI vừa sinh trong AI Planner cho cùng điểm đến, chuyển ngay vào chuyến đi
        try {
          const plannerStateRaw = localStorage.getItem('vista_active_planner_state');
          if (plannerStateRaw) {
            const plannerState = JSON.parse(plannerStateRaw);
            if (
              plannerState &&
              Array.isArray(plannerState.itineraryDays) &&
              plannerState.itineraryDays.length > 0
            ) {
              const tripDetailDays = plannerState.itineraryDays.map((d: any) => ({
                dayNumber: d.dayNumber,
                title: d.theme || `Ngày ${d.dayNumber} — ${destinationToSave}`,
                dateStr: d.date || `Ngày ${d.dayNumber}`,
                activities: (d.activities || []).map((a: any, idx: number) => ({
                  id: a.id || `act-${d.dayNumber}-${idx + 1}`,
                  timeSlot: a.timeSlot === 'MORNING' ? '08:00 – 11:30' : a.timeSlot === 'AFTERNOON' ? '14:00 – 17:00' : '19:00 – 21:30',
                  timeRange: a.timeRange || (a.timeSlot === 'MORNING' ? '08:00 – 11:30' : a.timeSlot === 'AFTERNOON' ? '14:00 – 17:00' : '19:00 – 21:30'),
                  title: a.title,
                  description: a.description || '',
                  location: a.location || destinationToSave,
                  costVnd: a.costVnd || 0,
                  costLabel: a.costLabel || (a.costVnd ? `${a.costVnd.toLocaleString('vi-VN')}₫` : 'Miễn phí'),
                  category: a.category || 'Tham quan',
                  sortOrder: idx + 1,
                  photoUrl: a.photoUrl,
                  latitude: a.latitude,
                  longitude: a.longitude,
                })),
              }));
              localStorage.setItem(`vista_trip_itinerary_${realTripId}`, JSON.stringify(tripDetailDays));
            }
          }
        } catch {}
      }

      if (autoSeedItinerary) {
        try {
          await seedSampleItineraryToTrip({
            tripId: String(realTripId),
            destination: destinationToSave,
            startDate: newStartDate,
            endDate: newEndDate,
          });
        } catch (seedErr) {
          console.warn('Auto-seed sample itinerary warning:', seedErr);
        }
      }

      setShowCreateModal(false);
      setNewTitle('');
      setNewDestination('');
      setCustomCityName('');
      setIsCustomCity(false);
      showToast(
        autoSeedItinerary
          ? `🎉 Đã tạo chuyến đi "${newTitle}" kèm lộ trình ảnh mẫu!`
          : `🎉 Tạo thành công chuyến đi "${newTitle}"!`
      );
      await fetchTripsFromBackend();
      router.push(`/trips/${realTripId}`);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tạo chuyến đi trên máy chủ');
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const handleQuickCreateDemoTrip = async () => {
    if (isCreatingTrip) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('vista_token') : null;
    if (!token) {
      showToast('Vui lòng đăng nhập để tạo chuyến đi demo!');
      router.replace('/login?returnUrl=/trips');
      return;
    }

    setIsCreatingTrip(true);
    const startIso = toIsoDateOffset(todayStr || undefined, 0);
    const endIso = toIsoDateOffset(todayStr || undefined, 2);
    const demoTitle = 'Khám phá Đà Nẵng – Hội An (3N2Đ Demo)';
    const demoDest = 'TP. Đà Nẵng';

    try {
      const createdTrip = await apiRequest<any>('/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: demoTitle,
          startDate: startIso,
          endDate: endIso,
          destinationSummary: demoDest,
          budgetTotal: 15000000,
          currency: 'VND',
        }),
      });

      const realTripId = String(createdTrip.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('vista_last_trip_id', realTripId);
      }

      await seedSampleItineraryToTrip({
        tripId: realTripId,
        destination: demoDest,
        startDate: startIso,
        endDate: endIso,
      });

      setShowCreateModal(false);
      showToast('🎉 Đã tạo chuyến đi Demo Đà Nẵng – Hội An có lộ trình ảnh đầy đủ!');
      await fetchTripsFromBackend();
      router.push(`/trips/${realTripId}`);
    } catch (err: any) {
      showToast(err.message || 'Không thể tạo chuyến đi demo lúc này');
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const handleJoinTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim();
    if (!cleanCode) {
      showToast('Vui lòng nhập mã mời từ trưởng nhóm!');
      return;
    }

    try {
      // 1. Thử gia nhập qua mã mời ngắn / mã chuyến đi (/invitations/join-by-code)
      let res: any;
      try {
        res = await apiRequest<any>('/invitations/join-by-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cleanCode }),
        });
      } catch (errCode: any) {
        // 2. Dự phòng: Thử accept theo rawToken cũ
        res = await apiRequest<any>(`/invitations/${encodeURIComponent(cleanCode)}/accept`, {
          method: 'POST',
        });
      }

      setShowJoinModal(false);
      setJoinCode('');
      showToast(`🎉 Gia nhập thành công chuyến đi! Đang chuyển hướng...`);
      await fetchTripsFromBackend();
      window.dispatchEvent(new CustomEvent('vista-trips-change'));

      if (res?.tripId) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('vista_last_trip_id', res.tripId);
        }
        router.push(`/trips/${res.tripId}`);
      }
    } catch (err: any) {
      showToast(err.message || 'Mã mời không tồn tại hoặc đã hết hạn.');
    }
  };

  const toggleVote = (id: number) => {
    setProposals((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextVoted = !item.userVoted;
          return {
            ...item,
            userVoted: nextVoted,
            votes: nextVoted ? item.votes + 1 : item.votes - 1,
          };
        }
        return item;
      })
    );
  };

  if (isAuthenticated !== true) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Yêu cầu đăng nhập
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Vui lòng đăng nhập để xem và quản lý chuyến đi của bạn. Đang chuyển hướng...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tripsPage}>
      <div className={styles.container}>
        {/* ─── 1. TOP HEADER & ACTION ROW ───────────────────────────────── */}
        <header className={styles.pageHeaderRow}>
          <h1 className={styles.pageTitle}>Chuyến đi của bạn</h1>
          <div className={styles.pageHeaderActions}>
            <button
              type="button"
              className={styles.btnCreateTripPrimary}
              onClick={() => setShowCreateModal(true)}
              id="btn-create-trip-modal"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Tạo chuyến đi</span>
            </button>
            <button
              type="button"
              className={styles.btnJoinCode}
              onClick={() => setShowJoinModal(true)}
              id="btn-join-trip-modal"
            >
              <Ticket size={15} />
              <span>Tham gia bằng mã</span>
            </button>
          </div>
        </header>

        {/* ─── 2.5 HỘP THƯ LỜI MỜI THAM GIA CHUYẾN ĐI (W3-TV3-01) ─── */}
        {incomingInvitations.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #EEF2FF 100%)',
            border: '1.5px solid #BFDBFE',
            borderRadius: '20px',
            padding: '20px 24px',
            marginBottom: '28px',
            boxShadow: '0 8px 24px rgba(30, 64, 175, 0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0284C7', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                ✉️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1E3A8A' }}>
                  Hộp thư Lời mời: Bạn có {incomingInvitations.length} lời mời tham gia chuyến đi mới!
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#475569' }}>
                  Bạn bè đã mời bạn cùng đồng hành. Chọn Chấp nhận để tự động tham gia và đồng bộ lịch trình vào danh sách của bạn.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {incomingInvitations.map((inv) => (
                <div
                  key={inv.token}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, background: '#E0F2FE', color: '#0284C7', padding: '2px 8px', borderRadius: '6px' }}>
                        {inv.token}
                      </span>
                      <strong style={{ fontSize: '14.5px', color: '#0F172A' }}>
                        {inv.tripTitle || 'Chuyến đi Vista'}
                      </strong>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>
                      Người mời: <strong style={{ color: '#0284C7' }}>{inv.inviterName || 'Trưởng nhóm'}</strong> {inv.inviterEmail ? `(${inv.inviterEmail})` : ''} • Hạn: {inv.expiresAt || '7 ngày'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleAcceptIncomingInvite(inv)}
                      style={{
                        padding: '9px 18px',
                        background: '#16A34A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Chấp nhận</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeclineIncomingInvite(inv)}
                      style={{
                        padding: '9px 14px',
                        background: '#FFFFFF',
                        color: '#64748B',
                        border: '1px solid #CBD5E1',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Từ chối
                    </button>

                    <Link
                      href={`/invitations/${inv.token}`}
                      style={{
                        padding: '9px 14px',
                        background: '#F1F5F9',
                        color: '#334155',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      Chi tiết
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── 2. STATUS TABS & SEARCH CONTROLS ───────────────────────── */}
        <div className={styles.tabsRowWrapper}>
          <div className={styles.filterTabs}>
            <button
              type="button"
              className={`${styles.filterTabBtn} ${activeTab === 'all' ? styles.filterTabBtnActive : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả ({totalCount})
            </button>
            <button
              type="button"
              className={`${styles.filterTabBtn} ${activeTab === 'mine' ? styles.filterTabBtnActive : ''}`}
              onClick={() => setActiveTab('mine')}
            >
              Của tôi ({myCount})
            </button>
            <button
              type="button"
              className={`${styles.filterTabBtn} ${activeTab === 'planning' ? styles.filterTabBtnActive : ''}`}
              onClick={() => setActiveTab('planning')}
            >
              Đang lên kế hoạch ({planningCount})
            </button>
            <button
              type="button"
              className={`${styles.filterTabBtn} ${activeTab === 'active' ? styles.filterTabBtnActive : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Đang diễn ra ({activeCount})
            </button>
            <button
              type="button"
              className={`${styles.filterTabBtn} ${activeTab === 'completed' ? styles.filterTabBtnActive : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Đã hoàn thành ({completedCount})
            </button>
          </div>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.searchBoxWrapper}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo tên chuyến đi hoặc điểm đến"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ position: 'relative' }} ref={dateDropdownRef}>
            <button
              type="button"
              className={`${styles.dateFilterBtn} ${dateFilter !== 'all' ? styles.dateFilterBtnActive : ''}`}
              onClick={() => setDateDropdownOpen((prev) => !prev)}
              id="btn-date-filter-toggle"
              title="Lọc chuyến đi theo thời gian"
            >
              <Calendar size={15} color={dateFilter !== 'all' ? '#0070BA' : '#64748B'} />
              <span>
                {dateFilter === 'all'
                  ? 'Thời gian'
                  : DATE_FILTER_OPTIONS.find((o) => o.key === dateFilter)?.label.replace(' / 2026', '')}
              </span>
              <ChevronDown
                size={14}
                style={{
                  transition: 'transform 0.2s ease',
                  transform: dateDropdownOpen ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>

            {dateDropdownOpen && (
              <div className={styles.dateDropdownMenu}>
                <div className={styles.dateDropdownHeader}>
                  <span>Lọc theo thời gian</span>
                  {dateFilter !== 'all' && (
                    <button
                      type="button"
                      className={styles.dateDropdownClear}
                      onClick={() => {
                        setDateFilter('all');
                        setDateDropdownOpen(false);
                      }}
                    >
                      Đặt lại
                    </button>
                  )}
                </div>
                <div className={styles.dateDropdownList}>
                  {DATE_FILTER_OPTIONS.map((opt) => {
                    const isSelected = dateFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        className={`${styles.dateDropdownItem} ${isSelected ? styles.dateDropdownItemActive : ''}`}
                        onClick={() => {
                          setDateFilter(opt.key);
                          setDateDropdownOpen(false);
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                          <span className={styles.dateOptionLabel}>{opt.label}</span>
                          {opt.desc && <span className={styles.dateOptionDesc}>{opt.desc}</span>}
                        </div>
                        {isSelected && <Check size={14} color="#0070BA" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={styles.viewToggleGroup}>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.viewToggleBtnActive : ''}`}
              onClick={() => setViewMode('grid')}
              title="Xem dạng lưới"
              aria-label="Xem dạng lưới"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleBtnActive : ''}`}
              onClick={() => setViewMode('list')}
              title="Xem dạng danh sách"
              aria-label="Xem dạng danh sách"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {/* ─── 4. TRIP CARDS GRID OR LIST VIEW ────────────────────────── */}
        {isSyncingTrips ? (
          <SkeletonCardGrid count={3} />
        ) : (
        <div className={viewMode === 'list' ? styles.tripsListView : styles.tripsGrid}>
          {filteredTrips.map((trip) => {
            const tripStatus = resolveTripStatus(trip.startDate, trip.endDate, trip.status, currentDate);
            const timelineData = buildTripTimelineData(trip, currentDate);
            const hasImage = Boolean(trip.image) && !imageErrors[trip.id];
            const visibleNodes = timelineData.nodes.slice(0, 4);
            const remainingDaysCount = Math.max(0, timelineData.nodes.length - 4);

            const statusBadge = (
              <div className={styles.ticketStatusRow}>
                {tripStatus === 'ACTIVE' || tripStatus === 'ONGOING' ? (
                  <span className={styles.ticketStatusActive}>
                    <span className={styles.ticketDotActive} />
                    <span>Đang diễn ra</span>
                  </span>
                ) : tripStatus === 'PLANNING' ? (
                  <span className={styles.ticketStatusPlanning}>
                    <span className={styles.ticketDotPlanning} />
                    <span>Đang lên kế hoạch</span>
                  </span>
                ) : tripStatus === 'COMPLETED' ? (
                  <span className={styles.ticketStatusCompleted}>
                    <span className={styles.ticketDotCompleted} />
                    <span>Đã hoàn thành</span>
                  </span>
                ) : (
                  <span className={styles.ticketStatusCancelled}>
                    <span className={styles.ticketDotCancelled} />
                    <span>Đã hủy</span>
                  </span>
                )}
              </div>
            );

            const cardMenu = (
              <div className={styles.cardMenuWrapper}>
                <button
                  type="button"
                  className={styles.ticketMoreBtn}
                  title="Tùy chọn khác"
                  aria-label="Tùy chọn khác"
                  onClick={() => setActiveMenuTripId(activeMenuTripId === trip.id ? null : trip.id)}
                >
                  <MoreHorizontal size={16} />
                </button>
                {activeMenuTripId === trip.id && (
                  <div className={styles.cardDropdownMenu} onMouseLeave={() => setActiveMenuTripId(null)}>
                    <Link
                      href={`/trips/${trip.id}?tab=itinerary`}
                      className={styles.cardDropdownItem}
                      onClick={() => setActiveMenuTripId(null)}
                    >
                      <Calendar size={14} />
                      <span>Lịch trình chi tiết</span>
                    </Link>
                    <Link
                      href={`/trips/${trip.id}/treasury`}
                      className={styles.cardDropdownItem}
                      onClick={() => setActiveMenuTripId(null)}
                    >
                      <CreditCard size={14} />
                      <span>Ví & Chi tiêu</span>
                    </Link>
                    <button
                      type="button"
                      className={styles.cardDropdownItem}
                      onClick={() => {
                        setActiveMenuTripId(null);
                        handleOpenAssignModal(trip);
                      }}
                    >
                      <Users size={14} />
                      <span>Phân công việc</span>
                    </button>
                    <button
                      type="button"
                      className={styles.cardDropdownItem}
                      onClick={() => {
                        setActiveMenuTripId(null);
                        handleOpenNoteModal(trip);
                      }}
                    >
                      <CheckSquare size={14} />
                      <span>Ghi chú chuẩn bị</span>
                    </button>
                    {isTripOwnerUser(trip) && (
                      <button
                        type="button"
                        className={`${styles.cardDropdownItem} ${styles.cardDropdownDanger}`}
                        onClick={() => {
                          setActiveMenuTripId(null);
                          setTripToDelete(trip);
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Xóa chuyến đi</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );

            if (viewMode === 'list') {
              return (
                <article key={trip.id} className={styles.ticketCard} id={`trip-card-${trip.id}`}>
                  {/* Left Zone: Cover Image or Light-Blue Placeholder */}
                  <div className={styles.ticketMediaZone}>
                    {hasImage ? (
                      <img
                        src={trip.image}
                        alt={trip.title}
                        className={styles.ticketMediaImg}
                        onError={() => setImageErrors((prev) => ({ ...prev, [trip.id]: true }))}
                      />
                    ) : (
                      <div className={styles.ticketMediaPlaceholder}>
                        <MapPin size={28} color="#0284C7" />
                      </div>
                    )}
                  </div>

                  {/* Middle Zone: Status, Title, Destination, Timeline */}
                  <div className={styles.ticketBodyZone}>
                    {statusBadge}

                    <h3 className={styles.ticketTitle} title={trip.title}>
                      <Link href={`/trips/${trip.id}`} className={styles.ticketTitleLink}>
                        {trip.title}
                      </Link>
                    </h3>

                    <div className={styles.ticketLocation}>
                      <MapPin size={14} />
                      <span>{trip.destination}</span>
                    </div>

                    {visibleNodes.length > 0 ? (
                      <div className={styles.timelineWrap}>
                        <div className={styles.timelineTrack} />
                        <div className={styles.timelineNodes}>
                          {visibleNodes.map((node) => (
                            <div key={node.dayNumber} className={styles.timelineNode}>
                              <div className={styles.timelineTodaySlot}>
                                {node.isToday && (
                                  <span className={styles.timelineTodayBadge}>Hôm nay</span>
                                )}
                              </div>
                              <div
                                className={`${styles.timelineDot} ${
                                  node.isToday
                                    ? styles.timelineDotToday
                                    : node.isPast
                                    ? styles.timelineDotPast
                                    : ''
                                }`}
                              />
                              <span
                                className={`${styles.timelineDate} ${
                                  node.isToday ? styles.timelineDateToday : ''
                                }`}
                              >
                                {node.dateLabel}
                              </span>
                              <span className={styles.timelineStop} title={node.stopLabel}>
                                {node.stopLabel}
                              </span>
                            </div>
                          ))}
                          {remainingDaysCount > 0 && (
                            <div className={styles.timelineMoreNode}>
                              <div className={styles.timelineTodaySlot} />
                              <span className={styles.timelineMoreBadge}>+{remainingDaysCount} ngày</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.ticketNoTimeline}>
                        <Calendar size={13} color="#64748B" />
                        <span>
                          {timelineData.dateRangeText
                            ? `Thời gian: ${timelineData.dateRangeText}`
                            : 'Chưa có lịch trình chi tiết theo ngày'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Zone: Actions & Progress */}
                  <div className={styles.ticketActionZone}>
                    <div className={styles.ticketActionTop}>{cardMenu}</div>

                    <div className={styles.ticketMetaCenter}>
                      {timelineData.isTodayInTrip && timelineData.totalDays ? (
                        <div className={styles.ticketDayProgress}>
                          <Calendar size={15} color="#475569" />
                          <span>
                            Ngày {timelineData.currentDayIndex} / {timelineData.totalDays}
                          </span>
                        </div>
                      ) : timelineData.totalDays ? (
                        <div className={styles.ticketDayProgress}>
                          <Calendar size={15} color="#475569" />
                          <span>{timelineData.totalDays} ngày</span>
                        </div>
                      ) : null}

                      {timelineData.dateRangeText && (
                        <div className={styles.ticketDateRange}>{timelineData.dateRangeText}</div>
                      )}
                    </div>

                    <Link
                      href={`/trips/${trip.id}`}
                      className={styles.btnOpenTrip}
                      id={`btn-cta-${trip.id}`}
                    >
                      <span>Mở chuyến đi</span>
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
              );
            }

            // Grid mode: compact vertical card
            return (
              <article key={trip.id} className={styles.gridCard} id={`trip-card-${trip.id}`}>
                <div className={styles.gridMediaZone}>
                  {hasImage ? (
                    <img
                      src={trip.image}
                      alt={trip.title}
                      className={styles.gridMediaImg}
                      onError={() => setImageErrors((prev) => ({ ...prev, [trip.id]: true }))}
                    />
                  ) : (
                    <div className={styles.ticketMediaPlaceholder}>
                      <MapPin size={28} color="#0284C7" />
                    </div>
                  )}
                </div>

                <div className={styles.gridCardBody}>
                  <div className={styles.gridCardTop}>
                    {statusBadge}
                    {cardMenu}
                  </div>

                  <h3 className={styles.gridCardTitle} title={trip.title}>
                    <Link href={`/trips/${trip.id}`} className={styles.ticketTitleLink}>
                      {trip.title}
                    </Link>
                  </h3>

                  <div className={styles.ticketLocation}>
                    <MapPin size={13} />
                    <span>{trip.destination}</span>
                  </div>

                  <div className={styles.gridCardMeta}>
                    <div className={styles.gridCardDateRow}>
                      <Calendar size={13} color="#64748B" />
                      <span>
                        {timelineData.isTodayInTrip && timelineData.totalDays
                          ? `Ngày ${timelineData.currentDayIndex}/${timelineData.totalDays} · ${timelineData.dateRangeText}`
                          : timelineData.dateRangeText || (timelineData.totalDays ? `${timelineData.totalDays} ngày` : 'Chưa có ngày')}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/trips/${trip.id}`}
                    className={styles.btnOpenTrip}
                    id={`btn-cta-${trip.id}`}
                  >
                    <span>Mở chuyến đi</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
          {filteredTrips.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1.5rem', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <Compass size={44} color="#0284c7" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                Chưa có chuyến đi nào
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: 420, margin: '0 auto 1.5rem' }}>
                Bạn chưa có chuyến đi phù hợp. Tạo chuyến đi mới hoặc nhập mã lời mời để bắt đầu.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.btnCreateTripPrimary}
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} />
                  <span>Tạo chuyến đi</span>
                </button>
                <button
                  type="button"
                  className={styles.btnJoinCode}
                  onClick={() => setShowJoinModal(true)}
                >
                  <Ticket size={15} />
                  <span>Tham gia bằng mã</span>
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* ─── 6. EDITORIAL FOOTER (Đồng nhất Homepage) ───────────────────── */}
      <footer className={styles.footerRoot}>
        <div className={styles.footerInnerContainer}>
          <div className={styles.footerGrid}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0088CC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                  <Compass size={18} color="#FFFFFF" />
                </div>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>VISTA</span>
              </div>
              <p style={{ fontSize: '13.5px', color: '#94A3B8', lineHeight: 1.6, maxWidth: '320px', margin: 0 }}>
                Nền tảng du lịch thông minh Việt Nam, tiên phong kết nối di sản văn hóa, trí tuệ nhân tạo và trải nghiệm cộng tác nhóm trọn vẹn.
              </p>
            </div>

            <div>
              <h4 className={styles.footerColTitle}>Sản phẩm</h4>
              <div className={styles.footerLinksList}>
                <Link href="/planner" className={styles.footerLink}>AI Planner Pro</Link>
                <Link href="/map" className={styles.footerLink}>Bản đồ số GPS</Link>
                <Link href="/trips" className={styles.footerLink}>Quản lý chuyến đi</Link>
                <Link href="/trips" className={styles.footerLink}>Thủ quỹ &amp; VietQR</Link>
              </div>
            </div>

            <div>
              <h4 className={styles.footerColTitle}>Di sản 4 miền</h4>
              <div className={styles.footerLinksList}>
                <Link href="/planner?dest=Hà Nội" className={styles.footerLink}>Hà Nội &amp; Miền Bắc</Link>
                <Link href="/planner?dest=Thừa Thiên Huế" className={styles.footerLink}>Cố đô Huế &amp; Miền Trung</Link>
                <Link href="/planner?dest=Hồ Chí Minh" className={styles.footerLink}>Sài Gòn &amp; Nam Bộ</Link>
                <Link href="/planner?dest=Lâm Đồng" className={styles.footerLink}>Đà Lạt &amp; Tây Nguyên</Link>
              </div>
            </div>

            <div>
              <h4 className={styles.footerColTitle}>Dự án VISTA</h4>
              <div className={styles.footerLinksList}>
                <span className={styles.footerLink}>Đồ án tốt nghiệp 2026</span>
                <span className={styles.footerLink}>Kiến trúc Monolith &amp; Next.js</span>
                <span className={styles.footerLink}>Bảo mật RBAC &amp; Supabase</span>
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

      {/* ─── MODAL: CREATE TRIP (LUXURY WITH CITY PICKER) ─────────────── */}
      {showCreateModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className={styles.modalTopAccent} />
            <button
              type="button"
              className={styles.btnCloseModal}
              onClick={() => setShowCreateModal(false)}
              aria-label="Đóng"
              title="Đóng (Esc)"
            >
              <X size={18} strokeWidth={2.4} color="#334155" />
            </button>

            <div className={styles.modalHeaderFancy}>
              <div className={styles.modalIconWrapper}>
                <Compass size={24} color="#0070BA" strokeWidth={2.2} />
              </div>
              <div className={styles.modalHeaderText}>
                <div className={styles.modalEyebrow}>VISTA CO-TRAVEL • KHỞI TẠO HÀNH TRÌNH</div>
                <h3 className={styles.modalTitle}>Tạo Chuyến Đi Nhóm Mới</h3>
              </div>
            </div>

            <form onSubmit={handleCreateTrip} className={styles.modalForm}>
              {/* Điểm đến chính (Xác định thành phố rõ ràng) */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>THÀNH PHỐ / ĐIỂM ĐẾN CHÍNH</span>
                  <span className={styles.formLabelHint}>Bắt buộc • Chọn thành phố</span>
                </label>

                <div className={styles.inputWithIconWrapper}>
                  <div className={styles.inputLeadingIcon}>
                    <MapPin size={18} color="#0070BA" />
                  </div>
                  <select
                    className={styles.formSelectFancy}
                    value={isCustomCity ? 'CUSTOM' : (newDestination || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'CUSTOM') {
                        setIsCustomCity(true);
                      } else {
                        handleSelectCity(val);
                      }
                    }}
                    required={!isCustomCity}
                  >
                    <option value="" disabled>-- Chọn thành phố / tỉnh thành du lịch --</option>
                    {VIETNAM_POPULAR_CITIES.map((group) => (
                      <optgroup key={group.region} label={group.region}>
                        {group.cities.map((city) => (
                          <option key={city.name} value={city.name}>
                            {city.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="CUSTOM">✏️ Thành phố / Tỉnh thành khác (Tự nhập)...</option>
                  </select>
                </div>

                {/* Ô tự nhập nếu chọn khác */}
                {isCustomCity && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Nhập tên thành phố / tỉnh thành (Ví dụ: Tuy Hòa, Phú Yên hoặc Pleiku, Gia Lai)"
                      value={customCityName}
                      onChange={(e) => {
                        setCustomCityName(e.target.value);
                        setNewDestination(e.target.value);
                      }}
                      autoFocus
                      required
                    />
                  </div>
                )}

                {/* Các chip thành phố nổi tiếng chọn 1 chạm */}
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginBottom: 4 }}>
                    Gợi ý thành phố du lịch tiêu biểu:
                  </div>
                  <div className={styles.cityChipsContainer}>
                    {QUICK_FEATURED_CITIES.map((cName) => {
                      const isSelected = !isCustomCity && newDestination === cName;
                      return (
                        <button
                          key={cName}
                          type="button"
                          className={`${styles.cityChip} ${isSelected ? styles.cityChipActive : ''}`}
                          onClick={() => handleSelectCity(cName)}
                        >
                          <MapPin size={11} color={isSelected ? '#0070BA' : '#64748B'} />
                          <span>{cName.split(',')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.cityHintText}>
                  💡 <span>Xác định rõ thành phố giúp AI Planner đề xuất chính xác các địa điểm, vé tham quan và tối ưu cung đường.</span>
                </div>
              </div>

              {/* Tên chuyến đi */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>TÊN CHUYẾN ĐI</span>
                  <span className={styles.formLabelHint}>Hấp dẫn & Dễ nhớ</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder={newDestination ? `Ví dụ: Khám phá ${newDestination.split(',')[0]} cùng nhóm bạn` : 'Ví dụ: Khám phá Quy Nhơn - Phú Yên 4N3Đ'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              {/* Ngày bắt đầu & kết thúc */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span>NGÀY BẮT ĐẦU</span>
                  </label>
                  <input
                    type="date"
                    className={styles.formInput}
                    min={todayStr || undefined}
                    value={newStartDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewStartDate(val);
                      if (newEndDate && newEndDate < val) {
                        setNewEndDate(val);
                      }
                    }}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span>NGÀY KẾT THÚC</span>
                    <span className={styles.durationBadgeInline}>
                      {calculateDuration(newStartDate, newEndDate)}
                    </span>
                  </label>
                  <input
                    type="date"
                    className={styles.formInput}
                    min={newStartDate || todayStr || undefined}
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Ngân sách */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>NGÂN SÁCH NHÓM DỰ KIẾN</span>
                  <span className={styles.formLabelHint}>
                    {Number(newBudget) ? `${Number(newBudget).toLocaleString('vi-VN')} đ` : 'VNĐ'}
                  </span>
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="20000000"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                />
                <div className={styles.budgetChipsRow}>
                  {['10000000', '20000000', '30000000', '50000000'].map((bVal) => (
                    <button
                      key={bVal}
                      type="button"
                      className={`${styles.budgetChip} ${newBudget === bVal ? styles.budgetChipActive : ''}`}
                      onClick={() => setNewBudget(bVal)}
                    >
                      {Number(bVal) / 1000000} triệu
                    </button>
                  ))}
                </div>
              </div>

              {/* Tùy chọn tạo sẵn lộ trình mẫu có ảnh */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0369A1',
                }}
              >
                <input
                  type="checkbox"
                  checked={autoSeedItinerary}
                  onChange={(e) => setAutoSeedItinerary(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#0284C7', cursor: 'pointer' }}
                />
                <span>✨ Tự động khởi tạo sẵn lịch trình mẫu kèm ảnh minh họa theo điểm đến</span>
              </label>

              {/* Action Buttons */}
              <div className={styles.modalActionsRow} style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className={styles.btnCancelModal}
                  disabled={isCreatingTrip}
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className={styles.btnSubmitFancy} disabled={isCreatingTrip}>
                  <Sparkles size={16} />
                  <span>{isCreatingTrip ? 'Đang khởi tạo...' : 'Hoàn tất & Khởi tạo chuyến đi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: JOIN BY INVITE CODE ────────────────────────────────── */}
      {showJoinModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowJoinModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTopAccent} />

            {/* Dấu X thoát rõ ràng, sang trọng */}
            <button
              type="button"
              className={styles.btnCloseModal}
              onClick={() => setShowJoinModal(false)}
              aria-label="Đóng biểu mẫu"
              title="Đóng (Esc)"
            >
              <X size={18} strokeWidth={2.4} color="#334155" />
            </button>

            {/* Header sang trọng với icon và badge */}
            <div className={styles.modalHeaderFancy}>
              <div className={styles.modalIconWrapper}>
                <Ticket size={24} color="#0070BA" strokeWidth={2.2} />
              </div>
              <div className={styles.modalHeaderText}>
                <div className={styles.modalEyebrow}>VISTA CO-TRAVEL • GIA NHẬP NHÓM</div>
                <h3 className={styles.modalTitle}>Gia Nhập Bằng Mã Mời</h3>
              </div>
            </div>

            <p className={styles.modalDescription}>
              Nhập mã token gồm 6 ký tự hoặc liên kết lời mời mà trưởng nhóm đã chia sẻ để cùng lên lịch trình và quản lý ngân sách minh bạch:
            </p>

            <form onSubmit={handleJoinTrip} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>MÃ TOKEN LỜI MỜI</span>
                  <span className={styles.formLabelHint}>Ví dụ: VISTA-DN2026</span>
                </label>

                <div className={styles.inputWithIconWrapper}>
                  <div className={styles.inputLeadingIcon}>
                    <KeyRound size={18} color="#0070BA" />
                  </div>
                  <input
                    type="text"
                    className={styles.formInputFancy}
                    placeholder="VÍ DỤ: VISTA-DN2026 HOẶC MÃ TOKEN"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    autoFocus
                    required
                  />
                  {joinCode ? (
                    <button
                      type="button"
                      className={styles.inputTrailingClear}
                      onClick={() => setJoinCode('')}
                      aria-label="Xóa mã đã nhập"
                      title="Xóa mã"
                    >
                      <X size={14} strokeWidth={2.5} color="#475569" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.inputTrailingPaste}
                      onClick={handlePasteCode}
                      title="Dán từ Clipboard"
                    >
                      <Clipboard size={13} color="#0284C7" />
                      <span>Dán</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Gợi ý mã mẫu nhanh */}
              <div className={styles.quickChipsWrapper}>
                <span className={styles.quickChipsLabel}>Mã chuyến đi mẫu:</span>
                <button
                  type="button"
                  className={styles.quickChip}
                  onClick={() => setJoinCode('VISTA-DN2026')}
                >
                  VISTA-DN2026 (Đà Nẵng)
                </button>
                <button
                  type="button"
                  className={styles.quickChip}
                  onClick={() => setJoinCode('VISTA-HG2026')}
                >
                  VISTA-HG2026 (Hà Giang)
                </button>
                <button
                  type="button"
                  className={styles.quickChip}
                  onClick={() => setJoinCode('VISTA-PQ2026')}
                >
                  VISTA-PQ2026 (Phú Quốc)
                </button>
              </div>

              {/* Thông tin bảo mật */}
              <div className={styles.securityCallout}>
                <Lock size={15} color="#0284C7" className={styles.securityIcon} />
                <span>
                  Mã mời được bảo mật mã hóa. Sau khi gia nhập, bạn sẽ được tự động đồng bộ vai trò thành viên và danh sách quỹ.
                </span>
              </div>

              {/* Nút thao tác sang trọng */}
              <div className={styles.modalActionsRow}>
                <button
                  type="button"
                  className={styles.btnCancelModal}
                  onClick={() => setShowJoinModal(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className={styles.btnSubmitFancy}>
                  <span>Xác thực & Tham gia nhóm</span>
                  <ArrowRight size={17} strokeWidth={2.4} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: TASK ASSIGNMENT (PHÂN CÔNG) ─────────────────────────── */}
      {showAssignModal && selectedTripForAction && (() => {
        const isMember = isUserTrip(selectedTripForAction);
        const isOwner = isTripOwnerUser(selectedTripForAction);

        if (!isMember) {
          return (
            <div className={styles.modalBackdrop} onClick={() => setShowAssignModal(false)}>
              <div className={styles.modalBox} style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldAlert size={20} color="#DC2626" />
                    <h3 className={styles.modalTitle} style={{ color: '#DC2626' }}>Truy Cập Bị Từ Chối</h3>
                  </div>
                  <button type="button" className={styles.btnCloseModal} onClick={() => setShowAssignModal(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ padding: '16px 0', textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Lock size={26} color="#DC2626" />
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', margin: '0 0 6px' }}>Bạn không thuộc chuyến đi này</h4>
                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 16px' }}>
                    Danh sách phân công nhiệm vụ là thông tin nội bộ của chuyến đi <strong>"{selectedTripForAction.title}"</strong>. Vui lòng tham gia chuyến đi để cùng thực hiện kế hoạch!
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    style={{ padding: '9px 24px', borderRadius: 8, background: '#0070BA', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              </div>
            </div>
          );
        }

        const curTasks = tripTasks[selectedTripForAction.id] || getDefaultTasks(selectedTripForAction.destination || selectedTripForAction.title);
        const doneCount = curTasks.filter((t) => t.done).length;
        const progressPct = curTasks.length > 0 ? Math.round((doneCount / curTasks.length) * 100) : 0;
        const membersList: TripMember[] = selectedTripForAction.members && selectedTripForAction.members.length > 0
          ? selectedTripForAction.members
          : [{ name: 'Trưởng nhóm', avatar: 'TN', color: '#0284c7', userId: 'default-owner' }];

        return (
          <div className={styles.modalBackdrop} onClick={() => setShowAssignModal(false)}>
            <div className={styles.modalBox} style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={20} color="#0070BA" />
                  <h3 className={styles.modalTitle}>Phân Công Nhiệm Vụ Nhóm</h3>
                </div>
                <button
                  type="button"
                  className={styles.btnCloseModal}
                  onClick={() => setShowAssignModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Role Indicator Banner */}
              {isOwner ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  color: '#92400E',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: 12,
                }}>
                  <Crown size={15} color="#D97706" style={{ flexShrink: 0 }} />
                  <span>Bạn là <strong>Trưởng nhóm</strong>: Có toàn quyền tạo nhiệm vụ, phân công cho các thành viên và quản lý đầu việc.</span>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#E0F2FE',
                  border: '1px solid #BAE6FD',
                  color: '#0369A1',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: '12.5px',
                  fontWeight: 500,
                  marginBottom: 12,
                }}>
                  <Info size={15} color="#0284C7" style={{ flexShrink: 0 }} />
                  <span>Vai trò của bạn: <strong>Thành viên nhóm</strong>. Bạn có thể đánh dấu công việc đã hoàn thành. Chỉ Trưởng nhóm ({selectedTripForAction.members?.[0]?.name || 'Trưởng nhóm'}) mới có quyền phân công việc mới.</span>
                </div>
              )}

              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                    Chuyến đi: {selectedTripForAction.title}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0070BA' }}>
                    {doneCount}/{curTasks.length} hoàn thành ({progressPct}%)
                  </span>
                </div>
                <div style={{ height: 6, width: '100%', background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: '#10B981', transition: 'width 0.3s' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                {curTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: t.done ? '#F0FDF4' : '#FFFFFF',
                      border: `1px solid ${t.done ? '#BBF7D0' : '#E2E8F0'}`,
                      borderRadius: 10,
                      gap: 10,
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => handleToggleTask(selectedTripForAction.id, t.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#10B981' }}
                      />
                      <span style={{
                        fontSize: '13.5px',
                        fontWeight: 500,
                        color: t.done ? '#15803D' : '#0F172A',
                        textDecoration: t.done ? 'line-through' : 'none',
                      }}>
                        {t.title}
                      </span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: t.assignee.includes('Trưởng nhóm') ? '#FEF3C7' : '#E0F2FE',
                        color: t.assignee.includes('Trưởng nhóm') ? '#B45309' : '#0284C7',
                      }}>
                        {t.assignee}
                      </span>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(selectedTripForAction.id, t.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}
                          title="Xóa công việc (Chỉ Trưởng nhóm)"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Form to add tasks: ONLY rendered for Trưởng nhóm (Leader/Owner) */}
              {isOwner ? (
                <form onSubmit={(e) => handleAddTask(e, selectedTripForAction.id)} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Giao nhiệm vụ mới cho nhóm..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                    }}
                  />
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      background: '#FFFFFF',
                      maxWidth: 160,
                    }}
                  >
                    <option value="Cả nhóm">Cả nhóm (Tất cả)</option>
                    {membersList.map((m, mIdx) => (
                      <option key={m.userId || mIdx} value={m.name}>
                        {m.name} {mIdx === 0 ? '(Trưởng nhóm)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: '#0070BA',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Giao việc
                  </button>
                </form>
              ) : (
                <div style={{ marginTop: 14, textAlign: 'center', fontSize: '12.5px', color: '#64748B', background: '#F8FAFC', padding: '8px 12px', borderRadius: 8 }}>
                  🔒 Bạn đang xem với vai trò Thành viên. Chỉ Trưởng nhóm mới có quyền tạo và giao việc mới.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ─── MODAL: NOTES & PACKING CHECKLIST (GHI CHÚ) ───────────────────── */}
      {showNoteModal && selectedTripForAction && (() => {
        const isMember = isUserTrip(selectedTripForAction);

        if (!isMember) {
          return (
            <div className={styles.modalBackdrop} onClick={() => setShowNoteModal(false)}>
              <div className={styles.modalBox} style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldAlert size={20} color="#DC2626" />
                    <h3 className={styles.modalTitle} style={{ color: '#DC2626' }}>Truy Cập Bị Từ Chối</h3>
                  </div>
                  <button type="button" className={styles.btnCloseModal} onClick={() => setShowNoteModal(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ padding: '16px 0', textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Lock size={26} color="#DC2626" />
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', margin: '0 0 6px' }}>Bạn không thuộc chuyến đi này</h4>
                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 16px' }}>
                    Danh sách hành lý và ghi chú chuẩn bị là thông tin nội bộ của chuyến đi <strong>"{selectedTripForAction.title}"</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(false)}
                    style={{ padding: '9px 24px', borderRadius: 8, background: '#0070BA', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              </div>
            </div>
          );
        }

        const curNotes = tripNotes[selectedTripForAction.id] || getDefaultNotes();
        const doneCount = curNotes.filter((n) => n.done).length;

        return (
          <div className={styles.modalBackdrop} onClick={() => setShowNoteModal(false)}>
            <div className={styles.modalBox} style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={20} color="#0070BA" />
                  <h3 className={styles.modalTitle}>Ghi Chú & Chuẩn Bị Hành Lý</h3>
                </div>
                <button
                  type="button"
                  className={styles.btnCloseModal}
                  onClick={() => setShowNoteModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Hành trang: {selectedTripForAction.title}
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Đã chuẩn bị {doneCount}/{curNotes.length} món đồ cần thiết cho chuyến đi.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                {curNotes.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: n.done ? '#F0FDF4' : '#FFFFFF',
                      border: `1px solid ${n.done ? '#BBF7D0' : '#E2E8F0'}`,
                      borderRadius: 10,
                      gap: 10,
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={n.done}
                        onChange={() => handleToggleNote(selectedTripForAction.id, n.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#10B981' }}
                      />
                      <span style={{
                        fontSize: '13.5px',
                        fontWeight: 500,
                        color: n.done ? '#15803D' : '#0F172A',
                        textDecoration: n.done ? 'line-through' : 'none',
                      }}>
                        {n.content}
                      </span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: '#EFF6FF',
                        color: '#0070BA',
                      }}>
                        {n.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(selectedTripForAction.id, n.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}
                        title="Xóa ghi chú"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={(e) => handleAddNote(e, selectedTripForAction.id)} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Thêm món đồ hoặc ghi chú..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                  }}
                />
                <select
                  value={newNoteCategory}
                  onChange={(e) => setNewNoteCategory(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="Giấy tờ">Giấy tờ</option>
                  <option value="Đồ dùng">Đồ dùng</option>
                  <option value="Công nghệ">Công nghệ</option>
                  <option value="Trang phục">Trang phục</option>
                  <option value="Y tế">Y tế</option>
                  <option value="Khác">Khác</option>
                </select>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: '#0070BA',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Thêm
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ─── MODAL: DESTINATION VOTING PREVIEW ──────────────────────────── */}
      {showVoteModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowVoteModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTopAccent} />
            <button
              type="button"
              className={styles.btnCloseModal}
              onClick={() => setShowVoteModal(false)}
              aria-label="Đóng"
              title="Đóng (Esc)"
            >
              <X size={18} strokeWidth={2.4} color="#334155" />
            </button>

            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Biểu Quyết Địa Điểm Nhóm</h3>
            </div>

            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              Các địa điểm được thành viên trong nhóm đề xuất. Bình chọn để chốt lịch trình chính thức:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {proposals.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: item.userVoted ? '#f0fdf4' : '#ffffff',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        color: '#475569',
                      }}
                    >
                      {item.category}
                    </span>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '4px' }}>
                      {item.name}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleVote(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: item.userVoted ? '#86efac' : '#cbd5e1',
                      background: item.userVoted ? '#22c55e' : '#ffffff',
                      color: item.userVoted ? '#ffffff' : '#334155',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <ThumbsUp size={14} />
                    <span>{item.votes}</span>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={styles.btnSubmitForm}
              onClick={() => {
                setShowVoteModal(false);
                showToast('Đã lưu kết quả biểu quyết của bạn!');
              }}
            >
              Đóng & Lưu kết quả
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFIRM DELETE TRIP (Dành cho Trưởng nhóm - TV4) ──── */}
      {tripToDelete && (
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
          onClick={() => !isDeletingTrip && setTripToDelete(null)}
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
              Hành động này sẽ <strong>xóa vĩnh viễn</strong> toàn bộ dữ liệu chuyến đi <strong>&ldquo;{tripToDelete.title}&rdquo;</strong>. Thao tác này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setTripToDelete(null)}
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toastNotification}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
