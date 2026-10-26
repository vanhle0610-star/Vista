'use client';

import type { Coordinates, DestinationMarker } from '../types';
import Link from 'next/link';
import { DestinationThumbnail } from './DestinationThumbnail';
import { getDestinationStats, getDistanceKm } from '../data/destinationStats';
import { IconStar, IconPin, IconRoute, IconClose } from './MapIcons';
import styles from './DestinationCard.module.css';

export function DestinationCard({
  destination,
  userLocation,
  onClose,
  onDirections,
  onAddToTrip,
}: {
  destination: DestinationMarker;
  userLocation?: Coordinates | null;
  onClose?: () => void;
  onDirections?: () => void;
  onAddToTrip?: () => void;
}) {
  const stats = getDestinationStats(destination);
  const dist = userLocation
    ? getDistanceKm(userLocation.latitude, userLocation.longitude, destination.latitude, destination.longitude)
    : null;

  return (
    <article className={styles.card} aria-label={`Chi tiết ${destination.name}`}>
      {/* ─── Landscape Cover Image with Floating Chips ─── */}
      <div className={styles.coverWrapper}>
        <DestinationThumbnail
          key={destination.id}
          destination={destination}
          className={styles.coverImage}
        />
        {/* Category Badge Pill on Bottom-Left of Image */}
        <span className={styles.categoryBadge}>{destination.category}</span>

        {/* Circular Dark Close Button on Top-Right */}
        {onClose && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng chi tiết"
          >
            <IconClose size={10} />
          </button>
        )}
      </div>

      {/* ─── Card Body ─── */}
      <div className={styles.body}>
        {/* Row 1: Title & Rating Badge */}
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{destination.name}</h2>
          <span className={styles.ratingBadge}>
            <IconStar size={11} />
            <span>{stats.rating}</span>
          </span>
        </div>

        {/* Row 2: Location */}
        <div className={styles.locationRow}>
          <IconPin size={12} className={styles.pinIcon} />
          <span>{stats.district}, {destination.province}</span>
        </div>

        {/* Row 3: Rating count & Distance */}
        <div className={styles.metaRow}>
          <IconStar size={11} fill="#f59e0b" stroke="#f59e0b" />
          <span className={styles.starText}>{stats.rating}</span>
          <span className={styles.reviewText}>({stats.reviewCount}+ đánh giá)</span>
          {dist !== null && (
            <span className={styles.distText}>
              · Cách bạn {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist} km`}
            </span>
          )}
        </div>

        {/* Row 4: Action Buttons */}
        <div className={styles.actionsRow}>
          <Link href={`/destination/${destination.id}`} className={styles.btnDetails}>
            Xem chi tiết
          </Link>

          {onDirections && (
            <button
              type="button"
              className={styles.btnDirections}
              onClick={onDirections}
            >
              <IconRoute size={12} />
              <span>Chỉ đường</span>
            </button>
          )}

          {onAddToTrip && (
            <button
              type="button"
              className={styles.btnTripAdd}
              onClick={onAddToTrip}
              title="Thêm vào chuyến đi"
            >
              + Chuyến đi
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
