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
      map = new maplibre.Map({
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
      });

      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'bottom-right');
      map.addControl(
        new maplibre.AttributionControl({
          customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>',
        })
      );
      mapRef.current = map;

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

      button.addEventListener('click', () => select(destination));
      return new maplibre.Marker({ element: button })
        .setLngLat([destination.longitude, destination.latitude])
        .addTo(map);
    });

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [destinations, props.selectedDestinationId, status]);

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
    </div>
  );
}
