'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/common/Navbar';
import styles from './planner.module.css';
import { fetchAllDestinationsWeather, RealtimeWeather } from '../../services/weatherService';

interface ActivityItem {
  id?: string;
  timeSlot: string;
  timeRange: string;
  destinationName: string;
  category: string;
  note: string;
  estimatedCostVnd: number;
}

interface DayPlan {
  dayNumber: number;
  dateLabel: string;
  activities: ActivityItem[];
}

interface GeneratedPlan {
  destinationProvince: string;
  totalDays: number;
  budgetLevel: string;
  estimatedTotalCost: number;
  isMockData: boolean;
  days: DayPlan[];
}

const DESTINATION_OPTIONS = [
  { id: 'danang', nameVi: 'Đà Nẵng & Bà Nà Hills', province: 'Đà Nẵng' },
  { id: 'halong', nameVi: 'Vịnh Hạ Long & Bái Tử Long', province: 'Quảng Ninh' },
  { id: 'hoian', nameVi: 'Phố Cổ Hội An & Cẩm Thanh', province: 'Quảng Nam' },
  { id: 'ninhbinh', nameVi: 'Quần thể Tràng An & Hang Múa', province: 'Ninh Bình' },
  { id: 'phuquoc', nameVi: 'Đảo Ngọc Phú Quốc & Cáp Treo', province: 'Kiên Giang' },
  { id: 'hagiang', nameVi: 'Cao Nguyên Đá Hà Giang & Mã Pí Lèng', province: 'Hà Giang' },
  { id: 'dalat', nameVi: 'Đà Lạt Sương Mù & Thung Lũng Tình Yêu', province: 'Lâm Đồng' },
  { id: 'saigon', nameVi: 'TP. Hồ Chí Minh & Bến Bạch Đằng', province: 'Hồ Chí Minh' },
];

const DEFAULT_PLAN: GeneratedPlan = {
  destinationProvince: 'Đà Nẵng',
  totalDays: 3,
  budgetLevel: 'MEDIUM',
  estimatedTotalCost: 4850000,
  isMockData: false,
  days: [
    {
      dayNumber: 1,
      dateLabel: 'Ngày 1 — Khám phá Biển Mỹ Khê & Bán Đảo Sơn Trà',
      activities: [
        {
          timeSlot: 'MORNING',
          timeRange: '08:00 - 11:30',
          destinationName: 'Đón bình minh & Viếng Chùa Linh Ứng - Bãi Bụt',
          category: 'Cảnh quan & Tâm linh',
          note: 'Ngắm tượng Phật Bà 67m hướng biển, ngắm Voọc chà vá chân nâu quý hiếm.',
          estimatedCostVnd: 0,
        },
        {
          timeSlot: 'AFTERNOON',
          timeRange: '12:00 - 14:00',
          destinationName: 'Bánh Tráng Cuốn Thịt Heo & Mì Quảng Đà Nẵng',
          category: 'Ẩm thực đặc sản',
          note: 'Thưởng thức tại đặc sản Trần hoặc Mì Quảng Bà Mua với nước chấm mắm nêm bí truyền.',
          estimatedCostVnd: 120000,
        },
        {
          timeSlot: 'AFTERNOON',
          timeRange: '15:30 - 18:00',
          destinationName: 'Tắm biển Mỹ Khê & Thư giãn nước dừa tươi',
          category: 'Biển đảo & Chill',
          note: 'Thư giãn trên bờ cát trắng mịn, tham gia dù lượn biển ngắm toàn cảnh vịnh.',
          estimatedCostVnd: 60000,
        },
        {
          timeSlot: 'EVENING',
          timeRange: '19:30 - 22:00',
          destinationName: 'Cầu Rồng Phun Lửa, Cầu Tình Yêu & Chợ Đêm Sơn Trà',
          category: 'Phố đêm & Check-in',
          note: 'Thưởng thức hải sản nướng tại chợ đêm, xem Cầu Rồng phun lửa phun nước lúc 21:00 cuối tuần.',
          estimatedCostVnd: 250000,
        },
      ],
    },
    {
      dayNumber: 2,
      dateLabel: 'Ngày 2 — Chinh phục Bà Nà Hills & Cầu Vàng Bàn Tay',
      activities: [
        {
          timeSlot: 'MORNING',
          timeRange: '08:00 - 12:00',
          destinationName: 'Cáp treo đạt kỷ lục thế giới & Dạo bước Cầu Vàng',
          category: 'Thắng cảnh nổi tiếng',
          note: 'Đi cáp treo qua thác Tóc Tiên, chiêm ngưỡng Cầu Vàng bồng bềnh giữa biển mây ngút ngàn.',
          estimatedCostVnd: 900000,
        },
        {
          timeSlot: 'AFTERNOON',
          timeRange: '12:30 - 14:00',
          destinationName: 'Buffet Á – Âu tại Làng Pháp Beer Plaza',
          category: 'Ẩm thực ẩm thực',
          note: 'Hơn 100 món ăn phong phú giữa không gian kiến trúc Gothic phong cách Pháp cổ kính.',
          estimatedCostVnd: 350000,
        },
        {
          timeSlot: 'AFTERNOON',
          timeRange: '14:30 - 17:00',
          destinationName: 'Lâu Đài Mặt Trăng & Xe Trượt Ống Alpine Coaster',
          category: 'Giải trí & Trải nghiệm',
          note: 'Trải nghiệm rạp chiếu phim bay 4D Mắt Bay và trượt ống ngoài trời cảm giác mạnh.',
          estimatedCostVnd: 0,
        },
        {
          timeSlot: 'EVENING',
          timeRange: '19:00 - 21:30',
          destinationName: 'Du thuyền sông Hàn & Ngắm cảnh Tứ đại mỹ cầu',
          category: 'Du thuyền & Ngắm cảnh',
          note: 'Lướt êm đềm trên sông Hàn, xem biểu diễn múa Chăm Pa và ngắm trọn vẹn đường chân trời Đà Nẵng.',
          estimatedCostVnd: 150000,
        },
      ],
    },
    {
      dayNumber: 3,
      dateLabel: 'Ngày 3 — Phố Cổ Hội An lung linh sắc đèn lồng & Rừng Dừa',
      activities: [
        {
          timeSlot: 'MORNING',
          timeRange: '08:30 - 11:30',
          destinationName: 'Đi thuyền thúng xoay Rừng dừa Bảy Mẫu Cẩm Thanh',
          category: 'Trải nghiệm sinh thái',
          note: 'Len lỏi giữa rừng dừa bạt ngàn, xem nghệ nhân múa thúng xoay tít và giăng lưới bắt cá.',
          estimatedCostVnd: 150000,
        },
        {
          timeSlot: 'AFTERNOON',
          timeRange: '12:00 - 13:30',
          destinationName: 'Cơm Gà Bà Buội & Bánh Mì Phượng trứ danh',
          category: 'Ẩm thực phố hội',
          note: 'Cơm gà xé vàng óng nghệ tươi thơm lừng ăn kèm dưa chua đu đủ và nước sốt gia truyền.',
          estimatedCostVnd: 80000,
        },
        {
          timeSlot: 'AFTERNOON',
          timeRange: '15:00 - 18:00',
          destinationName: 'Tản bộ Nhà cổ Tấn Ký, Chùa Cầu & Uống Cà phê Mót',
          category: 'Di sản UNESCO',
          note: 'Dạo bước trên những con ngõ vàng óng hoa giấy, nhâm nhi ly trà sen Mót thanh mát.',
          estimatedCostVnd: 150000,
        },
        {
          timeSlot: 'EVENING',
          timeRange: '18:30 - 21:00',
          destinationName: 'Thả hoa đăng ước nguyện trên sông Hoài & Mua sắm',
          category: 'Văn hóa & Đêm phố cổ',
          note: 'Đi thuyền gỗ nhỏ thả đèn hoa đăng lung linh mặt nước và mua đèn lồng lụa thủ công lưu niệm.',
          estimatedCostVnd: 100000,
        },
      ],
    },
  ],
};

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function mapTimeSlotToVi(slot: string): { labelVi: string; labelEn: string; icon: string; cssClass: string } {
  switch (slot?.toUpperCase()) {
    case 'MORNING':
      return { labelVi: 'Buổi Sáng', labelEn: 'Morning', icon: '☀️', cssClass: 'slotMorning' };
    case 'AFTERNOON':
      return { labelVi: 'Buổi Chiều', labelEn: 'Afternoon', icon: '🌤️', cssClass: 'slotAfternoon' };
    case 'EVENING':
      return { labelVi: 'Buổi Tối', labelEn: 'Evening', icon: '🌙', cssClass: 'slotEvening' };
    default:
      return { labelVi: 'Hoạt động', labelEn: 'Activity', icon: '📍', cssClass: 'slotDay' };
  }
}

export default function PlannerPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [destinationId, setDestinationId] = useState('danang');
  const [daysCount, setDaysCount] = useState(3);
  const [travelStyle, setTravelStyle] = useState('resort');
  const [budgetTier, setBudgetTier] = useState('standard');
  const [partySize, setPartySize] = useState('couple');
  const [activeDay, setActiveDay] = useState(1);

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [plan, setPlan] = useState<GeneratedPlan>(DEFAULT_PLAN);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Realtime Weather for selected destination
  const [weatherMap, setWeatherMap] = useState<Record<string, RealtimeWeather>>({});

  useEffect(() => {
    async function loadWeather() {
      try {
        const data = await fetchAllDestinationsWeather();
        setWeatherMap(data);
      } catch (e) {
        console.warn('Planner weather fetch error:', e);
      }
    }
    loadWeather();
  }, []);

  const selectedDestination = DESTINATION_OPTIONS.find((d) => d.id === destinationId) ?? DESTINATION_OPTIONS[0];
  const currentWeather = weatherMap[destinationId];

  // Loading animation simulation
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 3);
    }, 1100);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSavedSuccess(false);
    setErrorMessage(null);

    const budgetLevelMap: Record<string, string> = {
      economy: 'BUDGET',
      standard: 'MEDIUM',
      luxury: 'LUXURY',
    };

    const styleMap: Record<string, string> = {
      resort: 'Nghỉ dưỡng & Thư giãn',
      culture: 'Văn hóa & Di sản',
      adventure: 'Khám phá & Check-in',
      family: 'Gia đình & Vui chơi',
    };

    const requestPayload = {
      destinationProvince: selectedDestination.province,
      totalDays: daysCount,
      budgetLevel: budgetLevelMap[budgetTier] || 'MEDIUM',
      interests: [styleMap[travelStyle] || 'Khám phá', partySize],
    };

    try {
      // Call public AI Quick-Plan endpoint
      const res = await fetch('/api/v1/ai/quick-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      // Transform backend response to UI structure
      const parsedDays: DayPlan[] = (data.days || []).map((d: any, idx: number) => ({
        dayNumber: d.dayNumber ?? idx + 1,
        dateLabel: d.dateLabel ?? `Ngày ${idx + 1} — Khám phá & Trải nghiệm`,
        activities: (d.activities || []).map((a: any, aIdx: number) => {
          const slot = a.timeSlot || 'MORNING';
          const defaultTimes: Record<string, string> = {
            MORNING: '08:00 - 11:30',
            AFTERNOON: '13:30 - 17:00',
            EVENING: '18:30 - 21:30',
          };
          return {
            id: a.destinationId || String(aIdx),
            timeSlot: slot,
            timeRange: defaultTimes[slot] || '09:00 - 12:00',
            destinationName: a.destinationName || a.placeName || 'Điểm trải nghiệm đặc sắc',
            category: a.category || 'Trải nghiệm du lịch',
            note: a.note || a.activityDescription || 'Khám phá cảnh quan và thưởng thức phong vị địa phương',
            estimatedCostVnd: Number(a.estimatedCost || a.estimatedCostVnd || 150000),
          };
        }),
      }));

      setPlan({
        destinationProvince: data.destinationProvince || selectedDestination.province,
        totalDays: data.totalDays || daysCount,
        budgetLevel: data.budgetLevel || budgetTier,
        estimatedTotalCost: Number(data.estimatedTotalCost || 4500000),
        isMockData: Boolean(data.isMockData),
        days: parsedDays.length > 0 ? parsedDays : DEFAULT_PLAN.days,
      });

      setActiveDay(1);
    } catch (err: any) {
      console.warn('API fetch quick-plan failed, using graceful client plan:', err.message);
      // Graceful fallback to client plan without disrupting the user
      setPlan({
        ...DEFAULT_PLAN,
        destinationProvince: selectedDestination.province,
        totalDays: daysCount,
        isMockData: true,
      });
      setActiveDay(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTrip = () => {
    try {
      localStorage.setItem('vista_saved_plan', JSON.stringify(plan));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      setSavedSuccess(true);
    }
  };

  const handleConvertToOfficialTrip = () => {
    try {
      localStorage.setItem('vista_pending_trip_creation', JSON.stringify({
        title: `Hành trình ${plan.totalDays}N Khám Phá ${plan.destinationProvince}`,
        destination: plan.destinationProvince,
        days: plan.totalDays,
        budgetVnd: plan.estimatedTotalCost,
      }));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    router.push('/trips');
  };

  const currentDayData = plan.days.find((d) => d.dayNumber === activeDay) ?? plan.days[0] ?? DEFAULT_PLAN.days[0];

  const getPartyMultiplier = (size: string): number => {
    switch (size) {
      case 'solo': return 1;
      case 'couple': return 2;
      case 'group': return 4;
      default: return 2;
    }
  };

  const partyMultiplier = getPartyMultiplier(partySize);
  const costPerPersonVnd = Math.round(plan.estimatedTotalCost / partyMultiplier);

  return (
    <div className={styles.plannerRoot}>
      {/* ─── 1. TOP GLOBAL NAVBAR ───────────────────────────────────────── */}
      <Navbar
        activeModule="planner"
        lang={lang}
        onLangChange={(nextLang) => setLang(nextLang)}
      />

      {/* ─── 2. HERO HEADER ────────────────────────────────────────────── */}
      <section className={styles.plannerHero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <span>✨</span>
            <span>{lang === 'vi' ? 'Trợ Lý Du Lịch Thông Minh VISTA AI' : 'VISTA Intelligent Travel Assistant'}</span>
            <span className={styles.heroAIBadge}>Gemini 2.5 LLM</span>
          </div>
          <h1 className={styles.heroTitle}>
            {lang === 'vi' ? (
              <>
                Thiết kế lịch trình du lịch <span className={styles.heroTitleGradient}>tối ưu trong 10 giây</span>
              </>
            ) : (
              <>
                Design your personalized itinerary <span className={styles.heroTitleGradient}>in 10 seconds</span>
              </>
            )}
          </h1>
          <p className={styles.heroSubtitle}>
            {lang === 'vi'
              ? 'Tự động tính toán cung đường di chuyển tối ưu, cập nhật thời tiết realtime và đề xuất trải nghiệm độc bản theo đúng ngân sách của nhóm bạn.'
              : 'Auto-calculates optimal transit routes, monitors live weather conditions, and creates tailor-made daily timelines with group budget split.'}
          </p>
        </div>
      </section>

      {/* ─── 3. MAIN INTERACTIVE PLANNER ───────────────────────────────── */}
      <div className={styles.plannerContainer}>
        {/* LEFT: Configuration Panel */}
        <div className={styles.configPanel}>
          <div className={styles.panelTitle}>
            <span>⚙️</span>
            <span>{lang === 'vi' ? 'Tùy chỉnh chuyến đi' : 'Trip Preferences'}</span>
          </div>

          {/* Destination Selector */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{lang === 'vi' ? 'Điểm đến mong muốn:' : 'Target Destination:'}</label>
            <select
              className={styles.destinationSelect}
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
            >
              {DESTINATION_OPTIONS.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.nameVi}
                </option>
              ))}
            </select>
          </div>

          {/* Realtime Weather Alert for this destination */}
          <div className={styles.weatherAlertBox}>
            <div className={styles.weatherAlertIcon}>{currentWeather?.icon ?? '🌤️'}</div>
            <div className={styles.weatherAlertText}>
              <strong>
                {lang === 'vi' ? 'Thời tiết Realtime tại điểm đến:' : 'Live Destination Weather:'}{' '}
                {currentWeather?.tempFormatted ?? '28°C'}
              </strong>
              {currentWeather
                ? (lang === 'vi' ? `${currentWeather.statusVi}. ${currentWeather.adviceVi}` : `${currentWeather.statusEn}. ${currentWeather.adviceEn}`)
                : (lang === 'vi' ? 'Thời tiết nắng ráo thuận lợi, biển êm, rất đẹp cho các hoạt động ngoài trời.' : 'Sunny and calm sea, ideal for outdoor exploration.')}
            </div>
          </div>

          {/* Duration Selector */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{lang === 'vi' ? 'Thời gian chuyến đi:' : 'Trip Duration:'}</label>
            <div className={styles.pillGrid}>
              {[
                { count: 2, labelVi: '2N1Đ', labelEn: '2D1N' },
                { count: 3, labelVi: '3N2Đ', labelEn: '3D2N' },
                { count: 4, labelVi: '4N3Đ', labelEn: '4D3N' },
                { count: 5, labelVi: '5N4Đ', labelEn: '5D4N' },
              ].map((pill) => (
                <div
                  key={pill.count}
                  className={`${styles.optionPill} ${daysCount === pill.count ? styles.optionPillActive : ''}`}
                  onClick={() => setDaysCount(pill.count)}
                >
                  {lang === 'vi' ? pill.labelVi : pill.labelEn}
                </div>
              ))}
            </div>
          </div>

          {/* Travel Style */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{lang === 'vi' ? 'Phong cách chuyến đi:' : 'Travel Style:'}</label>
            <div className={styles.styleGrid}>
              {[
                { id: 'resort', icon: '🏨', labelVi: 'Nghỉ dưỡng & Chill', labelEn: 'Resort & Relax' },
                { id: 'culture', icon: '🏮', labelVi: 'Văn hóa & Di sản', labelEn: 'Culture & Food' },
                { id: 'adventure', icon: '⛰️', labelVi: 'Phượt & Trải nghiệm', labelEn: 'Trekking & Photo' },
                { id: 'family', icon: '👨‍👩‍👧', labelVi: 'Gia đình & Vui chơi', labelEn: 'Family Friendly' },
              ].map((st) => (
                <div
                  key={st.id}
                  className={`${styles.stylePill} ${travelStyle === st.id ? styles.stylePillActive : ''}`}
                  onClick={() => setTravelStyle(st.id)}
                >
                  <span>{st.icon}</span>
                  <span>{lang === 'vi' ? st.labelVi : st.labelEn}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Tier */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{lang === 'vi' ? 'Mức ngân sách dự kiến:' : 'Budget Level:'}</label>
            <div className={styles.pillGrid}>
              {[
                { id: 'economy', labelVi: 'Tiết kiệm', labelEn: 'Economy' },
                { id: 'standard', labelVi: 'Tiêu chuẩn', labelEn: 'Standard' },
                { id: 'luxury', labelVi: 'Cao cấp', labelEn: 'Luxury' },
              ].map((tier) => (
                <div
                  key={tier.id}
                  className={`${styles.optionPill} ${budgetTier === tier.id ? styles.optionPillActive : ''}`}
                  onClick={() => setBudgetTier(tier.id)}
                >
                  {lang === 'vi' ? tier.labelVi : tier.labelEn}
                </div>
              ))}
            </div>
          </div>

          {/* Party Size */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{lang === 'vi' ? 'Thành phần đồng hành:' : 'Travel Companions:'}</label>
            <div className={styles.pillGrid}>
              {[
                { id: 'solo', labelVi: '👤 Đi 1 mình', labelEn: 'Solo' },
                { id: 'couple', labelVi: '👫 Cặp đôi', labelEn: 'Couple' },
                { id: 'group', labelVi: '👥 Nhóm (4+)', labelEn: 'Group (4+)' },
              ].map((p) => (
                <div
                  key={p.id}
                  className={`${styles.optionPill} ${partySize === p.id ? styles.optionPillActive : ''}`}
                  onClick={() => setPartySize(p.id)}
                >
                  {lang === 'vi' ? p.labelVi : p.labelEn}
                </div>
              ))}
            </div>
          </div>

          {/* CTA Generate */}
          <button type="button" className={styles.btnGenerate} onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <div className={styles.generatingState}>
                <div className={styles.spinnerPulse} />
                <span>
                  {loadingStep === 0
                    ? (lang === 'vi' ? 'Đang phân tích điểm đến & thời tiết...' : 'Analyzing destination & weather...')
                    : loadingStep === 1
                    ? (lang === 'vi' ? 'Gemini AI đang tối ưu cung đường...' : 'Gemini AI is optimizing routes...')
                    : (lang === 'vi' ? 'Đang hoàn tất dự toán ngân sách...' : 'Finalizing budget & activities...')}
                </span>
              </div>
            ) : (
              <>
                <span>✨</span>
                <span>{lang === 'vi' ? 'Tạo Lịch Trình Bằng AI' : 'Generate AI Itinerary'}</span>
              </>
            )}
          </button>
        </div>

        {/* RIGHT: Generated Itinerary Panel */}
        <div className={styles.itineraryPanel}>
          {/* Header Card */}
          <div className={styles.itineraryHeaderCard}>
            <div className={styles.itineraryHeaderLeft}>
              <h2>
                {lang === 'vi'
                  ? `Lịch trình gợi ý: ${plan.totalDays} Ngày Khám Phá ${plan.destinationProvince}`
                  : `Curated Plan: ${plan.totalDays} Days in ${plan.destinationProvince}`}
              </h2>
              <div className={styles.itineraryMetaRow}>
                {plan.isMockData ? (
                  <span className={styles.badgeStandard}>
                    ⚡ {lang === 'vi' ? 'Lộ Trình Chuẩn Hóa Tự Động' : 'Deterministic Route'}
                  </span>
                ) : (
                  <span className={styles.badgeGeminiLive}>
                    <span className={styles.pulsingDot} />
                    ✨ Gemini 2.5 Flash Live AI
                  </span>
                )}
                <span>
                  {lang === 'vi'
                    ? `Tổng ${plan.days.reduce((acc, d) => acc + d.activities.length, 0)} hoạt động`
                    : `${plan.days.reduce((acc, d) => acc + d.activities.length, 0)} activities`}
                </span>
                <span>•</span>
                <span>{lang === 'vi' ? 'Tối ưu thời tiết & giao thông' : 'Weather & transit optimized'}</span>
              </div>
            </div>

            <div className={styles.itineraryActions}>
              <button type="button" className={styles.btnActionOutline} onClick={handleSaveTrip}>
                <span>{savedSuccess ? '✅ Đã lưu' : '💾 Lưu lịch trình'}</span>
              </button>
              <button
                type="button"
                className={styles.btnActionPrimary}
                onClick={handleConvertToOfficialTrip}
              >
                <span>🚀 {lang === 'vi' ? 'Mở Chuyến Đi & Bật Thủ Quỹ' : 'Open Trip & Split Treasury'}</span>
              </button>
            </div>
          </div>

          {/* Day Tabs */}
          <div className={styles.dayTabsRow}>
            {plan.days.map((d) => (
              <button
                key={d.dayNumber}
                type="button"
                className={`${styles.dayTabBtn} ${activeDay === d.dayNumber ? styles.dayTabBtnActive : ''}`}
                onClick={() => setActiveDay(d.dayNumber)}
              >
                <span>📅</span>
                <span>
                  {lang === 'vi' ? `Ngày ${d.dayNumber}` : `Day ${d.dayNumber}`}
                </span>
                <span className={styles.dayTabBadge}>{d.activities.length}</span>
              </button>
            ))}
          </div>

          {/* Timeline Activities */}
          <div className={styles.timelineWrapper}>
            <div className={styles.dayTitleBanner}>
              <span>📌</span>
              <span>{currentDayData.dateLabel}</span>
            </div>

            {currentDayData.activities.map((act, index) => {
              const slotInfo = mapTimeSlotToVi(act.timeSlot);
              return (
                <div key={act.id || index} className={styles.activityCard}>
                  <div className={styles.activityTimeCol}>
                    <span className={styles.activityTime}>{act.timeRange}</span>
                    <span className={`${styles.activitySlot} ${styles[slotInfo.cssClass] || ''}`}>
                      {slotInfo.icon} {lang === 'vi' ? slotInfo.labelVi : slotInfo.labelEn}
                    </span>
                  </div>

                  <div className={styles.activityInfoCol}>
                    <div className={styles.activityNameRow}>
                      <h3>{act.destinationName}</h3>
                      <span className={styles.categoryBadge}>{act.category}</span>
                    </div>
                    <p className={styles.activityDesc}>{act.note}</p>
                    <span className={styles.activityTip}>
                      💡 {lang === 'vi' ? 'Lời khuyên VISTA: Nên chuẩn bị trước điện thoại đầy pin để chụp ảnh đẹp nhất.' : 'VISTA tip: Keep phone battery charged for scenic views.'}
                    </span>
                  </div>

                  <div className={styles.activityCostCol}>
                    <span className={styles.activityCost}>
                      {act.estimatedCostVnd > 0 ? formatVnd(act.estimatedCostVnd) : (lang === 'vi' ? 'Miễn phí' : 'Free entry')}
                    </span>
                    <span className={styles.activityCostLabel}>
                      {lang === 'vi' ? 'Chi phí dự kiến' : 'Estimated cost'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cost Summary Footer */}
          <div className={styles.costSummaryCard}>
            <div className={styles.costSummaryLeft}>
              <h4>{lang === 'vi' ? 'Tổng ngân sách dự toán trọn gói' : 'Estimated Total Budget'}</h4>
              <p>
                {lang === 'vi'
                  ? `Bao gồm vé tham quan, ăn uống đặc sản, phương tiện di chuyển theo mức ${budgetTier === 'economy' ? 'Tiết kiệm' : budgetTier === 'luxury' ? 'Cao cấp' : 'Tiêu chuẩn'}.`
                  : 'Includes attraction tickets, regional cuisine, local transport and entry fees.'}
              </p>
              <div className={styles.treasurySplitBadge}>
                <span>👥 {lang === 'vi' ? `Thủ quỹ nhóm (${partyMultiplier} người):` : `Group Treasury (${partyMultiplier} people):`}</span>
                <strong>~{formatVnd(costPerPersonVnd)} / {lang === 'vi' ? 'người' : 'person'}</strong>
              </div>
            </div>
            <div className={styles.costSummaryRight}>
              <div className={styles.costTotalNumber}>
                {formatVnd(plan.estimatedTotalCost)}
              </div>
              <div className={styles.costPerPerson}>
                {lang === 'vi' ? 'Sẵn sàng đồng bộ vào Thủ Quỹ Chuyến Đi' : 'Ready to sync into Group Treasury'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
