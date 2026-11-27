'use client';

import React, { useState, useId, useEffect } from 'react';
import styles from './planner-setup.module.css';
import {
  MapPin,
  Calendar,
  Users,
  Minus,
  Plus,
  Sparkles,
  Compass,
  ChevronDown,
  Bookmark,
  Check,
  Search,
  CloudSun,
  Sun,
  CloudRain,
  Car,
  Footprints,
  Plane,
  Train,
  Bus,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { calculateIntercityTransit, getAvailableTransportModes } from '@/lib/intercityTransit';

export interface CuratedTemplateItem {
  id: string;
  title: string;
  subtitle: string;
  themeBadge?: string;
  duration: string;
  durationBadge?: string;
  timeInfo?: string;
  destInfo?: string;
  image: string;
  styles?: string[];
  rating?: number | string;
  usedCount?: string;
  priceFormatted?: string;
  dailyHighlights?: Array<{
    dayNumber: number;
    title: string;
    stops: string;
  }>;
}

export interface PlannerSetupProps {
  destination: string;
  onChangeDestination: (dest: string) => void;
  originProvince?: string;
  onChangeOriginProvince?: (origin: string) => void;
  intercityTransport?: string;
  onChangeIntercityTransport?: (mode: string) => void;
  startDate: string;
  onChangeStartDate: (date: string) => void;
  duration: string;
  onChangeDuration: (dur: string) => void;
  peopleCount: number;
  onChangePeopleCount: (count: number) => void;
  budgetTier: 'BUDGET' | 'STANDARD' | 'LUXURY';
  onChangeBudgetTier: (tier: 'BUDGET' | 'STANDARD' | 'LUXURY') => void;
  travelPace: 'RELAXED' | 'MODERATE' | 'INTENSIVE';
  onChangeTravelPace: (pace: 'RELAXED' | 'MODERATE' | 'INTENSIVE') => void;
  selectedStyles: string[];
  onToggleStyle: (styleId: string) => void;
  wishesText: string;
  onChangeWishesText: (text: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onApplyTemplate: (templateId: string) => void;
  curatedTemplates?: CuratedTemplateItem[];
  onApplyTemplateItem?: (template: CuratedTemplateItem) => void;
  savedTrips?: Array<{
    id: string;
    title: string;
    destination: string;
    durationLabel: string;
    peopleCount: number;
    startDate: string;
  }>;
  onOpenSavedTrip?: (tripId: string) => void;
  onDeleteSavedTrip?: (tripId: string) => void;
  onClearAllSavedTrips?: () => void;
  allDestinations?: Array<{ id: string; nameVi: string; region?: string }>;
  weatherData?: {
    temp?: number;
    tempFormatted?: string;
    statusVi?: string;
    adviceVi?: string;
    icon?: string;
  } | null;
  weatherInsight?: {
    temp: string;
    text: string;
    badge: string;
  } | null;
}

const DURATION_OPTIONS = [
  { id: '1n', label: '1 ngày' },
  { id: '2n1d', label: '2 ngày 1 đêm' },
  { id: '3n2d', label: '3 ngày 2 đêm' },
  { id: '4n3d', label: '4 ngày 3 đêm' },
  { id: '5n4d', label: '5 ngày 4 đêm' },
];

const STYLE_OPTIONS = [
  { id: 'heritage', label: 'Di tích & Lịch sử', icon: '🏛️' },
  { id: 'foodie', label: 'Ẩm thực đường phố', icon: '🍜' },
  { id: 'cafe_checkin', label: 'Cà phê & Check-in', icon: '☕' },
  { id: 'photography', label: 'Chụp ảnh nghệ thuật', icon: '📸' },
  { id: 'nightlife_shopping', label: 'Mua sắm & Chợ đêm', icon: '🛍️' },
  { id: 'nature_ecotourism', label: 'Sinh thái thiên nhiên', icon: '🌿' },
];

const QUICK_DESTINATIONS = ['Đà Nẵng', 'TP. Hồ Chí Minh', 'Sa Pa', 'Ninh Bình'];

export function PlannerSetupView({
  destination,
  onChangeDestination,
  originProvince = 'Hà Nội',
  onChangeOriginProvince,
  intercityTransport = 'flight',
  onChangeIntercityTransport,
  startDate,
  onChangeStartDate,
  duration,
  onChangeDuration,
  peopleCount,
  onChangePeopleCount,
  budgetTier,
  onChangeBudgetTier,
  travelPace,
  onChangeTravelPace,
  selectedStyles,
  onToggleStyle,
  wishesText,
  onChangeWishesText,
  isGenerating,
  onGenerate,
  onApplyTemplate,
  curatedTemplates = [],
  onApplyTemplateItem,
  savedTrips = [],
  onOpenSavedTrip,
  onDeleteSavedTrip,
  onClearAllSavedTrips,
  allDestinations = [],
  weatherData = null,
  weatherInsight = null,
}: PlannerSetupProps) {
  const [activeRightTab, setActiveRightTab] = useState<'TEMPLATES' | 'SAVED'>('TEMPLATES');
  const [showDestModal, setShowDestModal] = useState(false);
  const [destFilter, setDestFilter] = useState('');
  const [showChildInput, setShowChildInput] = useState(false);
  const [childCount, setChildCount] = useState(0);
  const [activeQuickDate, setActiveQuickDate] = useState<'today' | 'tomorrow' | 'weekend'>('weekend');
  const [showAllSavedTrips, setShowAllSavedTrips] = useState(false);
  const dateInputId = useId();

  const formatLocalIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayIso = formatLocalIso(new Date());

  // Get initials for destination avatar
  const getInitials = (name: string) => {
    if (!name) return 'VN';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const filteredDestinations = allDestinations.filter((d) =>
    d.nameVi.toLowerCase().includes(destFilter.toLowerCase().trim())
  );

  const availableModes = getAvailableTransportModes(originProvince, destination);

  // Tự động chuyển đổi nếu phương tiện hiện tại không khả thi cho chặng này (ví dụ: Đà Nẵng -> Huế ko có máy bay)
  useEffect(() => {
    const currentModeAvailable = availableModes.find((m) => m.id === intercityTransport)?.available;
    if (currentModeAvailable === false) {
      const fallback = availableModes.find((m) => m.available)?.id || 'train';
      onChangeIntercityTransport?.(fallback);
    }
  }, [originProvince, destination, intercityTransport, availableModes, onChangeIntercityTransport]);

  const transitCalc = calculateIntercityTransit(
    originProvince,
    destination,
    intercityTransport,
    startDate,
    peopleCount
  );

  const durationLabel =
    DURATION_OPTIONS.find((d) => d.id === duration)?.label || '3 ngày 2 đêm';

  const budgetTierLabel =
    budgetTier === 'BUDGET'
      ? 'Tiết kiệm'
      : budgetTier === 'LUXURY'
      ? 'Cao cấp'
      : 'Tiêu chuẩn';

  // Quick date presets
  const setQuickDate = (preset: 'today' | 'tomorrow' | 'weekend') => {
    setActiveQuickDate(preset);
    const today = new Date();
    if (preset === 'today') {
      onChangeStartDate(formatLocalIso(today));
    } else if (preset === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      onChangeStartDate(formatLocalIso(tomorrow));
    } else if (preset === 'weekend') {
      const sat = new Date(today);
      const dayOfWeek = sat.getDay();
      const diffToSaturday = (6 - dayOfWeek + 7) % 7 || 7;
      sat.setDate(today.getDate() + diffToSaturday);
      onChangeStartDate(formatLocalIso(sat));
    }
  };

  // Weather formatting
  const tempStr =
    weatherData?.tempFormatted ||
    (weatherData?.temp ? `${weatherData.temp}°C` : weatherInsight?.temp || '28°C');
  const statusStr = weatherData?.statusVi || 'Trời nắng đẹp';
  const adviceStr =
    weatherData?.adviceVi ||
    weatherInsight?.text ||
    'Thời tiết mát mẻ, lý tưởng để tham quan ngoài trời';
  const isRainy = statusStr.toLowerCase().includes('mưa');
  const isSunny = !isRainy;

  return (
    <div className={styles.setupPageWrapper}>
      {/* ─── TOP INTRO ROW & LIVE WEATHER ─── */}
      <div className={styles.topIntroRow}>
        <div className={styles.introLeft}>
          <div className={styles.badgePill}>
            <Compass size={13} />
            <span>VISTA TRIP PLANNER</span>
          </div>
          <h1 className={styles.mainHeading}>Thiết kế Hành trình</h1>
          <p className={styles.subHeading}>
            Tối ưu lộ trình và dự toán ngân sách theo sở thích của bạn.
          </p>
        </div>

        {/* Dynamic High-Prominence Live Weather Widget */}
        <div
          className={`${styles.weatherWidget} ${
            isSunny ? styles.weatherWidgetSunny : isRainy ? styles.weatherWidgetRainy : styles.weatherWidgetCool
          }`}
          title="Thông tin thời tiết trực tiếp theo điểm đến"
        >
          <div className={`${styles.weatherIconBox} ${isSunny ? styles.weatherIconBoxSunny : ''}`}>
            {isSunny ? (
              <Sun size={22} color="#D97706" />
            ) : isRainy ? (
              <CloudRain size={22} color="#0284C7" />
            ) : (
              <CloudSun size={22} color="#0088CC" />
            )}
          </div>
          <div className={styles.weatherContentCol}>
            <div className={styles.weatherTitleRow}>
              <span className={`${styles.weatherCityName} ${isSunny ? styles.weatherCityNameSunny : ''}`}>
                {destination}
              </span>
              <span className={`${styles.weatherTemp} ${isSunny ? styles.weatherTempSunny : ''}`}>
                <span className={styles.weatherLiveDot} />
                <span>{tempStr}</span>
              </span>
            </div>
            <div className={`${styles.weatherAdviceText} ${isSunny ? styles.weatherAdviceTextSunny : ''}`}>
              {adviceStr}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2-COLUMN BALANCED WORKSPACE GRID (60% Left : 40% Right) ─── */}
      <div className={styles.plannerGrid}>
        {/* ════════════════════════════════════════════════════════════════════
            LEFT COLUMN — FORM MODULES
            ════════════════════════════════════════════════════════════════════ */}
        <div className={styles.leftColForm}>
          {/* 1. Destination Module */}
          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleTitleRow}>
                <MapPin size={16} color="#0088CC" />
                <span>Điểm đến khám phá</span>
              </div>
              <span className={styles.moduleStatusBadge}>Đang thiết lập</span>
            </div>

            <div className={styles.chosenDestBar}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className={styles.destAvatarBox}>{getInitials(destination)}</div>
                <div className={styles.destInfoText}>
                  <div className={styles.destNameTitle}>{destination}, Việt Nam</div>
                  <div className={styles.destSubDesc}>
                    {destination.includes('Hà Nội')
                      ? 'Thủ đô nghìn năm văn hiến · 30 quận/huyện'
                      : destination.includes('Hồ Chí Minh')
                      ? 'Hòn ngọc Viễn Đông · 22 quận/huyện sầm uất'
                      : destination.includes('Đà Nẵng')
                      ? 'Thành phố đáng sống nhất Việt Nam'
                      : 'Điểm đến du lịch hấp dẫn hàng đầu'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={styles.changeDestBtn}
                onClick={() => setShowDestModal(true)}
              >
                Thay đổi
              </button>
            </div>

            {/* Quick jump pills */}
            <div className={styles.quickPillsRow}>
              <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 600 }}>Gợi ý nhanh:</span>
              {QUICK_DESTINATIONS.map((city) => (
                <button
                  key={city}
                  type="button"
                  className={styles.quickPillBtn}
                  onClick={() => onChangeDestination(city)}
                  style={
                    destination === city
                      ? { background: '#E0F2FE', color: '#0088CC', borderColor: '#BAE6FD', fontWeight: 700 }
                      : {}
                  }
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* 1b. Xuất phát & Phương tiện liên tỉnh với Biến động theo mùa */}
          <div className={styles.moduleCard} style={{ borderLeft: '3.5px solid #0088CC' }}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleTitleRow}>
                <Plane size={16} color="#0088CC" />
                <span>Điểm xuất phát & Phương tiện liên tỉnh</span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: transitCalc.seasonalFactor > 1.2 ? '#FEF2F2' : transitCalc.seasonalFactor < 1 ? '#F0FDF4' : '#F0F9FF',
                  color: transitCalc.seasonalFactor > 1.2 ? '#DC2626' : transitCalc.seasonalFactor < 1 ? '#16A34A' : '#0284C7',
                  border: `1px solid ${transitCalc.seasonalFactor > 1.2 ? '#FECDD3' : transitCalc.seasonalFactor < 1 ? '#BBF7D0' : '#BAE6FD'}`,
                }}
              >
                {transitCalc.seasonBadge}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              {/* Origin Selection */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>
                  Nơi xuất phát của đoàn:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'].map((orig) => (
                    <button
                      key={orig}
                      type="button"
                      onClick={() => onChangeOriginProvince?.(orig)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: originProvince === orig ? '1.5px solid #0088CC' : '1px solid #E2E8F0',
                        background: originProvince === orig ? '#F0F9FF' : '#FFFFFF',
                        color: originProvince === orig ? '#0088CC' : '#334155',
                        fontWeight: originProvince === orig ? 700 : 500,
                      }}
                    >
                      {orig}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transit Mode Selection */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>
                  Lựa chọn phương tiện khứ hồi:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {[
                    { id: 'flight', label: 'Máy bay', icon: Plane, defaultDesc: 'Nhanh nhất' },
                    { id: 'train', label: 'Tàu hỏa', icon: Train, defaultDesc: 'Trải nghiệm' },
                    { id: 'coach', label: 'Xe khách / Limousine', icon: Bus, defaultDesc: 'Tiết kiệm' },
                    { id: 'car', label: 'Ô tô cá nhân', icon: Car, defaultDesc: 'Xăng dầu & BOT' },
                  ].map((m) => {
                    const IconComp = m.icon;
                    const modeStatus = availableModes.find((item) => item.id === m.id);
                    const isAvailable = modeStatus ? modeStatus.available : true;
                    const isActive = intercityTransport === m.id;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => {
                          if (isAvailable) onChangeIntercityTransport?.(m.id);
                        }}
                        title={!isAvailable ? (modeStatus?.unavailableReason || 'Phương tiện không khả dụng cho tuyến đường này') : ''}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '2px',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          border: isActive && isAvailable
                            ? '1.5px solid #0088CC'
                            : !isAvailable
                            ? '1px dashed #CBD5E1'
                            : '1px solid #E2E8F0',
                          background: isActive && isAvailable
                            ? '#F0F9FF'
                            : !isAvailable
                            ? '#F1F5F9'
                            : '#FFFFFF',
                          opacity: isAvailable ? 1 : 0.55,
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IconComp size={13} color={isActive && isAvailable ? '#0088CC' : !isAvailable ? '#94A3B8' : '#64748B'} />
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: isActive && isAvailable ? 700 : 600,
                                color: isActive && isAvailable ? '#0088CC' : !isAvailable ? '#94A3B8' : '#1E293B',
                                textDecoration: !isAvailable ? 'line-through' : 'none',
                              }}
                            >
                              {m.label}
                            </span>
                          </div>
                          {!isAvailable && (
                            <span style={{ fontSize: '9px', fontWeight: 600, background: '#E2E8F0', color: '#64748B', padding: '1px 4px', borderRadius: '4px' }}>
                              Không có
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '10px', color: !isAvailable ? '#94A3B8' : '#64748B' }}>
                          {!isAvailable ? 'Không có tuyến này' : m.defaultDesc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notice if vehicle was auto-switched or has route limitation */}
              {!transitCalc.isAvailable && (
                <div
                  style={{
                    padding: '8px 11px',
                    borderRadius: '8px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11.5px',
                    color: '#1D4ED8',
                  }}
                >
                  <AlertCircle size={15} color="#2563EB" style={{ flexShrink: 0 }} />
                  <span>{transitCalc.summary}</span>
                </div>
              )}

              {/* Live Fare Estimation Banner */}
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '9px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Dự toán {transitCalc.transportName}:</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    ~{transitCalc.actualFarePerPerson.toLocaleString('vi-VN')} đ/người (Khứ hồi)
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#0088CC' }}>Đến: {transitCalc.arrivalHub}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10.5px', color: '#64748B' }}>Tổng {peopleCount} người:</span>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0284C7' }}>
                    {transitCalc.totalTransitCostVnd.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Departure Date & Group Size & Duration Module */}
          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleTitleRow}>
                <Calendar size={16} color="#0088CC" />
                <span>Thời gian chuyến đi</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Dương lịch 2026</span>
            </div>

            <div className={styles.datePaxGrid}>
              {/* Departure date */}
              <div>
                <label className={styles.fieldLabelSmall} htmlFor={dateInputId}>Ngày khởi hành</label>
                <div className={styles.dateInputBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} color="#0088CC" />
                    <input
                      id={dateInputId}
                      type="date"
                      min={todayIso}
                      value={startDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && val < todayIso) {
                          onChangeStartDate(todayIso);
                          return;
                        }
                        onChangeStartDate(val);
                      }}
                      style={{
                        border: 'none',
                        outline: 'none',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#0F172A',
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    {startDate ? new Date(startDate).toLocaleDateString('vi-VN', { weekday: 'short' }) : 'Thứ ba'}
                  </span>
                </div>
                <div className={styles.dateQuickRow}>
                  <button
                    type="button"
                    className={`${styles.dateQuickBtn} ${activeQuickDate === 'today' ? styles.dateQuickBtnActive : ''}`}
                    onClick={() => setQuickDate('today')}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    className={`${styles.dateQuickBtn} ${activeQuickDate === 'tomorrow' ? styles.dateQuickBtnActive : ''}`}
                    onClick={() => setQuickDate('tomorrow')}
                  >
                    Ngày mai
                  </button>
                  <button
                    type="button"
                    className={`${styles.dateQuickBtn} ${activeQuickDate === 'weekend' ? styles.dateQuickBtnActive : ''}`}
                    onClick={() => setQuickDate('weekend')}
                  >
                    Cuối tuần này
                  </button>
                </div>
              </div>

              {/* Group size */}
              <div>
                <span className={styles.fieldLabelSmall}>Số lượng thành viên</span>
                <div className={styles.paxStepperBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} color="#0088CC" />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                      {peopleCount} người lớn
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => onChangePeopleCount(Math.max(1, peopleCount - 1))}
                      disabled={peopleCount <= 1}
                      title="Giảm số người"
                    >
                      <Minus size={13} />
                    </button>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => onChangePeopleCount(Math.min(20, peopleCount + 1))}
                      title="Tăng số người"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: '5px', fontSize: '11px', color: '#64748B' }}>
                  Có trẻ em hoặc em bé?{' '}
                  {!showChildInput ? (
                    <button
                      type="button"
                      onClick={() => setShowChildInput(true)}
                      style={{ color: '#0088CC', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                    >
                      + Thêm trẻ
                    </button>
                  ) : (
                    <span style={{ color: '#0088CC', fontWeight: 600 }}>
                      <button
                        type="button"
                        onClick={() => setChildCount(Math.max(0, childCount - 1))}
                        style={{ padding: '0 4px', border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '3px' }}
                      >
                        -
                      </button>{' '}
                      {childCount} trẻ em{' '}
                      <button
                        type="button"
                        onClick={() => setChildCount(childCount + 1)}
                        style={{ padding: '0 4px', border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '3px' }}
                      >
                        +
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Duration selector */}
            <div style={{ marginTop: '2px' }}>
              <span className={styles.fieldLabelSmall}>Thời lượng hành trình</span>
              <div className={styles.durationRadioGroup}>
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.durationBtn} ${duration === opt.id ? styles.durationBtnActive : ''}`}
                    onClick={() => onChangeDuration(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Budget & Travel Pace */}
          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleTitleRow}>
                <Sparkles size={16} color="#0088CC" />
                <span>Mức chi tiêu & Nhịp độ di chuyển</span>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '-4px' }}>
              Hỗ trợ thuật toán AI lượng giá gợi ý nhà hàng, khách sạn và điểm check-in phù hợp túi tiền.
            </div>

            {/* 3 Budget Cards */}
            <div className={styles.budgetThreeCards}>
              {/* Tiết kiệm */}
              <div
                className={`${styles.tierCard} ${budgetTier === 'BUDGET' ? styles.tierCardActive : ''}`}
                onClick={() => onChangeBudgetTier('BUDGET')}
              >
                <div className={styles.tierTitle}>
                  <span>Tiết kiệm</span>
                  <span style={{ fontSize: '12px' }}>🏷️</span>
                </div>
                <div className={budgetTier === 'BUDGET' ? styles.tierPrice : styles.tierPriceMuted}>
                  ~600k <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#64748B' }}>/người/ngày</span>
                </div>
                <div className={styles.tierDesc}>
                  Homestay ấm cúng, quán ăn bình dân chuẩn vị.
                </div>
              </div>

              {/* Tiêu chuẩn */}
              <div
                className={`${styles.tierCard} ${budgetTier === 'STANDARD' ? styles.tierCardActive : ''}`}
                onClick={() => onChangeBudgetTier('STANDARD')}
              >
                <span className={styles.tierBadgePop}>Phổ biến nhất</span>
                <div className={styles.tierTitle}>
                  <span>Tiêu chuẩn</span>
                  <span style={{ fontSize: '12px' }}>✨</span>
                </div>
                <div className={budgetTier === 'STANDARD' ? styles.tierPrice : styles.tierPriceMuted}>
                  ~1.2tr <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#64748B' }}>/người/ngày</span>
                </div>
                <div className={styles.tierDesc}>
                  Khách sạn 3-4 sao, nhà hàng đặc sản nổi tiếng.
                </div>
              </div>

              {/* Cao cấp */}
              <div
                className={`${styles.tierCard} ${budgetTier === 'LUXURY' ? styles.tierCardActive : ''}`}
                onClick={() => onChangeBudgetTier('LUXURY')}
              >
                <div className={styles.tierTitle}>
                  <span>Cao cấp</span>
                  <span style={{ fontSize: '12px' }}>💎</span>
                </div>
                <div className={budgetTier === 'LUXURY' ? styles.tierPrice : styles.tierPriceMuted}>
                  ~2.5tr+ <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#64748B' }}>/người/ngày</span>
                </div>
                <div className={styles.tierDesc}>
                  Resort 4-5 sao, ẩm thực Fine Dining sang trọng.
                </div>
              </div>
            </div>

            {/* Travel Pace */}
            <div style={{ marginTop: '2px' }}>
              <span className={styles.fieldLabelSmall}>Nhịp độ tham quan</span>
              <div className={styles.paceRowGrid}>
                <button
                  type="button"
                  className={`${styles.paceBtn} ${travelPace === 'RELAXED' ? styles.paceBtnActive : ''}`}
                  onClick={() => onChangeTravelPace('RELAXED')}
                >
                  🐢 Thư thả <span style={{ fontSize: '10px', color: '#64748B', display: 'block', fontWeight: 400 }}>(1-2 điểm/buổi)</span>
                </button>
                <button
                  type="button"
                  className={`${styles.paceBtn} ${travelPace === 'MODERATE' ? styles.paceBtnActive : ''}`}
                  onClick={() => onChangeTravelPace('MODERATE')}
                >
                  ⚡ Cân bằng <span style={{ fontSize: '10px', color: '#0088CC', display: 'block', fontWeight: 700 }}>(Đề xuất VISTA AI)</span>
                </button>
                <button
                  type="button"
                  className={`${styles.paceBtn} ${travelPace === 'INTENSIVE' ? styles.paceBtnActive : ''}`}
                  onClick={() => onChangeTravelPace('INTENSIVE')}
                >
                  🚀 Dày đặc <span style={{ fontSize: '10px', color: '#64748B', display: 'block', fontWeight: 400 }}>(Trải nghiệm tối đa)</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Interests & Priority Order */}
          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleTitleRow}>
                <Compass size={16} color="#0088CC" />
                <span>Sở thích & Ưu tiên trải nghiệm</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  STYLE_OPTIONS.forEach((s) => {
                    if (selectedStyles.includes(s.id)) onToggleStyle(s.id);
                  });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Đặt lại
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '-4px' }}>
              Chọn theo thứ tự quan trọng để AI tối ưu trọng số các địa điểm ghé thăm.
            </div>

            <div className={styles.interestsTagGrid}>
              {STYLE_OPTIONS.map((style) => {
                const idx = selectedStyles.indexOf(style.id);
                const isSelected = idx !== -1;
                return (
                  <button
                    key={style.id}
                    type="button"
                    className={`${styles.interestPill} ${isSelected ? styles.interestPillActive : ''}`}
                    onClick={() => onToggleStyle(style.id)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>{style.icon}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {style.label}
                      </span>
                    </span>
                    {isSelected ? (
                      <span className={styles.priorityBadgeCircle}>{idx + 1}</span>
                    ) : (
                      <span className={styles.unselectedPlusCircle}>+</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Special Requests / Custom Wishes */}
          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleTitleRow}>
                <Sparkles size={16} color="#0088CC" />
                <span>Yêu cầu & Mong muốn đặc biệt</span>
              </div>
            </div>
            <textarea
              className={styles.wishesTextarea}
              rows={2}
              value={wishesText}
              onChange={(e) => onChangeWishesText(e.target.value)}
              placeholder="Có người lớn tuổi, ưu tiên ít đi bộ và điểm ăn uống có máy lạnh, chỗ nghỉ trưa thoải mái."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '10.5px', color: '#94A3B8' }}>
              {wishesText.length || 78} ký tự
            </div>
          </div>

          {/* 6. Advanced Transport & Options (Collapsible) */}
          <details
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '10px 14px',
              boxShadow: '0 1px 2px rgba(15,23,42,0.02)',
            }}
          >
            <summary
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#0F172A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Car size={15} color="#0088CC" />
                <span>Tùy chọn di chuyển nâng cao</span>
              </div>
              <ChevronDown size={15} color="#64748B" />
            </summary>
            <div
              style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '11.5px',
                color: '#475569',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Footprints size={14} color="#0088CC" />
                  Mức độ đi bộ:
                </span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>Vừa phải (&lt; 5.000 bước/ngày)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Car size={14} color="#0088CC" />
                  Phương tiện ưu tiên:
                </span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>Taxi công nghệ / Xe đưa đón</span>
              </div>
            </div>
          </details>

          {/* 7. Sticky Bottom Action Bar */}
          <div className={styles.stickyBottomBar}>
            <div>
              <div className={styles.bottomSummaryTitle}>
                {destination} - {durationLabel}
              </div>
              <div className={styles.bottomSummarySub}>
                {peopleCount} khách · {budgetTierLabel} · Thời gian chuẩn
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => alert('Đã lưu nháp cấu hình chuyến đi của bạn!')}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '7px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Lưu nháp
              </button>

              <button
                type="button"
                className={styles.primaryCtaBtn}
                onClick={onGenerate}
                disabled={isGenerating}
              >
                <Sparkles size={15} />
                <span>{isGenerating ? 'Đang tạo lịch trình...' : `Tạo lịch trình ${destination}`}</span>
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '10.5px', color: '#94A3B8', marginTop: '-4px' }}>
            * Thời gian xử lý: ~3 giây bởi mô hình du lịch VISTA AI · Hoàn toàn miễn phí
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            RIGHT COLUMN — STICKY CURATED TEMPLATES & SAVED TRIPS
            ════════════════════════════════════════════════════════════════════ */}
        <aside className={styles.rightStickyRail}>
          {/* Tabs */}
          <div className={styles.rightTabSwitcher}>
            <button
              type="button"
              className={`${styles.rightTabBtn} ${activeRightTab === 'TEMPLATES' ? styles.rightTabBtnActive : ''}`}
              onClick={() => setActiveRightTab('TEMPLATES')}
            >
              Lịch trình Mẫu tuyển chọn ({curatedTemplates.length || 3})
            </button>
            <button
              type="button"
              className={`${styles.rightTabBtn} ${activeRightTab === 'SAVED' ? styles.rightTabBtnActive : ''}`}
              onClick={() => setActiveRightTab('SAVED')}
            >
              Hành trình đã lưu ({savedTrips.length})
            </button>
          </div>

          {activeRightTab === 'TEMPLATES' ? (
            <>
              {(() => {
                const heroTemplate: CuratedTemplateItem =
                  curatedTemplates && curatedTemplates.length > 0
                    ? curatedTemplates[0]
                    : {
                        id: destination.includes('Hồ Chí Minh') ? 'hcm-hero' : 'hn-hero',
                        title: destination.includes('Hồ Chí Minh')
                          ? 'Sài Gòn Năng Động & Ẩm Thực Đêm'
                          : 'Hà Nội hoài niệm: Văn Miếu, Phố cổ & Cà phê Trứng',
                        subtitle: 'Lịch trình tuyển chọn tối ưu điểm dừng và văn hóa bản địa',
                        themeBadge: 'Khuyên dùng nhiều nhất',
                        duration: '3n2d',
                        durationBadge: '3N2Đ',
                        timeInfo: '3 ngày 2 đêm',
                        destInfo: destination,
                        image: destination.includes('Hồ Chí Minh')
                          ? '/destinations/dest-ff3fa74a.webp'
                          : '/destinations/dest-0098ba1b.webp',
                        rating: 4.9,
                        usedCount: '1.2k lượt dùng',
                        dailyHighlights: destination.includes('Hồ Chí Minh')
                          ? [
                              {
                                dayNumber: 1,
                                title: 'Khám phá Trái tim',
                                stops: 'Dinh Độc Lập · Bưu điện Trung tâm · Chợ Bến Thành · Cà phê vợt',
                              },
                              {
                                dayNumber: 2,
                                title: 'Văn hóa & Thắng cảnh',
                                stops: 'Chùa Bửu Long · Bảo tàng Mỹ thuật · Hoàng hôn bến Bạch Đằng',
                              },
                              {
                                dayNumber: 3,
                                title: 'Dấu ấn Sài Gòn',
                                stops: 'Chợ hoa Hồ Thị Kỷ · Hẻm ẩm thực Sài Gòn · Mua đặc sản làm quà',
                              },
                            ]
                          : [
                              {
                                dayNumber: 1,
                                title: 'Khám phá Trái tim',
                                stops: 'Hồ Hoàn Kiếm · Đền Ngọc Sơn · Cà phê Giảng · Ẩm thực đêm Tạ Hiện',
                              },
                              {
                                dayNumber: 2,
                                title: 'Văn hóa & Thắng cảnh',
                                stops: 'Lăng Bác · Văn Miếu Quốc Tử Giám · Chùa Trấn Quốc · Hoàng hôn Hồ Tây',
                              },
                              {
                                dayNumber: 3,
                                title: 'Dấu ấn Kinh kỳ',
                                stops: 'Hoàng Thành Thăng Long · Phố bích họa Phùng Hưng · Mua quà Ô mai Hàng Đường',
                              },
                            ],
                      };

                const compactList: CuratedTemplateItem[] =
                  curatedTemplates && curatedTemplates.length > 1
                    ? curatedTemplates.slice(1, 3)
                    : [
                        {
                          id: 'hanoi-halong-yentu-4n3d',
                          title: 'Hà Nội - Hạ Long - Yên Tử kỳ vĩ',
                          subtitle:
                            'Hành trình di sản tâm linh & kỳ quan thiên nhiên thế giới kết hợp văn hóa Đất kinh kỳ.',
                          duration: '4n3d',
                          durationBadge: '4N3Đ',
                          timeInfo: '4 ngày 3 đêm',
                          destInfo: 'Hà Nội',
                          image: '/destinations/dest-9648da36.webp',
                          rating: 4.8,
                          priceFormatted: '12.800.000đ',
                        },
                        {
                          id: 'food-tour-48h',
                          title: 'Food Tour 48h: Tinh hoa Ẩm thực',
                          subtitle:
                            'Trải nghiệm 12 món ăn đường phố nổi tiếng: Phở Bát Đàn, Bún chả Hàng Quạt, Chè Gỗ Lộ Trọng...',
                          duration: '2n1d',
                          durationBadge: '2N1Đ',
                          timeInfo: '2 ngày 1 đêm',
                          destInfo: 'Hà Nội',
                          image: '/destinations/dest-ff3fa74a.webp',
                          rating: 4.9,
                          priceFormatted: '950.000đ',
                        },
                      ];

                return (
                  <>
                    {/* Card 1: Featured Hero Showcase Card */}
                    <div className={styles.heroShowcaseCard}>
                      <div className={styles.showcaseImgBox}>
                        <img
                          src={heroTemplate.image}
                          alt={heroTemplate.title}
                          className={styles.showcaseImg}
                        />
                        <div className={styles.showcaseOverlay}>
                          <div className={styles.showcaseTopRow}>
                            <span className={styles.showcaseTag}>
                              {heroTemplate.themeBadge || 'Khuyên dùng nhiều nhất'}
                            </span>
                            <span className={styles.showcaseRating}>
                              ⭐ {heroTemplate.rating || '4.9'} ({heroTemplate.usedCount || '1.2k lượt dùng'})
                            </span>
                          </div>
                          <div className={styles.showcaseTitle}>
                            {heroTemplate.title.startsWith('Lịch trình đề xuất')
                              ? heroTemplate.title
                              : `Lịch trình đề xuất ${heroTemplate.durationBadge || '3N2Đ'}: ${heroTemplate.title}`}
                          </div>
                        </div>
                      </div>

                      {/* Day breakdown */}
                      <div className={styles.dailyStopsBox}>
                        {heroTemplate.dailyHighlights && heroTemplate.dailyHighlights.length > 0 ? (
                          heroTemplate.dailyHighlights.map((dh) => (
                            <div key={dh.dayNumber} className={styles.dailyStopRow}>
                              <span className={styles.stopDayBadge}>N{dh.dayNumber}</span>
                              <span>
                                <strong>{dh.title}:</strong> {dh.stops}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className={styles.dailyStopRow}>
                            <span className={styles.stopDayBadge}>N1-N3</span>
                            <span>{heroTemplate.subtitle}</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.showcaseActionRow}>
                        <button
                          type="button"
                          className={styles.outlineBtnSm}
                          onClick={() => {
                            if (onApplyTemplateItem) onApplyTemplateItem(heroTemplate);
                            else onApplyTemplate(heroTemplate.id);
                          }}
                        >
                          Xem chi tiết
                        </button>
                        <button
                          type="button"
                          className={styles.applyBtnSm}
                          onClick={() => {
                            if (onApplyTemplateItem) onApplyTemplateItem(heroTemplate);
                            else onApplyTemplate(heroTemplate.id);
                          }}
                        >
                          <Check size={13} />
                          <span>Dùng mẫu này</span>
                        </button>
                      </div>
                    </div>

                    {/* Compact Curated Cards */}
                    {compactList.map((card) => (
                      <div
                        key={card.id}
                        className={styles.compactCard}
                        onClick={() => {
                          if (onApplyTemplateItem) onApplyTemplateItem(card);
                          else onApplyTemplate(card.id);
                        }}
                      >
                        <img
                          src={card.image}
                          alt={card.title}
                          className={styles.compactThumb}
                        />
                        <div className={styles.compactBody}>
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '10.5px',
                                color: '#64748B',
                              }}
                            >
                              <span>
                                {card.timeInfo ||
                                  (card.duration === '2n1d'
                                    ? '2 ngày 1 đêm'
                                    : card.duration === '4n3d'
                                    ? '4 ngày 3 đêm'
                                    : '3 ngày 2 đêm')}
                              </span>
                              <span style={{ color: '#D97706', fontWeight: 700 }}>
                                ★ {card.rating || '4.8'}
                              </span>
                            </div>
                            <div className={styles.compactTitle}>{card.title}</div>
                            <div className={styles.compactDesc}>{card.subtitle}</div>
                          </div>
                          <div className={styles.compactFooter}>
                            <span className={styles.compactPrice}>
                              {card.priceFormatted || '950.000đ'}
                            </span>
                            <span style={{ color: '#0088CC', fontWeight: 600 }}>Chi tiết &gt;</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </>
          ) : null}

          {/* Saved Trips Section */}
          <div className={styles.savedTeaserBox}>
            <div className={styles.savedTeaserHeader}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Bookmark size={14} color="#0088CC" />
                <span>Chuyến đi đã lưu gần đây</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {savedTrips.length > 0 && onClearAllSavedTrips && (
                  <button
                    type="button"
                    onClick={onClearAllSavedTrips}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#E11D48',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Xóa tất cả
                  </button>
                )}
                {savedTrips.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSavedTrips((prev) => !prev)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#0088CC',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {showAllSavedTrips ? 'Thu gọn' : `Xem tất cả (${savedTrips.length})`}
                  </button>
                )}
              </div>
            </div>

            {savedTrips.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: showAllSavedTrips ? '320px' : 'none',
                  overflowY: showAllSavedTrips ? 'auto' : 'visible',
                  paddingRight: showAllSavedTrips ? '4px' : 0,
                }}
              >
                {(showAllSavedTrips ? savedTrips : savedTrips.slice(0, 2)).map((trip) => (
                  <div key={trip.id} className={styles.savedMiniCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={styles.savedCityBadge}>{getInitials(trip.destination)}</div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{trip.destination}</span>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '1px 4px', borderRadius: '3px' }}>Đã lưu</span>
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                          {trip.durationLabel} · {trip.peopleCount} khách · Khởi hành {trip.startDate}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => onOpenSavedTrip && onOpenSavedTrip(trip.id)}
                        style={{
                          background: '#F0F9FF',
                          border: '1px solid #BAE6FD',
                          color: '#0088CC',
                          borderRadius: '5px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Mở lại
                      </button>
                      {onDeleteSavedTrip && (
                        <button
                          type="button"
                          onClick={() => onDeleteSavedTrip(trip.id)}
                          title="Xóa lịch trình này"
                          aria-label="Xóa lịch trình này"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '5px',
                            border: '1px solid #FECDD3',
                            background: '#FFF1F2',
                            color: '#E11D48',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#64748B', textAlign: 'center', padding: '14px 8px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                Chưa có lịch trình nào được lưu. Hãy tạo lịch trình AI đầu tiên của bạn!
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ─── VISTA Platform Page Footer ─── */}
      <footer className={styles.plannerFooter}>
        <div className={styles.footerLeft}>
          <div className={styles.footerLogo}>
            <span style={{ color: '#0088CC', fontWeight: 800 }}>VISTA</span>
            <span style={{ fontWeight: 600 }}> Việt Nam</span>
          </div>
          <span className={styles.footerDivider}>•</span>
          <span>© 2026 VISTA Travel Platform. Thiết kế đồng hành cùng du lịch thông minh Việt Nam.</span>
        </div>
        <div className={styles.footerRight}>
          <a href="#terms">Điều khoản sử dụng</a>
          <span className={styles.footerDivider}>•</span>
          <a href="#privacy">Chính sách bảo mật</a>
          <span className={styles.footerDivider}>•</span>
          <a href="#help">Trung tâm trợ giúp</a>
        </div>
      </footer>

      {/* ─── Destination Picker Modal ─── */}
      {showDestModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowDestModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '520px',
              width: '100%',
              padding: '20px',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.16)',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Chọn điểm đến du lịch
              </div>
              <button
                type="button"
                onClick={() => setShowDestModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                color="#64748B"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Tìm kiếm tỉnh thành (Hà Nội, Đà Nẵng, Phú Quốc...)"
                value={destFilter}
                onChange={(e) => setDestFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', overflowY: 'auto', maxHeight: '320px' }}>
              {(filteredDestinations.length > 0 ? filteredDestinations : allDestinations.slice(0, 20)).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    onChangeDestination(d.nameVi);
                    setShowDestModal(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #E2E8F0',
                    background: destination === d.nameVi ? '#F0F9FF' : '#FFFFFF',
                    color: destination === d.nameVi ? '#0088CC' : '#0F172A',
                    fontWeight: destination === d.nameVi ? 700 : 500,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <MapPin size={13} color="#0088CC" />
                    <span>{d.nameVi}</span>
                  </span>
                  {destination === d.nameVi && <Check size={15} color="#0088CC" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
