'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Coordinates, DestinationMarker, MapProviderType, SyncDevice } from '../types';
import { SAMPLE_DESTINATIONS, DEFAULT_MAP_CENTER } from '../data/destinations';
import { MapViewAdapter } from '../adapter/MapViewAdapter';

interface MapViewerProps {
  userCoords: Coordinates | null;
  partnerDevice?: SyncDevice | null;
  isSharingActive?: boolean;
  onRequestUserLocation?: () => void;
  onOpenComparisonModal?: () => void;
  onLogEvent?: (type: 'map', isSimulation: boolean, title: string, details?: string) => void;
}

// Định nghĩa giao diện tối giản cho Leaflet thay cho any
interface LeafletMapInstance {
  remove: () => void;
  flyTo: (center: [number, number], zoom: number, options?: { duration?: number }) => void;
  fitBounds: (bounds: unknown, options?: { padding?: [number, number] }) => void;
}

interface LeafletLayerGroup {
  clearLayers: () => void;
  addTo: (map: LeafletMapInstance) => LeafletLayerGroup;
}

interface LeafletMarker {
  remove: () => void;
  addTo: (map: LeafletMapInstance | LeafletLayerGroup) => LeafletMarker;
  bindPopup: (content: string | HTMLElement) => LeafletMarker;
  on: (event: string, fn: () => void) => LeafletMarker;
}

interface LeafletGlobal {
  map: (element: HTMLElement, options: Record<string, unknown>) => LeafletMapInstance;
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: LeafletMapInstance) => unknown };
  layerGroup: () => LeafletLayerGroup;
  marker: (latlng: [number, number], options?: Record<string, unknown>) => LeafletMarker;
  divIcon: (options: Record<string, unknown>) => unknown;
  latLngBounds: (points: [number, number][]) => { extend: (point: [number, number]) => void };
}

declare global {
  interface Window {
    L?: LeafletGlobal;
  }
}

export function MapViewer({
  userCoords,
  partnerDevice,
  isSharingActive,
  onRequestUserLocation,
  onOpenComparisonModal,
  onLogEvent,
}: MapViewerProps) {
  // Mặc định chọn MapLibre Vector làm bản đồ chính cho tuần 2
  const [provider, setProvider] = useState<MapProviderType>('maplibre-vector');
  const [selectedDestination, setSelectedDestination] = useState<DestinationMarker | null>(null);
  const [isLeafletReady, setIsLeafletReady] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isLoadingTiles, setIsLoadingTiles] = useState<boolean>(false);

  // Cấu hình URL Vector Style cho MapLibre
  const [vectorStyleUrl, setVectorStyleUrl] = useState<string>('');
  const [activeVectorStyle, setActiveVectorStyle] = useState<string | undefined>(undefined);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const markersLayerRef = useRef<LeafletLayerGroup | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const partnerMarkerRef = useRef<LeafletMarker | null>(null);

  // 1. Kiểm tra trạng thái mạng
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      onLogEvent?.('map', false, 'Mạng trực tuyến trở lại (Online)', 'Bản đồ kết nối lại dịch vụ tile server.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      onLogEvent?.('map', false, 'Mất kết nối mạng (Offline)', 'Không thể tải thêm các mảnh bản đồ (tiles).');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onLogEvent]);

  // 2. Tải Leaflet CSS & JS động nếu chọn phương án fallback Leaflet
  useEffect(() => {
    if (provider !== 'leaflet-osm') return;

    if (window.L) {
      queueMicrotask(() => setIsLeafletReady(true));
      return;
    }

    queueMicrotask(() => setIsLoadingTiles(true));

    // Chèn Leaflet CSS
    const cssId = 'leaflet-cdn-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Chèn Leaflet JS
    const scriptId = 'leaflet-cdn-js';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.crossOrigin = '';
      script.onload = () => {
        setIsLeafletReady(true);
        setIsLoadingTiles(false);
        onLogEvent?.('map', false, 'SDK Leaflet 1.9.4 đã tải', 'Sẵn sàng kết xuất bản đồ 2D fallback.');
      };
      script.onerror = () => {
        setIsLoadingTiles(false);
        onLogEvent?.('map', false, 'Lỗi nạp Leaflet SDK', 'Không thể tải tài nguyên từ CDN. Vui lòng kiểm tra mạng.');
      };
      document.body.appendChild(script);
    } else {
      // An existing script may still be loading; wait for its actual load event.
      const handleLoad = () => {
        setIsLeafletReady(Boolean(window.L));
        setIsLoadingTiles(false);
      };
      script.addEventListener('load', handleLoad);
      const existingScript = script;
      return () => existingScript.removeEventListener('load', handleLoad);
    }
  }, [provider, onLogEvent]);

  // 3. Khởi tạo & Cập nhật Leaflet Map (2D Fallback)
  useEffect(() => {
    if (provider !== 'leaflet-osm' || !isLeafletReady || !mapContainerRef.current || !window.L) {
      return;
    }

    const L = window.L;

    // Tránh khởi tạo trùng
    if (!leafletMapInstanceRef.current) {
      const initialCenter: [number, number] = userCoords
        ? [userCoords.latitude, userCoords.longitude]
        : [DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: DEFAULT_MAP_CENTER.zoom,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | VISTA',
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      leafletMapInstanceRef.current = map;

      onLogEvent?.('map', false, 'Khởi tạo Leaflet 2D Map', `Tọa độ: ${initialCenter[0]}, ${initialCenter[1]}`);
    }

    const map = leafletMapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const destinationIcon = L.divIcon({
      className: 'custom-destination-pin',
      html: `
        <div style="background: linear-gradient(135deg, #0984e3, #0284c7); width: 26px; height: 26px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid #ffffff;">
          <div style="transform: rotate(45deg); width: 7px; height: 7px; background: #ffffff; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    });

    SAMPLE_DESTINATIONS.forEach((dest) => {
      const marker = L.marker([dest.latitude, dest.longitude], { icon: destinationIcon }).addTo(markersLayer);

      const popupDiv = document.createElement('div');
      popupDiv.style.fontSize = '12px';
      popupDiv.style.color = '#1e293b';

      const titleEl = document.createElement('strong');
      titleEl.textContent = dest.name;
      popupDiv.appendChild(titleEl);

      const descEl = document.createElement('p');
      descEl.style.margin = '4px 0';
      descEl.textContent = dest.description;
      popupDiv.appendChild(descEl);

      marker.bindPopup(popupDiv);
      marker.on('click', () => {
        setSelectedDestination(dest);
        onLogEvent?.('map', false, 'Chọn địa điểm Leaflet', dest.name);
      });
    });

    // Cập nhật User GPS Marker
    if (userCoords) {
      if (userMarkerRef.current) userMarkerRef.current.remove();
      const uIcon = L.divIcon({
        className: 'user-pin',
        html: `<div style="width: 14px; height: 14px; background: #00cec9; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      userMarkerRef.current = L.marker([userCoords.latitude, userCoords.longitude], { icon: uIcon }).addTo(map);
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    // Cập nhật Partner Marker (Dev only)
    if (isSharingActive && partnerDevice) {
      if (partnerMarkerRef.current) partnerMarkerRef.current.remove();
      const pIcon = L.divIcon({
        className: 'partner-pin',
        html: `<div style="width: 14px; height: 14px; background: #f59e0b; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      partnerMarkerRef.current = L.marker([partnerDevice.latitude, partnerDevice.longitude], { icon: pIcon }).addTo(map);
    } else if (partnerMarkerRef.current) {
      partnerMarkerRef.current.remove();
      partnerMarkerRef.current = null;
    }

    return () => {
      // Cleanup khi chuyển engine
      if (provider !== 'leaflet-osm' && leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
        leafletMapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, [provider, isLeafletReady, userCoords, partnerDevice, isSharingActive, onLogEvent]);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '16px',
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Thanh công cụ lựa chọn Phương án Bản đồ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '12px',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setProvider('maplibre-vector');
              onLogEvent?.('map', false, 'Chuyển sang MapLibre Vector 3D (Chính)');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '10px',
              border: provider === 'maplibre-vector' ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
              backgroundColor: provider === 'maplibre-vector' ? '#e0f2fe' : '#ffffff',
              color: provider === 'maplibre-vector' ? '#0369a1' : '#64748b',
              fontWeight: 750,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>MapLibre GL + Three.js 3D</span>
            <span style={{
              fontSize: '0.68rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '1px 6px',
              borderRadius: '4px',
            }}>
              Tuần 2 • Cầu Rồng 3D
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProvider('leaflet-osm');
              onLogEvent?.('map', false, 'Chuyển sang Leaflet 2D Fallback');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '10px',
              border: provider === 'leaflet-osm' ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
              backgroundColor: provider === 'leaflet-osm' ? '#e0f2fe' : '#ffffff',
              color: provider === 'leaflet-osm' ? '#0369a1' : '#64748b',
              fontWeight: 750,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Leaflet 2D Fallback</span>
            <span style={{
              fontSize: '0.68rem',
              backgroundColor: '#e2e8f0',
              color: '#475569',
              padding: '1px 6px',
              borderRadius: '4px',
            }}>
              Tuần 1
            </span>
          </button>
        </div>

        {onOpenComparisonModal && (
          <button
            type="button"
            onClick={onOpenComparisonModal}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#475569',
              fontSize: '0.8rem',
              fontWeight: 650,
              cursor: 'pointer',
            }}
          >
            So sánh kỹ thuật ↗
          </button>
        )}
      </div>

      {/* Cảnh báo Mất mạng */}
      {!isOnline && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#92400e',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
        }}>
          ⚠️ Mất kết nối Internet: Không thể tải thêm các mảnh bản đồ mới. Dữ liệu bộ đệm có thể vẫn hiển thị.
        </div>
      )}

      {/* VÙNG HIỂN THỊ BẢN ĐỒ */}
      <div style={{ position: 'relative', width: '100%', minHeight: '520px', borderRadius: '12px', overflow: 'hidden' }}>
        {provider === 'maplibre-vector' ? (
          /* PHƯƠNG ÁN CHÍNH TUẦN 2: MapLibre GL JS + Three.js 3D Cầu Rồng */
          <div style={{ width: '100%', height: '520px' }}>
            <MapViewAdapter
              destinations={SAMPLE_DESTINATIONS}
              selectedDestinationId={selectedDestination?.id}
              onSelectDestination={(dest) => {
                setSelectedDestination(dest);
                onLogEvent?.('map', false, 'Chọn điểm trên MapLibre 3D', dest?.name || 'Bỏ chọn');
              }}
              userCoords={userCoords}
              onRequestUserLocation={onRequestUserLocation}
              mode="3d"
              styleUrl={activeVectorStyle}
              showBridge3D={true}
              onStatusChange={(status, details) => {
                onLogEvent?.('map', false, `MapLibre Status: ${status}`, details);
              }}
            />
          </div>
        ) : (
          /* PHƯƠNG ÁN FALLBACK: Leaflet 2D */
          <>
            <div
              ref={mapContainerRef}
              style={{ width: '100%', height: '520px', borderRadius: '12px' }}
            />
            {isLoadingTiles && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255,255,255,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.88rem',
                fontWeight: 650,
                color: '#0369a1',
              }}>
                Đang nạp Leaflet SDK...
              </div>
            )}
          </>
        )}
      </div>

      {/* Tùy chỉnh Vector Style nâng cao cho Tester */}
      {provider === 'maplibre-vector' && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '0.8rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, color: '#334155' }}>
              Cấu hình Vector Style URL thử nghiệm (Tùy chọn):
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Mặc định: OpenStreetMap Raster chuẩn WebGL
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={vectorStyleUrl}
              onChange={(e) => setVectorStyleUrl(e.target.value)}
              placeholder="Ví dụ: https://tiles.openfreemap.org/styles/liberty hoặc MapTiler JSON"
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (vectorStyleUrl.trim()) {
                  setActiveVectorStyle(vectorStyleUrl.trim());
                  // Không log token hoặc full secret
                  const sanitized = vectorStyleUrl.replace(/key=[^&]+/gi, 'key=***');
                  onLogEvent?.('map', false, 'Áp dụng Vector Style URL', sanitized);
                }
              }}
              style={{
                padding: '7px 14px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Áp dụng
            </button>
            {activeVectorStyle && (
              <button
                type="button"
                onClick={() => {
                  setActiveVectorStyle(undefined);
                  setVectorStyleUrl('');
                  onLogEvent?.('map', false, 'Khôi phục Style mặc định');
                }}
                style={{
                  padding: '7px 12px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Mặc định
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chi tiết điểm đang chọn */}
      {selectedDestination && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: '#f0f9ff',
          borderRadius: '10px',
          border: '1px solid #bae6fd',
          fontSize: '0.84rem',
        }}>
          <div>
            <strong style={{ color: '#0369a1' }}>{selectedDestination.name}</strong>
            <span style={{ color: '#64748b', marginLeft: '6px' }}>({selectedDestination.province})</span>
            <span style={{
              marginLeft: '8px',
              fontSize: '0.72rem',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700,
            }}>
              {selectedDestination.category}
            </span>
          </div>

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDestination.latitude},${selectedDestination.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '5px 12px',
              background: 'linear-gradient(135deg, #0984e3 0%, #00cec9 100%)',
              color: '#ffffff',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.76rem',
              textDecoration: 'none',
            }}
          >
            Chỉ đường ↗
          </a>
        </div>
      )}
    </div>
  );
}
