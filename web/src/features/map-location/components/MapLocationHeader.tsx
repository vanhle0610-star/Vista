'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapIcon } from './MapIcon';
import styles from './MapLocationHeader.module.css';

const links = [
  { href: '/', label: 'Trang chủ' },
  { href: '/map', label: 'Bản đồ khám phá' },
  { href: '/dev/map-location', label: 'Thử nghiệm GPS' },
  { href: '/dashboard', label: 'Quản trị' },
];

export function MapLocationHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="VISTA — Trang chủ"
        >
          <span className={styles.logo}>
            <MapIcon name="globe" size={28} />
          </span>
          <span className={styles.wordmark}>
            <strong>VISTA</strong>
            <span>
              VIETNAM SMART
              <br />
              TRAVEL
            </span>
          </span>
        </Link>
        <nav
          id="map-navigation"
          className={`${styles.nav} ${isMenuOpen ? styles.open : ''}`}
          aria-label="Điều hướng VISTA"
        >
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? styles.active : undefined}
              aria-current={pathname === href ? 'page' : undefined}
              onClick={() => setIsMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <Link href="/login" className={styles.login}>
            <MapIcon name="user" size={18} />
            <span>Đăng nhập</span>
          </Link>
          <button
            className={styles.menu}
            aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-controls="map-navigation"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <MapIcon name={isMenuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  );
}
