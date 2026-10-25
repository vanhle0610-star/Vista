'use client';

import { useEffect, useRef } from 'react';
import type { DestinationMarker } from '../types';
import { DestinationThumbnail } from './DestinationThumbnail';
import { MapIcon } from './MapIcon';
import styles from './DestinationList.module.css';

const featuredIds = ['dest-01', 'dest-04', 'dest-06'];
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
export function filterDestinations(
  destinations: DestinationMarker[],
  search: string,
  category: string,
  featured: boolean,
) {
  return destinations
    .filter(
      (d) =>
        (!featured || featuredIds.includes(d.id)) &&
        (category === 'all' || d.category === category) &&
        normalize(d.name + ' ' + d.province + ' ' + d.description).includes(
          normalize(search.trim()),
        ),
    )
    .sort((a, b) => {
      const rank = (id: string) => {
        const index = featuredIds.indexOf(id);
        return index < 0 ? featuredIds.length : index;
      };
      return rank(a.id) - rank(b.id);
    });
}
interface Props {
  destinations: DestinationMarker[];
  filtered: DestinationMarker[];
  selectedId?: string | null;
  onSelect: (d: DestinationMarker) => void;
  search: string;
  category: string;
  featured: boolean;
  onSearch: (s: string) => void;
  onCategory: (s: string) => void;
  onFeatured: (s: boolean) => void;
  showFeatured?: boolean;
}
export function DestinationList({
  destinations,
  filtered,
  selectedId,
  onSelect,
  search,
  category,
  featured,
  onSearch,
  onCategory,
  onFeatured,
  showFeatured = true,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedId) return;
    const list = listRef.current;
    const card = list?.querySelector(`[data-destination-id="${CSS.escape(selectedId)}"]`);
    if (!list || !card) return;
    const offset = card.getBoundingClientRect().top - list.getBoundingClientRect().top;
    list.scrollTo({ top: list.scrollTop + offset, behavior: 'smooth' });
  }, [selectedId]);
  const categories = [...new Set(destinations.map((d) => d.category))];
  return (
    <div className={styles.root}>
      <div className={styles.tabs} role="group" aria-label="Nhóm điểm đến">
        {showFeatured && <button
          aria-pressed={featured}
          className={featured ? styles.activeTab : ''}
          onClick={() => onFeatured(true)}
        >
          <MapIcon name="pin" size={19} />
          Nổi bật
        </button>}
        <button
          aria-pressed={!featured}
          className={!featured ? styles.activeTab : ''}
          onClick={() => onFeatured(false)}
        >
          Tất cả điểm đến <span>{destinations.length}</span>
        </button>
      </div>
      <div className={styles.filters}>
        <label className={styles.search}>
          <MapIcon name="search" size={17} />
          <input
            aria-label="Tìm điểm đến"
            placeholder="Tìm địa điểm, tỉnh thành…"
            value={search}
            onChange={(e) => {
              onSearch(e.target.value);
              if (e.target.value) onFeatured(false);
            }}
          />
        </label>
        <label className={styles.categoryLabel}>
          Loại hình
          <select
            aria-label="Lọc loại hình"
            value={category}
            onChange={(e) => {
              onCategory(e.target.value);
              onFeatured(false);
            }}
          >
            <option value="all">Tất cả loại hình</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.results} aria-live="polite">
        {filtered.length} điểm đến{search && ' phù hợp'}
      </div>
      <div className={styles.list} ref={listRef}>
        {filtered.length ? (
          filtered.map((d) => (
            <button
              key={d.id}
              data-destination-id={d.id}
              className={`${styles.card} ${d.id === selectedId ? styles.selected : ''}`}
              onClick={() => onSelect(d)}
              aria-pressed={d.id === selectedId}
              aria-label={`Chọn ${d.name}`}
            >
              <DestinationThumbnail
                destination={d}
                className={styles.thumbnail}
              />
              <span className={styles.cardBody}>
                <strong>{d.name}</strong>
                <span className={styles.province}>
                  <MapIcon name="pin" size={14} />
                  {d.province}
                </span>
                <span className={styles.category}>{d.category}</span>
                <span className={styles.description}>{d.description}</span>
              </span>
              <span className={styles.chevron}>
                <MapIcon name="chevron" size={15} />
              </span>
            </button>
          ))
        ) : (
          <div className={styles.empty}>
            <MapIcon name="search" size={28} />
            <strong>Chưa tìm thấy điểm đến</strong>
            <p>Thử tên khác hoặc bỏ bộ lọc.</p>
            <button
              onClick={() => {
                onSearch('');
                onCategory('all');
                onFeatured(false);
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
