'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/common/Navbar';
import { MapViewAdapter } from '@/features/map-location/adapter/MapViewAdapter';

import { DestinationList, filterDestinations } from '@/features/map-location/components/DestinationList';
import { DirectionsPanel } from '@/features/map-location/components/DirectionsPanel';
import { GPSPermissionBar } from '@/features/map-location/components/GPSPermissionBar';
import { fetchMapDestinations } from '@/features/map-location/data/publicDestinations';
import { validPoint } from '@/features/map-location/data/publicDestinations';
import { rememberDestination, viewedDestination } from '@/features/map-location/data/viewedDestinations';
import { apiRequest } from '@/lib/api';
import type { components } from '@/types/api.generated';
import { useGeolocation } from '@/features/map-location/hooks/useGeolocation';
import { useRoutePlanner } from '@/features/map-location/hooks/useRoutePlanner';
import type { DestinationMarker } from '@/features/map-location/types';
import type { TravelMode } from '@/features/map-location/routing/routes';
import styles from './map-page.module.css';

export default function VistaMapPage() {
  const [data, setData] = useState<{ destinations: DestinationMarker[]; rejected: number; loading: boolean; error: string | null }>({ destinations: [], rejected: 0, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [gpsDismissed, setGpsDismissed] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [linked, setLinked] = useState<DestinationMarker | null>(null);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  const [linkAttempt, setLinkAttempt] = useState(0);
  const [mode, setMode] = useState<TravelMode>('DRIVING');
  const { coords, status, errorMessage, requestCurrentPosition, dismissPrompt, automaticEnabled, choiceKnown } = useGeolocation();
  const planner = useRoutePlanner(Boolean(coords));
  useEffect(() => { if (directionsOpen && coords && !originId) queueMicrotask(() => setOriginId('gps')); }, [directionsOpen, coords, originId]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('destinationId');
    if (!id) return;
    const abort = new AbortController();
    const selectLinked = (detail: components['schemas']['DestinationDetail']) => {
      if (abort.signal.aborted) return;
      if (!validPoint(detail)) { setLinkNotice(`${detail.name}: chưa có tọa độ hợp lệ để định vị. Bạn vẫn xem được thông tin tại trang chi tiết.`); return; }
      setLinked({ id: detail.id, name: detail.name, province: detail.province, category: detail.category, latitude: detail.latitude, longitude: detail.longitude, description: detail.description ?? '', sourceUrl: detail.sourceUrl ?? undefined });
      setSelectedId(detail.id);
      if (params.get('directions') === '1') { setDestinationId(detail.id); setDirectionsOpen(true); }
    };
    const cached = viewedDestination(id);
    if (cached) queueMicrotask(() => selectLinked(cached));
    void apiRequest<components['schemas']['DestinationDetail']>(`/destinations/${encodeURIComponent(id)}`, { signal: abort.signal }).then((detail) => {
      if (abort.signal.aborted) return;
      rememberDestination(detail); setLinkNotice(null); selectLinked(detail);
    }).catch(() => { if (!abort.signal.aborted) setLinkNotice('Chưa tải được địa điểm từ liên kết. Kiểm tra mạng rồi tải lại trang.'); });
    return () => abort.abort();
  }, [linkAttempt]);
  const destinations = useMemo(() => linked && !data.destinations.some((d) => d.id === linked.id) ? [linked, ...data.destinations] : data.destinations, [linked, data.destinations]);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) setData((old) => ({ ...old, loading: true, error: null })); });
    void fetchMapDestinations(controller.signal, (result) => {
      if (!controller.signal.aborted) setData((old) => ({ ...result, destinations: [...new Map([...old.destinations, ...result.destinations].map((destination) => [destination.id, destination])).values()], loading: true, error: null }));
    }).then((result) => {
      if (!controller.signal.aborted) setData({ ...result, loading: false, error: null });
    }).catch((reason) => {
      if (!controller.signal.aborted) setData((old) => ({ ...old, loading: false, error: reason instanceof Error && !['TimeoutError', 'TypeError'].includes(reason.name) ? reason.message : 'Không tải đủ điểm đến. Kiểm tra kết nối và thử lại.' }));
    });
    return () => controller.abort();
  }, [attempt]);
  const filtered = useMemo(() => filterDestinations(destinations, search, category, false), [destinations, search, category]);
  const select = useCallback((destination: DestinationMarker | null) => setSelectedId(destination?.id ?? null), []);
  const openDirections = (destination: DestinationMarker) => {
    planner.clear(); setDestinationId(destination.id); setDirectionsOpen(true); setSelectedId(destination.id); if (coords && !originId) setOriginId('gps');
  };
  const compute = () => {
    const origin = originId === 'gps' ? (coords ? { ...coords, label: 'Vị trí của tôi' } : null) : destinations.find((d) => d.id === originId);
    const destination = destinations.find((d) => d.id === destinationId);
    if (!origin || !destination) return;
    planner.compute({ origin: { ...origin, label: 'label' in origin ? origin.label : origin.name },
      destination: { ...destination, label: destination.name }, mode, fromGps: originId === 'gps' });
  };
  const route = planner.route?.input.fromGps && !coords ? null : planner.route;
  const visibleDestinations = directionsOpen ? destinations : filtered;
  return <div className={styles.page}>
    <Navbar activeModule="map" />
    <main className={styles.content}>
      <div className={styles.intro}><h1>Khám phá Việt Nam <span>trên bản đồ</span></h1><p>Chọn điểm đến, tìm đường và bắt đầu hành trình cùng VISTA.</p></div>
      <div className={styles.layout}>
        <section className={styles.sidebar} aria-label={directionsOpen ? 'Bảng chỉ đường' : 'Danh sách điểm đến'}>
          {linkNotice && <div role="alert" className={styles.dataNotice}><p>{linkNotice}</p><button onClick={() => setLinkAttempt((value) => value + 1)}>Thử tải lại địa điểm</button></div>}
          {directionsOpen ? <DirectionsPanel destinations={destinations} coords={coords} originId={originId} destinationId={destinationId} mode={mode}
            onOrigin={(value) => { setOriginId(value); planner.clear(); }}
            onDestination={(value) => { setDestinationId(value); setSelectedId(value); planner.clear(); }}
            onMode={(value) => { setMode(value); planner.clear(); }} onRequestGps={requestCurrentPosition} onCompute={compute}
            onClear={planner.clear} onClose={() => { planner.clear(); setDirectionsOpen(false); }}
            configured={true} status={planner.status} error={planner.error} route={route} /> : <>
            {data.loading && <div className={styles.dataNotice} role="status">{data.destinations.length ? 'Đang tải thêm điểm đến…' : 'Đang tải điểm đến…'}</div>}
            {data.error && <div className={styles.dataNotice} role="alert"><p>{data.error}</p><button onClick={() => setAttempt((value) => value + 1)}>Thử tải lại điểm đến</button></div>}
            {(destinations.length > 0 || (!data.loading && !data.error)) && <DestinationList destinations={destinations} filtered={filtered} selectedId={selectedId} onSelect={select}
              search={search} category={category} featured={false} showFeatured={false} onSearch={setSearch} onCategory={setCategory} onFeatured={() => {}} />}
          </>}
        </section>
        <section className={styles.map} aria-label="Bản đồ khám phá"><MapViewAdapter destinations={visibleDestinations} selectedDestinationId={selectedId}
          onSelectDestination={select} userLocation={coords} onRequestUserLocation={requestCurrentPosition} routeGeometry={route?.path} onDirections={openDirections} /></section>
      </div>
      {!gpsDismissed && (!choiceKnown || automaticEnabled) && <GPSPermissionBar status={status} hasPosition={Boolean(coords)} errorMessage={errorMessage} automaticEnabled={automaticEnabled} onRequestPermission={requestCurrentPosition} onDismiss={() => { dismissPrompt(); setGpsDismissed(true); }} />}
      {automaticEnabled && <button onClick={() => { dismissPrompt(); setGpsDismissed(true); }}>Tắt tự định vị</button>}
      <footer className={styles.footer}>Dữ liệu điểm đến đã công bố từ VISTA · {data.destinations.length} điểm có tọa độ hợp lệ{data.rejected > 0 && ` · ${data.rejected} điểm chưa đủ dữ liệu để hiển thị`}</footer>
    </main>
  </div>;
}
