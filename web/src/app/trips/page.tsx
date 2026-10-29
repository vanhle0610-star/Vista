'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { Navbar } from '@/components/common/Navbar';
import { SkeletonCardGrid } from '@/components/common/Skeleton';
import {
  POPULAR_DESTINATIONS,
  getSampleItineraryForDestination,
  getDestinationHeroImage,
} from '@/data/sampleItineraries';
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
  status: 'ACTIVE' | 'PLANNING' | 'COMPLETED';
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
  itineraryDays?: unknown[];
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
  const currentName = (currentUser?.displayName || currentUser?.name || '').toLowerCase().trim();

  if (!Array.isArray(members) || members.length === 0) {
    return [getCurrentUserMember(defaultRole)];
  }

  const seen = new Set<string>();
  const result: TripMember[] = [];

  for (const m of members) {
    if (!m) continue;
    const rawName = (m.name || '').replace(/\s*\([^)]*\)/g, '').trim();
    const rawEmail = (m.email || '').toLowerCase().trim();
    const key = (m.userId ? `id:${m.userId}` : '') || rawEmail || rawName.toLowerCase();

    if (!key || seen.has(key)) continue;
    seen.add(key);

    const isMe = Boolean(
      (currentUser && m.userId && currentUser.id && m.userId === currentUser.id) ||
      (currentEmail && rawEmail && currentEmail === rawEmail) ||
      (currentName && rawName.toLowerCase() === currentName) ||
      (m.name || '').toLowerCase().includes('(bạn)')
    );

    result.push({
      name: isMe ? `${rawName || 'Bạn'} (Bạn)` : rawName,
      avatar: m.avatar || (rawName.slice(0, 2)).toUpperCase() || 'TV',
      color: m.color || '#0284c7',
      email: m.email || (isMe && currentEmail ? currentEmail : undefined),
      role: m.role || 'Thành viên',
      userId: m.userId || (isMe && currentUser?.id ? currentUser.id : undefined),
    });
  }

  return result.length > 0 ? result : [getCurrentUserMember(defaultRole)];
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

function matchesDateFilter(trip: TripItem, filter: DateFilterType): boolean {
  if (filter === 'all') return true;
  const text = `${trip.startDate || ''} ${trip.endDate || ''}`.toLowerCase();

  if (filter === 'upcoming') {
    return trip.status === 'PLANNING' || trip.status === 'ACTIVE';
  }
  if (filter === 'past') {
    return trip.status === 'COMPLETED' || text.includes('2025');
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
      }
    }
  }, [router]);

  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'planning' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
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

  const handleOpenAssignModal = (t: TripItem) => {
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
    try {
      const stored = localStorage.getItem(`vista_trip_tasks_${t.id}`);
      if (stored) {
        setTripTasks((prev) => ({ ...prev, [t.id]: JSON.parse(stored) }));
      } else {
        const def = getDefaultTasks(t.destination || t.title);
        setTripTasks((prev) => ({ ...prev, [t.id]: def }));
        localStorage.setItem(`vista_trip_tasks_${t.id}`, JSON.stringify(def));
      }
    } catch {
      const def = getDefaultTasks(t.destination || t.title);
      setTripTasks((prev) => ({ ...prev, [t.id]: def }));
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

  const handleToggleTask = (tripId: string, taskId: string) => {
    if (!selectedTripForAction || !isUserTrip(selectedTripForAction)) {
      showToast('⚠️ Bạn không thuộc chuyến đi này. Thao tác bị từ chối!');
      return;
    }
    setTripTasks((prev) => {
      const current = prev[tripId] || [];
      const updated = current.map((item) =>
        item.id === taskId ? { ...item, done: !item.done } : item
      );
      try {
        localStorage.setItem(`vista_trip_tasks_${tripId}`, JSON.stringify(updated));
      } catch {}
      return { ...prev, [tripId]: updated };
    });
  };

  const handleAddTask = (e: React.FormEvent, tripId: string) => {
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
    const newTask: TripTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      assignee: newTaskAssignee || 'Cả nhóm',
      done: false,
    };
    setTripTasks((prev) => {
      const current = prev[tripId] || [];
      const updated = [...current, newTask];
      try {
        localStorage.setItem(`vista_trip_tasks_${tripId}`, JSON.stringify(updated));
      } catch {}
      return { ...prev, [tripId]: updated };
    });
    setNewTaskTitle('');
    showToast(`Đã giao việc cho: ${newTask.assignee}!`);
  };

  const handleDeleteTask = (tripId: string, taskId: string) => {
    if (!selectedTripForAction) return;
    if (!isUserTrip(selectedTripForAction)) {
      showToast('⚠️ Bạn không thuộc chuyến đi này!');
      return;
    }
    if (!isTripOwnerUser(selectedTripForAction)) {
      showToast('⚠️ Chỉ Trưởng nhóm mới có quyền xóa nhiệm vụ phân công!');
      return;
    }
    setTripTasks((prev) => {
      const current = prev[tripId] || [];
      const updated = current.filter((item) => item.id !== taskId);
      try {
        localStorage.setItem(`vista_trip_tasks_${tripId}`, JSON.stringify(updated));
      } catch {}
      return { ...prev, [tripId]: updated };
    });
    showToast('Đã xóa nhiệm vụ!');
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

  const [tripsList, setTripsList] = useState<TripItem[]>(DEFAULT_DEMO_TRIPS);
  const [isSyncingTrips, setIsSyncingTrips] = useState<boolean>(true);
  const [incomingInvitations, setIncomingInvitations] = useState<any[]>([]);

  // Synchronize with localStorage (custom trips created from Planner or Trips)
  useEffect(() => {
    const syncTrips = async () => {
      await Promise.resolve();
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('vista_custom_trips');
          const customTrips: TripItem[] = stored ? JSON.parse(stored) : [];
          if (customTrips && customTrips.length > 0) {
            const currentOwner = getCurrentUserMember('Trưởng nhóm');
            let hasLegacyData = false;
            const normalized = customTrips.map((t) => {
              const dest = t.destination || 'Việt Nam';
              const isHanoiMismatch = dest && !dest.toLowerCase().includes('hà nội') && JSON.stringify(t.itineraryDays || '').includes('Hoàn Kiếm');
              const fixedItinerary = (!t.itineraryDays || (t.itineraryDays as unknown[]).length === 0 || isHanoiMismatch)
                ? getSampleItineraryForDestination(dest, t.startDate)
                : t.itineraryDays;

              const rawMembers = Array.isArray(t.members) && t.members.length > 0 ? t.members : [currentOwner];
              const cleanedMembers: TripMember[] = rawMembers.map((m: any, idx: number) => {
                const rawName = m.name || '';
                let cleanName = rawName.replace(/\s*\(Bạn\)/g, '').trim();
                if (!cleanName || cleanName === 'Bạn') {
                  cleanName = idx === 0 ? 'Trưởng nhóm VISTA' : 'Thành viên VISTA';
                }
                if (cleanName !== rawName) {
                  hasLegacyData = true;
                }

                // Match with currentUser only if name or email truly matches
                const isMe = Boolean(
                  currentUser && (
                    (m.userId && m.userId === currentUser.id) ||
                    (currentUser.displayName && cleanName.toLowerCase() === currentUser.displayName.toLowerCase()) ||
                    (currentUser.email && m.email && m.email.toLowerCase() === currentUser.email.toLowerCase())
                  )
                );

                const memberUserId = isMe
                  ? (currentUser?.id || currentOwner.userId)
                  : (m.userId && m.userId !== currentOwner.userId ? m.userId : `u-${encodeURIComponent(cleanName.toLowerCase().replace(/\s+/g, '-'))}`);

                const memberEmail = isMe
                  ? (currentUser?.email || currentOwner.email)
                  : (m.email && m.email !== currentOwner.email ? m.email : `${encodeURIComponent(cleanName.toLowerCase().replace(/\s+/g, ''))}@vista.vn`);

                return {
                  name: cleanName,
                  avatar: m.avatar || cleanName.slice(0, 2).toUpperCase(),
                  color: m.color || '#0284c7',
                  role: m.role || (idx === 0 ? 'Trưởng nhóm' : 'Thành viên'),
                  userId: memberUserId,
                  email: memberEmail,
                };
              });

              const firstMember = cleanedMembers[0];
              const isCreatorMe = Boolean(
                currentUser && (
                  (firstMember?.userId && firstMember.userId === currentUser.id) ||
                  (currentUser.displayName && firstMember?.name && firstMember.name.toLowerCase() === currentUser.displayName.toLowerCase()) ||
                  (currentUser.email && firstMember?.email && firstMember.email.toLowerCase() === currentUser.email.toLowerCase())
                )
              );

              const resolvedOwnerId = isCreatorMe
                ? (currentUser?.id || currentOwner.userId)
                : (firstMember?.userId || `owner-${t.id}`);

              const bSpent = typeof t.budgetSpent === 'number' ? t.budgetSpent : 0;
              const bTotal = typeof t.budgetTotal === 'number' && t.budgetTotal > 0 ? t.budgetTotal : 20000000;
              const calculatedProgress = bTotal > 0 ? Math.min(100, Math.round((bSpent / bTotal) * 100)) : 0;

              if (t.progressPercent !== calculatedProgress || t.ownerId !== resolvedOwnerId) {
                hasLegacyData = true;
              }

              return {
                ...t,
                ownerId: resolvedOwnerId,
                members: cleanedMembers,
                image: getDestinationHeroImage(dest),
                itineraryDays: fixedItinerary,
                quickActions: Array.isArray(t.quickActions) && t.quickActions.length > 0
                  ? t.quickActions
                  : [
                      { label: 'Lịch trình', href: `/trips/${t.id}` },
                      { label: 'Phân công', actionType: 'ASSIGN' },
                      { label: 'Ghi chú', actionType: 'NOTE' },
                    ],
                budgetTotal: bTotal,
                budgetSpent: bSpent,
                progressPercent: calculatedProgress,
                durationBadge: t.durationBadge || '4 ngày',
                startDate: t.startDate || '15/11',
                endDate: t.endDate || '18/11/2026',
                role: t.role || 'OWNER',
                status: t.status || 'PLANNING',
                treasuryPath: t.treasuryPath || `/trips/${t.id}/treasury`,
              };
            });

            if (hasLegacyData) {
              try {
                localStorage.setItem('vista_custom_trips', JSON.stringify(normalized));
              } catch {}
            }
            const merged: TripItem[] = [...normalized];
            DEFAULT_DEMO_TRIPS.forEach((d) => {
              if (!merged.some((m) => m.id === d.id)) {
                merged.push(d);
              }
            });
            setTripsList(merged);
          } else {
            setTripsList(DEFAULT_DEMO_TRIPS);
          }

          // Also sync with server API to fetch trips from other windows / accounts
          try {
            fetch('/api/trips')
              .then((r) => (r.ok ? r.json() : []))
              .then((serverTrips) => {
                if (Array.isArray(serverTrips) && serverTrips.length > 0) {
                  setTripsList((prev) => {
                    const map = new Map();
                    prev.forEach((t) => map.set(t.id, t));
                    serverTrips.forEach((st: any) => {
                      if (map.has(st.id)) {
                        const existing = map.get(st.id);
                        map.set(st.id, {
                          ...existing,
                          ...st,
                          members: formatMembersForCurrentUser([...(existing.members || []), ...(st.members || [])]),
                        });
                      } else {
                        map.set(st.id, {
                          ...st,
                          members: formatMembersForCurrentUser(st.members || []),
                        });
                      }
                    });
                    return Array.from(map.values());
                  });
                }
              })
              .catch(() => {});
          } catch {}

          // Check if user just created a trip from Planner
          const params = new URLSearchParams(window.location.search);
          const createdId = params.get('created');
          if (createdId) {
            const createdTrip = customTrips.find((t) => t.id === createdId);
            const title = createdTrip ? createdTrip.title : 'Chuyến đi mới';
            showToast(`🎉 Đã đồng bộ thành công chuyến đi "${title}" từ AI Planner!`);
            setActiveTab('planning');
          }
        } catch {
          // SSR safe
        }
      }
    };
    void syncTrips().finally(() => setIsSyncingTrips(false));

    // Load incoming invitations for currently logged in user
    try {
      const userStr = localStorage.getItem('vista_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        const email = (u.email || '').toLowerCase().trim();
        if (email) {
          fetch(`/api/invitations?email=${encodeURIComponent(email)}`)
            .then((r) => r.json())
            .then((list) => {
              if (Array.isArray(list)) {
                const pending = list.filter(
                  (inv) => inv.inviteeEmail && inv.inviteeEmail.toLowerCase() === email && inv.status === 'PENDING'
                );
                setIncomingInvitations(pending);
              }
            })
            .catch(() => {});
        }
      }
    } catch {}
  }, []);

  const handleAcceptIncomingInvite = async (inv: any) => {
    try {
      await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inv.token, status: 'ACCEPTED' }),
      });

      const currentUserMember = getCurrentUserMember('Thành viên');
      const newJoinedTrip: TripItem = {
        id: inv.tripId || `trip-joined-${Date.now()}`,
        title: inv.tripTitle || 'Chuyến đi tham gia qua lời mời',
        destination: inv.destination || 'Việt Nam',
        durationBadge: '4 ngày',
        startDate: inv.startDate || 'Sắp tới',
        endDate: inv.endDate || '2026',
        status: 'PLANNING',
        role: 'MEMBER',
        budgetTotal: 15000000,
        budgetSpent: 0,
        progressPercent: 20,
        members: [
          { name: inv.inviterName || 'Trưởng nhóm', avatar: (inv.inviterName || 'TN').slice(0, 2).toUpperCase(), color: '#0070BA', role: 'Trưởng nhóm', userId: 'owner-stub' },
          currentUserMember,
        ],
        image: getDestinationHeroImage(inv.destination || 'Việt Nam'),
        treasuryPath: `/trips/${inv.tripId || 'demo-danang-2026'}/treasury`,
        alertType: 'BLUE',
        alertText: `Bạn đã tham gia qua lời mời từ ${inv.inviterName || 'Trưởng nhóm'}`,
        quickActions: [
          { label: 'Lịch trình', actionType: 'PLAN' },
          { label: 'Thành viên', actionType: 'MEMBERS' },
        ],
      };

      setTripsList((prev) => [newJoinedTrip, ...prev]);

      try {
        const stored = localStorage.getItem('vista_custom_trips');
        const list: TripItem[] = stored ? JSON.parse(stored) : [];
        if (!list.some((t) => t.id === newJoinedTrip.id)) {
          list.unshift(newJoinedTrip);
          localStorage.setItem('vista_custom_trips', JSON.stringify(list));
        }
      } catch {}

      setIncomingInvitations((prev) => prev.filter((i) => i.token !== inv.token));
      showToast(`🎉 Bạn đã gia nhập "${inv.tripTitle}" thành công!`);

      setTimeout(() => {
        router.push(`/trips/${newJoinedTrip.id}`);
      }, 600);
    } catch {
      showToast('Có lỗi xảy ra khi chấp nhận lời mời');
    }
  };

  const handleDeclineIncomingInvite = async (inv: any) => {
    try {
      await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inv.token, status: 'REVOKED' }),
      });
      setIncomingInvitations((prev) => prev.filter((i) => i.token !== inv.token));
      showToast('Đã từ chối lời mời.');
    } catch {
      showToast('Có lỗi khi từ chối lời mời');
    }
  };

  // isUserTrip defined above
  const myTripsList = tripsList.filter(isUserTrip);
  const myCount = myTripsList.length;
  const totalCount = tripsList.length;
  const planningCount = tripsList.filter((t) => t.status === 'PLANNING').length;
  const activeCount = tripsList.filter((t) => t.status === 'ACTIVE').length;
  const completedCount = tripsList.filter((t) => t.status === 'COMPLETED').length;

  const filteredTrips = tripsList.filter((trip) => {
    if (activeTab === 'mine' && !isUserTrip(trip)) return false;
    if (activeTab === 'planning' && trip.status !== 'PLANNING') return false;
    if (activeTab === 'active' && trip.status !== 'ACTIVE') return false;
    if (activeTab === 'completed' && trip.status !== 'COMPLETED') return false;

    if (!matchesDateFilter(trip, dateFilter)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        trip.title.toLowerCase().includes(q) ||
        trip.destination.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
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

    const start = new Date(newStartDate).getTime();
    const end = new Date(newEndDate).getTime();
    const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const durationBadge = `${diffDays} ngày`;

    const startParts = newStartDate.split('-');
    const endParts = newEndDate.split('-');
    const formattedStartDate = startParts.length === 3 ? `${startParts[2]}/${startParts[1]}` : newStartDate;
    const formattedEndDate = endParts.length === 3 ? `${endParts[2]}/${endParts[1]}/${endParts[0]}` : newEndDate;

    const tripId = `trip-${Date.now()}`;
    const currentOwner = getCurrentUserMember('Trưởng nhóm');
    const generatedItinerary = getSampleItineraryForDestination(destinationToSave, formattedStartDate);

    const parsedBudget = Number(newBudget) > 0 ? Number(newBudget) : 20000000;
    const newTrip: TripItem = {
      id: tripId,
      title: newTitle,
      destination: destinationToSave,
      durationBadge,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      status: 'PLANNING',
      role: 'OWNER',
      ownerId: currentOwner.userId,
      budgetTotal: parsedBudget,
      budgetSpent: 0,
      progressPercent: 0,
      members: [currentOwner],
      image: getDestinationHeroImage(destinationToSave),
      treasuryPath: `/trips/${tripId}/treasury`,
      alertText: `Hành trình ${durationBadge} khám phá ${destinationToSave}`,
      alertLinkText: 'Xem',
      itineraryDays: generatedItinerary,
      quickActions: [
        { label: 'Lịch trình', href: `/trips/${tripId}` },
        { label: 'Phân công', actionType: 'ASSIGN' },
        { label: 'Ghi chú', actionType: 'NOTE' },
      ],
    };

    setTripsList((prev) => [newTrip, ...prev]);

    // Persist to localStorage
    try {
      const stored = localStorage.getItem('vista_custom_trips');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(newTrip);
      localStorage.setItem('vista_custom_trips', JSON.stringify(list));
    } catch {
      // ignore
    }

    setShowCreateModal(false);
    setNewTitle('');
    setNewDestination('');
    setCustomCityName('');
    setIsCustomCity(false);
    showToast(`Đã tạo thành công chuyến đi "${newTrip.title}"!`);
  };

  const handleJoinTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Vui lòng nhập mã mời từ trưởng nhóm!');
      return;
    }

    // Try finding in existing trips (custom or demo)
    const allTrips = [...tripsList];
    const matched = allTrips.find((t) => {
      const tripCode = `VISTA-${t.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6)}`.toUpperCase();
      return (
        cleanCode === tripCode ||
        cleanCode === t.id.toUpperCase() ||
        t.id.toUpperCase().includes(cleanCode.replace('VISTA-', '')) ||
        (cleanCode.includes('DN') && t.id.includes('danang')) ||
        (cleanCode.includes('HG') && t.id.includes('hagiang')) ||
        (cleanCode.includes('PQ') && t.id.includes('phuquoc'))
      );
    });

    if (matched) {
      // Add current user as member if not yet added
      const meMember = getCurrentUserMember('Thành viên');
      const alreadyIn = (matched.members || []).some(
        (m) =>
          (m.userId && m.userId === meMember.userId) ||
          (m.email && meMember.email && m.email.toLowerCase() === meMember.email.toLowerCase()) ||
          m.name.toLowerCase() === meMember.name.toLowerCase()
      );
      if (!alreadyIn) {
        matched.members = [...(matched.members || []), meMember];
        // Save to localStorage
        try {
          const stored = localStorage.getItem('vista_custom_trips');
          const list: TripItem[] = stored ? JSON.parse(stored) : [];
          const idx = list.findIndex((x) => x.id === matched.id);
          if (idx >= 0) {
            list[idx] = matched;
          } else {
            list.unshift(matched);
          }
          localStorage.setItem('vista_custom_trips', JSON.stringify(list));
        } catch {
          // ignore
        }
      }

      setShowJoinModal(false);
      setJoinCode('');
      showToast(`Gia nhập thành công "${matched.title}"! Đang chuyển hướng...`);
      setTimeout(() => {
        router.push(`/trips/${matched.id}`);
      }, 500);
      return;
    }

    // If new custom code not matching existing, create a joined trip stub
    const meMember = getCurrentUserMember('Thành viên');
    const newJoinedId = `trip-joined-${Date.now()}`;
    const newJoinedTrip: TripItem = {
      id: newJoinedId,
      title: `Chuyến đi theo mã ${cleanCode}`,
      destination: 'Việt Nam',
      durationBadge: '3 ngày',
      startDate: 'Sắp tới',
      endDate: '2026',
      status: 'PLANNING',
      role: 'MEMBER',
      budgetTotal: 15000000,
      budgetSpent: 0,
      progressPercent: 0,
      members: [
        { name: 'Trưởng nhóm', avatar: 'TN', color: '#0070BA', role: 'Trưởng nhóm', userId: 'owner-stub' },
        meMember,
      ],
      image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
      treasuryPath: `/trips/${newJoinedId}/treasury`,
      alertType: 'BLUE',
      alertText: `Bạn đã tham gia qua mã mời ${cleanCode}`,
      quickActions: [
        { label: 'Lịch trình', actionType: 'PLAN' },
        { label: 'Thành viên', actionType: 'MEMBERS' },
      ],
    };

    setTripsList((prev) => [newJoinedTrip, ...prev]);
    try {
      const stored = localStorage.getItem('vista_custom_trips');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(newJoinedTrip);
      localStorage.setItem('vista_custom_trips', JSON.stringify(list));
    } catch {
      // ignore
    }

    setShowJoinModal(false);
    setJoinCode('');
    showToast(`Gia nhập thành công chuyến đi theo mã ${cleanCode}! Đang chuyển hướng...`);
    setTimeout(() => {
      router.push(`/trips/${newJoinedTrip.id}`);
    }, 500);
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
      {/* ─── 1. TOP HEADER & ACTION ROW ───────────────────────────────── */}
      <section className={styles.headerSection}>
        <div className={styles.container}>
          <div className={styles.headerRow}>
            <div className={styles.headerText}>
              <div className={styles.headerBadge}>
                <span className={styles.badgeDot} />
                <span>Quản lý hành trình</span>
              </div>
              <h1 className={styles.pageTitle}>Chuyến đi của bạn</h1>
              <p className={styles.pageSubtitle}>
                Lên kế hoạch, đồng hành và quản lý mọi hoạt động của nhóm trong cùng một nơi.
              </p>
            </div>

            <div className={styles.headerActions}>
              <div className={styles.headerActionsRow}>
                <Link href="/planner" className={styles.btnAiPlan}>
                  <Sparkles size={16} />
                  <span>Tạo lịch trình bằng AI</span>
                </Link>
                <button
                  type="button"
                  className={styles.btnJoinCode}
                  onClick={() => setShowJoinModal(true)}
                  id="btn-join-trip-modal"
                >
                  <Ticket size={16} />
                  <span>Tham gia bằng mã mới</span>
                </button>
              </div>

              <button
                type="button"
                className={styles.btnCreateTripPrimary}
                onClick={() => setShowCreateModal(true)}
                id="btn-create-trip-modal"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Tạo chuyến đi mới</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. KPI METRICS CARDS ROW (4 CARDS) ───────────────────────── */}
      <div className={styles.container}>
        <div className={styles.kpiGrid}>
          {/* Card 1: Tổng chuyến đi */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Tổng chuyến đi</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{totalCount}</span>
              </div>
              <span className={styles.kpiSubtext}>Đã đồng bộ hồ sơ</span>
            </div>
            <div className={styles.kpiIconBox}>
              <Briefcase size={20} />
            </div>
          </div>

          {/* Card 2: Đang lên kế hoạch */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Đang lên kế hoạch</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{planningCount}</span>
              </div>
              <span className={`${styles.kpiSubtext} ${styles.kpiSubtextAccent}`}>
                Chờ biểu quyết chặng
              </span>
            </div>
            <div className={styles.kpiIconBox}>
              <Calendar size={20} />
            </div>
          </div>

          {/* Card 3: Đang diễn ra */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Đang diễn ra</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{activeCount}</span>
                {activeCount > 0 && <span className={styles.liveGreenDot} />}
              </div>
              <span className={`${styles.kpiSubtext} ${styles.kpiSubtextLive}`}>
                {activeCount > 0 ? 'Đang ở Quảng Nam' : 'Chưa có chuyến đi'}
              </span>
            </div>
            <div className={styles.kpiIconBox}>
              <Compass size={20} />
            </div>
          </div>

          {/* Card 4: Đã hoàn thành */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Đã hoàn thành</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{completedCount}</span>
              </div>
              <span className={styles.kpiSubtext}>Lưu trữ ảnh & chi phí</span>
            </div>
            <div className={styles.kpiIconBox}>
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

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

        {/* ─── 3. FILTER TABS & SEARCH CONTROLS TOOLBAR ───────────────── */}
        <div className={styles.toolbarRow}>
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

          <div className={styles.toolbarRight}>
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
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleBtnActive : ''}`}
                onClick={() => setViewMode('list')}
                title="Xem dạng danh sách"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── 4. TRIP CARDS GRID OR LIST VIEW ────────────────────────── */}
        {isSyncingTrips ? (
          <SkeletonCardGrid count={3} />
        ) : (
        <div className={viewMode === 'list' ? styles.tripsListView : styles.tripsGrid}>
          {filteredTrips.map((trip) => {
            const currentOwnerMember = getCurrentUserMember('Trưởng nhóm');
            const membersList = Array.isArray(trip.members) && trip.members.length > 0
              ? trip.members
              : [currentOwnerMember];

            const isTripOwner = Boolean(
              currentUser && (
                (trip.ownerId && (trip.ownerId === currentUser.id || (currentUser.email && trip.ownerId === currentUser.email))) ||
                (trip.members?.[0] && (
                  (trip.members[0].userId && (trip.members[0].userId === currentUser.id || (currentUser.email && trip.members[0].userId === currentUser.email))) ||
                  (trip.members[0].email && currentUser.email && trip.members[0].email.toLowerCase() === currentUser.email.toLowerCase()) ||
                  (currentUser.displayName && trip.members[0].name && trip.members[0].name.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase())
                ))
              )
            );

            const isTripMember = Boolean(
              currentUser && (
                isTripOwner ||
                trip.members?.some((m) =>
                  (m.userId && (m.userId === currentUser.id || (currentUser.email && m.userId === currentUser.email))) ||
                  (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                  (currentUser.displayName && m.name && m.name.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase())
                )
              )
            );

            const actions = Array.isArray(trip.quickActions) && trip.quickActions.length > 0
              ? trip.quickActions
              : [
                  { label: 'Lịch trình', href: `/planner?tripId=${trip.id}&dest=${encodeURIComponent(trip.destination || '')}` },
                  { label: 'Phân công', actionType: 'ASSIGN' },
                  { label: 'Ghi chú', actionType: 'NOTE' },
                ];

            return (
              <div key={trip.id} className={styles.tripCard} id={`trip-card-${trip.id}`}>
                {/* Media Image Banner */}
                <div
                  className={styles.tripMediaWrapper}
                  style={{
                    backgroundImage: trip.image ? `url(${trip.image})` : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className={styles.tripMediaOverlay}>
                    {/* Top Row: Status badge + 3-dots menu */}
                    <div className={styles.mediaTopRow}>
                      {trip.status === 'ACTIVE' && (
                        <span className={styles.statusPillActive}>
                          <span className={styles.liveGreenDot} />
                          <span>Đang diễn ra</span>
                        </span>
                      )}
                      {trip.status === 'PLANNING' && (
                        <span className={styles.statusPillPlanning}>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#FFFFFF',
                            }}
                          />
                          <span>Đang lên kế hoạch</span>
                        </span>
                      )}
                      {trip.status === 'COMPLETED' && (
                        <span className={styles.statusPillCompleted}>
                          <Check size={12} strokeWidth={3} />
                          <span>Đã hoàn thành</span>
                        </span>
                      )}

                      <button
                        type="button"
                        className={styles.btnMoreMenu}
                        title="Tùy chọn khác"
                        onClick={() => showToast(`Tùy chọn: ${trip.title}`)}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>

                    {/* Bottom Row: Location + Duration badge */}
                    <div className={styles.mediaBottomRow}>
                      <div className={styles.mediaLocation}>
                        <MapPin size={14} />
                        <span>{trip.destination}</span>
                      </div>
                      <div className={styles.mediaDurationBadge}>
                        {trip.durationBadge}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className={styles.tripCardBody}>
                  {/* Row 1: Role / Rating + Date */}
                  <div className={styles.cardHeaderRow}>
                    {trip.rating ? (
                      <div className={styles.ratingRow}>
                        <Star size={13} fill="#D97706" color="#D97706" />
                        <Star size={13} fill="#D97706" color="#D97706" />
                        <Star size={13} fill="#D97706" color="#D97706" />
                        <Star size={13} fill="#D97706" color="#D97706" />
                        <Star size={13} fill="#D97706" color="#D97706" />
                        <span>5.0</span>
                      </div>
                    ) : isTripOwner ? (
                      <span className={styles.roleBadgeOwner}>Bạn là trưởng nhóm</span>
                    ) : isTripMember ? (
                      <span className={styles.roleBadgeMember}>Thành viên nhóm</span>
                    ) : (
                      <span className={styles.roleBadgeOther}>
                        Trưởng nhóm: {trip.members?.[0]?.name || 'Khác'}
                      </span>
                    )}

                    <span className={styles.cardDateText}>
                      <Calendar size={13} />
                      <span>{trip.startDate} – {trip.endDate}</span>
                    </span>
                  </div>

                  {/* Row 2: Trip Title */}
                  <h3 className={styles.tripTitle}>
                    <Link href={`/trips/${trip.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {trip.title}
                    </Link>
                  </h3>

                  {/* Row 3: Members Avatar Stack */}
                  <div className={styles.membersRow}>
                    <div className={styles.avatarStack}>
                      {membersList.map((m, idx) => {
                        const isMe = Boolean(
                          currentUser && (
                            (m.userId && currentUser.id && m.userId === currentUser.id) ||
                            (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                            (currentUser.displayName && m.name.toLowerCase() === currentUser.displayName.toLowerCase())
                          )
                        );
                        return (
                          <div
                            key={idx}
                            className={styles.avatarCircle}
                            style={{ backgroundColor: m.color || '#0284c7' }}
                            title={`${m.name}${isMe ? ' (Bạn)' : ''}`}
                          >
                            {m.avatar || 'TV'}
                          </div>
                        );
                      })}
                    </div>
                    <span className={styles.memberCountText}>
                      {membersList.length} thành viên
                    </span>
                  </div>

                  {/* Row 4: Alert Box */}
                  {trip.alertType === 'AMBER' && (
                    <div className={styles.alertBoxAmber}>
                      <Bell size={14} style={{ flexShrink: 0 }} />
                      <span>{trip.alertText}</span>
                    </div>
                  )}
                  {trip.alertType === 'BLUE' && (
                    <div className={styles.alertBoxBlue}>
                      <Shuffle size={14} style={{ flexShrink: 0 }} />
                      <span>{trip.alertText}</span>
                    </div>
                  )}
                  {trip.alertType === 'COMPLETED' && (
                    <div className={styles.alertBoxCompleted}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Camera size={14} style={{ flexShrink: 0 }} />
                        <span>{trip.alertText}</span>
                      </div>
                      <span
                        className={styles.alertLinkBtn}
                        onClick={() => showToast('Mở bộ sưu tập 148 ảnh & hóa đơn')}
                      >
                        {trip.alertLinkText || 'Xem'}
                      </span>
                    </div>
                  )}

                  {/* Row 5: Progress Bar / Budget */}
                  <div className={styles.cardProgressGroup}>
                    {trip.status === 'COMPLETED' ? (
                      <div className={styles.progressLabelRow}>
                        <span>Tổng chi tiêu hoàn tất</span>
                        <span className={styles.progressValueBold}>
                          {trip.budgetSpent.toLocaleString('vi-VN')}đ / {trip.budgetTotal.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className={styles.progressLabelRow}>
                          <span>Chi phí đã chi</span>
                          <span className={styles.progressValueBold}>{trip.progressPercent}%</span>
                        </div>
                        <div className={styles.progressBarTrack}>
                          <div
                            className={styles.progressBarFillCyan}
                            style={{ width: `${trip.progressPercent}%` }}
                          />
                        </div>
                        <div className={styles.progressLabelRow}>
                          <span>Ngân sách chuyến đi</span>
                          <span className={styles.progressValueBold}>
                            {trip.budgetSpent.toLocaleString('vi-VN')}đ / {trip.budgetTotal.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </>
                    )}

                    {trip.status === 'COMPLETED' && (
                      <div className={styles.progressBarTrack}>
                        <div
                          className={styles.progressBarFillNavy}
                          style={{ width: `${trip.progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 6: Primary CTA Button */}
                  <Link
                    href={`/trips/${trip.id}`}
                    className={
                      trip.status === 'ACTIVE'
                        ? styles.btnCardMainPrimary
                        : styles.btnCardMainSoft
                    }
                    id={`btn-cta-${trip.id}`}
                  >
                    {trip.status === 'COMPLETED' ? 'Xem lại hành trình' : 'Xem chi tiết'}
                  </Link>

                  {/* Row 7: Secondary Action Pills */}
                  <div
                    className={
                      actions.length === 2
                        ? styles.secondaryActionsRow2
                        : styles.secondaryActionsRow
                    }
                  >
                    {actions.map((act, aIdx) => {
                      const isItinerary = act.label.toLowerCase().includes('lịch trình') || act.actionType === 'PLAN';
                      const isAssign = act.label.toLowerCase().includes('phân công') || act.actionType === 'ASSIGN';
                      const isNote = act.label.toLowerCase().includes('ghi chú') || act.actionType === 'NOTE';
                      const isVote = act.label.toLowerCase().includes('biểu quyết') || act.actionType === 'VOTE';

                      if (isItinerary) {
                        return (
                          <Link
                            key={aIdx}
                            href={`/trips/${trip.id}?tab=itinerary`}
                            className={styles.btnSecondaryPill}
                            title="Mở lịch trình từng ngày của chuyến đi"
                          >
                            <Calendar size={13} style={{ marginRight: 4 }} />
                            <span>{act.label}</span>
                          </Link>
                        );
                      }

                      if (isAssign) {
                        return (
                          <button
                            key={aIdx}
                            type="button"
                            className={styles.btnSecondaryPill}
                            onClick={() => handleOpenAssignModal(trip)}
                            title={isTripMember ? "Mở bảng phân công nhiệm vụ nhóm" : "Chỉ thành viên chuyến đi mới có quyền xem phân công"}
                            style={!isTripMember ? { opacity: 0.65 } : undefined}
                          >
                            <Users size={13} style={{ marginRight: 4 }} />
                            <span>{act.label}</span>
                            {!isTripMember && <Lock size={10} style={{ marginLeft: 3, opacity: 0.7 }} />}
                          </button>
                        );
                      }

                      if (isNote) {
                        return (
                          <button
                            key={aIdx}
                            type="button"
                            className={styles.btnSecondaryPill}
                            onClick={() => handleOpenNoteModal(trip)}
                            title={isTripMember ? "Mở ghi chú và danh sách chuẩn bị" : "Chỉ thành viên chuyến đi mới có quyền xem ghi chú"}
                            style={!isTripMember ? { opacity: 0.65 } : undefined}
                          >
                            <CheckSquare size={13} style={{ marginRight: 4 }} />
                            <span>{act.label}</span>
                            {!isTripMember && <Lock size={10} style={{ marginLeft: 3, opacity: 0.7 }} />}
                          </button>
                        );
                      }

                      if (isVote) {
                        return (
                          <button
                            key={aIdx}
                            type="button"
                            className={styles.btnSecondaryPill}
                            onClick={() => setShowVoteModal(true)}
                          >
                            <ThumbsUp size={13} style={{ marginRight: 4 }} />
                            <span>{act.label}</span>
                          </button>
                        );
                      }

                      if (act.href) {
                        return (
                          <Link
                            key={aIdx}
                            href={act.href}
                            className={styles.btnSecondaryPill}
                          >
                            <span>{act.label}</span>
                          </Link>
                        );
                      }

                      return (
                        <button
                          key={aIdx}
                          type="button"
                          className={styles.btnSecondaryPill}
                          onClick={() => showToast(`Mở tính năng: ${act.label}`)}
                        >
                          <span>{act.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredTrips.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1.5rem', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <Compass size={48} color="#0284c7" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                Chưa có chuyến đi nào
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: 440, margin: '0 auto 1.5rem' }}>
                Bạn chưa tham gia chuyến đi nào. Hãy bắt đầu bằng cách tạo chuyến đi mới hoặc dùng AI Planner để thiết kế lịch trình tự động!
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.btnPrimaryAction}
                  onClick={() => setShowCreateModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Plus size={16} /> Tạo chuyến đi mới
                </button>
                <Link
                  href="/planner"
                  className={styles.btnSecondaryPill}
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem' }}
                >
                  <Sparkles size={16} color="#0284c7" /> Lên lịch với AI Planner
                </Link>
              </div>
            </div>
          )}
        </div>

        )}

        {/* ─── 5. BOTTOM INSPIRATION & CTA BANNER ───────────────────────── */}
        <section className={styles.bottomCtaSection}>
          <div className={styles.bottomSuitcaseCircle}>
            <Briefcase size={26} />
          </div>
          <div className={styles.bottomEyebrow}>CẢM HỨNG ĐIỂM ĐẾN</div>
          <h2 className={styles.bottomTitle}>Hành trình mới đang chờ bạn</h2>
          <p className={styles.bottomSubtitle}>
            Tạo chuyến đi đầu tiên hoặc nhập mã mới để đồng hành cùng bạn bè và tối ưu từng trải nghiệm khắp Việt Nam.
          </p>
          <div className={styles.bottomBtnGroup}>
            <button
              type="button"
              className={styles.btnBottomPrimary}
              onClick={() => setShowCreateModal(true)}
            >
              Tạo chuyến đi đầu tiên
            </button>
            <button
              type="button"
              className={styles.btnBottomSoft}
              onClick={() => setShowJoinModal(true)}
            >
              Tôi có mã lời mời
            </button>
          </div>
        </section>
      </div>

      {/* ─── 6. FOOTER ─────────────────────────────────────────────────── */}
      <footer className={styles.tripsFooter}>
        <div className={styles.footerContainer}>
          <div className={styles.footerLogoBrand}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="#0070BA"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="#0070BA"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="#0070BA"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>© 2025 VISTA - Vietnam Smart Travel Platform. Bảo lưu mọi quyền.</span>
          </div>

          <div className={styles.footerLinks}>
            <Link href="#">Điều khoản</Link>
            <Link href="#">Chính sách bảo mật</Link>
            <Link href="#">Trung tâm trợ giúp</Link>
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

              {/* Action Buttons */}
              <div className={styles.modalActionsRow} style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className={styles.btnCancelModal}
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className={styles.btnSubmitFancy}>
                  <Sparkles size={16} />
                  <span>Hoàn tất & Khởi tạo chuyến đi</span>
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toastNotification}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
