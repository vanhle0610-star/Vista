'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapViewAdapterProps, MapViewMode } from '../types';
import { DRAGON_BRIDGE_CONFIG } from '../data/bridgeConfig';
import { MapLibre3DBridgeLayer } from '../3d/MapLibre3DBridgeLayer';
import { DestinationCard } from '../components/DestinationCard';
import { MapIcon } from '../components/MapIcon';
import styles from './MapViewAdapter.module.css';

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    { id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 20 },
  ],
};
const LAYER_ID = 'danang-cau-rong-3d';
type Notice = { kind: 'webgl' | 'tiles' | 'model' | 'style'; message: string };
const animationDuration = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;

export function MapViewAdapter({
  destinations,
  selectedDestinationId,
  onSelectDestination,
  userCoords,
  onRequestUserLocation,
  mode,
  onModeChange,
  bridgeConfig = DRAGON_BRIDGE_CONFIG,
  showBridge3D = true,
  initialCenter,
  styleUrl,
  onStatusChange,
  onError,
  className = '',
  showSelectedCard = false,
}: MapViewAdapterProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, maplibregl.Marker>());
  const gpsMarker = useRef<maplibregl.Marker | null>(null);
  const previousSelected = useRef<string | null>(selectedDestinationId ?? null);
  const pendingGPSFocus = useRef(false);
  const [initial] = useState(() => ({
    center: initialCenter ?? { ...bridgeConfig.anchor, zoom: 16.5 },
    mode: mode ?? '3d',
    customCenter: !!initialCenter,
  }));
  const [localMode, setLocalMode] = useState<MapViewMode>(initial.mode);
  const currentMode = mode ?? localMode;
  const [ready, setReady] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [modelRendered, setModelRendered] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const selected = destinations.find((d) => d.id === selectedDestinationId);

  // React effect events keep map subscriptions current without rebuilding the WebGL context.
  const report = useEffectEvent((kind: Notice['kind'], message: string) => {
    setNotice({ kind, message });
    setLoading(false);
    onError?.(new Error(message));
    onStatusChange?.(
      kind === 'webgl'
        ? 'webgl-unsupported'
        : kind === 'style'
          ? 'style-error'
          : 'error',
      message,
    );
  });
  const selectFromMarker = useEffectEvent((id: string) => {
    const destination = destinations.find((d) => d.id === id);
    if (destination) onSelectDestination?.(destination);
  });
  const reportReady = useEffectEvent(() => onStatusChange?.('ready'));
  const reportModelRender = useEffectEvent(() => setModelRendered(true));

  useEffect(() => {
    if (!container.current) return;
    let map: maplibregl.Map;
    let active = true;
    let bridge: MapLibre3DBridgeLayer | null = null;
    try {
      maplibregl.setWorkerUrl('/map-assets/maplibre-gl-worker.mjs');
      map = new maplibregl.Map({
        container: container.current,
        style: styleUrl || OSM_STYLE,
        center: [initial.center.longitude, initial.center.latitude],
        zoom: initial.center.zoom,
        pitch: initial.mode === '3d' ? 57 : 0,
        bearing: initial.mode === '3d' ? 26 : 0,
        maxPitch: 75,
        canvasContextAttributes: { antialias: true },
        attributionControl: { compact: true },
      });
    } catch {
      queueMicrotask(() => {
        if (active)
          report(
            'webgl',
            'Thiết bị chưa hỗ trợ WebGL 2. Bạn vẫn có thể chọn địa điểm và mở chỉ đường.',
          );
      });
      return () => {
        active = false;
      };
    }
    mapRef.current = map;
    const currentMarkers = markers.current;
    const timeout = window.setTimeout(() => {
      if (active && !map.isStyleLoaded())
        report('style', 'Bản đồ tải quá lâu. Kiểm tra kết nối rồi thử lại.');
    }, 15000);

    const onStyleLoad = () => {
      if (!active) return;
      window.clearTimeout(timeout);
      setLoading(false);
      setNotice(null);
      setModelRendered(false);
      setReady((value) => value + 1);
      reportReady();
      if (showBridge3D && !map.getLayer(LAYER_ID))
        map.once('idle', () => {
          if (!active || map.getLayer(LAYER_ID)) return;
          try {
            bridge = new MapLibre3DBridgeLayer(bridgeConfig, LAYER_ID, {
              onFirstRender: () => {
                if (active) reportModelRender();
              },
              onError: () => {
                if (active)
                  report(
                    'model',
                    'Chưa thể dựng mô hình Cầu Rồng. Bản đồ và danh sách vẫn hoạt động.',
                  );
              },
            });
            map.addLayer(bridge);
          } catch {
            bridge?.onRemove();
            report(
              'model',
              'Không thể khởi tạo mô hình Cầu Rồng. Hãy thử tải lại bản đồ.',
            );
          }
        });
      if (!initial.customCenter && showBridge3D) {
        map.fitBounds(
          [
            [
              bridgeConfig.westAbutment.longitude,
              bridgeConfig.westAbutment.latitude,
            ],
            [
              bridgeConfig.eastAbutment.longitude,
              bridgeConfig.eastAbutment.latitude,
            ],
          ],
          {
            padding: { top: 110, bottom: 130, left: 45, right: 75 },
            pitch: initial.mode === '3d' ? 57 : 0,
            bearing: initial.mode === '3d' ? 26 : 0,
            maxZoom: 17.2,
            duration: 0,
          },
        );
      }
    };
    map.on('style.load', onStyleLoad);
    map.on('error', (event) => {
      if (!active) return;
      const isTile =
        'sourceId' in event ||
        event.error.message.toLowerCase().includes('tile');
      report(
        isTile ? 'tiles' : 'style',
        isTile
          ? 'Không tải được một phần nền bản đồ. Kiểm tra mạng hoặc thử lại.'
          : 'Không tải được bản đồ. Kiểm tra kết nối rồi thử lại.',
      );
    });
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      resize.disconnect();
      map.off('style.load', onStyleLoad);
      currentMarkers.forEach((marker) => marker.remove());
      currentMarkers.clear();
      gpsMarker.current?.remove();
      gpsMarker.current = null;
      previousSelected.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [styleUrl, bridgeConfig, showBridge3D, initial, attempt]);

  // A mode change only changes the camera; it never creates a new map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.easeTo({
      pitch: currentMode === '3d' ? 57 : 0,
      duration: animationDuration(),
    });
  }, [currentMode, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const current = markers.current;
    const ids = new Set(destinations.map((d) => d.id));
    current.forEach((marker, id) => {
      if (!ids.has(id)) {
        marker.remove();
        current.delete(id);
      }
    });
    destinations.forEach((destination) => {
      let marker = current.get(destination.id);
      if (!marker) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = styles.marker;
        button.setAttribute('aria-label', `Chọn marker ${destination.name}`);
        const dot = document.createElement('span');
        dot.className = styles.markerDot;
        const label = document.createElement('span');
        label.textContent =
          destination.id === 'dest-01' ? 'Cầu Rồng' : destination.name;
        label.className = styles.markerLabel;
        button.append(dot, label);
        button.addEventListener('click', () =>
          selectFromMarker(destination.id),
        );
        marker = new maplibregl.Marker({
          element: button,
          anchor: 'bottom',
          offset: [0, -12],
        })
          .setLngLat([destination.longitude, destination.latitude])
          .addTo(map);
        current.set(destination.id, marker);
      }
      marker.setLngLat([destination.longitude, destination.latitude]);
      const isSelected = destination.id === selectedDestinationId;
      marker.getElement().classList.toggle(styles.markerSelected, isSelected);
      marker.getElement().setAttribute('aria-pressed', String(isSelected));
    });
    // Only a new selection moves the camera, never an unrelated render or filter update.
    if (
      selectedDestinationId &&
      previousSelected.current !== selectedDestinationId
    ) {
      const destination = destinations.find(
        (d) => d.id === selectedDestinationId,
      );
      if (destination) {
        map.easeTo({
          center: [destination.longitude, destination.latitude],
          zoom: destination.id === 'dest-01' ? 16.5 : 14,
          duration: animationDuration(),
        });
      }
    }
    previousSelected.current = selectedDestinationId ?? null;
  }, [destinations, selectedDestinationId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!userCoords) {
      gpsMarker.current?.remove();
      gpsMarker.current = null;
      return;
    }
    if (!gpsMarker.current) {
      const element = document.createElement('span');
      element.className = styles.gpsMarker;
      element.setAttribute('role', 'img');
      gpsMarker.current = new maplibregl.Marker({ element })
        .setLngLat([userCoords.longitude, userCoords.latitude])
        .addTo(map);
    }
    gpsMarker.current.setLngLat([userCoords.longitude, userCoords.latitude]);
    gpsMarker.current
      .getElement()
      .setAttribute(
        'aria-label',
        `Vị trí của bạn, độ chính xác ±${userCoords.accuracy} m`,
      );
    if (pendingGPSFocus.current) {
      pendingGPSFocus.current = false;
      map.easeTo({
        center: [userCoords.longitude, userCoords.latitude],
        zoom: 15,
        duration: animationDuration(),
      });
    }
  }, [userCoords, ready]);

  function changeMode(nextMode: MapViewMode) {
    setLocalMode(nextMode);
    onModeChange?.(nextMode);
  }
  function focusBridge() {
    const map = mapRef.current;
    if (!map) return;
    changeMode('3d');
    // Inspect the dragon's head and central arches at real metre scale.
    // The overview remains available through the fit-all and destination controls.
    map.easeTo({
      center: [
        bridgeConfig.anchor.longitude + 0.0025,
        bridgeConfig.anchor.latitude - 0.0005,
      ],
      zoom: 17.6,
      pitch: 64,
      bearing: -28,
      duration: animationDuration(),
    });
  }
  function focusUser() {
    if (!userCoords) {
      pendingGPSFocus.current = true;
      onRequestUserLocation?.();
      return;
    }
    mapRef.current?.easeTo({
      center: [userCoords.longitude, userCoords.latitude],
      zoom: 15,
      duration: animationDuration(),
    });
  }
  function fitAll() {
    if (!destinations.length) return;
    const bounds = new maplibregl.LngLatBounds();
    destinations.forEach((d) => bounds.extend([d.longitude, d.latitude]));
    mapRef.current?.fitBounds(bounds, {
      padding: 80,
      maxZoom: 16,
      duration: animationDuration(),
    });
  }
  function retry() {
    setNotice(null);
    setLoading(true);
    setModelRendered(false);
    setReady(0);
    setAttempt((value) => value + 1);
  }

  return (
    <div
      className={`${styles.root} ${className}`}
      data-map-ready={ready > 0}
      data-model-rendered={modelRendered}
      data-view-mode={currentMode}
    >
      <div
        ref={container}
        className={styles.canvas}
        role="region"
        aria-label="Bản đồ tương tác VISTA"
      />
      <div className={styles.top}>
        {showBridge3D && (
          <span className={styles.modelBadge}>
            <MapIcon name="cube" size={15} />
            {modelRendered ? 'Mô hình 3D minh họa' : 'Đang dựng mô hình…'}
          </span>
        )}
        <div
          className={styles.modes}
          role="group"
          aria-label="Chế độ hiển thị bản đồ"
        >
          {(['3d', '2d'] as const).map((value) => (
            <button
              key={value}
              onClick={() => changeMode(value)}
              aria-pressed={currentMode === value}
              className={currentMode === value ? styles.activeMode : ''}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div
        className={styles.controls}
        role="group"
        aria-label="Điều khiển bản đồ"
      >
        <button
          className={styles.compass}
          onClick={() => {
            mapRef.current?.easeTo({
              bearing: 0,
              duration: animationDuration(),
            });
          }}
          aria-label="Đặt lại hướng Bắc"
        >
          <span>N</span>
          <svg width="18" height="25" viewBox="0 0 18 26" aria-hidden="true">
            <path d="M9 1 15 14 9 11 3 14Z" fill="#e35454" />
            <path d="m9 25-6-13 6 3 6-3Z" fill="#27b4e4" />
          </svg>
        </button>
        <div className={styles.zoom}>
          <button
            onClick={() =>
              mapRef.current?.zoomIn({ duration: animationDuration() })
            }
            aria-label="Phóng to"
          >
            +
          </button>
          <button
            onClick={() =>
              mapRef.current?.zoomOut({ duration: animationDuration() })
            }
            aria-label="Thu nhỏ"
          >
            −
          </button>
        </div>
        <button
          className={styles.iconButton}
          onClick={fitAll}
          aria-label="Xem tất cả điểm đến"
          disabled={!destinations.length}
        >
          <MapIcon name="expand" />
        </button>
      </div>
      <div className={styles.quickActions}>
        {showBridge3D && modelRendered && (
          <button onClick={focusBridge}>
            <MapIcon name="cube" size={16} />
            Xem Cầu Rồng
          </button>
        )}
        <button onClick={focusUser}>
          <MapIcon name="locate" size={17} />
          Vị trí của tôi
        </button>
      </div>
      {showSelectedCard && selected && (
        <div className={styles.selectedCard}>
          <DestinationCard
            destination={selected}
            onClose={() => onSelectDestination?.(null)}
            onView3D={modelRendered ? focusBridge : undefined}
          />
        </div>
      )}
      {!destinations.length && !loading && (
        <div className={styles.empty} role="status">
          Không có điểm đến phù hợp. Thử bỏ bộ lọc trong danh sách.
        </div>
      )}
      {loading && (
        <div className={styles.loading} role="status">
          <span className={styles.spinner} />
          <strong>Đang mở bản đồ…</strong>
          <span>Khám phá Đà Nẵng từ một góc nhìn mới</span>
        </div>
      )}
      {notice && (
        <div className={styles.error} role="alert">
          <strong>{notice.message}</strong>
          <div>
            <button onClick={retry}>Thử lại</button>
            {notice.kind !== 'webgl' && (
              <button
                onClick={() => {
                  setNotice(null);
                  changeMode('2d');
                }}
              >
                Tiếp tục xem bản đồ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
