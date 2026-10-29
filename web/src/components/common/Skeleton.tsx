import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonBox({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  className = '',
  style = {},
}: SkeletonProps) {
  return (
    <div
      className={`${styles.box} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCircle({
  size = 40,
  className = '',
  style = {},
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`${styles.circle} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  width = '100%',
  lines = 1,
  gap = 8,
  className = '',
}: {
  width?: string | number;
  lines?: number;
  gap?: number;
  className?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, width: '100%' }}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`${styles.text} ${className}`}
          style={{
            width: idx === lines - 1 && lines > 1 ? '70%' : typeof width === 'number' ? `${width}px` : width,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/** Giả lập chính xác cấu trúc Navbar 64px của VISTA */
export function SkeletonNavbar() {
  return (
    <header className={styles.navbarWrapper} aria-busy="true">
      <div className={styles.navbarContainer}>
        {/* Brand Logo Skeleton */}
        <div className={styles.brandGroup}>
          <div className={styles.brandIcon} />
          <div className={styles.brandTextCol}>
            <SkeletonBox width="85px" height="18px" borderRadius="4px" />
            <SkeletonBox width="115px" height="10px" borderRadius="3px" />
          </div>
        </div>

        {/* Navigation items Skeleton */}
        <div className={styles.navLinksGroup}>
          <div className={styles.navPill} style={{ width: '85px' }} />
          <div className={styles.navPill} style={{ width: '110px' }} />
          <div className={styles.navPill} style={{ width: '95px' }} />
          <div className={styles.navPill} style={{ width: '90px' }} />
          <div className={styles.navPill} style={{ width: '80px' }} />
          <div className={styles.navPill} style={{ width: '90px' }} />
        </div>

        {/* Right actions */}
        <div className={styles.navActionsGroup}>
          <SkeletonBox width="36px" height="36px" borderRadius="18px" />
          <SkeletonCircle size={40} />
        </div>
      </div>
    </header>
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.cardItem} aria-hidden="true">
      <div className={styles.cardThumbnail} />
      <div className={styles.cardContent}>
        <div className={styles.cardMetaRow}>
          <SkeletonBox width="70px" height="22px" borderRadius="12px" />
          <SkeletonBox width="50px" height="16px" borderRadius="4px" />
        </div>
        <SkeletonBox width="85%" height="22px" borderRadius="6px" />
        <SkeletonText lines={2} gap={6} />
        <div className={styles.cardFooter}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <SkeletonCircle size={26} />
            <SkeletonCircle size={26} />
            <SkeletonBox width="45px" height="14px" borderRadius="4px" />
          </div>
          <SkeletonBox width="75px" height="32px" borderRadius="16px" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.gridWrapper} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Skeleton trang tổng thể chung */
export function SkeletonUniversalPage() {
  return (
    <div className={styles.fadeIn} style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <SkeletonNavbar />
      <section className={styles.heroSection}>
        <div className={styles.heroBadge} />
        <div className={styles.heroTitle} />
        <div className={styles.heroSubtitle} />
        <div className={styles.searchBarWrapper} />
      </section>

      <div className={styles.filterBarWrapper}>
        <div className={styles.filterPill} style={{ width: '80px' }} />
        <div className={styles.filterPill} style={{ width: '120px' }} />
        <div className={styles.filterPill} style={{ width: '100px' }} />
        <div className={styles.filterPill} style={{ width: '130px' }} />
        <div className={styles.filterPill} style={{ width: '90px' }} />
      </div>

      <SkeletonCardGrid count={6} />
    </div>
  );
}

/** Skeleton chuyên biệt cho Trang Chuyến đi */
export function SkeletonTripsPage() {
  return (
    <div className={styles.fadeIn} style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <SkeletonNavbar />
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '32px 24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <SkeletonBox width="260px" height="34px" borderRadius="8px" style={{ marginBottom: '8px' }} />
            <SkeletonBox width="380px" height="16px" borderRadius="4px" />
          </div>
          <SkeletonBox width="160px" height="44px" borderRadius="24px" />
        </div>

        {/* Tabs switcher */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px' }}>
          <SkeletonBox width="140px" height="36px" borderRadius="18px" />
          <SkeletonBox width="140px" height="36px" borderRadius="18px" />
          <SkeletonBox width="120px" height="36px" borderRadius="18px" />
        </div>
      </div>

      <SkeletonCardGrid count={6} />
    </div>
  );
}

/** Skeleton chuyên biệt cho Trang AI Planner - khớp 100% bố cục trang thật */
export function SkeletonPlannerPage() {
  return (
    <div className={styles.fadeIn} style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <SkeletonNavbar />

      {/* 1. Intro Header matching .introContainer */}
      <section className={styles.plannerIntroSkeleton}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SkeletonBox width="140px" height="14px" borderRadius="4px" />
          <SkeletonBox width="340px" height="32px" borderRadius="8px" />
          <SkeletonBox width="420px" height="16px" borderRadius="4px" />
        </div>
        <SkeletonBox width="140px" height="38px" borderRadius="10px" />
      </section>

      {/* 2. Workspace Grid matching .workspaceContainer (360px & 1fr) */}
      <main className={styles.plannerWorkspaceSkeleton}>
        {/* Left Column — Preferences Card Skeleton */}
        <aside className={styles.plannerFormCardSkeleton}>
          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <SkeletonCircle size={40} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <SkeletonBox width="150px" height="18px" borderRadius="4px" />
              <SkeletonBox width="200px" height="12px" borderRadius="3px" />
            </div>
          </div>

          {/* Group A — Destination & Dates */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SkeletonBox width="110px" height="14px" borderRadius="4px" />
            <SkeletonBox width="100%" height="46px" borderRadius="12px" />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SkeletonBox width="70px" height="14px" borderRadius="4px" />
              <SkeletonBox width="100%" height="44px" borderRadius="10px" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SkeletonBox width="70px" height="14px" borderRadius="4px" />
              <SkeletonBox width="100%" height="44px" borderRadius="10px" />
            </div>
          </div>

          {/* Group B — Styles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <SkeletonBox width="120px" height="14px" borderRadius="4px" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <SkeletonBox height="42px" borderRadius="10px" />
              <SkeletonBox height="42px" borderRadius="10px" />
              <SkeletonBox height="42px" borderRadius="10px" />
              <SkeletonBox height="42px" borderRadius="10px" />
              <SkeletonBox height="42px" borderRadius="10px" />
              <SkeletonBox height="42px" borderRadius="10px" />
            </div>
          </div>

          {/* Generate Button CTA */}
          <SkeletonBox width="100%" height="48px" borderRadius="24px" style={{ marginTop: '8px' }} />
        </aside>

        {/* Right Column — Itinerary Workspace Skeleton */}
        <section className={styles.plannerItinerarySkeleton}>
          {/* Summary Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px 24px', boxShadow: '0 4px 20px rgba(20, 40, 63, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <SkeletonBox width="88px" height="88px" borderRadius="14px" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <SkeletonBox width="260px" height="24px" borderRadius="6px" />
                  <SkeletonBox width="180px" height="14px" borderRadius="4px" />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <SkeletonBox width="75px" height="24px" borderRadius="12px" />
                    <SkeletonBox width="85px" height="24px" borderRadius="12px" />
                    <SkeletonBox width="65px" height="24px" borderRadius="12px" />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <SkeletonBox width="110px" height="38px" borderRadius="10px" />
                <SkeletonBox width="130px" height="38px" borderRadius="10px" />
              </div>
            </div>
          </div>

          {/* Tabs row */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <SkeletonBox width="130px" height="36px" borderRadius="18px" />
            <SkeletonBox width="140px" height="36px" borderRadius="18px" />
            <SkeletonBox width="120px" height="36px" borderRadius="18px" />
          </div>

          {/* Day 1 and Day 2 Timeline */}
          <SkeletonTimeline days={2} />
        </section>
      </main>
    </div>
  );
}

/** Skeleton chuyên biệt cho Trang Bản đồ & GPS */
export function SkeletonMapPage() {
  return (
    <div className={styles.fadeIn} style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <SkeletonNavbar />
      <div className={styles.splitLayout}>
        {/* Left Destination List Sidebar */}
        <aside className={styles.splitSidebar}>
          <SkeletonBox width="100%" height="46px" borderRadius="23px" />
          <div style={{ display: 'flex', gap: '8px', overflowX: 'hidden' }}>
            <SkeletonBox width="75px" height="30px" borderRadius="15px" />
            <SkeletonBox width="80px" height="30px" borderRadius="15px" />
            <SkeletonBox width="70px" height="30px" borderRadius="15px" />
            <SkeletonBox width="90px" height="30px" borderRadius="15px" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                <SkeletonBox width="80px" height="65px" borderRadius="8px" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <SkeletonBox width="70%" height="16px" borderRadius="4px" />
                  <SkeletonBox width="50%" height="12px" borderRadius="3px" />
                  <SkeletonBox width="40%" height="12px" borderRadius="3px" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Map Canvas */}
        <main className={styles.splitMainContent}>
          <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
            <SkeletonBox width="160px" height="38px" borderRadius="19px" />
          </div>
        </main>
      </div>
    </div>
  );
}

/** Skeleton chuyên biệt cho Trang Thủ quỹ */
export function SkeletonTreasuryPage() {
  return (
    <div className={styles.fadeIn} style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <SkeletonNavbar />
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '32px 24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <SkeletonBox width="280px" height="36px" borderRadius="8px" style={{ marginBottom: '8px' }} />
            <SkeletonBox width="350px" height="16px" borderRadius="4px" />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <SkeletonBox width="130px" height="42px" borderRadius="21px" />
            <SkeletonBox width="150px" height="42px" borderRadius="21px" />
          </div>
        </div>
      </div>

      <SkeletonKpiGrid />
      <SkeletonTableRows count={5} />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   SECTION-LEVEL SKELETON COMPONENTS (CHO TỪNG MỤC CỤ THỂ TRONG TRANG)
   ═════════════════════════════════════════════════════════════════════════ */

/** 1. Skeleton thanh dự báo thời tiết lướt ngang */
export function SkeletonWeatherBar({ count = 4 }: { count?: number }) {
  return (
    <div className={`${styles.weatherTrackSkeleton} ${styles.fadeIn}`} aria-label="Đang cập nhật dữ liệu thời tiết...">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.weatherCardSkeleton}>
          <div>
            {/* Top row: City Name & Region */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <SkeletonBox width="120px" height="22px" borderRadius="6px" style={{ marginBottom: '6px' }} />
                <SkeletonBox width="70px" height="14px" borderRadius="10px" />
              </div>
              <SkeletonBox width="55px" height="18px" borderRadius="9px" />
            </div>

            {/* Temp & Icon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0' }}>
              <div>
                <SkeletonBox width="85px" height="38px" borderRadius="8px" style={{ marginBottom: '4px' }} />
                <SkeletonBox width="105px" height="12px" borderRadius="4px" />
              </div>
              <SkeletonCircle size={46} />
            </div>

            {/* Status text */}
            <SkeletonBox width="80%" height="16px" borderRadius="4px" style={{ margin: '14px 0 12px' }} />

            {/* Metrics */}
            <div style={{ display: 'flex', gap: '12px', margin: '12px 0' }}>
              <SkeletonBox width="45%" height="20px" borderRadius="6px" />
              <SkeletonBox width="45%" height="20px" borderRadius="6px" />
            </div>

            {/* Advice Box */}
            <SkeletonBox width="100%" height="42px" borderRadius="10px" style={{ marginTop: '12px' }} />
          </div>

          {/* Button CTA */}
          <SkeletonBox width="100%" height="38px" borderRadius="10px" style={{ marginTop: '20px' }} />
        </div>
      ))}
    </div>
  );
}

/** 2. Skeleton 4 thẻ KPI tài chính Thủ quỹ */
export function SkeletonKpiGrid() {
  return (
    <div className={`${styles.kpiRow} ${styles.fadeIn}`} aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonBox width="110px" height="15px" borderRadius="4px" />
            <SkeletonCircle size={28} />
          </div>
          <SkeletonBox width="150px" height="32px" borderRadius="6px" />
          <SkeletonBox width="65%" height="12px" borderRadius="3px" />
        </div>
      ))}
    </div>
  );
}

/** 3. Skeleton bảng Sổ cái thu chi / Danh sách dữ liệu bảng */
export function SkeletonTableRows({ count = 5 }: { count?: number }) {
  return (
    <div className={`${styles.tableSkeleton} ${styles.fadeIn}`} aria-busy="true">
      <div className={styles.tableCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <SkeletonBox width="200px" height="24px" borderRadius="6px" style={{ marginBottom: '6px' }} />
            <SkeletonBox width="260px" height="13px" borderRadius="4px" />
          </div>
          <SkeletonBox width="120px" height="36px" borderRadius="18px" />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.tableRowItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
              <SkeletonCircle size={40} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <SkeletonBox width="40%" height="17px" borderRadius="4px" />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <SkeletonBox width="80px" height="12px" borderRadius="3px" />
                  <SkeletonBox width="60px" height="12px" borderRadius="3px" />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <SkeletonBox width="110px" height="20px" borderRadius="4px" />
              <SkeletonBox width="70px" height="12px" borderRadius="3px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 4. Skeleton danh sách công việc/nhiệm vụ (Tasks) */
export function SkeletonTaskList({ count = 4 }: { count?: number }) {
  return (
    <div className={`${styles.taskListSkeleton} ${styles.fadeIn}`} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.taskItemSkeleton}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <SkeletonBox width="22px" height="22px" borderRadius="6px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <SkeletonBox width={`${55 + (i % 3) * 15}%`} height="16px" borderRadius="4px" />
              <SkeletonBox width="90px" height="11px" borderRadius="3px" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SkeletonCircle size={28} />
            <SkeletonBox width="20px" height="20px" borderRadius="4px" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 5. Skeleton Lộ trình chi tiết từng ngày (Timeline) */
export function SkeletonTimeline({ days = 2 }: { days?: number }) {
  return (
    <div className={styles.fadeIn} aria-busy="true">
      {Array.from({ length: days }).map((_, dIdx) => (
        <div key={dIdx} className={styles.timelineDaySkeleton}>
          {/* Day Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <SkeletonBox width="80px" height="28px" borderRadius="8px" />
              <SkeletonBox width="160px" height="20px" borderRadius="6px" />
            </div>
            <SkeletonBox width="100px" height="14px" borderRadius="4px" />
          </div>

          {/* Activities */}
          {Array.from({ length: 3 }).map((_, aIdx) => (
            <div key={aIdx} className={styles.timelineItemSkeleton}>
              <div className={styles.timelineDot} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <SkeletonBox width="110px" height="16px" borderRadius="4px" />
                  <SkeletonBox width="75px" height="20px" borderRadius="10px" />
                </div>
                <SkeletonBox width="60%" height="18px" borderRadius="4px" />
                <SkeletonBox width="85%" height="13px" borderRadius="3px" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** 6. Skeleton Sinh lộ trình AI thông minh (AI Generating Workspace) */
export function SkeletonAiGenerating() {
  return (
    <div className={styles.fadeIn} aria-live="polite">
      {/* Banner AI Pulse */}
      <div className={styles.aiPulseBanner}>
        <div className={styles.aiBrainIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '15px' }}>
            Trí tuệ nhân tạo VISTA AI đang tính toán & tối ưu hóa...
          </div>
          <div style={{ color: '#0284c7', fontSize: '13px' }}>
            Đang tổng hợp các điểm tham quan, ẩm thực đặc sản và cân đối ngân sách cho bạn
          </div>
        </div>
      </div>

      {/* Summary card skeleton */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <SkeletonBox width="280px" height="26px" borderRadius="6px" />
          <SkeletonBox width="110px" height="28px" borderRadius="14px" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <SkeletonBox height="60px" borderRadius="10px" />
          <SkeletonBox height="60px" borderRadius="10px" />
          <SkeletonBox height="60px" borderRadius="10px" />
        </div>
      </div>

      {/* Day by Day skeleton */}
      <SkeletonTimeline days={2} />
    </div>
  );
}


