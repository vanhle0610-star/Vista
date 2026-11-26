'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import type { components } from '@/types/api.generated';
import { validPoint } from '@/features/map-location/data/publicDestinations';
import { rememberDestination, viewedDestination } from '@/features/map-location/data/viewedDestinations';
import { getCloudImageUrl } from '@/utils/cloudImage';
import { DestinationRequestModal } from '@/components/DestinationRequestModal';
import styles from './page.module.css';

export default function DestinationPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<components['schemas']['DestinationDetail'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const cached = viewedDestination(id);
    if (cached) queueMicrotask(() => { if (!controller.signal.aborted) setData(cached); });
    void apiRequest<components['schemas']['DestinationDetail']>(`/destinations/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((detail) => { if (!controller.signal.aborted) { rememberDestination(detail); setData(detail); setError(null); } })
      .catch(() => { if (!controller.signal.aborted) setError('Chưa tải được thông tin. Kiểm tra kết nối rồi thử lại.'); });
    return () => controller.abort();
  }, [id, attempt]);
  return (
    <main className={styles.content}>
      <Link href="/map">← Khám phá trên bản đồ</Link>
      {error && <p role="alert">{error} <button onClick={() => setAttempt((n) => n + 1)}>Thử lại</button></p>}
      {!data && !error && <p role="status">Đang tải địa điểm…</p>}
      {data && (
        <article>
          {data.imageUrl && (
            <div className={styles.heroWrapper}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCloudImageUrl(data.imageUrl)}
                alt={data.name}
                className={styles.heroImage}
              />
            </div>
          )}
          <p>{data.province} · {data.category}</p>
          <h1>{data.name}</h1>
          <p className={styles.description}>{data.description || 'Chưa có mô tả chi tiết.'}</p>
          {data.sourceUrl && (
            <p>
              <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">
                Nguồn thông tin địa điểm ↗
              </a>
            </p>
          )}
          {validPoint(data) ? (
            <div className={styles.actions}>
              <Link href={`/map?destinationId=${data.id}`}>Xem trên bản đồ</Link>
              <Link href={`/map?destinationId=${data.id}&directions=1`}>Chỉ đường</Link>
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                style={{ background: '#0f172a' }}
              >
                ✏️ Đề xuất cập nhật
              </button>
            </div>
          ) : (
            <div className={styles.actions}>
              <p style={{ margin: 0, width: '100%' }}>
                Địa điểm chưa có tọa độ hợp lệ. Chưa thể hiển thị trên bản đồ hoặc tính tuyến.
              </p>
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                style={{ background: '#0f172a' }}
              >
                ✏️ Đề xuất cập nhật
              </button>
            </div>
          )}
        </article>
      )}
      {toast && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            borderRadius: 12,
            background: '#dcfce7',
            color: '#166534',
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      )}
      {showRequestModal && data && (
        <DestinationRequestModal
          mode="UPDATE"
          initialDestination={{
            id: data.id,
            name: data.name,
            province: data.province,
            category: data.category,
            description: data.description,
            latitude: data.latitude,
            longitude: data.longitude,
            priceMin: data.priceMin,
            priceMax: data.priceMax,
            sourceUrl: data.sourceUrl,
            imageUrl: data.imageUrl,
          }}
          onClose={() => setShowRequestModal(false)}
          onSuccess={(msg) => {
            setToast(msg);
            setTimeout(() => setToast(null), 5000);
          }}
        />
      )}
    </main>
  );
}
