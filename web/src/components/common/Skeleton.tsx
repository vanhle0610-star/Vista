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

/** Skeleton chuyên biệt cho Trang AI Planner */
export function SkeletonPlannerPage() {
  return (
    <div className={styles.fadeIn} style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <SkeletonNavbar />
      <div className={styles.splitLayout}>
        {/* Left Form Sidebar */}
        <aside className={styles.splitSidebar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <SkeletonCircle size={36} />
            <div>
              <SkeletonBox width="160px" height="20px" borderRadius="4px" style={{ marginBottom: '6px' }} />
              <SkeletonBox width="200px" height="12px" borderRadius="3px" />
            </div>
          </div>

          <SkeletonBox width="100%" height="48px" borderRadius="12px" />
          <SkeletonBox width="100%" height="48px" borderRadius="12px" />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <SkeletonBox width="50%" height="44px" borderRadius="10px" />
            <SkeletonBox width="50%" height="44px" borderRadius="10px" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <SkeletonBox width="120px" height="16px" borderRadius="4px" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <SkeletonBox width="70px" height="32px" borderRadius="16px" />
              <SkeletonBox width="85px" height="32px" borderRadius="16px" />
              <SkeletonBox width="65px" height="32px" borderRadius="16px" />
              <SkeletonBox width="90px" height="32px" borderRadius="16px" />
            </div>
          </div>

          <SkeletonBox width="100%" height="52px" borderRadius="26px" style={{ marginTop: 'auto' }} />
        </aside>

        {/* Right Canvas/Itinerary Skeleton */}
        <main className={styles.splitMainContent}>
          <div style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '860px' }}>
            <SkeletonBox width="300px" height="28px" borderRadius="8px" />
            <SkeletonBox width="500px" height="16px" borderRadius="4px" />
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              <SkeletonBox width="100%" height="180px" borderRadius="16px" />
              <SkeletonBox width="100%" height="180px" borderRadius="16px" />
            </div>
            <SkeletonBox width="100%" height="240px" borderRadius="16px" style={{ marginTop: '12px' }} />
          </div>
        </main>
      </div>
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

      {/* KPI Cards */}
      <div className={styles.kpiRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.kpiCard}>
            <SkeletonBox width="90px" height="14px" borderRadius="4px" />
            <SkeletonBox width="140px" height="30px" borderRadius="6px" />
            <SkeletonBox width="70%" height="12px" borderRadius="3px" />
          </div>
        ))}
      </div>

      {/* Ledger Table Skeleton */}
      <div className={styles.tableSkeleton}>
        <div className={styles.tableCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <SkeletonBox width="180px" height="24px" borderRadius="6px" />
            <SkeletonBox width="100px" height="32px" borderRadius="16px" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.tableRowItem}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <SkeletonCircle size={36} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <SkeletonBox width="160px" height="16px" borderRadius="4px" />
                  <SkeletonBox width="110px" height="12px" borderRadius="3px" />
                </div>
              </div>
              <SkeletonBox width="100px" height="20px" borderRadius="4px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
