'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { DestinationMarker } from '../types';
import { MapIcon } from './MapIcon';
import styles from './DestinationThumbnail.module.css';

export function DestinationThumbnail({
  destination,
  className = '',
}: {
  destination: DestinationMarker;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`${styles.frame} ${className}`}>
      {destination.thumbnailUrl && !failed ? (
        <Image
          src={destination.thumbnailUrl}
          alt={destination.name}
          fill
          sizes="(max-width: 900px) 112px, 100px"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={styles.placeholder}
          aria-label={`Chưa có ảnh ${destination.name}`}
        >
          <MapIcon name="pin" size={26} />
          <span>VISTA</span>
        </span>
      )}
    </span>
  );
}
