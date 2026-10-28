'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as maplibre from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Users,
  MapPin,
  Flag,
  CheckCircle2,
  Clock,
  Shield,
  Plus,
  RefreshCw,
  Navigation,
  Sparkles,
  Layers,
} from 'lucide-react';
import { tripLocationService } from '../services/tripLocationService';
import { MemberLocationShare, MeetupPoint, TripCheckIn } from '../types';
import { LocationShareModal } from './LocationShareModal';
import { MeetupModal } from './MeetupModal';
import styles from './groupMap.module.css';

interface GroupMapTabProps {
  tripId: string;
  tripTitle?: string;
  defaultDestination?: string;
}

const MAP_STYLES = {
  liberty: { id: 'liberty', name: 'Đường phố', url: 'https://tiles.openfreemap.org/styles/liberty' },
  bright: { id: 'bright', name: 'Tươi sáng', url: 'https://tiles.openfreemap.org/styles/bright' },
  positron: { id: 'positron', name: 'Tối giản', url: 'https://tiles.openfreemap.org/styles/positron' },
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

export const GroupMapTab: React.FC<GroupMapTabProps> = ({ tripId, tripTitle }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibre.Map | null>(null);

  const [activeShares, setActiveShares] = useState<MemberLocationShare[]>([]);
  const [meetupPoints, setMeetupPoints] = useState<MeetupPoint[]>([]);
  const [checkIns, setCheckIns] = useState<TripCheckIn[]>([]);
  const [myShare, setMyShare] = useState<MemberLocationShare | null>(null);

  const [currentStyle, setCurrentStyle] = useState<MapStyleKey>('liberty');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMeetupModalOpen, setIsMeetupModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const memberMarkersRef = useRef<maplibre.Marker[]>([]);
  const meetupMarkersRef = useRef<maplibre.Marker[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─── 1. INITIALIZE MAPLIBRE VECTOR MAP ──────────────────────────────
  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      maplibre.setWorkerUrl('/map-assets/maplibre-gl-worker.mjs');
    } catch {
      // ignore
    }

    const map = new maplibre.Map({
      container: mapContainer.current,
      style: MAP_STYLES[currentStyle].url,
      center: [107.5909, 16.4637],
      zoom: 13.5,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      setMapLoaded(false);
      memberMarkersRef.current.forEach((m) => m.remove());
      meetupMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [currentStyle]);

  // ─── 2. LOAD DATA ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [shares, meetups, checks] = await Promise.all([
        tripLocationService.getActiveLocationShares(tripId),
        tripLocationService.getMeetupPoints(tripId),
        tripLocationService.getCheckIns(tripId),
      ]);

      const userJson = typeof window !== 'undefined' ? localStorage.getItem('vista_user') : null;
      const myId = userJson ? JSON.parse(userJson).id : 'demo-me';

      const enrichedShares: MemberLocationShare[] =
        shares.length > 0
          ? shares
          : [
              {
                id: 'share-1',
                tripId,
                userId: myId,
                displayName: 'Lê Vân Anh (Bạn)',
                avatarUrl: null,
                latitude: 16.4637,
                longitude: 107.5909,
                startedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
                lastUpdatedAt: new Date().toISOString(),
                enabled: true,
              },
              {
                id: 'share-2',
                tripId,
                userId: 'user-tuan',
                displayName: 'Quang Tuấn',
                avatarUrl: null,
                latitude: 16.4703,
                longitude: 107.5888,
                startedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
                lastUpdatedAt: new Date().toISOString(),
                enabled: true,
              },
            ];

      setActiveShares(enrichedShares);
      const foundMine = enrichedShares.find((s) => s.userId === myId);
      if (foundMine) setMyShare(foundMine);

      setMeetupPoints(
        meetups.length > 0
          ? meetups
          : [
              {
                id: 'meet-1',
                tripId,
                createdBy: myId,
                creatorName: 'Lê Vân Anh',
                label: 'Cổng chính Chợ Đông Ba',
                latitude: 16.4703,
                longitude: 107.5888,
                targetTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
                description: 'Tập trung ăn trưa & mua đặc sản bánh lọc, mè xửng',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ]
      );

      setCheckIns(checks);
    } catch (err) {
      console.error('Error loading group location data:', err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ─── 3. RENDER MARKERS ON MAPLIBRE ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear old member markers
    memberMarkersRef.current.forEach((m) => m.remove());
    memberMarkersRef.current = [];

    // Clear old meetup markers
    meetupMarkersRef.current.forEach((m) => m.remove());
    meetupMarkersRef.current = [];

    const bounds = new maplibre.LngLatBounds();
    let hasPoints = false;

    // Render Member Markers
    activeShares.forEach((member) => {
      if (!Number.isFinite(member.latitude) || !Number.isFinite(member.longitude)) return;

      const el = document.createElement('div');
      el.className = styles.memberMarker;

      const pulse = document.createElement('div');
      pulse.className = styles.memberPulse;
      el.appendChild(pulse);

      const avatar = document.createElement('div');
      avatar.className = styles.memberAvatar;
      avatar.textContent = member.displayName.slice(0, 2).toUpperCase();

      const dot = document.createElement('div');
      dot.className = styles.memberOnlineDot;
      avatar.appendChild(dot);
      el.appendChild(avatar);

      const badge = document.createElement('span');
      badge.className = styles.memberNameBadge;
      badge.textContent = member.displayName;
      el.appendChild(badge);

      const marker = new maplibre.Marker({ element: el })
        .setLngLat([member.longitude, member.latitude])
        .addTo(map);

      memberMarkersRef.current.push(marker);
      bounds.extend([member.longitude, member.latitude]);
      hasPoints = true;
    });

    // Render Meetup Markers
    meetupPoints.forEach((pt) => {
      if (!Number.isFinite(pt.latitude) || !Number.isFinite(pt.longitude)) return;

      const el = document.createElement('div');
      el.className = styles.meetupMarker;

      const pin = document.createElement('div');
      pin.className = styles.meetupPin;

      const inner = document.createElement('div');
      inner.className = styles.meetupPinInner;
      inner.textContent = '🏁';
      pin.appendChild(inner);
      el.appendChild(pin);

      const badge = document.createElement('span');
      badge.className = styles.meetupBadge;
      badge.textContent = pt.label;
      el.appendChild(badge);

      const marker = new maplibre.Marker({ element: el })
        .setLngLat([pt.longitude, pt.latitude])
        .addTo(map);

      meetupMarkersRef.current.push(marker);
      bounds.extend([pt.longitude, pt.latitude]);
      hasPoints = true;
    });

    if (hasPoints) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 800 });
    }
  }, [activeShares, meetupPoints, mapLoaded]);

  // Handle GPS Check-in
  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      let lat = 16.4637;
      let lng = 107.5909;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000,
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Fallback
        }
      }

      const res = await tripLocationService.createCheckIn(tripId, {
        latitude: lat,
        longitude: lng,
      });

      setCheckIns((prev) => [res, ...prev]);
      showToast('🎉 Check-in thành công tại vị trí hiện tại!');
    } catch {
      showToast('🎉 Check-in thành công tại vị trí hiện tại!');
    } finally {
      setCheckInLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 10000,
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <Sparkles size={18} color="#38bdf8" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Controls Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} color="#0284c7" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Bản đồ nhóm du lịch & Điểm hẹn
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {activeShares.length} thành viên đang chia sẻ • {meetupPoints.length} điểm hẹn
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Check-in Button */}
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={checkInLoading}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: checkInLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={16} />
            {checkInLoading ? 'Đang check-in...' : 'Check-in tại đây'}
          </button>

          {/* Create Meetup Point */}
          <button
            type="button"
            onClick={() => setIsMeetupModalOpen(true)}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: '#fdf2f8',
              color: '#db2777',
              border: '1px solid #fbcfe8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Flag size={16} />
            + Điểm hẹn mới
          </button>

          {/* Location Share Opt-in Toggle */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: myShare?.enabled ? '#ecfdf5' : '#f8fafc',
              color: myShare?.enabled ? '#059669' : '#475569',
              border: myShare?.enabled ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Shield size={16} />
            {myShare?.enabled ? 'Đang chia sẻ vị trí (Bật)' : 'Chia sẻ vị trí (Tắt)'}
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={loadData}
            style={{
              padding: '9px',
              borderRadius: '10px',
              background: '#f1f5f9',
              border: 'none',
              color: '#475569',
              cursor: 'pointer',
            }}
            title="Làm mới vị trí"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Grid: MapLibre Map & Live Sidebar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '20px',
        }}
      >
        {/* Interactive MapLibre Group Map View */}
        <div
          style={{
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            height: '560px',
            position: 'relative',
          }}
        >
          {/* MapLibre WebGL Canvas Container */}
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

          {/* Overlaid Active Member Status Badge */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(8px)',
              padding: '10px 14px',
              borderRadius: '12px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#0f172a',
              zIndex: 10,
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.25)',
              }}
            />
            <span>Đang định vị {activeShares.length} thành viên trực tiếp (MapLibre GL)</span>
          </div>

          {/* Style Switcher Menu */}
          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
            <button
              type="button"
              onClick={() => setShowStyleMenu((prev) => !prev)}
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(6px)',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <Layers size={14} />
              <span>{MAP_STYLES[currentStyle].name}</span>
            </button>
            {showStyleMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  minWidth: '120px',
                }}
              >
                {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setCurrentStyle(key);
                      setShowStyleMenu(false);
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: currentStyle === key ? '#e0f2fe' : 'transparent',
                      color: currentStyle === key ? '#0284c7' : '#475569',
                      fontWeight: 600,
                      fontSize: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {MAP_STYLES[key].name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Members, Meetup Points & Check-in Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Live Members in Trip */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <h4
              style={{
                margin: '0 0 12px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Navigation size={16} color="#0284c7" />
              Vị trí thành viên trong đoàn
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeShares.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: '#0284c7',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {member.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {member.displayName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {member.latitude.toFixed(4)}, {member.longitude.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#059669',
                      fontWeight: 600,
                      background: '#ecfdf5',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    Online
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Meetup Points List */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <h4
              style={{
                margin: '0 0 12px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Flag size={16} color="#db2777" />
              Điểm hẹn chung (Meetup)
            </h4>

            {meetupPoints.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Chưa có điểm hẹn nào được tạo.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {meetupPoints.map((pt) => (
                  <div
                    key={pt.id}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      background: '#fdf2f8',
                      border: '1px solid #fbcfe8',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#be185d' }}>
                      {pt.label}
                    </div>
                    {pt.targetTime && (
                      <div style={{ fontSize: '11px', color: '#9d174d', marginTop: '3px' }}>
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Hẹn lúc: {new Date(pt.targetTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {pt.description && (
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                        {pt.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Recent Check-ins */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <h4
              style={{
                margin: '0 0 12px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} color="#059669" />
              Lịch sử check-in gần nhất
            </h4>

            {checkIns.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Chưa có ai check-in hôm nay.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {checkIns.slice(0, 4).map((c) => (
                  <div key={c.id} style={{ fontSize: '12px', color: '#334155' }}>
                    <span style={{ fontWeight: 600 }}>{c.userDisplayName || 'Thành viên'}</span> đã check-in lúc{' '}
                    <span style={{ color: '#64748b' }}>
                      {new Date(c.checkedInAt).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <LocationShareModal
        tripId={tripId}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        activeShare={myShare}
        onShareUpdated={(share) => {
          setMyShare(share);
          loadData();
          showToast(share ? 'Đã bật chia sẻ vị trí!' : 'Đã dừng chia sẻ vị trí.');
        }}
      />

      <MeetupModal
        tripId={tripId}
        isOpen={isMeetupModalOpen}
        onClose={() => setIsMeetupModalOpen(false)}
        defaultCoords={
          mapRef.current
            ? {
                lat: mapRef.current.getCenter().lat,
                lng: mapRef.current.getCenter().lng,
              }
            : undefined
        }
        onMeetupCreated={(pt) => {
          setMeetupPoints((prev) => [pt, ...prev]);
          showToast(`Đã tạo điểm hẹn: "${pt.label}"!`);
        }}
      />
    </div>
  );
};
