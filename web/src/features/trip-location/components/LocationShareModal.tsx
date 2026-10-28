'use client';

import React, { useState } from 'react';
import { Shield, Clock, MapPin, X, AlertCircle } from 'lucide-react';
import { tripLocationService } from '../services/tripLocationService';
import { MemberLocationShare } from '../types';

interface LocationShareModalProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
  activeShare: MemberLocationShare | null;
  onShareUpdated: (share: MemberLocationShare | null) => void;
}

export const LocationShareModal: React.FC<LocationShareModalProps> = ({
  tripId,
  isOpen,
  onClose,
  activeShare,
  onShareUpdated,
}) => {
  const [durationHours, setDurationHours] = useState<number>(4);
  const [consent, setConsent] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartShare = async () => {
    if (!consent) {
      setError('Bạn cần đồng ý chia sẻ vị trí để tiếp tục.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Get current GPS position
      let lat: number | undefined;
      let lng: number | undefined;

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
          // GPS fallback: default destination area
          lat = 16.0544;
          lng = 108.2022;
        }
      }

      const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
      const result = await tripLocationService.startLocationShare(tripId, {
        consent: true,
        expiresAt,
        latitude: lat,
        longitude: lng,
      });

      onShareUpdated(result);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi bật chia sẻ vị trí.');
    } finally {
      setLoading(false);
    }
  };

  const handleStopShare = async () => {
    setLoading(true);
    setError(null);
    try {
      await tripLocationService.stopLocationShare(tripId);
      onShareUpdated(null);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi dừng chia sẻ vị trí.');
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
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={24} color="#059669" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              Bản đồ nhóm & Vị trí (Opt-in)
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Bảo vệ an toàn & kết nối thành viên trong đoàn
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
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

        {activeShare ? (
          <div>
            <div
              style={{
                padding: '14px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 600 }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    display: 'inline-block',
                  }}
                />
                Đang chia sẻ vị trí trực tiếp
              </div>
              <p style={{ fontSize: '12px', color: '#15803d', margin: '6px 0 0' }}>
                Hết hạn lúc: {new Date(activeShare.expiresAt).toLocaleTimeString('vi-VN')} ngày{' '}
                {new Date(activeShare.expiresAt).toLocaleDateString('vi-VN')}. Tọa độ sẽ tự động xóa khi hết giờ.
              </p>
            </div>

            <button
              onClick={handleStopShare}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Đang xử lý...' : 'Dừng chia sẻ vị trí ngay'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                <Clock size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                Thời lượng chia sẻ:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[1, 4, 8, 24].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setDurationHours(hours)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '8px',
                      border: durationHours === hours ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: durationHours === hours ? '#e0f2fe' : '#f8fafc',
                      color: durationHours === hours ? '#0284c7' : '#475569',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {hours === 24 ? 'Cả ngày' : `${hours} giờ`}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '12px',
                color: '#64748b',
                lineHeight: 1.5,
                marginBottom: '16px',
              }}
            >
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Cam kết quyền riêng tư:</div>
              • Vị trí của bạn chỉ chia sẻ riêng tư với các thành viên trong chuyến đi này.
              <br />
              • Hệ thống sẽ tự động hủy phiên và xóa sạch tọa độ khi hết giờ hoặc chuyến đi kết thúc.
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '13px',
                color: '#1e293b',
                cursor: 'pointer',
                marginBottom: '20px',
              }}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                style={{ marginTop: '2px', accentColor: '#0284c7' }}
              />
              <span>Tôi đồng ý chia sẻ vị trí GPS thời gian thực với các thành viên trong nhóm.</span>
            </label>

            <button
              onClick={handleStartShare}
              disabled={loading || !consent}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: loading || !consent ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <MapPin size={18} />
              {loading ? 'Đang kết nối GPS...' : 'Bật chia sẻ vị trí'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
