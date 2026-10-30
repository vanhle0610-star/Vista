'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import type { Coordinates, DestinationMarker } from '../types';
import { DestinationThumbnail } from './DestinationThumbnail';
import { getDestinationStats, getDistanceKm } from '../data/destinationStats';
import { IconSearch, IconRoute, IconPin, IconStar, IconHeart, IconClose, IconArrowRight } from './MapIcons';
import styles from './DestinationList.module.css';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

export const REGIONS_PROVINCES = [
  {
    region: 'Miền Bắc',
    provinces: [
      'Hà Nội',
      'Quảng Ninh',
      'Ninh Bình',
      'Lào Cai',
      'Hải Phòng',
      'Điện Biên',
      'Sơn La',
      'Lai Châu',
      'Cao Bằng',
      'Lạng Sơn',
      'Tuyên Quang',
      'Thái Nguyên',
      'Phú Thọ',
      'Bắc Ninh',
      'Hưng Yên',
    ],
  },
  {
    region: 'Miền Trung & Tây Nguyên',
    provinces: [
      'Đà Nẵng',
      'Thừa Thiên Huế',
      'Quảng Nam',
      'Khánh Hòa',
      'Lâm Đồng',
      'Đắk Lắk',
      'Gia Lai',
      'Thanh Hóa',
      'Nghệ An',
      'Hà Tĩnh',
      'Quảng Trị',
      'Quảng Ngãi',
      'Bình Định',
      'Phú Yên',
      'Ninh Thuận',
      'Bình Thuận',
      'Kon Tum',
    ],
  },
  {
    region: 'Miền Nam & Miền Tây',
    provinces: [
      'TP. Hồ Chí Minh',
      'Cần Thơ',
      'Kiên Giang',
      'Tây Ninh',
      'Đồng Nai',
      'Vĩnh Long',
      'Đồng Tháp',
      'An Giang',
      'Cà Mau',
      'Bà Rịa - Vũng Tàu',
      'Bến Tre',
      'Tiền Giang',
    ],
  },
];

export function filterDestinations(
  destinations: DestinationMarker[],
  search: string,
  category: string,
  province: string = 'all',
  userCoords?: Coordinates | null,
  nearbyRadiusKm?: number | null
) {
  return destinations.filter((d) => {
    // Province filter
    if (province !== 'all') {
      const provNorm = normalize(d.province);
      const targetNorm = normalize(province);
      if (!provNorm.includes(targetNorm) && !targetNorm.includes(provNorm)) {
        return false;
      }
    }

    // Category filter
    if (category !== 'all' && d.category !== category) {
      return false;
    }

    // Search filter
    if (
      search.trim() &&
      !normalize(d.name + ' ' + d.province + ' ' + d.description).includes(
        normalize(search.trim())
      )
    ) {
      return false;
    }

    // Nearby GPS Radius filter
    if (nearbyRadiusKm && userCoords) {
      const dist = getDistanceKm(userCoords.latitude, userCoords.longitude, d.latitude, d.longitude);
      if (dist > nearbyRadiusKm) return false;
    }

    return true;
  });
}

interface Props {
  destinations: DestinationMarker[];
  filtered: DestinationMarker[];
  selectedId?: string | null;
  onSelect: (d: DestinationMarker) => void;
  search: string;
  category: string;
  selectedProvince?: string;
  userCoords?: Coordinates | null;
  nearbyRadiusKm?: number | null;
  onSearch: (s: string) => void;
  onCategory: (s: string) => void;
  onProvinceChange?: (prov: string) => void;
  onNearbyRadiusChange?: (radius: number | null) => void;
  onDirections?: (d: DestinationMarker) => void;
  onAddStop?: (d: DestinationMarker) => void;
  directionsOpen?: boolean;
  onToggleDirections?: () => void;
  onCollapseSidebar?: () => void;
}

export function DestinationList({
  destinations,
  filtered,
  selectedId,
  onSelect,
  search,
  category,
  selectedProvince = 'all',
  userCoords,
  nearbyRadiusKm,
  onSearch,
  onCategory,
  onProvinceChange,
  onNearbyRadiusChange,
  onDirections,
  onAddStop,
  directionsOpen,
  onToggleDirections,
  onCollapseSidebar,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<'best' | 'nearest' | 'rating' | 'name'>('best');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    try {
      const saved = localStorage.getItem('vista_favorites');
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const favorites = parsed.filter((id): id is string => typeof id === 'string');
          queueMicrotask(() => { if (alive) setFavorites(favorites); });
        }
      }
    } catch {
      // ignore
    }
    return () => { alive = false; };
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('vista_favorites', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  useEffect(() => {
    if (!selectedId) return;
    const list = listRef.current;
    const card = list?.querySelector(`[data-destination-id="${CSS.escape(selectedId)}"]`);
    if (!list || !card) return;
    const offset = card.getBoundingClientRect().top - list.getBoundingClientRect().top;
    list.scrollTo({ top: list.scrollTop + offset - 40, behavior: 'smooth' });
  }, [selectedId]);

  // Province destination counts
  const provinceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    destinations.forEach((d) => {
      counts[d.province] = (counts[d.province] || 0) + 1;
    });
    return counts;
  }, [destinations]);

  const categories = useMemo(() => {
    return [...new Set(destinations.map((d) => d.category))];
  }, [destinations]);

  // Sorted list based on current sort criteria
  const sortedList = useMemo(() => {
    const list = [...filtered];
    if (sortBy === 'nearest' && userCoords) {
      list.sort((a, b) => {
        const distA = getDistanceKm(userCoords.latitude, userCoords.longitude, a.latitude, a.longitude);
        const distB = getDistanceKm(userCoords.latitude, userCoords.longitude, b.latitude, b.longitude);
        return distA - distB;
      });
    } else if (sortBy === 'rating') {
      list.sort((a, b) => {
        const statsA = getDestinationStats(a);
        const statsB = getDestinationStats(b);
        return parseFloat(statsB.rating) - parseFloat(statsA.rating);
      });
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }
    return list;
  }, [filtered, sortBy, userCoords]);

  return (
    <div className={styles.root}>
      {/* ─── HEADER ─── */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>Khám phá quanh bạn</h2>
          <p className={styles.subtitle}>
            {selectedProvince !== 'all' ? selectedProvince : 'Đà Nẵng'} có gì thú vị?
          </p>
        </div>

        <div className={styles.headerActions}>
          {onCollapseSidebar && (
            <button
              type="button"
              className={styles.btnCollapse}
              onClick={onCollapseSidebar}
              title="Thu gọn bảng điều khiển"
              aria-label="Thu gọn sidebar"
            >
              ❮
            </button>
          )}
        </div>
      </div>

      {/* ─── CONTROLS: SEARCH & FILTERS ─── */}
      <div className={styles.controlsBar}>
        {/* Row 1: Search Input + Route Toggle */}
        <div className={styles.searchRow}>
          <div className={styles.searchBar}>
            <IconSearch size={15} className={styles.searchIconSvg} />
            <input
              className={styles.searchInput}
              aria-label="Tìm kiếm địa điểm"
              placeholder={
                selectedProvince !== 'all'
                  ? `Tìm tại ${selectedProvince}…`
                  : 'Tìm địa danh, thành phố, trải nghiệm…'
              }
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className={styles.btnClearSearch}
                onClick={() => onSearch('')}
                title="Xóa tìm kiếm"
                aria-label="Xóa tìm kiếm"
              >
                <IconClose size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          {onToggleDirections && (
            <button
              type="button"
              className={`${styles.btnRouteToggle} ${directionsOpen ? styles.btnRouteToggleActive : ''}`}
              onClick={onToggleDirections}
              title={directionsOpen ? 'Đang mở chế độ Lộ trình' : 'Chuyển sang chế độ Lập lộ trình'}
            >
              <IconRoute size={14} />
              <span>Lộ trình</span>
            </button>
          )}
        </div>

        {/* Row 2: 3 Balanced Dropdown Filters */}
        <div className={styles.filterStrip}>
          {/* City / Province Selector */}
          <select
            className={`${styles.compactSelect} ${selectedProvince !== 'all' ? styles.compactSelectActive : ''}`}
            value={selectedProvince}
            onChange={(e) => onProvinceChange?.(e.target.value)}
            aria-label="Khoanh vùng theo thành phố"
          >
            <option value="all">Toàn quốc</option>
            {REGIONS_PROVINCES.map((reg) => (
              <optgroup key={reg.region} label={reg.region}>
                {reg.provinces.map((prov) => {
                  const count = provinceCounts[prov] || 0;
                  if (count === 0) return null;
                  return (
                    <option key={prov} value={prov}>
                      {prov} ({count})
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>

          {/* Category Dropdown */}
          <select
            className={`${styles.compactSelect} ${category !== 'all' ? styles.compactSelectActive : ''}`}
            value={category}
            onChange={(e) => onCategory(e.target.value)}
            aria-label="Lọc theo Danh mục"
          >
            <option value="all">Danh mục</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            className={styles.compactSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sắp xếp kết quả"
          >
            <option value="best">Phù hợp</option>
            {userCoords && <option value="nearest">Gần tôi</option>}
            <option value="rating">Đánh giá cao</option>
            <option value="name">Tên A-Z</option>
          </select>

          {/* Reset button if active */}
          {(search || selectedProvince !== 'all' || category !== 'all' || nearbyRadiusKm !== null) && (
            <button
              type="button"
              className={styles.btnResetIcon}
              onClick={() => {
                onSearch('');
                onProvinceChange?.('all');
                onCategory('all');
                onNearbyRadiusChange?.(null);
              }}
              title="Đặt lại bộ lọc"
              aria-label="Đặt lại bộ lọc"
            >
              <IconClose size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* ─── SINGLE SMOOTH SCROLLABLE LIST ─── */}
      <div className={styles.list} ref={listRef}>
        {sortedList.length ? (
          sortedList.map((d) => {
            const isSelected = d.id === selectedId;
            const dist = userCoords
              ? getDistanceKm(userCoords.latitude, userCoords.longitude, d.latitude, d.longitude)
              : null;
            const stats = getDestinationStats(d);
            const isFavorite = favorites.includes(d.id);

            return (
              <div
                key={d.id}
                data-destination-id={d.id}
                className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                onClick={() => onSelect(d)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(d)}
                aria-pressed={isSelected}
                aria-label={`Chọn ${d.name}`}
              >
                {/* Header: Thumbnail + Meta */}
                <div className={styles.cardHeader}>
                  <div className={styles.thumbWrapper}>
                    <DestinationThumbnail destination={d} className={styles.thumbnail} />
                    <button
                      type="button"
                      className={`${styles.btnFavInside} ${isFavorite ? styles.btnFavInsideActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(d.id);
                      }}
                      title={isFavorite ? 'Bỏ lưu yêu thích' : 'Lưu vào yêu thích'}
                      aria-label="Yêu thích"
                    >
                      <IconHeart size={13} active={isFavorite} />
                    </button>
                  </div>

                  <div className={styles.cardMeta}>
                    <div className={styles.titleRow}>
                      <h3 className={styles.cardTitle} title={d.name}>{d.name}</h3>
                    </div>

                    <div className={styles.categoryDistRow}>
                      <span className={styles.categoryText}>{d.category}</span>
                      {dist !== null && (
                        <span className={styles.distText}>
                          · Cách {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist} km`}
                        </span>
                      )}
                    </div>

                    <div className={styles.ratingRow}>
                      <IconStar size={12} className={styles.starIconSvg} />
                      <strong className={styles.ratingScore}>{stats.rating}</strong>
                      <span className={styles.reviewCount}>({stats.reviewCount} đánh giá)</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className={styles.cardDescription}>{d.description}</p>

                {/* Footer Actions */}
                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={`${styles.btnMapStatus} ${isSelected ? styles.btnMapStatusActive : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(d);
                    }}
                  >
                    <IconPin size={12} className={styles.statusPinSvg} />
                    <span>{isSelected ? 'Đang chọn trên bản đồ' : 'Xem trên bản đồ'}</span>
                  </button>

                  <div className={styles.footerActions}>
                    {directionsOpen && onAddStop && (
                      <button
                        type="button"
                        className={styles.btnAddWaypoint}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddStop(d);
                        }}
                        title="Thêm địa điểm này vào danh sách điểm dừng trước điểm đến cuối"
                      >
                        + Thêm điểm dừng
                      </button>
                    )}

                    <button
                      type="button"
                      className={styles.btnRoute}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDirections) {
                          onDirections(d);
                        } else {
                          onSelect(d);
                        }
                      }}
                      title="Chỉ đường đến địa điểm này"
                    >
                      <span>Chỉ đường</span>
                      <IconArrowRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles.empty}>
            <IconSearch size={32} className={styles.emptyIcon} />
            <strong>Không tìm thấy địa điểm phù hợp</strong>
            <p>Hãy thử tìm kiếm với từ khóa khác hoặc đặt lại bộ lọc.</p>
            <button
              type="button"
              className={styles.btnResetAll}
              onClick={() => {
                onSearch('');
                onCategory('all');
                onProvinceChange?.('all');
                onNearbyRadiusChange?.(null);
              }}
            >
              Xem tất cả {destinations.length} địa điểm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
