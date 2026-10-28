'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  getSampleItineraryForDestination,
  getDestinationHeroImage,
  getSampleProposals,
} from '@/data/sampleItineraries';
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
} from 'lucide-react';
import { Navbar } from '@/components/common/Navbar';
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
}

interface DayPlanItem {
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
  status: 'ACTIVE' | 'PLANNING' | 'COMPLETED';
  role: 'OWNER' | 'MEMBER';
  ownerId?: string;
  budgetTotal: number;
  budgetSpent: number;
  progressPercent: number;
  members: MemberItem[];
  image: string;
  treasuryPath: string;
  alertType?: 'AMBER' | 'BLUE' | 'COMPLETED';
  alertText?: string;
  itineraryDays?: DayPlanItem[];
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

const DEFAULT_DEMO_TRIPS: TripDetailData[] = [];

function getCurrentUserMember(defaultRole = 'Trưởng nhóm'): MemberItem {
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

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tripId = typeof params?.tripId === 'string' ? params.tripId : '';

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
        router.replace('/login?returnUrl=' + encodeURIComponent(`/trips/${tripId}`));
      } else {
        setIsAuthenticated(true);
      }
    }
  }, [router, tripId]);

  const [trip, setTrip] = useState<TripDetailData | null>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'members' | 'treasury' | 'voting'>('itinerary');

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && ['itinerary', 'members', 'treasury', 'voting'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Split-screen itinerary & interactive diagram state
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | 'all'>(1);
  const [checkedActivities, setCheckedActivities] = useState<Record<string, boolean>>({});
  const [highlightedActId, setHighlightedActId] = useState<string | null>(null);

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
    const updatedMembers = [...(trip.members || []), meMember];
    const updatedTrip = { ...trip, members: updatedMembers };
    setTrip(updatedTrip);

    // Save to localStorage
    try {
      const stored = localStorage.getItem('vista_custom_trips');
      const list: TripDetailData[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex((x) => x.id === trip.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], members: updatedMembers };
      } else {
        list.unshift(updatedTrip);
      }
      localStorage.setItem('vista_custom_trips', JSON.stringify(list));
    } catch {}

    showToast(`🎉 Bạn đã tham gia thành công "${trip.title}"! Giờ đây bạn có thể check-in và biểu quyết.`);
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!tripId) return;

    const timer = setTimeout(() => {
      // 1. Try finding in custom trips in localStorage
      try {
        const stored = localStorage.getItem('vista_custom_trips');
        if (stored) {
          const parsed: TripDetailData[] = JSON.parse(stored);
          const match = parsed.find((item) => item.id === tripId);
          if (match) {
            let needsUpdate = false;
            const currentOwner = getCurrentUserMember('Trưởng nhóm');
            const rawMembers = match.members && match.members.length > 0 ? match.members : [currentOwner];
            const normalizedMembers: MemberItem[] = rawMembers.map((m: any, idx: number) => {
              const rawName = m.name || '';
              let cleanName = rawName.replace(/\s*\(Bạn\)/g, '').trim();
              if (!cleanName || cleanName === 'Bạn') {
                cleanName = idx === 0 ? 'Trưởng nhóm VISTA' : 'Thành viên VISTA';
              }
              if (cleanName !== rawName) {
                needsUpdate = true;
              }

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
                ...m,
                name: cleanName,
                avatar: m.avatar || cleanName.slice(0, 2).toUpperCase(),
                color: m.color || '#0284c7',
                role: m.role || (idx === 0 ? 'Trưởng nhóm' : 'Thành viên'),
                userId: memberUserId,
                email: memberEmail,
              };
            });

            const firstMember = normalizedMembers[0];
            const isCreatorMe = Boolean(
              currentUser && (
                (firstMember?.userId && firstMember.userId === currentUser.id) ||
                (currentUser.displayName && firstMember?.name && firstMember.name.toLowerCase() === currentUser.displayName.toLowerCase()) ||
                (currentUser.email && firstMember?.email && firstMember.email.toLowerCase() === currentUser.email.toLowerCase())
              )
            );

            const resolvedOwnerId = isCreatorMe
              ? (currentUser?.id || currentOwner.userId)
              : (firstMember?.userId || `owner-${match.id}`);

            const bSpent = typeof match.budgetSpent === 'number' ? match.budgetSpent : 0;
            const bTotal = typeof match.budgetTotal === 'number' && match.budgetTotal > 0 ? match.budgetTotal : 20000000;
            const calculatedProgress = bTotal > 0 ? Math.min(100, Math.round((bSpent / bTotal) * 100)) : 0;

            if (match.progressPercent !== calculatedProgress || match.ownerId !== resolvedOwnerId) {
              needsUpdate = true;
            }

            const isHanoiMismatch =
              match.destination &&
              !match.destination.toLowerCase().includes('hà nội') &&
              JSON.stringify(match.itineraryDays || '').includes('Hoàn Kiếm');

            const itinerary =
              !match.itineraryDays || match.itineraryDays.length === 0 || isHanoiMismatch
                ? getSampleItineraryForDestination(match.destination, match.startDate)
                : match.itineraryDays;

            const heroImg =
              match.image && !match.image.includes('photo-1528127269322-539801943592')
                ? match.image
                : getDestinationHeroImage(match.destination);

            const updatedTrip: TripDetailData = {
              ...match,
              ownerId: resolvedOwnerId,
              members: normalizedMembers,
              budgetTotal: bTotal,
              budgetSpent: bSpent,
              progressPercent: calculatedProgress,
              image: heroImg,
              treasuryPath: match.treasuryPath || `/trips/${match.id}/treasury`,
              itineraryDays: itinerary,
            };

            if (needsUpdate || isHanoiMismatch) {
              try {
                const updatedList = parsed.map((item) => (item.id === tripId ? updatedTrip : item));
                localStorage.setItem('vista_custom_trips', JSON.stringify(updatedList));
              } catch {}
            }

            setTrip(updatedTrip);
            setProposals(getSampleProposals(match.destination));
            return;
          }
        }
      } catch (e) {
        console.error('Error reading vista_custom_trips from localStorage:', e);
      }

      // 2. Try finding in DEFAULT_DEMO_TRIPS
      const demoMatch = DEFAULT_DEMO_TRIPS.find((item) => item.id === tripId);
      if (demoMatch) {
        setTrip(demoMatch);
        return;
      }

      // 3. Fallback: generate a clean stub trip for any custom ID with rich 3-day sample
      const fallbackDest =
        (searchParams && searchParams.get('dest')) ||
        (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('dest') : null) ||
        'Thừa Thiên Huế';
      const fallbackItinerary = getSampleItineraryForDestination(fallbackDest, '24/11/2026');

      setTrip({
        id: tripId,
        title: `Chuyến đi ${fallbackDest} 3 ngày`,
        destination: fallbackDest,
        durationBadge: '3 ngày',
        startDate: '24/11/2026',
        endDate: '26/11/2026',
        status: 'PLANNING',
        role: 'OWNER',
        budgetTotal: 3350000,
        budgetSpent: 0,
        progressPercent: 0,
        members: [getCurrentUserMember('Trưởng nhóm')],
        image: getDestinationHeroImage(fallbackDest),
        treasuryPath: `/trips/${tripId}/treasury`,
        alertType: 'BLUE',
        alertText: `Hành trình 3 ngày khám phá trải nghiệm đặc sắc tại ${fallbackDest}`,
        itineraryDays: fallbackItinerary,
      });
      setProposals(getSampleProposals(fallbackDest));
    }, 0);

    return () => clearTimeout(timer);
  }, [tripId, searchParams]);

  const handleVoteToggle = (propId: string) => {
    if (!isTripMember) {
      showToast('⚠️ Bạn chưa tham gia chuyến đi này. Chỉ thành viên nhóm mới có quyền biểu quyết!');
      return;
    }
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === propId) {
          const newVoted = !p.voted;
          showToast(newVoted ? 'Đã bỏ phiếu đồng thuận (+1)!' : 'Đã hủy bỏ phiếu.');
          return {
            ...p,
            voted: newVoted,
            votes: newVoted ? p.votes + 1 : p.votes - 1,
          };
        }
        return p;
      })
    );
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

  const displayDateText = useMemo(() => {
    if (!trip) return '24/11 – 26/11/2026';
    const s = trip.startDate?.trim();
    const e = trip.endDate?.trim();

    const parseDateObj = (str?: string) => {
      if (!str) return null;
      if (str.includes('-')) {
        const parts = str.split('-');
        if (parts[0].length === 4) {
          return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10), d: parseInt(parts[2], 10) };
        }
      }
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts[2]?.length === 4) {
          return { y: parseInt(parts[2], 10), m: parseInt(parts[1], 10), d: parseInt(parts[0], 10) };
        }
        if (parts[0]?.length === 4) {
          return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10), d: parseInt(parts[2], 10) };
        }
      }
      return null;
    };

    const d1 = parseDateObj(s);
    let d2 = parseDateObj(e);

    // If d2 is invalid or before d1, default to d1 + 2 days
    if (d1 && (!d2 || d2.d < d1.d)) {
      d2 = { y: d1.y, m: d1.m, d: d1.d + 2 };
    }

    if (d1 && d2) {
      const pad = (n: number) => String(n).padStart(2, '0');
      if (d1.m === d2.m && d1.y === d2.y) {
        return `${pad(d1.d)} – ${pad(d2.d)}/${pad(d1.m)}/${d1.y}`;
      }
      return `${pad(d1.d)}/${pad(d1.m)} – ${pad(d2.d)}/${pad(d2.m)}/${d2.y}`;
    }

    return s && e ? `${s} – ${e}` : '24/11 – 26/11/2026';
  }, [trip?.startDate, trip?.endDate, trip]);

  // Calculate stats
  const totalDays = trip?.itineraryDays?.length || 3;
  const totalActivities = trip?.itineraryDays
    ? trip.itineraryDays.reduce((acc, d) => acc + (d.activities?.length || 0), 0)
    : 8;

  // Determine which days to display in the flowchart
  const daysList = useMemo(() => trip?.itineraryDays || [], [trip?.itineraryDays]);

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

  if (!trip) {
    return (
      <div className={styles.tripDetailPage}>
        <Navbar activeModule="trips" />
        <div className={styles.container} style={{ paddingTop: '80px', textAlign: 'center' }}>
          <p style={{ color: '#64748B', fontSize: '16px' }}>Đang tải thông tin chuyến đi...</p>
        </div>
      </div>
    );
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

  return (
    <div className={styles.tripDetailPage}>
      <Navbar activeModule="trips" />

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

            <div className={styles.headerPolaroidCard} title={`${trip.destination} 🏮`}>
              <img
                src={destinationPhoto}
                alt={trip.title}
                className={styles.headerPolaroidImg}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80';
                }}
              />
              <div className={styles.headerPolaroidPin}>📍</div>
              <span className={styles.headerPolaroidTag}>{trip.destination || 'Việt Nam'}</span>
            </div>

            <div className={styles.headerTitleInfo}>
              <div className={styles.headerTitleRow}>
                <h1 className={styles.headerTitleText}>{trip.title}</h1>
                {trip.status === 'ACTIVE' && (
                  <span className={styles.statusPillActive}>
                    <span className={styles.pulseDot} /> Đang diễn ra
                  </span>
                )}
                {trip.status === 'PLANNING' && (
                  <span className={styles.statusPillPlanning}>
                    <Sparkles size={12} /> Đang lên kế hoạch
                  </span>
                )}
                {trip.status === 'COMPLETED' && (
                  <span className={styles.statusPillCompleted}>
                    <CheckCircle2 size={12} /> Đã hoàn thành
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
                <div className={`${styles.headerChip} ${styles.chipMembers}`}>
                  <Users size={12} />
                  <span>{trip.members?.length || 1} thành viên</span>
                </div>
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

        {/* ─── 4. MAIN WORKSPACE WITH TABS ───────────────────────────────── */}
        <div className={styles.tabsBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'itinerary' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('itinerary')}
            id="tab-btn-itinerary"
          >
            Lộ trình từng ngày ({totalDays} ngày)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'members' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('members')}
            id="tab-btn-members"
          >
            Thành viên nhóm ({trip.members?.length || 1})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'treasury' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('treasury')}
            id="tab-btn-treasury"
          >
            Chi tiêu & Sổ quỹ
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'voting' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('voting')}
            id="tab-btn-voting"
          >
            Biểu quyết địa điểm ({proposals.length})
          </button>
        </div>

        {/* TAB 1: ITINERARY TIMELINE (2-COLUMN SPLIT: STATS PANEL + INTERACTIVE FLOWCHART) */}
        {activeTab === 'itinerary' && (
          <div>
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
                    {daysList.map((d) => {
                      const isSelected = selectedDayNumber === d.dayNumber;
                      const dayOfWeek = d.dayNumber === 1 ? 'THỨ BA' : d.dayNumber === 2 ? 'THỨ TƯ' : 'THỨ NĂM';
                      const dayDate = d.dayNumber === 1 ? '24' : d.dayNumber === 2 ? '25' : '26';
                      const cuteTheme = d.dayNumber === 1
                        ? { headerBg: '#EEF2FF', headerColor: '#4F46E5', icon: '🏮' }
                        : d.dayNumber === 2
                        ? { headerBg: '#ECFDF5', headerColor: '#059669', icon: '🌅' }
                        : { headerBg: '#FFF1F2', headerColor: '#E11D48', icon: '🏺' };

                      const activeClass = d.dayNumber === 2
                        ? styles.cuteCalendarCardActiveDay2
                        : d.dayNumber === 3
                        ? styles.cuteCalendarCardActiveDay3
                        : styles.cuteCalendarCardActive;

                      return (
                        <button
                          key={d.dayNumber}
                          type="button"
                          className={`${styles.cuteCalendarCard} ${isSelected ? activeClass : ''}`}
                          onClick={() => setSelectedDayNumber(d.dayNumber)}
                        >
                          <div
                            className={styles.calendarHeader}
                            style={{
                              background: cuteTheme.headerBg,
                              color: cuteTheme.headerColor,
                            }}
                          >
                            <span>{dayOfWeek}</span>
                            <span>{cuteTheme.icon}</span>
                          </div>
                          <div className={styles.calendarBody}>
                            <span className={styles.calendarDayNum}>{dayDate}</span>
                            <span className={styles.calendarMonth}>Tháng 11</span>
                            <span className={styles.calendarDayTitle}>Ngày {d.dayNumber}</span>
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
                      <span style={{ fontSize: '11px', opacity: 0.85 }}>{daysList.length} ngày</span>
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
                    <div className={styles.flowchartBannerMeta}>
                      <span>{activeStats.actCount} điểm ghé thăm</span>
                      <span>·</span>
                      <span>~{activeStats.distanceKm} km lộ trình</span>
                      <span>·</span>
                      <span>~{activeStats.durationHours} giờ trải nghiệm</span>
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

                      <div className={styles.flowchartTrack}>
                        <div className={styles.flowchartSpine} />

                        {(dayPlan.activities || []).map((act, actIdx) => {
                          const slotCfg = getSlotConfig(act.timeSlot || act.timeRange, actIdx);
                          const isDone = !!checkedActivities[act.id];
                          const isHighlighted = highlightedActId === act.id;
                          const isLast = actIdx === (dayPlan.activities || []).length - 1;

                          return (
                            <div key={act.id} className={styles.stationBlock} id={`station-${act.id}`}>
                              {/* Station Node Badge */}
                              <div
                                className={styles.stationNodeCircle}
                                style={{
                                  background: isDone ? '#10B981' : slotCfg.gradient,
                                  boxShadow: `0 0 0 4px #FFFFFF, 0 4px 14px ${isDone ? 'rgba(16, 185, 129, 0.35)' : slotCfg.glow}`,
                                }}
                              >
                                {isDone ? '🌸' : String(actIdx + 1).padStart(2, '0')}
                              </div>

                              {/* Station Content Card with Real Photo */}
                              <div
                                className={`${styles.stationCard} ${isHighlighted ? styles.stationCardHighlighted : ''}`}
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
                                  <div className={styles.stationHeaderLeft}>
                                    <span
                                      className={styles.stationSlotBadge}
                                      style={{ background: slotCfg.bg, color: slotCfg.color, border: `1px solid ${slotCfg.border}` }}
                                    >
                                      {slotCfg.icon}
                                      <span>{slotCfg.label}</span>
                                    </span>
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
                                      <span>{isDone ? 'Đã vi vu 🌸' : 'Check-in'}</span>
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
            <div className={styles.membersGrid}>
              {(trip.members || []).map((m, idx) => {
                const isMe = Boolean(
                  currentUser && (
                    (m.userId && currentUser.id && m.userId === currentUser.id) ||
                    (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                    (currentUser.displayName && m.name.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase())
                  )
                );
                return (
                  <div key={idx} className={styles.memberCard}>
                    <div className={styles.memberAvatarCircle} style={{ background: m.color || '#0070BA' }}>
                      {m.avatar}
                    </div>
                    <div className={styles.memberInfo}>
                      <h4 className={styles.memberName}>
                        {m.name}
                        {isMe && (
                          <span style={{ marginLeft: 8, fontSize: '13px', fontWeight: 600, color: '#0284c7' }}>
                            (Bạn)
                          </span>
                        )}
                      </h4>
                      <span className={styles.memberRole}>{m.role || (idx === 0 ? 'Trưởng nhóm' : 'Thành viên')}</span>
                    </div>
                  </div>
                );
              })}
            </div>

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
            <div
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <ThumbsUp size={20} style={{ color: '#0070BA', flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: '0 0 2px', fontSize: '14.5px', fontWeight: 700, color: '#1E40AF' }}>
                  Biểu quyết dân chủ cho chuyến đi
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#3B82F6' }}>
                  Các thành viên bình chọn cho điểm đến và trải nghiệm yêu thích để trưởng nhóm chốt lịch trình chính thức.
                </p>
              </div>
            </div>

            {proposals.map((prop) => (
              <div
                key={prop.id}
                className={`${styles.proposalCard} ${prop.voted ? styles.proposalVoted : ''}`}
              >
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0284C7',
                      background: '#E0F2FE',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginBottom: '6px',
                    }}
                  >
                    {prop.category}
                  </span>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {prop.title}
                  </h4>
                </div>

                <button
                  type="button"
                  className={`${styles.btnVote} ${prop.voted ? styles.btnVotedActive : ''}`}
                  onClick={() => handleVoteToggle(prop.id)}
                >
                  <ThumbsUp size={15} />
                  <span>{prop.votes} đồng thuận</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating toast notification */}
      {toastMessage && (
        <div className={styles.toastNotice}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
