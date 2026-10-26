'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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

const DEFAULT_DEMO_TRIPS: TripDetailData[] = [];

export default function TripDetailPage() {
  const params = useParams();
  const tripId = typeof params?.tripId === 'string' ? params.tripId : '';

  const [trip, setTrip] = useState<TripDetailData | null>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'members' | 'treasury' | 'voting'>('itinerary');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Split-screen itinerary & interactive diagram state
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | 'all'>(1);
  const [checkedActivities, setCheckedActivities] = useState<Record<string, boolean>>({});
  const [highlightedActId, setHighlightedActId] = useState<string | null>(null);

  const toggleCheckActivity = (id: string, title: string) => {
    setCheckedActivities((prev) => {
      const nextVal = !prev[id];
      showToast(nextVal ? `Đã đánh dấu ghé thăm: ${title}` : `Đã bỏ đánh dấu: ${title}`);
      return { ...prev, [id]: nextVal };
    });
  };

  // Voting state
  const [proposals, setProposals] = useState([
    {
      id: 'prop-1',
      title: 'Buffet hải sản Biển Rạng đêm thứ 2',
      category: 'Ẩm thực',
      votes: 3,
      voted: false,
    },
    {
      id: 'prop-2',
      title: 'Trải nghiệm dù lượn ngắm toàn cảnh Bán đảo Sơn Trà',
      category: 'Trải nghiệm mạo hiểm',
      votes: 4,
      voted: true,
    },
    {
      id: 'prop-3',
      title: 'Xem show Ký Ức Hội An lúc 20:00',
      category: 'Nghệ thuật & Di sản',
      votes: 2,
      voted: false,
    },
  ]);

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
            // Normalize fields
            setTrip({
              ...match,
              members: match.members && match.members.length > 0
                ? match.members
                : [{ name: 'Lê Vân Anh', avatar: 'VA', color: '#0284c7', role: 'Trưởng nhóm' }],
              treasuryPath: match.treasuryPath || `/trips/${match.id}/treasury`,
              itineraryDays: match.itineraryDays && match.itineraryDays.length > 0
                ? match.itineraryDays
                : SAMPLE_HANOI_DAYS,
            });
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
      setTrip({
        id: tripId,
        title: `Chuyến đi Hà Nội 3 ngày`,
        destination: 'Hà Nội',
        durationBadge: '3 ngày',
        startDate: '24/11/2026',
        endDate: '26/11/2026',
        status: 'PLANNING',
        role: 'OWNER',
        budgetTotal: 3350000,
        budgetSpent: 0,
        progressPercent: 20,
        members: [{ name: 'Lê Vân Anh (Trưởng nhóm)', avatar: 'VA', color: '#0284c7', role: 'Trưởng nhóm' }],
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
        treasuryPath: `/trips/${tripId}/treasury`,
        alertType: 'BLUE',
        alertText: 'Hành trình 3 ngày khám phá Cố Đô và văn hóa Hà Nội',
        itineraryDays: SAMPLE_HANOI_DAYS,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [tripId]);

  const handleVoteToggle = (propId: string) => {
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
    const dest = (trip?.destination || '').toLowerCase();
    if (dest.includes('hà nội') || dest.includes('hanoi')) {
      return 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80';
    }
    if (dest.includes('đà nẵng') || dest.includes('danang')) {
      return 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80';
    }
    return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80';
  }, [trip?.image, trip?.destination]);

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
    activeActivities.forEach((a) => {
      if (typeof a.costVnd === 'number' && a.costVnd > 0) {
        estCost += a.costVnd;
      } else if (a.costLabel) {
        const num = parseInt(a.costLabel.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > 0) estCost += num;
        else estCost += 100000;
      } else {
        estCost += 100000;
      }
    });

    const distanceKm = Math.round((actCount * 3.6 + 1.2) * 10) / 10;
    const durationHours = Math.round((actCount * 1.5 + 0.5) * 10) / 10;
    const totalBudget = trip?.budgetTotal || 10000000;

    return {
      actCount,
      completedCount,
      estCost,
      distanceKm,
      durationHours,
      percentOfBudget: totalBudget > 0
        ? Math.min(100, Math.round((estCost / totalBudget) * 100))
        : 35,
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
              </div>

              <div className={styles.headerChipsRow}>
                <div className={`${styles.headerChip} ${styles.chipLocation}`}>
                  <MapPin size={12} />
                  <span>{trip.destination || 'Hà Nội'}</span>
                </div>
                <div className={`${styles.headerChip} ${styles.chipCalendar}`}>
                  <Calendar size={12} />
                  <span>{displayDateText}</span>
                </div>
                <div className={`${styles.headerChip} ${styles.chipDuration}`}>
                  <Clock size={12} />
                  <span>{totalDays} ngày ({trip.itineraryDays?.reduce((acc, d) => acc + (d.activities?.length || 0), 0) || 12} địa điểm)</span>
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
                      <div className={styles.catProgressSeg} style={{ width: '42%', background: '#6366F1' }} />
                      <div className={styles.catProgressSeg} style={{ width: '38%', background: '#F59E0B' }} />
                      <div className={styles.catProgressSeg} style={{ width: '20%', background: '#10B981' }} />
                    </div>

                    <div className={styles.categoryLegendGrid}>
                      <div className={styles.catLegendItem}>
                        <span className={styles.catLegendDot} style={{ background: '#6366F1' }} />
                        <span>Vé tham quan: 42%</span>
                      </div>
                      <div className={styles.catLegendItem}>
                        <span className={styles.catLegendDot} style={{ background: '#F59E0B' }} />
                        <span>Ẩm thực: 38%</span>
                      </div>
                      <div className={styles.catLegendItem}>
                        <span className={styles.catLegendDot} style={{ background: '#10B981' }} />
                        <span>Di chuyển: 20%</span>
                      </div>
                      <div className={styles.catLegendItem}>
                        <span className={styles.catLegendDot} style={{ background: '#0284C7' }} />
                        <span>Dịch vụ khác</span>
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
              {(trip.members || []).map((m, idx) => (
                <div key={idx} className={styles.memberCard}>
                  <div className={styles.memberAvatarCircle} style={{ background: m.color || '#0070BA' }}>
                    {m.avatar}
                  </div>
                  <div className={styles.memberInfo}>
                    <h4 className={styles.memberName}>{m.name}</h4>
                    <span className={styles.memberRole}>{m.role || (idx === 0 ? 'Trưởng nhóm' : 'Thành viên')}</span>
                  </div>
                </div>
              ))}
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
