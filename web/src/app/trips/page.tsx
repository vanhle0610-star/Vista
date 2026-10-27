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
} from 'lucide-react';
import { Navbar } from '@/components/common/Navbar';
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
  image: string;
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
      { name: 'Lê Vân Anh (Bạn)', avatar: 'VA', color: '#0284c7' },
      { name: 'Trần Minh Tuấn', avatar: 'MT', color: '#10b981' },
      { name: 'Nguyễn Hoàng Nam', avatar: 'HN', color: '#f59e0b' },
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
      { name: 'Lê Vân Anh (Bạn)', avatar: 'VA', color: '#0284c7' },
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
      { name: 'Lê Vân Anh (Bạn)', avatar: 'VA', color: '#10b981' },
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

export default function TripsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'planning' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New trip form state
  const [newTitle, setNewTitle] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newBudget, setNewBudget] = useState('20000000');
  const [newStartDate, setNewStartDate] = useState('2026-11-20');
  const [newEndDate, setNewEndDate] = useState('2026-11-24');
  const [joinCode, setJoinCode] = useState('');

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

  const [tripsList, setTripsList] = useState<TripItem[]>(DEFAULT_DEMO_TRIPS);

  // Synchronize with localStorage (custom trips created from Planner or Trips)
  useEffect(() => {
    const syncTrips = async () => {
      await Promise.resolve();
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('vista_custom_trips');
          let customTrips: TripItem[] = [];
          try {
            const parsed = stored ? JSON.parse(stored) : [];
            if (Array.isArray(parsed)) {
              customTrips = parsed.filter(Boolean);
            }
          } catch {
            customTrips = [];
          }

          const tripMap = new Map<string, TripItem>();
          DEFAULT_DEMO_TRIPS.forEach((item) => tripMap.set(item.id, item));

          if (customTrips && customTrips.length > 0) {
            customTrips.forEach((t) => {
              if (!t || !t.id) return;
              const existing = tripMap.get(t.id);
              const normalized: TripItem = {
                ...existing,
                ...t,
                members: Array.isArray(t.members) && t.members.length > 0
                  ? t.members
                  : existing?.members || [{ name: 'Lê Vân Anh (Bạn)', avatar: 'VA', color: '#0284c7' }],
                quickActions: Array.isArray(t.quickActions) && t.quickActions.length > 0
                  ? t.quickActions
                  : existing?.quickActions || [
                      { label: 'Lịch trình', href: `/planner?tripId=${t.id}&dest=${encodeURIComponent(t.destination || '')}` },
                      { label: 'Phân công', actionType: 'ASSIGN' },
                      { label: 'Ghi chú', actionType: 'NOTE' },
                    ],
                budgetTotal: t.budgetTotal || existing?.budgetTotal || 20000000,
                budgetSpent: t.budgetSpent || existing?.budgetSpent || 0,
                progressPercent: typeof t.progressPercent === 'number' ? t.progressPercent : (existing?.progressPercent || 20),
                durationBadge: t.durationBadge || existing?.durationBadge || '4 ngày',
                startDate: t.startDate || existing?.startDate || '15/11',
                endDate: t.endDate || existing?.endDate || '18/11/2026',
                role: t.role || existing?.role || 'OWNER',
                status: t.status || existing?.status || 'PLANNING',
                image: t.image || existing?.image || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
                treasuryPath: t.treasuryPath || existing?.treasuryPath || `/trips/${t.id}/treasury`,
              };
              tripMap.set(t.id, normalized);
            });
          }

          setTripsList(Array.from(tripMap.values()));

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
    if (!newTitle.trim() || !newDestination.trim()) {
      showToast('Vui lòng nhập đầy đủ tiêu đề và điểm đến!');
      return;
    }

    const tripId = `trip-${Date.now()}`;
    const newTrip: TripItem = {
      id: tripId,
      title: newTitle,
      destination: newDestination,
      durationBadge: '4 ngày',
      startDate: newStartDate.slice(5).replace('-', '/'),
      endDate: newEndDate.slice(5).replace('-', '/') + '/2026',
      status: 'PLANNING',
      role: 'OWNER',
      budgetTotal: Number(newBudget) || 20000000,
      budgetSpent: 0,
      progressPercent: 15,
      members: [{ name: 'Lê Vân Anh (Bạn)', avatar: 'VA', color: '#0284c7' }],
      image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
      treasuryPath: `/trips/${tripId}/treasury`,
      alertText: 'Chuyến đi vừa tạo. Bấm "Lịch trình" để AI lên kế hoạch chi tiết!',
      alertLinkText: 'Xem',
      quickActions: [
        { label: 'Lịch trình', href: `/planner?tripId=${tripId}&dest=${encodeURIComponent(newDestination)}` },
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
      image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
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
                  style={{ backgroundImage: `url(${trip.image})` }}
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

      {/* ─── MODAL: CREATE TRIP ────────────────────────────────────────── */}
      {showCreateModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Tạo Chuyến Đi Nhóm Mới</h3>
              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={() => setShowCreateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTrip}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên chuyến đi</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Ví dụ: Khám phá Quy Nhơn - Phú Yên 4N3Đ"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Điểm đến chính</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Ví dụ: Quy Nhơn, Bình Định"
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ngày bắt đầu</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ngày kết thúc</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ngân sách nhóm dự kiến (VNĐ)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="20000000"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                />
              </div>

              <button type="submit" className={styles.btnSubmitForm}>
                Hoàn tất & Khởi tạo chuyến đi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: JOIN BY INVITE CODE ────────────────────────────────── */}
      {showJoinModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowJoinModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Gia Nhập Bằng Mã Mời</h3>
              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={() => setShowJoinModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Nhập mã token gồm 6 ký tự hoặc liên kết lời mời mà trưởng nhóm đã chia sẻ cho bạn:
            </p>

            <form onSubmit={handleJoinTrip}>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Ví dụ: VISTA-DN2026 hoặc mã token"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}
                  required
                />
              </div>

              <button type="submit" className={styles.btnSubmitForm}>
                Xác thực & Tham gia nhóm
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DESTINATION VOTING PREVIEW ──────────────────────────── */}
      {showVoteModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowVoteModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Biểu Quyết Địa Điểm Nhóm</h3>
              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={() => setShowVoteModal(false)}
              >
                <X size={18} />
              </button>
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
