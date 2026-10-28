'use client';

import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Lock,
  Clipboard,
  KeyRound,
} from 'lucide-react';
import { Navbar } from '@/components/common/Navbar';
import {
  POPULAR_DESTINATIONS,
  getSampleItineraryForDestination,
  getDestinationHeroImage,
} from '@/data/sampleItineraries';
import styles from './trips.module.css';

interface TripItem {
  id: string;
  title: string;
  destination: string;
  durationBadge: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'PLANNING' | 'COMPLETED';
  role: 'OWNER' | 'MEMBER';
  budgetTotal: number;
  budgetSpent: number;
  progressPercent: number;
  members: Array<{ name: string; avatar: string; color: string }>;
  image?: string;
  treasuryPath: string;
  rating?: number;
  alertType?: 'AMBER' | 'BLUE' | 'COMPLETED';
  alertText?: string;
  alertLinkText?: string;
  quickActions: Array<{ label: string; href?: string; actionType?: string }>;
  itineraryDays?: unknown[];
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

function getCurrentUserMember(defaultRole = 'Trưởng nhóm') {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('vista_user');
      if (stored) {
        const u = JSON.parse(stored);
        const name = u.displayName || u.email || 'Nguyễn Văn Sang';
        const parts = name.trim().split(/\s+/);
        const initials = (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
        return {
          name: `${name} (Bạn)`,
          avatar: initials || 'NS',
          color: '#0284c7',
          role: defaultRole,
        };
      }
    } catch {
      // fallback
    }
  }
  return {
    name: 'Nguyễn Văn Sang (Bạn)',
    avatar: 'NS',
    color: '#0284c7',
    role: defaultRole,
  };
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
  const [activeTab, setActiveTab] = useState<'all' | 'planning' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
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
            const normalized = customTrips.map((t) => {
              const dest = t.destination || 'Việt Nam';
              const isHanoiMismatch = dest && !dest.toLowerCase().includes('hà nội') && JSON.stringify(t.itineraryDays || '').includes('Hoàn Kiếm');
              const fixedItinerary = (!t.itineraryDays || (t.itineraryDays as unknown[]).length === 0 || isHanoiMismatch)
                ? getSampleItineraryForDestination(dest, t.startDate)
                : t.itineraryDays;

              return {
                ...t,
                members: Array.isArray(t.members) && t.members.length > 0
                  ? t.members.map((m) => (m.name.includes('Lê Vân Anh') ? currentOwner : m))
                  : [currentOwner],
                image: getDestinationHeroImage(dest),
                itineraryDays: fixedItinerary,
                quickActions: Array.isArray(t.quickActions) && t.quickActions.length > 0
                  ? t.quickActions
                  : [
                      { label: 'Lịch trình', href: `/trips/${t.id}` },
                      { label: 'Phân công', actionType: 'ASSIGN' },
                      { label: 'Ghi chú', actionType: 'NOTE' },
                    ],
                budgetTotal: t.budgetTotal || 20000000,
                budgetSpent: t.budgetSpent || 0,
                progressPercent: typeof t.progressPercent === 'number' ? t.progressPercent : 20,
                durationBadge: t.durationBadge || '4 ngày',
                startDate: t.startDate || '15/11',
                endDate: t.endDate || '18/11/2026',
                role: t.role || 'OWNER',
                status: t.status || 'PLANNING',
                treasuryPath: t.treasuryPath || `/trips/${t.id}/treasury`,
              };
            });

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
    void syncTrips();
  }, []);

  const totalCount = tripsList.length;
  const planningCount = tripsList.filter((t) => t.status === 'PLANNING').length;
  const activeCount = tripsList.filter((t) => t.status === 'ACTIVE').length;
  const completedCount = tripsList.filter((t) => t.status === 'COMPLETED').length;

  const filteredTrips = tripsList.filter((trip) => {
    if (activeTab === 'planning' && trip.status !== 'PLANNING') return false;
    if (activeTab === 'active' && trip.status !== 'ACTIVE') return false;
    if (activeTab === 'completed' && trip.status !== 'COMPLETED') return false;

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

    const newTrip: TripItem = {
      id: tripId,
      title: newTitle,
      destination: destinationToSave,
      durationBadge,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      status: 'PLANNING',
      role: 'OWNER',
      budgetTotal: Number(newBudget) || 20000000,
      budgetSpent: 0,
      progressPercent: 15,
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
      const hasMe = (matched.members || []).some((m) => m.name.includes('Bạn'));
      if (!hasMe) {
        matched.members = [
          ...(matched.members || []),
          {
            name: 'Bạn (Thành viên)',
            avatar: 'ME',
            color: '#10b981',
          },
        ];
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
    const newJoinedTrip: TripItem = {
      id: `trip-joined-${Date.now()}`,
      title: `Chuyến đi theo mã ${cleanCode}`,
      destination: 'Việt Nam',
      durationBadge: '3 ngày',
      startDate: 'Sắp tới',
      endDate: '2026',
      status: 'PLANNING',
      role: 'MEMBER',
      budgetTotal: 15000000,
      budgetSpent: 0,
      progressPercent: 20,
      members: [
        { name: 'Trưởng nhóm', avatar: 'TN', color: '#0070BA' },
        { name: 'Bạn (Thành viên)', avatar: 'ME', color: '#10b981' },
      ],
      image: undefined,
      treasuryPath: '/trips/demo-danang-2026/treasury',
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

  return (
    <div className={styles.tripsPage}>
      {/* ─── GLOBAL NAVBAR ─────────────────────────────────────────────── */}
      <Navbar activeModule="trips" />

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

            <button type="button" className={styles.dateFilterBtn}>
              <Calendar size={15} />
              <span>Thời gian</span>
              <ChevronDown size={14} />
            </button>

            <div className={styles.viewToggleGroup}>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${styles.viewToggleBtnActive}`}
                title="Xem dạng lưới"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                className={styles.viewToggleBtn}
                title="Xem dạng danh sách"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── 4. TRIP CARDS GRID (3 COLUMNS) ─────────────────────────── */}
        <div className={styles.tripsGrid}>
          {filteredTrips.map((trip) => {
            const membersList = Array.isArray(trip.members) && trip.members.length > 0
              ? trip.members
              : [{ name: 'Lê Vân Anh (Bạn)', avatar: 'VA', color: '#0284c7' }];

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
                    ) : trip.role === 'OWNER' ? (
                      <span className={styles.roleBadgeOwner}>Bạn là trưởng nhóm</span>
                    ) : (
                      <span className={styles.roleBadgeMember}>Thành viên nhóm</span>
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
                      {membersList.map((m, idx) => (
                        <div
                          key={idx}
                          className={styles.avatarCircle}
                          style={{ backgroundColor: m.color }}
                          title={m.name}
                        >
                          {m.avatar}
                        </div>
                      ))}
                      {trip.id === 'demo-danang-2026' && (
                        <div className={styles.avatarCountBadge}>+1</div>
                      )}
                    </div>
                    <span className={styles.memberCountText}>
                      {trip.id === 'demo-danang-2026' ? '4' : membersList.length} thành viên
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
                          <span>Tiến độ chuẩn bị</span>
                          <span className={styles.progressValueBold}>{trip.progressPercent}%</span>
                        </div>
                        <div className={styles.progressBarTrack}>
                          <div
                            className={styles.progressBarFillCyan}
                            style={{ width: `${trip.progressPercent}%` }}
                          />
                        </div>
                        <div className={styles.progressLabelRow}>
                          <span>Ngân sách đã chi</span>
                          <span className={styles.progressValueBold}>
                            {trip.budgetSpent.toLocaleString('vi-VN')}đ / {trip.budgetTotal.toLocaleString('vi-VN')}đ
                            {trip.id === 'trip-hagiang-2026' ? ' (23%)' : ''}
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
                      if (act.actionType === 'VOTE') {
                        return (
                          <button
                            key={aIdx}
                            type="button"
                            className={styles.btnSecondaryPill}
                            onClick={() => setShowVoteModal(true)}
                          >
                            {act.label}
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
                            {act.label}
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
                          {act.label}
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
