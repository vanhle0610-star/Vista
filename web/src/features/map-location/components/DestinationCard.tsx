'use client';

import type { DestinationMarker } from '../types';
import Link from 'next/link';
import { DestinationThumbnail } from './DestinationThumbnail';
import { MapIcon } from './MapIcon';
import styles from './DestinationCard.module.css';

export function DestinationCard({
  destination,
  onClose,
  onDirections,
}: {
  destination: DestinationMarker;
  onClose?: () => void;
  onDirections?: () => void;
}) {
  return (
    <article
      className={styles.card}
      aria-label={`Chi tiết ${destination.name}`}
    >
      <DestinationThumbnail
        key={destination.id}
        destination={destination}
        className={styles.thumbnail}
      />
      <div className={styles.body}>
        <h2>{destination.name}</h2>
        <p>
          <MapIcon name="pin" size={13} />
          {destination.province} · {destination.category}
        </p>
        <div className={styles.actions}>
          <Link href={`/destination/${destination.id}`}>Xem chi tiết</Link>
          {onDirections && <button onClick={onDirections}>Chỉ đường <MapIcon name="arrow" size={13} /></button>}
        </div>
      </div>
      {onClose && (
        <button
          className={styles.close}
          onClick={onClose}
          aria-label="Đóng chi tiết"
        >
          <MapIcon name="close" size={17} />
        </button>
      )}
    </article>
  );
}
