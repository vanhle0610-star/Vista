'use client';

import { useState } from 'react';
import type { DestinationMarker } from '../types';
import { MapIcon } from './MapIcon';
import { getCloudImageUrl } from '@/utils/cloudImage';
import styles from './DestinationThumbnail.module.css';

export function DestinationThumbnail({
  destination,
  className = '',
}: {
  destination: DestinationMarker;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  const rawUrl = destination.thumbnailUrl;
  let finalUrl = '';
  if (rawUrl) {
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      finalUrl = rawUrl;
    } else if (rawUrl.startsWith('/')) {
      finalUrl = rawUrl;
    } else {
      finalUrl = getCloudImageUrl(rawUrl);
    }
  }

  return (
    <span className={`${styles.frame} ${className}`}>
      {finalUrl && !failed ? (
        <img
          src={finalUrl}
          alt={destination.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setFailed(true)}
          loading="lazy"
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
