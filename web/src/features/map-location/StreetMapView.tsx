'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import * as maplibre from 'maplibre-gl';
import type { Map as LibreMap, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DestinationCard } from './components/DestinationCard';
import type { MapViewAdapterProps } from './types';
import { validPoint } from './coordinates';
import styles from './StreetMapView.module.css';

export function MapViewAdapter(props: MapViewAdapterProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const select = useEffectEvent((destination: MapViewAdapterProps['destinations'][number]) => props.onSelectDestination?.(destination));
  const report = useEffectEvent(() => props.onStatusChange?.(status === 'error' ? 'error' : status));
  const [initial] = useState(() => props.initialCenter ?? { latitude: 16.061168, longitude: 108.227897, zoom: 12 });
  useEffect(() => { report(); }, [status]);
  const destinations = useMemo(() => props.destinations.filter(validPoint), [props.destinations]);
  const selected = destinations.find((d) => d.id === props.selectedDestinationId);
  useEffect(() => {
    if (!container.current) return;
    let map: LibreMap | undefined;
    let alive = true;
    const timer = setTimeout(() => { if (alive) setStatus('error'); }, 20000);
    try {
      maplibre.setWorkerUrl('/map-assets/maplibre-gl-worker.mjs');
      map = new maplibre.Map({ container: container.current,
        style: 'https://tiles.openfreemap.org/styles/liberty', center: [initial.longitude, initial.latitude], zoom: initial.zoom ?? 12,
        pitch: 0, bearing: 0, maxPitch: 0, dragRotate: false, touchPitch: false,
        attributionControl: false });
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibre.AttributionControl({ customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>' }));
      mapRef.current = map;
      map.on('load', () => { clearTimeout(timer); if (alive) setStatus('ready'); });
      map.on('error', () => { if (alive) setStatus('error'); });
    } catch { queueMicrotask(() => { if (alive) setStatus('error'); }); }
    return () => { alive = false; clearTimeout(timer); mapRef.current = null; map?.remove(); };
  }, [attempt, initial]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    const markers = destinations.map((destination) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = `${styles.marker} ${destination.id === props.selectedDestinationId ? styles.selectedMarker : ''}`;
      button.textContent = '●'; button.setAttribute('aria-label', destination.name);
      button.addEventListener('click', () => select(destination));
      return new maplibre.Marker({ element: button }).setLngLat([destination.longitude, destination.latitude]).addTo(map);
    });
    return () => { markers.forEach((marker) => marker.remove()); };
  }, [destinations, props.selectedDestinationId, status]);
  useEffect(() => {
    if (selected && status === 'ready') mapRef.current?.easeTo({ center: [selected.longitude, selected.latitude], zoom: 14, pitch: 0, bearing: 0 });
  }, [selected, status]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready' || !props.userLocation || !validPoint(props.userLocation)) return;
    const dot = document.createElement('span'); dot.className = styles.userMarker; dot.setAttribute('aria-label', 'Vị trí của bạn');
    const marker = new maplibre.Marker({ element: dot }).setLngLat([props.userLocation.longitude, props.userLocation.latitude]).addTo(map);
    return () => { marker.remove(); };
  }, [props.userLocation, status]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready' || !props.routeGeometry?.length) return;
    const path = props.routeGeometry.filter((point) => point && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180);
    if (path.length < 2) return;
    const data: GeoJSON.Feature<GeoJSON.LineString> = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: path.map((p) => [p.lng, p.lat]) } };
    const source = map.getSource('vista-route') as GeoJSONSource | undefined;
    if (source) source.setData(data); else {
      map.addSource('vista-route', { type: 'geojson', data });
      map.addLayer({ id: 'vista-route-line', type: 'line', source: 'vista-route', paint: { 'line-color': '#087ed0', 'line-width': 6, 'line-opacity': 0.85 } });
    }
    const endpoints = [path[0], path[path.length - 1]].map((p, index) => {
      const el = document.createElement('span'); el.className = styles.endpoint; el.textContent = index === 0 ? 'A' : 'B';
      return new maplibre.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
    });
    const bounds = new maplibre.LngLatBounds(); path.forEach((p) => bounds.extend([p.lng, p.lat]));
    map.fitBounds(bounds, { padding: { top: 70, right: 55, bottom: 190, left: 50 }, maxZoom: 15 });
    return () => {
      endpoints.forEach((marker) => marker.remove());
      if (mapRef.current === map) { if (map.getLayer('vista-route-line')) map.removeLayer('vista-route-line'); if (map.getSource('vista-route')) map.removeSource('vista-route'); }
    };
  }, [props.routeGeometry, status]);
  return <div className={`${styles.root} ${props.className ?? ''}`}>
    <div ref={container} className={styles.canvas} aria-label="Bản đồ đường phố" />
    {status !== 'ready' && <div className={styles.notice} role={status === 'error' ? 'alert' : 'status'}>
      <strong>{status === 'loading' ? 'Đang tải bản đồ…' : 'Chưa tải được bản đồ'}</strong>
      <p>{status === 'error' ? 'Kiểm tra kết nối và thử lại. Thông tin địa điểm đã tải vẫn xem được bên cạnh.' : 'Đang mở bản đồ đường phố.'}</p>
      {status === 'error' && <button onClick={() => { setStatus('loading'); setAttempt((n) => n + 1); }}>Thử lại bản đồ</button>}
    </div>}
    <button className={styles.locate} onClick={() => {
      if (props.userLocation) mapRef.current?.easeTo({ center: [props.userLocation.longitude, props.userLocation.latitude], zoom: 15 });
      else props.onRequestUserLocation?.();
    }}>◎ Vị trí của tôi</button>
    {selected && props.showSelectedCard !== false && <div className={styles.card}><DestinationCard destination={selected} onClose={() => props.onSelectDestination?.(null)} onDirections={props.onDirections ? () => props.onDirections?.(selected) : undefined} /></div>}
  </div>;
}
