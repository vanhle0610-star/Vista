'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import * as maplibre from 'maplibre-gl';
import type { Map as LibreMap, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DestinationCard } from './components/DestinationCard';
import { IconLayers, IconCar, IconWalk, IconCrosshair, IconClose } from './components/MapIcons';
import type { MapViewAdapterProps } from './types';
import { LoaderCircle } from 'lucide-react';
import { accuracyRing, validPoint } from './coordinates';
import styles from './StreetMapView.module.css';

const STREET_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const SATELLITE_STYLE: maplibre.StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '© Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

function getCategoryGlyph(category?: string): string {
  if (!category) return '📍';
  const c = category.toLowerCase();
  if (c.includes('biển') || c.includes('đảo')) return '🌊';
  if (c.includes('ẩm thực') || c.includes('chợ') || c.includes('ăn')) return '🍜';
  if (c.includes('di tích') || c.includes('lịch sử') || c.includes('bảo tàng')) return '🏛️';
  if (c.includes('tâm linh') || c.includes('chùa') || c.includes('nhà thờ')) return '⛩️';
  if (c.includes('vui chơi') || c.includes('nghỉ dưỡng') || c.includes('giải trí')) return '🎡';
  if (c.includes('thiên nhiên') || c.includes('cảnh quan') || c.includes('núi') || c.includes('đèo')) return '🏞️';
  return '📍';
}

export function MapViewAdapter(props: MapViewAdapterProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [locationCentered, setLocationCentered] = useState(false);
  const [dismissedRoute, setDismissedRoute] = useState<MapViewAdapterProps['route']>(null);
  const cameraSettled = useEffectEvent(() => {
    const center = mapRef.current?.getCenter();
    const fix = props.userLocation;
    setLocationCentered(Boolean(center && fix && Math.abs(center.lat - fix.latitude) < 0.00001 && Math.abs(center.lng - fix.longitude) < 0.00001));
  });
  const fitVisibleRoute = useEffectEvent(() => {
    const map = mapRef.current;
    const path = props.routeGeometry;
    if (!map || !path || path.length < 2 || !container.current) return;
    const bounds = new maplibre.LngLatBounds();
    path.forEach((point) => { if (validPoint({ latitude: point.lat, longitude: point.lng })) bounds.extend([point.lng, point.lat]); });
    if (bounds.isEmpty()) return;
    const { clientWidth: width, clientHeight: height } = container.current;
    map.fitBounds(bounds, { padding: { top: Math.min(80, height * 0.2), bottom: Math.min(100, height * 0.25), left: Math.min(60, width * 0.12), right: Math.min(70, width * 0.2) }, maxZoom: 15 });
  });

  const select = useEffectEvent((destination: MapViewAdapterProps['destinations'][number]) =>
    props.onSelectDestination?.(destination)
  );
  const report = useEffectEvent(() =>
    props.onStatusChange?.(status === 'error' ? 'error' : status)
  );
  const [initial] = useState(() => props.initialCenter ?? { latitude: 16.061168, longitude: 108.227897, zoom: 12 });

  useEffect(() => {
    report();
  }, [status]);

  const destinations = useMemo(() => props.destinations.filter(validPoint), [props.destinations]);
  const selected = destinations.find((d) => d.id === props.selectedDestinationId);

  // Initialize Map
  useEffect(() => {
    if (!container.current) return;
    let map: LibreMap | undefined;
    let alive = true;
    const timer = setTimeout(() => {
      if (alive) setStatus('error');
    }, 20000);

    try {
      maplibre.setWorkerUrl('/map-assets/maplibre-gl-worker.mjs');
      const initialStyle = mapType === 'satellite' ? SATELLITE_STYLE : STREET_STYLE_URL;

      map = new maplibre.Map({
        container: container.current,
        style: initialStyle,
        center: [initial.longitude, initial.latitude],
        zoom: initial.zoom ?? 12,
        pitch: 0,
        bearing: 0,
        maxPitch: 0,
        dragRotate: false,
        touchPitch: false,
        attributionControl: false,
      });

      map.touchZoomRotate.disableRotation();
      map.addControl(
        new maplibre.AttributionControl({
          customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>',
          compact: true,
        }),
        'bottom-left'
      );
      mapRef.current = map;

      map.on('moveend', () => cameraSettled());
      map.on('dragstart', () => setLocationCentered(false));
      map.on('zoomstart', (event) => { if (event.originalEvent) setLocationCentered(false); });
      map.on('load', () => {
        clearTimeout(timer);
        if (alive) setStatus('ready');
      });

      map.on('error', () => {
        if (alive) setStatus('error');
      });
    } catch {
      queueMicrotask(() => {
        if (alive) setStatus('error');
      });
    }

    return () => {
      alive = false;
      clearTimeout(timer);
      mapRef.current = null;
      map?.remove();
    };
  }, [attempt, initial, mapType]);

  // Handle Container Resize (Sidebar Collapse/Expand)
  useEffect(() => {
    const el = container.current;
    if (!el) return;

    let fitTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
      clearTimeout(fitTimer);
      fitTimer = setTimeout(() => fitVisibleRoute(), 100);
    });
    observer.observe(el);

    const timer = setTimeout(() => {
      mapRef.current?.resize();
    }, 250);

    return () => {
      observer.disconnect();
      clearTimeout(fitTimer);
      clearTimeout(timer);
    };
  }, [props.sidebarCollapsed]);

  // Camera FlyTo Target (when province or selection changes)
  useEffect(() => {
    if (props.cameraTarget && status === 'ready' && mapRef.current) {
      mapRef.current.flyTo({
        center: [props.cameraTarget.longitude, props.cameraTarget.latitude],
        zoom: props.cameraTarget.zoom ?? 12.5,
        essential: true,
        speed: 1.4,
      });
    }
  }, [props.cameraTarget, status]);

  // Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    const markers = destinations.filter((destination) => !props.routeStops?.some((stop) => stop.latitude === destination.latitude && stop.longitude === destination.longitude)).map((destination) => {
      const isSelected = destination.id === props.selectedDestinationId;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `${styles.marker} ${isSelected ? styles.selectedMarker : ''}`;
      button.setAttribute('aria-label', destination.name);
      button.title = `${destination.name} (${destination.province} · ${destination.category})`;

      const icon = document.createElement('span');
      icon.className = styles.markerIcon;
      icon.textContent = getCategoryGlyph(destination.category);
      button.appendChild(icon);

      if (isSelected) {
        const label = document.createElement('span');
        label.className = styles.markerLabelBubble;
        label.textContent = destination.name;
        button.appendChild(label);
      }

      button.addEventListener('click', () => select(destination));
      return new maplibre.Marker({ element: button })
        .setLngLat([destination.longitude, destination.latitude])
        .addTo(map);
    });

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [destinations, props.selectedDestinationId, props.routeStops, status, attempt, mapType]);

  // Ease to selected destination
  useEffect(() => {
    if (selected && status === 'ready') {
      mapRef.current?.easeTo({
        center: [selected.longitude, selected.latitude],
        zoom: 14,
        pitch: 0,
        bearing: 0,
      });
    }
  }, [selected, status]);

  // User location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready' || !props.userLocation || !validPoint(props.userLocation)) return;
    const dot = document.createElement('span');
    dot.className = styles.userMarker;
    dot.setAttribute('role', 'img');
    dot.setAttribute('aria-label', 'Vị trí của bạn');
    const marker = new maplibre.Marker({ element: dot })
      .setLngLat([props.userLocation.longitude, props.userLocation.latitude])
      .addTo(map);
    const accuracy = props.userLocation.accuracy;
    if (Number.isFinite(accuracy) && accuracy > 0) {
      map.addSource('vista-gps-accuracy', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [accuracyRing(props.userLocation.latitude, props.userLocation.longitude, accuracy)] } } });
      map.addLayer({ id: 'vista-gps-accuracy-fill', type: 'fill', source: 'vista-gps-accuracy', paint: { 'fill-color': '#1a73e8', 'fill-opacity': 0.12 } });
      map.addLayer({ id: 'vista-gps-accuracy-outline', type: 'line', source: 'vista-gps-accuracy', paint: { 'line-color': '#1a73e8', 'line-opacity': 0.35, 'line-width': 1 } });
    }
    return () => {
      marker.remove();
      if (mapRef.current === map) {
        if (map.getLayer('vista-gps-accuracy-outline')) map.removeLayer('vista-gps-accuracy-outline');
        if (map.getLayer('vista-gps-accuracy-fill')) map.removeLayer('vista-gps-accuracy-fill');
        if (map.getSource('vista-gps-accuracy')) map.removeSource('vista-gps-accuracy');
      }
    };
  }, [props.userLocation, status, attempt, mapType]);

  // Selected points retain their exact coordinates, even before route calculation.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    const markers = (props.routeStops ?? []).map((stop) => {
      const button = document.createElement('button'); button.type = 'button';
      button.className = styles.endpoint;
      button.dataset.role = stop.type ?? 'waypoint';
      button.dataset.stopId = stop.id;
      button.setAttribute('aria-label', stop.role + ': ' + stop.label);
      button.title = stop.role + ': ' + stop.label;
      const icon = document.createElement('span');
      icon.className = stop.type === 'destination' ? styles.endpointPin : styles.endpointCircle;
      if (stop.type === 'destination') icon.innerHTML = '<svg width="24" height="28" viewBox="0 0 24 28" aria-hidden="true"><path fill="#ea4335" stroke="#fff" stroke-width="1.5" d="M12 27S2 16 2 10a10 10 0 0 1 20 0c0 6-10 17-10 17Z"/><circle cx="12" cy="10" r="3.5" fill="#a82118"/></svg>';
      button.appendChild(icon);
      const content = document.createElement('div'); content.textContent = stop.role + ': ' + stop.label;
      const popup = new maplibre.Popup({ offset: 12 }).setDOMContent(content);
      const marker = new maplibre.Marker({ element: button, anchor: stop.type === 'destination' ? 'bottom' : 'center' }).setLngLat([stop.longitude, stop.latitude]).setPopup(popup).addTo(map);
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); event.stopPropagation(); marker.togglePopup();
        }
      });
      return marker;
    });
    return () => { markers.forEach((marker) => marker.remove()); };
  }, [props.routeStops, status, attempt, mapType]);

  // Route Polyline & Stops
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready' || !props.routeGeometry?.length) return;
    const path = props.routeGeometry.filter(
      (point) =>
        point &&
        Number.isFinite(point.lat) &&
        Math.abs(point.lat) <= 90 &&
        Number.isFinite(point.lng) &&
        Math.abs(point.lng) <= 180
    );
    if (path.length < 2) return;

    const data: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: path.map((p) => [p.lng, p.lat]) },
    };

    let cancelled = false;

    const applyRoute = () => {
      if (cancelled || !mapRef.current) return;
      // Pending base-map tiles can make isStyleLoaded() false even though the
      // style accepts layers. Waiting for styledata then can leave a valid route invisible.
      if (!map.getStyle()) {
        map.once('style.load', applyRoute);
        return;
      }

      try {
        const source = map.getSource('vista-route') as GeoJSONSource | undefined;
        if (source) {
          source.setData(data);
        } else {
          map.addSource('vista-route', { type: 'geojson', data });

          if (!map.getLayer('vista-route-casing')) {
            map.addLayer({
              id: 'vista-route-casing',
              type: 'line',
              source: 'vista-route',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': '#24136a', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 5, 15, 8, 19, 10], 'line-opacity': 0.95 },
            });
          }

          if (!map.getLayer('vista-route-line')) {
            map.addLayer({
              id: 'vista-route-line',
              type: 'line',
              source: 'vista-route',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': '#6250ee', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3, 15, 5, 19, 7], 'line-opacity': 0.95 },
            });
          }
        }
      } catch (err) {
        console.warn('Deferred adding route source/layer:', err);
      }
    };

    applyRoute();

    fitVisibleRoute();

    return () => {
      cancelled = true;
      map.off('style.load', applyRoute);
      if (mapRef.current === map) {
        try {
          if (map.getLayer('vista-route-line')) map.removeLayer('vista-route-line');
          if (map.getLayer('vista-route-casing')) map.removeLayer('vista-route-casing');
          if (map.getSource('vista-route')) map.removeSource('vista-route');
        } catch {
          // ignore cleanup on style change
        }
      }
    };
  }, [props.routeGeometry, status, attempt, mapType]);

  return (
    <div className={`${styles.root} ${props.className ?? ''}`}>
      <div ref={container} className={styles.canvas} aria-label="Bản đồ đường phố" />

      {/* Loading / Error overlay */}
      {status !== 'ready' && (
        <div className={styles.notice} role={status === 'error' ? 'alert' : 'status'}>
          <strong>{status === 'loading' ? 'Đang tải bản đồ…' : 'Chưa tải được bản đồ'}</strong>
          <p>
            {status === 'error'
              ? 'Kiểm tra kết nối mạng và thử lại. Danh sách địa điểm đã tải vẫn sử dụng được bình thường.'
              : 'Đang kết nối dịch vụ bản đồ vệ tinh & đường phố OpenStreetMap.'}
          </p>
          {status === 'error' && (
            <button
              type="button"
              onClick={() => {
                setStatus('loading');
                setAttempt((n) => n + 1);
              }}
            >
              Thử lại bản đồ
            </button>
          )}
        </div>
      )}

      {/* ─── TOP-LEFT: LOCATION BADGE PILL ─── */}
      <div className={styles.locationPill}>
        <span className={styles.locationPillText}>Khu vực: <strong>{props.currentCityName || 'Toàn quốc'}</strong></span>
      </div>

      {/* ─── TOP-RIGHT: MAP STYLE SWITCHER (Bản đồ / Vệ tinh) ─── */}
      <div className={styles.mapTypeSwitcher} role="group" aria-label="Kiểu hiển thị bản đồ">
        <button
          type="button"
          className={`${styles.mapTypeBtn} ${mapType === 'streets' ? styles.mapTypeBtnActive : ''}`}
          onClick={() => { if (mapType !== 'streets') { setStatus('loading'); setMapType('streets'); } }}
        >
          <IconLayers size={13} />
          <span>Bản đồ</span>
        </button>
        <button
          type="button"
          className={`${styles.mapTypeBtn} ${mapType === 'satellite' ? styles.mapTypeBtnActive : ''}`}
          onClick={() => { if (mapType !== 'satellite') { setStatus('loading'); setMapType('satellite'); } }}
        >
          <span>🛰️</span>
          <span>Vệ tinh</span>
        </button>
      </div>

      {/* ─── BOTTOM-RIGHT: CONTROLS GROUP ─── */}
      <div className={styles.mapControlsGroup}>
        <button type="button" className={styles.mapControlBtn + ' ' + (locationCentered && props.userLocation ? styles.locationActive : '')}
          onClick={() => props.onRequestUserLocation?.()} disabled={props.gpsStatus === 'requesting'}
          aria-busy={props.gpsStatus === 'requesting'} title="Hiển thị vị trí của bạn" aria-label="Hiển thị vị trí của bạn">
          {props.gpsStatus === 'requesting' ? <LoaderCircle size={20} className={styles.locationSpinner} /> : <IconCrosshair size={20} />}
          <span className={styles.controlTooltip}>Hiển thị vị trí của bạn</span>
        </button>
        <div className={styles.mapControlDivider} />
        <button
          type="button"
          className={styles.mapControlBtn}
          onClick={() => mapRef.current?.zoomIn()}
          title="Phóng to"
          aria-label="Phóng to"
        >
          +
        </button>
        <button
          type="button"
          className={styles.mapControlBtn}
          onClick={() => mapRef.current?.zoomOut()}
          title="Thu nhỏ"
          aria-label="Thu nhỏ"
        >
          −
        </button>
      </div>

      {props.gpsError && <div className={styles.gpsError} role="alert">{props.gpsError} Bạn vẫn có thể chọn điểm xuất phát thủ công.</div>}

      {/* ─── BOTTOM-CENTER: FLOATING ROUTE SUMMARY BANNER ─── */}
      {props.route && props.route !== dismissedRoute && (
        <div className={styles.floatingRouteBanner} role="status">
          <div className={styles.routeBannerIcon}>
            {props.route.input?.mode === 'WALKING' ? <IconWalk size={20} /> : <IconCar size={20} />}
          </div>
          <div className={styles.routeBannerContent}>
            <div className={styles.routeBannerTitle}>
              Từ {props.route.input?.origin?.label || 'vị trí của bạn'} đến{' '}
              <strong>{props.route.input?.destination?.label || 'Điểm đến'}</strong>
            </div>
            <div className={styles.routeBannerMeta}>
              <strong className={styles.routeDurationText}>
                {Math.max(1, Math.ceil(props.route.durationMillis / 60000))} phút
              </strong>
              <span className={styles.routeMetaDivider}>·</span>
              <span>{Math.round(props.route.distanceMeters / 100) / 10} km</span>
              {props.route.legs?.[0]?.summary && (
                <>
                  <span className={styles.routeMetaDivider}>·</span>
                  <span className={styles.routeRoadSummary}>Qua {props.route.legs[0].summary}</span>
                </>
              )}
            </div>
          </div>
          <div className={styles.routeBannerActions}>
            <button
              type="button"
              className={styles.routeBannerBtnStart}
              onClick={() => props.onOpenRouteDetail?.()}
            >
              <span>Xem chi tiết</span>
            </button>
            <button
              type="button"
              className={styles.routeBannerBtnClose}
              onClick={() => setDismissedRoute(props.route)}
              title="Ẩn thông báo"
              aria-label="Đóng thanh lộ trình"
            >
              <IconClose size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Selected Destination Card Popup */}
      {selected && props.showSelectedCard !== false && (
        <div className={styles.card}>
          <DestinationCard
            destination={selected}
            userLocation={props.userLocation}
            onClose={() => props.onSelectDestination?.(null)}
            onDirections={props.onDirections ? () => props.onDirections?.(selected) : undefined}
            onAddToTrip={props.onAddToTrip ? () => props.onAddToTrip?.(selected) : undefined}
          />
        </div>
      )}
    </div>
  );
}
