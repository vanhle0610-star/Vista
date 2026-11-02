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
      {/* ─── Left: Square Thumbnail with Category Chip ─── */}
      <div className={styles.thumbWrapper}>
        <DestinationThumbnail
          key={destination.id}
          destination={destination}
          className={styles.thumbImage}
        />
        <span className={styles.categoryChip}>{destination.category}</span>
      </div>

      {/* ─── Right: Content & Action ─── */}
      <div className={styles.cardBody}>
        {/* Row 1: Title + Close Button */}
        <div className={styles.topRow}>
          <h2 className={styles.title} title={destination.name}>
            {destination.name}
          </h2>
          {onClose && (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Đóng chi tiết"
              title="Đóng"
            >
              <IconClose size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Row 2: Star Rating */}
        <div className={styles.ratingRow}>
          <IconStar size={12} className={styles.starIcon} />
          <strong className={styles.ratingScore}>{stats.rating}</strong>
          <span className={styles.reviewCount}>({stats.reviewCount} đánh giá)</span>
        </div>

        {/* Row 3: Distance or District */}
        <div className={styles.distanceRow}>
          <IconPin size={12} className={styles.pinIcon} />
          <span>
            {dist !== null
              ? `Cách ${dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist} km`}`
              : `${stats.district}, ${destination.province}`}
          </span>
        </div>

        {/* Row 4: Primary Action Buttons */}
        <div className={styles.actionRow}>
          <Link href={`/destination/${destination.id}`} className={styles.btnDetails}>
            Xem chi tiết
          </Link>

          {onDirections && (
            <button
              type="button"
              className={styles.btnDirections}
              onClick={onDirections}
              title="Chỉ đường đến địa điểm này"
            >
              <IconRoute size={12} />
              <span>Chỉ đường</span>
            </button>
          )}

          {onAddToTrip && (
            <button
              type="button"
              className={styles.btnTrip}
              onClick={onAddToTrip}
              title="Thêm vào chuyến đi"
            >
              +
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
