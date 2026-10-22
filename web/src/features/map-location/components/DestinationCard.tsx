'use client';

import type { DestinationMarker } from '../types';
import { DestinationThumbnail } from './DestinationThumbnail';
import { MapIcon } from './MapIcon';
import styles from './DestinationCard.module.css';

export function DestinationCard({
  destination,
  onClose,
  onView3D,
}: {
  destination: DestinationMarker;
  onClose?: () => void;
  onView3D?: () => void;
}) {
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
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
          {destination.id === 'dest-01' && onView3D && (
            <button onClick={onView3D}>
              Xem Cầu Rồng <MapIcon name="cube" size={13} />
            </button>
          )}
          <a href={directions} target="_blank" rel="noopener noreferrer">
            Chỉ đường <MapIcon name="arrow" size={13} />
          </a>
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
