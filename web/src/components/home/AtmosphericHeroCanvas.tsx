'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Wallet,
  ArrowRight,
  ChevronDown,
  Sun,
  CloudRain,
  Cloud,
  Moon,
  Sparkles
} from 'lucide-react';
import styles from './atmospheric-hero-canvas.module.css';

export type WeatherMoodKey = 'sun' | 'rain' | 'cloud' | 'night';

interface WeatherMoodMeta {
  key: WeatherMoodKey;
  label: string;
  icon: typeof Sun;
  headline: string;
  subheadline: string;
  locationName: string;
  gpsCoords: string;
  weatherState: string;
  bgImage: string;
  suggestedDestinations: string[];
}

const WEATHER_MOODS: Record<WeatherMoodKey, WeatherMoodMeta> = {
  sun: {
    key: 'sun',
    label: 'Nắng Vàng',
    icon: Sun,
    headline: 'Khi Đất Nước Đón Nắng Ấm',
    subheadline: 'Những cung đường rực rỡ của nắng gió địa đầu và biển ngọc miền Trung.',
    locationName: 'Đỉnh Lũng Cú • Cực Bắc Tổ Quốc',
    gpsCoords: '23°21\'49"N 105°18\'58"E',
    weatherState: '24°C • Nắng chan hòa',
    bgImage: '/hero/hero-nang-vang.jpg',
    suggestedDestinations: ['Đà Nẵng', 'Phú Quốc', 'Lũng Cú', 'Ninh Bình'],
  },
  rain: {
    key: 'rain',
    label: 'Mưa Phùn',
    icon: CloudRain,
    headline: 'Khung Cửa Trầm Ngâm Chiều Mưa',
    subheadline: 'Tìm về sự an yên giữa tiếng mưa rào đất Cố Đô hay ngõ phố cổ kính.',
    locationName: 'Đại Nội Hoàng Thành • Cố Đô Huế',
    gpsCoords: '16°28\'02"N 107°34\'44"E',
    weatherState: '21°C • Mưa lất phất se lạnh',
    bgImage: '/hero/hero-mua-phun.jpg',
    suggestedDestinations: ['Thừa Thiên Huế', 'Hà Nội', 'Đà Lạt', 'Hội An'],
  },
  cloud: {
    key: 'cloud',
    label: 'Săn Mây',
    icon: Cloud,
    headline: 'Bay Giữa Biển Mây Đại Ngàn',
    subheadline: 'Lạc bước trong thung lũng sương mờ bồng bềnh của nóc nhà Đông Dương.',
    locationName: 'Đỉnh Fansipan • Sa Pa',
    gpsCoords: '22°18\'15"N 103°46\'31"E',
    weatherState: '14°C • Biển mây dày đặc',
    bgImage: '/hero/hero-san-may.jpg',
    suggestedDestinations: ['Sa Pa', 'Tà Xùa', 'Mộc Châu', 'Tam Đảo'],
  },
  night: {
    key: 'night',
    label: 'Đêm Lên Đèn',
    icon: Moon,
    headline: 'Dải Sao Hoa Đăng Phố Hội',
    subheadline: 'Hàng ngàn ánh đèn hoa đăng thắp sáng dòng sông Hoài thơ mộng.',
    locationName: 'Sông Hoài • Phố Cổ Hội An',
    gpsCoords: '15°52\'38"N 108°19\'33"E',
    weatherState: '23°C • Đêm trăng gió nhẹ',
    bgImage: '/hero/hero-dem-hoa-dang.jpg',
    suggestedDestinations: ['Hội An', 'Hạ Long', 'Nha Trang', 'TP. Hồ Chí Minh'],
  },
};

const DURATION_OPTIONS = [
  { val: '2n1d', label: '2 Ngày 1 Đêm', sub: 'Cuối tuần thư thái' },
  { val: '3n2d', label: '3 Ngày 2 Đêm', sub: 'Lựa chọn phổ biến nhất' },
  { val: '4n3d', label: '4 Ngày 3 Đêm', sub: 'Khám phá sâu bản địa' },
];

const BUDGET_OPTIONS = [
  { val: 'economy', label: 'Tiết kiệm & Phượt', sub: '~600k – 1.000k / ngày' },
  { val: 'standard', label: 'Tiêu chuẩn & Tiện nghi', sub: '~1.500k – 2.500k / ngày' },
  { val: 'luxury', label: 'Nghỉ dưỡng Cao cấp', sub: '~3.500k+ / ngày' },
];

const DESTINATIONS_LIST = [
  { name: 'Đà Nẵng', region: 'Miền Trung' },
  { name: 'Thừa Thiên Huế', region: 'Miền Trung' },
  { name: 'Phố Cổ Hội An', region: 'Miền Trung' },
  { name: 'Sa Pa', region: 'Miền Bắc' },
  { name: 'Hà Giang', region: 'Miền Bắc' },
  { name: 'Ninh Bình', region: 'Miền Bắc' },
  { name: 'Hà Nội', region: 'Miền Bắc' },
  { name: 'Đà Lạt', region: 'Tây Nguyên' },
  { name: 'Đảo Ngọc Phú Quốc', region: 'Miền Nam' },
];

export function AtmosphericHeroCanvas() {
  const [activeMood, setActiveMood] = useState<WeatherMoodKey>('sun');
  const [selectedDest, setSelectedDest] = useState('Đà Nẵng');
  const [selectedDuration, setSelectedDuration] = useState('3n2d');
  const [selectedBudget, setSelectedBudget] = useState('standard');
  const [activePopover, setActivePopover] = useState<'dest' | 'duration' | 'budget' | null>(null);

  // 3D Mouse Parallax
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 0, y: 0 });
  }, []);

  const currentMoodData = WEATHER_MOODS[activeMood];
  const curDurationObj = DURATION_OPTIONS.find((d) => d.val === selectedDuration) || DURATION_OPTIONS[1];
  const curBudgetObj = BUDGET_OPTIONS.find((b) => b.val === selectedBudget) || BUDGET_OPTIONS[1];

  // Overlay class
  const overlayClass =
    activeMood === 'sun' ? styles.overlaySun :
      activeMood === 'rain' ? styles.overlayRain :
        activeMood === 'cloud' ? styles.overlayCloud :
          styles.overlayNight;

  return (
    <section
      ref={heroRef}
      className={styles.heroCanvasWrapper}
      id="hero"
      aria-label="VISTA Atmospheric Canvas"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Layer with Smooth Transition & Parallax */}
      <div
        className={styles.canvasBgLayer}
        style={{
          backgroundImage: `url(${currentMoodData.bgImage})`,
          transform: `scale(1.05) translate3d(${mousePos.x * -16}px, ${mousePos.y * -10}px, 0)`,
        }}
      />

      {/* Atmospheric Ambient Lighting Overlay */}
      <div className={`${styles.ambientOverlay} ${overlayClass}`} />

      {/* Dynamic Atmospheric Particle FX Layer */}
      <div className={styles.particleCanvasLayer}>
        {/* Rain Streaks */}
        {activeMood === 'rain' && (
          <>
            {[...Array(14)].map((_, i) => (
              <span
                key={i}
                className={styles.rainDropStreak}
                style={{
                  left: `${(i * 7.2) + 2}%`,
                  animationDuration: `${0.75 + (i % 4) * 0.15}s`,
                  animationDelay: `${(i % 5) * 0.18}s`,
                }}
              />
            ))}
          </>
        )}

        {/* Solar Flare */}
        {activeMood === 'sun' && <div className={styles.solarFlareGlow} />}

        {/* Cloud Mist */}
        {activeMood === 'cloud' && <div className={styles.cloudMistFlow} />}

        {/* Night Lantern Embers */}
        {activeMood === 'night' && (
          <>
            {[...Array(10)].map((_, i) => (
              <span
                key={i}
                className={styles.lanternEmber}
                style={{
                  left: `${15 + (i * 8)}%`,
                  animationDuration: `${6 + (i % 4) * 2}s`,
                  animationDelay: `${i * 0.8}s`,
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Stage Container */}
      <div className={styles.stageContainer}>
        {/* 4 Mùa / Weather Mood Selector */}
        <div className={styles.moodSelectorRow} role="tablist" aria-label="Chọn thời tiết du lịch">
          {(Object.keys(WEATHER_MOODS) as WeatherMoodKey[]).map((key) => {
            const m = WEATHER_MOODS[key];
            const Icon = m.icon;
            const isActive = activeMood === key;

            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.moodTabBtn} ${isActive ? styles.moodTabBtnActive : ''}`}
                onClick={() => {
                  setActiveMood(key);
                  setSelectedDest(m.suggestedDestinations[0]);
                }}
              >
                <Icon size={14} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cinematic Editorial Headline (Tinh gọn, Không tiêu đề sáo rỗng) */}
        <div className={styles.headlineWrap}>
          <h1 className={styles.headlineMain}>
            {currentMoodData.headline}
          </h1>
          <p className={styles.headlineSub}>
            {currentMoodData.subheadline}
          </p>
        </div>

        {/* Smart Atmospheric Travel Console (Frosted Glass Floating Capsule) */}
        <div
          className={`${styles.consoleCard} ${styles['consoleCard_' + activeMood]}`}
          style={{
            transform: `perspective(900px) rotateX(${mousePos.y * -2.5}deg) rotateY(${mousePos.x * 3}deg)`,
          }}
        >
          {/* Field 1: Destination */}
          <div
            className={styles.consoleField}
            onClick={() => setActivePopover(activePopover === 'dest' ? null : 'dest')}
          >
            <div className={styles.fieldHeader}>
              <MapPin size={13} className={styles.fieldIcon} />
              <span className={styles.consoleFieldLabel}>Điểm đến</span>
            </div>
            <div className={styles.fieldValueRow}>
              <span className={styles.consoleFieldValue}>{selectedDest}</span>
              <ChevronDown size={13} className={styles.chevronIcon} />
            </div>

            {/* Destination Popover */}
            {activePopover === 'dest' && (
              <div className={styles.fieldPopover} onClick={(e) => e.stopPropagation()}>
                {DESTINATIONS_LIST.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    className={`${styles.popoverOptionItem} ${selectedDest === d.name ? styles.popoverOptionItemActive : ''}`}
                    onClick={() => {
                      setSelectedDest(d.name);
                      setActivePopover(null);
                    }}
                  >
                    <span className={styles.popoverOptionName}>{d.name}</span>
                    <span className={styles.popoverOptionSub}>{d.region}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider 1 */}
          <div className={styles.fieldDivider} />

          {/* Field 2: Duration */}
          <div
            className={styles.consoleField}
            onClick={() => setActivePopover(activePopover === 'duration' ? null : 'duration')}
          >
            <div className={styles.fieldHeader}>
              <Calendar size={13} className={styles.fieldIcon} />
              <span className={styles.consoleFieldLabel}>Thời lượng</span>
            </div>
            <div className={styles.fieldValueRow}>
              <span className={styles.consoleFieldValue}>{curDurationObj.label}</span>
              <ChevronDown size={13} className={styles.chevronIcon} />
            </div>

            {/* Duration Popover */}
            {activePopover === 'duration' && (
              <div className={styles.fieldPopover} onClick={(e) => e.stopPropagation()}>
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    className={`${styles.popoverOptionItem} ${selectedDuration === opt.val ? styles.popoverOptionItemActive : ''}`}
                    onClick={() => {
                      setSelectedDuration(opt.val);
                      setActivePopover(null);
                    }}
                  >
                    <span className={styles.popoverOptionName}>{opt.label}</span>
                    <span className={styles.popoverOptionSub}>{opt.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider 2 */}
          <div className={styles.fieldDivider} />

          {/* Field 3: Budget */}
          <div
            className={styles.consoleField}
            onClick={() => setActivePopover(activePopover === 'budget' ? null : 'budget')}
          >
            <div className={styles.fieldHeader}>
              <Wallet size={13} className={styles.fieldIcon} />
              <span className={styles.consoleFieldLabel}>Ngân sách</span>
            </div>
            <div className={styles.fieldValueRow}>
              <span className={styles.consoleFieldValue}>{curBudgetObj.label.split('&')[0].trim()}</span>
              <ChevronDown size={13} className={styles.chevronIcon} />
            </div>

            {/* Budget Popover */}
            {activePopover === 'budget' && (
              <div className={styles.fieldPopover} onClick={(e) => e.stopPropagation()}>
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    className={`${styles.popoverOptionItem} ${selectedBudget === opt.val ? styles.popoverOptionItemActive : ''}`}
                    onClick={() => {
                      setSelectedBudget(opt.val);
                      setActivePopover(null);
                    }}
                  >
                    <span className={styles.popoverOptionName}>{opt.label}</span>
                    <span className={styles.popoverOptionSub}>{opt.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Action Button (Sleek Floating Pill) */}
          <Link
            href={`/planner?dest=${encodeURIComponent(selectedDest)}&duration=${selectedDuration}`}
            className={`${styles.btnExplore} ${styles['btnExplore_' + activeMood]}`}
          >
            <span>Khám phá</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Quick Destination Chips */}
        <div className={styles.quickDestRow}>
          <span className={styles.quickDestLabel}>Gợi ý theo thời tiết:</span>
          {currentMoodData.suggestedDestinations.map((city) => (
            <button
              key={city}
              type="button"
              className={styles.quickDestChip}
              onClick={() => setSelectedDest(city)}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Live Telemetry Bar */}
      <div className={styles.bottomTelemetryBar}>
        <div className={styles.telemetryLeft}>
          <div className={styles.pulseDot} />
          <span>{currentMoodData.gpsCoords}</span>
          <span>•</span>
          <span>{currentMoodData.locationName}</span>
        </div>
        <div className={styles.telemetryRight}>
          <span>{currentMoodData.weatherState}</span>
          <span>•</span>
          <span>Cập nhật khí tượng thực địa VISTA</span>
        </div>
      </div>
    </section>
  );
}
