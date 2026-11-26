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
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const rawUrl = destination.imageUrl || destination.thumbnailUrl;
  const finalUrl = rawUrl ? getCloudImageUrl(rawUrl) : '';
  const failed = Boolean(finalUrl && failedUrl === finalUrl);

  return (
    <span className={`${styles.frame} ${className}`}>
      {finalUrl && !failed ? (
        <img
          src={finalUrl}
          alt={destination.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setFailedUrl(finalUrl)}
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
