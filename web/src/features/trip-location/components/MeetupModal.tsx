'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as maplibre from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Flag,
  X,
  Clock,
  MapPin,
  AlertCircle,
  Search,
  Crosshair,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { tripLocationService } from '../services/tripLocationService';
import { MeetupPoint } from '../types';

interface MeetupModalProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
  onMeetupCreated: (point: MeetupPoint) => void;
  defaultCoords?: { lat: number; lng: number };
}

interface GeocodingResult {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
}

export const MeetupModal: React.FC<MeetupModalProps> = ({
  tripId,
  isOpen,
  onClose,
  onMeetupCreated,
  defaultCoords,
}) => {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [targetTime, setTargetTime] = useState('');

  // Default coordinates: Hue or provided coordinates
  const initialLat = defaultCoords?.lat && Number.isFinite(defaultCoords.lat) ? defaultCoords.lat : 16.4637;
  const initialLng = defaultCoords?.lng && Number.isFinite(defaultCoords.lng) ? defaultCoords.lng : 107.5909;

  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Address search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showManualCoords, setShowManualCoords] = useState(false);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibre.Map | null>(null);
  const markerRef = useRef<maplibre.Marker | null>(null);

  // Initialize and resize map when modal opens
  useEffect(() => {
    if (!isOpen) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const startLat = lat || initialLat;
      const startLng = lng || initialLng;

      const map = new maplibre.Map({
        container: mapContainerRef.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [startLng, startLat],
        zoom: 14,
        attributionControl: false,
      });

      map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');

      // Create interactive draggable pin
      const el = document.createElement('div');
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.cursor = 'grab';
      el.innerHTML = `
        <svg viewBox="0 0 24 24" width="32" height="32" fill="#db2777" stroke="#ffffff" stroke-width="1.5" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); transform: translateY(-14px);">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
        </svg>
      `;

      const marker = new maplibre.Marker({ element: el, draggable: true })
        .setLngLat([startLng, startLat])
        .addTo(map);

      // When dragging pin
      marker.on('dragend', () => {
        const coords = marker.getLngLat();
        setLat(coords.lat);
        setLng(coords.lng);
      });

      // When clicking on the map, move pin to clicked spot
      map.on('click', (e) => {
        marker.setLngLat(e.lngLat);
        setLat(e.lngLat.lat);
        setLng(e.lngLat.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;

      // Force canvas resize to fit container
      map.resize();
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Update marker position when lat/lng change from external source
  const updateMapPosition = (newLat: number, newLng: number, zoom = 15) => {
    setLat(newLat);
    setLng(newLng);
    if (markerRef.current) {
      markerRef.current.setLngLat([newLng, newLat]);
    }
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [newLng, newLat],
        zoom,
        essential: true,
      });
    }
  };

  // Search address via OpenStreetMap Nominatim
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowResults(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery.trim()
      )}&countrycodes=vn&limit=5`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'vi',
        },
      });
      const data: GeocodingResult[] = await res.json();
      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Pick search result
  const handleSelectLocation = (item: GeocodingResult) => {
    const parsedLat = parseFloat(item.lat);
    const parsedLng = parseFloat(item.lon);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      updateMapPosition(parsedLat, parsedLng, 16);
      if (!label.trim()) {
        const shortName = item.name || item.display_name.split(',')[0];
        setLabel(shortName);
      }
    }
    setShowResults(false);
  };

  // Get user GPS position
  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        updateMapPosition(pos.coords.latitude, pos.coords.longitude, 16);
      },
      () => {
        setLoading(false);
        setError('Không thể lấy vị trí GPS hiện tại. Vui lòng bấm trực tiếp trên bản đồ.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Vui lòng nhập tên điểm hẹn.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await tripLocationService.createMeetupPoint(tripId, {
        label: label.trim(),
        latitude: lat,
        longitude: lng,
        targetTime: targetTime ? new Date(targetTime).toISOString() : undefined,
        description: description.trim() || undefined,
      });
      onMeetupCreated(res);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi tạo điểm hẹn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#fdf2f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flag size={22} color="#db2777" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                Tạo điểm hẹn chung (Meetup)
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Tìm kiếm đường phố hoặc nhấp trực tiếp trên bản đồ để ghim
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              border: 'none',
              background: '#f1f5f9',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                color: '#dc2626',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Search Location Bar */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              🔍 Tìm vị trí hoặc tên đường
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="VD: Đường Lê Lợi Huế, Chợ Đông Ba, Đại Nội..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <Search
                  size={18}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={isSearching}
                style={{
                  padding: '0 16px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Tìm'}
              </button>

              <button
                type="button"
                onClick={handleGetCurrentGps}
                title="Dùng vị trí GPS hiện tại của tôi"
                style={{
                  padding: '0 12px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0284c7',
                  whiteSpace: 'nowrap',
                }}
              >
                <Crosshair size={16} />
                <span>GPS tôi</span>
              </button>
            </div>

            {/* Search Dropdown Results */}
            {showResults && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  marginTop: '4px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {searchResults.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                    Không tìm thấy địa điểm nào. Bạn có thể bấm trực tiếp lên bản đồ bên dưới.
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <div
                      key={item.place_id}
                      onClick={() => handleSelectLocation(item)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <MapPin size={16} color="#db2777" style={{ flexShrink: 0 }} />
                      <span style={{ color: '#0f172a', fontWeight: 500 }}>{item.display_name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Interactive Map for Pinning */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                📍 Ghim điểm hẹn trên bản đồ:
              </span>
              <span style={{ fontSize: '12px', color: '#db2777', fontWeight: 600 }}>
                Nhấp hoặc kéo thả ghim đỏ
              </span>
            </div>

            <div
              ref={mapContainerRef}
              style={{
                width: '100%',
                height: '240px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                overflow: 'hidden',
                position: 'relative',
                background: '#f8fafc',
              }}
            />

            {/* Pinned Coordinates Tag */}
            <div
              style={{
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#64748b',
              }}
            >
              <span>
                Vị trí đã chọn:{' '}
                <strong style={{ color: '#0f172a' }}>
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </strong>
              </span>

              <button
                type="button"
                onClick={() => setShowManualCoords(!showManualCoords)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: 0,
                }}
              >
                {showManualCoords ? 'Ẩn tọa độ' : 'Chỉnh tay'}
                {showManualCoords ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* Optional Collapsed Manual Coordinates */}
            {showManualCoords && (
              <div
                style={{
                  marginTop: '8px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Vĩ độ (Lat)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => updateMapPosition(parseFloat(e.target.value) || 0, lng)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Kinh độ (Lng)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => updateMapPosition(lat, parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form details */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Tên điểm hẹn *
              </label>
              <input
                type="text"
                placeholder="VD: Cổng chính Chợ Đông Ba, Quán cà phê..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                <Clock size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Thời gian hẹn tập trung
              </label>
              <input
                type="datetime-local"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Ghi chú cho các thành viên
              </label>
              <textarea
                rows={2}
                placeholder="VD: Tập trung chụp ảnh lưu niệm, ăn bún bò lúc 12h..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  resize: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#db2777',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(219, 39, 119, 0.3)',
              }}
            >
              <MapPin size={18} />
              {loading ? 'Đang tạo điểm hẹn...' : 'Ghim điểm hẹn lên bản đồ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
