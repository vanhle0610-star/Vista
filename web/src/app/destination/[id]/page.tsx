'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import type { components } from '@/types/api.generated';
import { Navbar } from '@/components/common/Navbar';
import { validPoint } from '@/features/map-location/data/publicDestinations';
import { rememberDestination, viewedDestination } from '@/features/map-location/data/viewedDestinations';
import styles from './page.module.css';

export default function DestinationPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<components['schemas']['DestinationDetail'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const cached = viewedDestination(id);
    if (cached) queueMicrotask(() => { if (!controller.signal.aborted) setData(cached); });
    void apiRequest<components['schemas']['DestinationDetail']>(`/destinations/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((detail) => { if (!controller.signal.aborted) { rememberDestination(detail); setData(detail); setError(null); } })
      .catch(() => { if (!controller.signal.aborted) setError('Chưa tải được thông tin. Kiểm tra kết nối rồi thử lại.'); });
    return () => controller.abort();
  }, [id, attempt]);
  return <><Navbar /><main className={styles.content}>
    <Link href="/map">← Khám phá trên bản đồ</Link>
    {error && <p role="alert">{error} <button onClick={() => setAttempt((n) => n + 1)}>Thử lại</button></p>}
    {!data && !error && <p role="status">Đang tải địa điểm…</p>}
    {data && <article><p>{data.province} · {data.category}</p><h1>{data.name}</h1>
      <p className={styles.description}>{data.description || 'Chưa có mô tả chi tiết.'}</p>
      {data.sourceUrl && <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">Nguồn thông tin địa điểm ↗</a>}
      {validPoint(data) ? <div className={styles.actions}>
        <Link href={`/map?destinationId=${data.id}`}>Xem trên bản đồ</Link>
        <Link href={`/map?destinationId=${data.id}&directions=1`}>Chỉ đường</Link>
      </div> : <p>Địa điểm chưa có tọa độ hợp lệ. Chưa thể hiển thị trên bản đồ hoặc tính tuyến.</p>}
    </article>}
  </main></>;
}
