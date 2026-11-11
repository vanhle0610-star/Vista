'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import * as maplibre from 'maplibre-gl';
import type { Map as LibreMap, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DestinationCard } from './components/DestinationCard';
import { IconLayers } from './components/MapIcons';
import type { MapViewAdapterProps } from './types';
import { validPoint } from './coordinates';
import styles from './StreetMapView.module.css';

const MAP_STYLES = {
  liberty: { id: 'liberty', name: 'Đường phố', url: 'https://tiles.openfreemap.org/styles/liberty' },
  bright: { id: 'bright', name: 'Tươi sáng', url: 'https://tiles.openfreemap.org/styles/bright' },
  positron: { id: 'positron', name: 'Tối giản', url: 'https://tiles.openfreemap.org/styles/positron' },
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

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
  const [currentStyle, setCurrentStyle] = useState<MapStyleKey>('liberty');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [activeSovereignty, setActiveSovereignty] = useState<{
    id: 'hoang_sa' | 'truong_sa';
    name: string;
    admin: string;
    coords: string;
    lat: number;
    lng: number;
    description: string;
  } | null>(null);

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
      const mapOptions: any = {
        container: container.current,
        style: MAP_STYLES[currentStyle].url,
        center: [initial.longitude, initial.latitude],
        zoom: initial.zoom ?? 12,
        pitch: 0,
        bearing: 0,
        maxPitch: 0,
        dragRotate: false,
        touchPitch: false,
        attributionControl: false,
        transformStyle: (_prev: any, next: any) => {
          if (next && next.layers) {
            next.layers.forEach((layer: any) => {
              if (layer.id === 'water_name_point_label' || layer.id === 'water_name_line_label') {
                layer.filter = [
                  'all',
                  layer.filter || ['literal', true],
                  ['!=', ['coalesce', ['get', 'name:latin'], ''], 'South China Sea'],
                  ['!=', ['coalesce', ['get', 'name_en'], ''], 'South China Sea'],
                  ['!=', ['coalesce', ['get', 'name:en'], ''], 'South China Sea'],
                  ['!=', ['coalesce', ['get', 'name'], ''], 'South China Sea'],
                  ['!=', ['coalesce', ['get', 'name:nonlatin'], ''], '南海'],
                  ['!', ['in', 'South China', ['coalesce', ['get', 'name:latin'], ['get', 'name_en'], ['get', 'name'], '']]],
                  ['!', ['in', 'China Sea', ['coalesce', ['get', 'name:latin'], ['get', 'name_en'], ['get', 'name'], '']]],
                  ['!', ['in', '南海', ['coalesce', ['get', 'name:nonlatin'], ['get', 'name'], '']]],
                ];
              }
            });
          }
          return next;
        },
      };
      map = new maplibre.Map(mapOptions);

      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'bottom-right');
      map.addControl(
        new maplibre.AttributionControl({
          customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>',
        })
      );
      mapRef.current = map;

      map.on('click', () => {
        setActiveSovereignty(null);
      });

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
  }, [attempt, initial, currentStyle]);

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
    const markers = destinations.map((destination) => {
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
        label.innerHTML = `${destination.name} <span class="${styles.markerLabelStar}">★ 4.8</span>`;
        button.appendChild(label);
      }

      button.addEventListener('click', () => {
        setActiveSovereignty(null);
        select(destination);
      });
      return new maplibre.Marker({ element: button })
        .setLngLat([destination.longitude, destination.latitude])
        .addTo(map);
    });

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [destinations, props.selectedDestinationId, status]);

  // ─── VIETNAMESE SOVEREIGNTY OVERLAYS (HOÀNG SA, TRƯỜNG SA, BIỂN ĐÔNG) ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;

    // Filter out foreign labels from openmaptiles base tiles
    const hideForeignLabels = () => {
      try {
        const layers = ['water_name_point_label', 'water_name_line_label'];
        layers.forEach((layerId) => {
          if (map.getLayer(layerId)) {
            try {
              map.setPaintProperty(layerId, 'text-opacity', [
                'case',
                [
                  'any',
                  ['in', 'South China', ['coalesce', ['get', 'name:latin'], ['get', 'name_en'], ['get', 'name'], '']],
                  ['in', 'China Sea', ['coalesce', ['get', 'name:latin'], ['get', 'name_en'], ['get', 'name'], '']],
                  ['in', '南海', ['coalesce', ['get', 'name:nonlatin'], ['get', 'name'], '']],
                ],
                0,
                1,
              ] as any);
            } catch {
              // ignore
            }

            const existingFilter = map.getFilter(layerId);
            const filtered = [
              'all',
              existingFilter || ['literal', true],
              ['!=', ['coalesce', ['get', 'name:latin'], ''], 'South China Sea'],
              ['!=', ['coalesce', ['get', 'name_en'], ''], 'South China Sea'],
              ['!=', ['coalesce', ['get', 'name:en'], ''], 'South China Sea'],
              ['!=', ['coalesce', ['get', 'name'], ''], 'South China Sea'],
              ['!=', ['coalesce', ['get', 'name:nonlatin'], ''], '南海'],
              ['!', ['in', 'South China', ['coalesce', ['get', 'name:latin'], ['get', 'name_en'], ['get', 'name'], '']]],
              ['!', ['in', 'China Sea', ['coalesce', ['get', 'name:latin'], ['get', 'name_en'], ['get', 'name'], '']]],
              ['!', ['in', '南海', ['coalesce', ['get', 'name:nonlatin'], ['get', 'name'], '']]],
            ];
            map.setFilter(layerId, filtered as any);
          }
        });
      } catch {
        // ignore
      }
    };

    if (map.isStyleLoaded()) {
      hideForeignLabels();
    }
    map.on('styledata', hideForeignLabels);
    map.on('style.load', hideForeignLabels);

    const sovereigntyMarkers: maplibre.Marker[] = [];
    const VIETNAM_FLAG_SVG = `<svg width="18" height="12" viewBox="0 0 300 200" style="display:block;border-radius:2px;"><rect width="300" height="200" fill="#da251d"/><polygon points="150,30 162.36,88.04 221.35,88.04 173.65,123.92 191.86,181.96 150,146.08 108.14,181.96 126.35,123.92 78.65,88.04 137.64,88.04" fill="#ffff00"/></svg>`;

    // 1. Biển Đông Label (Grand water label)
    const seaElem = document.createElement('div');
    seaElem.className = styles.sovereigntySeaLabel;
    seaElem.innerHTML = `
      <span class="${styles.sovereigntySeaTitle}">BIỂN ĐÔNG</span>
      <span class="${styles.sovereigntySeaSub}">(VIỆT NAM)</span>
    `;
    const seaMarker = new maplibre.Marker({ element: seaElem, anchor: 'center' })
      .setLngLat([113.2, 13.8])
      .addTo(map);
    sovereigntyMarkers.push(seaMarker);

    // 2. Quần đảo Hoàng Sa (Compact Pill - Nhấp vào mới bung thông tin)
    const hsElem = document.createElement('div');
    hsElem.className = styles.sovereigntyCompactPill;
    hsElem.setAttribute('title', 'Quần đảo Hoàng Sa (TP. Đà Nẵng, Việt Nam) — Nhấp để xem thông tin chủ quyền');
    hsElem.innerHTML = `
      <span class="${styles.sovereigntyPillFlag}">${VIETNAM_FLAG_SVG}</span>
      <span class="${styles.sovereigntyPillTitle}">Quần đảo Hoàng Sa</span>
      <span class="${styles.sovereigntyPillDot}"></span>
    `;
    hsElem.addEventListener('click', (e) => {
      e.stopPropagation();
      props.onSelectDestination?.(null);
      map.flyTo({ center: [112.0, 16.5], zoom: 8, speed: 1.2 });
      setActiveSovereignty({
        id: 'hoang_sa',
        name: 'QUẦN ĐẢO HOÀNG SA',
        admin: 'Huyện đảo Hoàng Sa, Thành phố Đà Nẵng',
        coords: '16°30\'B — 112°00\'Đ',
        lat: 16.5,
        lng: 112.0,
        description:
          'Quần đảo Hoàng Sa là phần lãnh thổ thiêng liêng, không thể tách rời và bất khả xâm phạm của Tổ quốc Việt Nam. Khu vực biển đảo tiền tiêu giữ vị trí chiến lược trọng yếu trong việc bảo đảm quốc phòng - an ninh biển đảo quốc gia.',
      });
    });
    const hsMarker = new maplibre.Marker({ element: hsElem, anchor: 'center' })
      .setLngLat([112.0, 16.5])
      .addTo(map);
    sovereigntyMarkers.push(hsMarker);

    // 3. Quần đảo Trường Sa (Compact Pill - Nhấp vào mới bung thông tin)
    const tsElem = document.createElement('div');
    tsElem.className = styles.sovereigntyCompactPill;
    tsElem.setAttribute('title', 'Quần đảo Trường Sa (Tỉnh Khánh Hòa, Việt Nam) — Nhấp để xem thông tin chủ quyền');
    tsElem.innerHTML = `
      <span class="${styles.sovereigntyPillFlag}">${VIETNAM_FLAG_SVG}</span>
      <span class="${styles.sovereigntyPillTitle}">Quần đảo Trường Sa</span>
      <span class="${styles.sovereigntyPillDot}"></span>
    `;
    tsElem.addEventListener('click', (e) => {
      e.stopPropagation();
      props.onSelectDestination?.(null);
      map.flyTo({ center: [114.2, 10.0], zoom: 7.5, speed: 1.2 });
      setActiveSovereignty({
        id: 'truong_sa',
        name: 'QUẦN ĐẢO TRƯỜNG SA',
        admin: 'Huyện đảo Trường Sa, Tỉnh Khánh Hòa',
        coords: '10°00\'B — 114°10\'Đ',
        lat: 10.0,
        lng: 114.2,
        description:
          'Quần đảo Trường Sa là phần lãnh thổ thiêng liêng, không thể tách rời và bất khả xâm phạm của Tổ quốc Việt Nam. Vùng biển và các điểm đảo tiền tiêu được các thế hệ người Việt Nam xác lập, bảo vệ vững chắc theo luật pháp quốc tế.',
      });
    });
    const tsMarker = new maplibre.Marker({ element: tsElem, anchor: 'center' })
      .setLngLat([114.2, 10.0])
      .addTo(map);
    sovereigntyMarkers.push(tsMarker);

    return () => {
      map.off('styledata', hideForeignLabels);
      map.off('style.load', hideForeignLabels);
      sovereigntyMarkers.forEach((m) => m.remove());
    };
  }, [status]);

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
    dot.setAttribute('aria-label', 'Vị trí của bạn');
    const marker = new maplibre.Marker({ element: dot })
      .setLngLat([props.userLocation.longitude, props.userLocation.latitude])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [props.userLocation, status]);

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
    const stopMarkers: maplibre.Marker[] = [];

    const applyRoute = () => {
      if (cancelled || !mapRef.current) return;
      if (!map.isStyleLoaded()) {
        map.once('styledata', applyRoute);
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
              paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 },
            });
          }

          if (!map.getLayer('vista-route-line')) {
            map.addLayer({
              id: 'vista-route-line',
              type: 'line',
              source: 'vista-route',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': '#0284c7', 'line-width': 5, 'line-opacity': 0.95 },
            });
          }
        }
      } catch (err) {
        console.warn('Deferred adding route source/layer:', err);
      }
    };

    applyRoute();

    // Render Stop Markers (A, B, C, D...)
    if (props.routeStops && props.routeStops.length > 0) {
      props.routeStops.forEach((stop) => {
        const el = document.createElement('div');
        const typeClass =
          stop.type === 'origin'
            ? styles.endpointOrigin
            : stop.type === 'destination'
              ? styles.endpointDestination
              : styles.endpointWaypoint;
        el.className = `${styles.endpoint} ${typeClass}`;
        el.textContent = stop.tag;

        const tooltip = document.createElement('span');
        tooltip.className = styles.endpointTooltip;
        tooltip.textContent = `${stop.tag}: ${stop.label}`;
        el.appendChild(tooltip);

        const marker = new maplibre.Marker({ element: el })
          .setLngLat([stop.longitude, stop.latitude])
          .addTo(map);
        stopMarkers.push(marker);
      });
    } else {
      // Fallback: Endpoints A & B from path
      [path[0], path[path.length - 1]].forEach((p, index) => {
        const el = document.createElement('div');
        el.className = `${styles.endpoint} ${index === 0 ? styles.endpointOrigin : styles.endpointDestination}`;
        el.textContent = index === 0 ? 'A' : 'B';
        const marker = new maplibre.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
        stopMarkers.push(marker);
      });
    }

    const bounds = new maplibre.LngLatBounds();
    path.forEach((p) => bounds.extend([p.lng, p.lat]));
    map.fitBounds(bounds, { padding: { top: 80, right: 65, bottom: 200, left: 60 }, maxZoom: 15 });

    return () => {
      cancelled = true;
      map.off('styledata', applyRoute);
      stopMarkers.forEach((marker) => marker.remove());
      if (mapRef.current === map) {
        try {
          if (map.isStyleLoaded()) {
            if (map.getLayer('vista-route-line')) map.removeLayer('vista-route-line');
            if (map.getLayer('vista-route-casing')) map.removeLayer('vista-route-casing');
            if (map.getSource('vista-route')) map.removeSource('vista-route');
          }
        } catch {
          // ignore cleanup on style change
        }
      }
    };
  }, [props.routeGeometry, props.routeStops, status]);

  return (
    <div className={`${styles.root} ${props.className ?? ''}`}>
      <div ref={container} className={styles.canvas} aria-label="Bản đồ đường phố" />

      {/* Loading / Error overlay */}
      {status !== 'ready' && (
        <div className={styles.notice} role={status === 'error' ? 'alert' : 'status'}>
          <strong>{status === 'loading' ? 'Đang tải bản đồ…' : 'Chưa tải được bản đồ'}</strong>
          <p>
            {status === 'error'
              ? 'Kiểm tra kết nối và thử lại. Thông tin địa điểm đã tải vẫn xem được bên cạnh.'
              : 'Đang kết nối OpenStreetMap.'}
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

      {/* Locate button */}
      <button
        type="button"
        className={styles.locate}
        onClick={() => {
          if (props.userLocation) {
            mapRef.current?.easeTo({
              center: [props.userLocation.longitude, props.userLocation.latitude],
              zoom: 15,
            });
          } else {
            props.onRequestUserLocation?.();
          }
        }}
      >
        <span className={styles.livePulseDot} />
        <span>Vị trí của tôi: {props.userLocation ? 'Cầu Rồng' : 'Đà Nẵng'}</span>
      </button>

      {/* Style Switcher */}
      <div className={styles.styleSwitcherContainer}>
        <button
          type="button"
          className={styles.styleToggleBtn}
          onClick={() => setShowStyleMenu((prev) => !prev)}
          title="Đổi kiểu hiển thị bản đồ"
        >
          <IconLayers size={13} />
          <span>{MAP_STYLES[currentStyle].name}</span>
        </button>

        {showStyleMenu && (
          <div className={styles.styleDropdown}>
            {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`${styles.styleOption} ${currentStyle === key ? styles.styleOptionActive : ''}`}
                onClick={() => {
                  setCurrentStyle(key);
                  setShowStyleMenu(false);
                }}
              >
                {MAP_STYLES[key].name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Destination Card */}
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

      {/* Sovereignty Detail Card (Shown ONLY when clicked) */}
      {activeSovereignty && (
        <div className={styles.sovereigntyCardOverlay}>
          <div className={styles.sovereigntyDetailCard}>
            <button
              type="button"
              className={styles.sovereigntyCloseBtn}
              onClick={() => setActiveSovereignty(null)}
              aria-label="Thu nhỏ"
              title="Thu nhỏ"
            >
              ✕
            </button>

            <div className={styles.sovereigntyDetailHeader}>
              <div className={styles.sovereigntyDetailFlag}>
                <svg width="36" height="24" viewBox="0 0 300 200" style={{ display: 'block' }}>
                  <rect width="300" height="200" fill="#da251d" />
                  <polygon
                    points="150,30 162.36,88.04 221.35,88.04 173.65,123.92 191.86,181.96 150,146.08 108.14,181.96 126.35,123.92 78.65,88.04 137.64,88.04"
                    fill="#ffff00"
                  />
                </svg>
              </div>
              <div>
                <div className={styles.sovereigntyDetailTitleRow}>
                  <h3 className={styles.sovereigntyDetailTitle}>{activeSovereignty.name}</h3>
                  <span className={styles.sovereigntyBadgeGold}>Việt Nam</span>
                </div>
                <p className={styles.sovereigntyDetailAdmin}>{activeSovereignty.admin}</p>
              </div>
            </div>

            <div className={styles.sovereigntyAffirmation}>
              <span style={{ fontSize: '15px' }}>🇻🇳</span>
              <p className={styles.sovereigntyAffirmationText}>
                {activeSovereignty.description}
              </p>
            </div>

            <div className={styles.sovereigntyMetaGrid}>
              <div className={styles.sovereigntyMetaItem}>
                <span className={styles.sovereigntyMetaLabel}>Tọa độ địa lý:</span>
                <span className={styles.sovereigntyMetaValue}>{activeSovereignty.coords}</span>
              </div>
              <div className={styles.sovereigntyMetaItem}>
                <span className={styles.sovereigntyMetaLabel}>Vùng biển:</span>
                <span className={styles.sovereigntyMetaValue}>Biển Đông (Việt Nam)</span>
              </div>
            </div>

            <p className={styles.sovereigntyNote}>
              ℹ️ Khu vực an ninh - quốc phòng tiền tiêu, hiện không khai thác tuyến du lịch thương mại tự do.
            </p>

            <div className={styles.sovereigntyActionRow}>
              <button
                type="button"
                className={styles.sovereigntyZoomBtn}
                onClick={() => {
                  mapRef.current?.flyTo({
                    center: [activeSovereignty.lng, activeSovereignty.lat],
                    zoom: activeSovereignty.id === 'hoang_sa' ? 9.5 : 8.5,
                    speed: 1.2,
                  });
                }}
              >
                <span>🔍</span>
                <span>Xem cận cảnh khu vực</span>
              </button>
              <button
                type="button"
                className={styles.sovereigntyDismissBtn}
                onClick={() => setActiveSovereignty(null)}
              >
                Thu nhỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
