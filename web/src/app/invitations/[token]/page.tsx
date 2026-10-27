'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { Navbar } from '@/components/common/Navbar';

export default function InvitationAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === 'string' ? params.token : 'VISTA-NG2026';

  const [testState, setTestState] = useState<'PENDING' | 'REVOKED' | 'EXPIRED' | 'ACCEPTED'>('PENDING');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Parse simulated status from token if encoded
  useEffect(() => {
    if (token.toLowerCase().includes('revoked')) {
      setTestState('REVOKED');
    } else if (token.toLowerCase().includes('expired')) {
      setTestState('EXPIRED');
    }
  }, [token]);

  const handleAccept = () => {
    if (testState === 'REVOKED') {
      setStatusMessage('❌ Lời mời này đã bị Trưởng nhóm (Owner) thu hồi! Bạn không thể tham gia chuyến đi.');
      return;
    }
    if (testState === 'EXPIRED') {
      setStatusMessage('❌ Lời mời này đã quá thời hạn 7 ngày và bị hết hạn! Vui lòng xin mã mời mới.');
      return;
    }
    if (testState === 'ACCEPTED') {
      setStatusMessage('❌ Lời mời này đã được sử dụng trước đó (Conflict 409)! Không thể tái sử dụng.');
      return;
    }

    // Success: Add new member to local storage trip data
    try {
      const stored = localStorage.getItem('vista_custom_trips');
      let trips = stored ? JSON.parse(stored) : [];
      let trip = trips.find((t: any) => t.id === 'trip-danang-2026');

      const newMember = {
        name: 'Nguyễn Văn B (Bạn vừa tham gia)',
        avatar: 'VB',
        color: '#10B981',
        role: 'Thành viên',
      };

      if (!trip) {
        trip = {
          id: 'trip-danang-2026',
          title: 'Khám phá Đà Nẵng - Hội An 4N3Đ',
          destination: 'Đà Nẵng & Quảng Nam',
          startDate: '15/11/2026',
          endDate: '18/11/2026',
          members: [
            { name: 'Lê Vân Anh (Trưởng nhóm)', avatar: 'VA', color: '#0284c7', role: 'Trưởng nhóm' },
            { name: 'Trần Minh Tuấn', avatar: 'MT', color: '#10b981', role: 'Thành viên' },
            { name: 'Nguyễn Hoàng Nam', avatar: 'HN', color: '#f59e0b', role: 'Thành viên' },
            newMember,
          ],
        };
        trips.push(trip);
      } else {
        if (!trip.members) trip.members = [];
        if (!trip.members.some((m: any) => m.name.includes('Nguyễn Văn B'))) {
          trip.members.push(newMember);
        }
      }
      localStorage.setItem('vista_custom_trips', JSON.stringify(trips));
    } catch {
      // ignore
    }

    setIsSuccess(true);
    setTestState('ACCEPTED');
    setStatusMessage('🎉 Chúc mừng! Bạn đã chấp nhận lời mời và trở thành thành viên chính thức của nhóm.');

    setTimeout(() => {
      router.push('/trips/trip-danang-2026?tab=members');
    }, 1800);
  };

  const handleDecline = () => {
    setStatusMessage('⚠️ Bạn đã chọn TỪ CHỐI lời mời. Bạn không được thêm vào danh sách thành viên của nhóm.');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', paddingBottom: '80px' }}>
      <Navbar activeModule="trips" />

      <main style={{ maxWidth: '640px', margin: '40px auto 0', padding: '0 20px' }}>
        {/* Banner kiểm thử Tuần 3 / Tuần 4 */}
        <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: '16px', padding: '14px 18px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎯</span>
            <strong style={{ fontSize: '14px', color: '#1E40AF' }}>
              Trạng thái kiểm tra Lời mời
            </strong>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
            Chọn trường hợp muốn thử nghiệm bên dưới để kiểm tra phản hồi của hệ thống:
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setTestState('PENDING'); setStatusMessage(null); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid #93C5FD',
                background: testState === 'PENDING' ? '#0284C7' : '#FFFFFF',
                color: testState === 'PENDING' ? '#FFFFFF' : '#0369A1',
                cursor: 'pointer',
              }}
            >
              1. Hợp lệ (PENDING)
            </button>
            <button
              type="button"
              onClick={() => { setTestState('REVOKED'); setStatusMessage(null); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid #FECACA',
                background: testState === 'REVOKED' ? '#DC2626' : '#FFFFFF',
                color: testState === 'REVOKED' ? '#FFFFFF' : '#B91C1C',
                cursor: 'pointer',
              }}
            >
              2. Đã thu hồi (REVOKED)
            </button>
            <button
              type="button"
              onClick={() => { setTestState('EXPIRED'); setStatusMessage(null); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid #FED7AA',
                background: testState === 'EXPIRED' ? '#EA580C' : '#FFFFFF',
                color: testState === 'EXPIRED' ? '#FFFFFF' : '#C2410C',
                cursor: 'pointer',
              }}
            >
              3. Hết hạn (EXPIRED)
            </button>
            <button
              type="button"
              onClick={() => { setTestState('ACCEPTED'); setStatusMessage(null); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid #CBD5E1',
                background: testState === 'ACCEPTED' ? '#475569' : '#FFFFFF',
                color: testState === 'ACCEPTED' ? '#FFFFFF' : '#334155',
                cursor: 'pointer',
              }}
            >
              4. Dùng lại (ACCEPTED - 409)
            </button>
          </div>
        </div>

        {/* Thẻ Lời Mời Chính */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }}>
          {/* Header thiệp mời */}
          <div style={{ background: 'linear-gradient(135deg, #0284C7 0%, #4F46E5 100%)', color: '#FFFFFF', padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '12px' }}>
              ✉️
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px' }}>
              Lời mời tham gia chuyến đi
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
              Trưởng nhóm <strong>Lê Vân Anh</strong> đã mời bạn cùng đồng hành!
            </p>
          </div>

          {/* Chi tiết chuyến đi */}
          <div style={{ padding: '28px' }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Ticket size={16} style={{ color: '#0284C7' }} />
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#64748B' }}>MÃ LỜI MỜI:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284C7', background: '#E0F2FE', padding: '2px 8px', borderRadius: '6px' }}>
                  {token}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '11.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '999px', background: testState === 'PENDING' ? '#DCFCE7' : '#FEE2E2', color: testState === 'PENDING' ? '#15803D' : '#991B1B' }}>
                  {testState}
                </span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px' }}>
                Khám phá Đà Nẵng - Hội An 4N3Đ
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13.5px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} style={{ color: '#0EA5E9' }} />
                  <span>Đà Nẵng & Hội An</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} style={{ color: '#6366F1' }} />
                  <span>15 – 18/11/2026</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} style={{ color: '#F59E0B' }} />
                  <span>3 thành viên đang chờ</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} style={{ color: '#10B981' }} />
                  <span>Vai trò: Thành viên (MEMBER)</span>
                </div>
              </div>
            </div>

            {/* Thông báo kết quả thao tác */}
            {statusMessage && (
              <div style={{
                background: isSuccess ? '#F0FDF4' : '#FEF2F2',
                border: `1.5px solid ${isSuccess ? '#86EFAC' : '#FECACA'}`,
                borderRadius: '14px',
                padding: '14px 18px',
                marginBottom: '20px',
                fontSize: '13.5px',
                color: isSuccess ? '#15803D' : '#991B1B',
                fontWeight: 600,
                lineHeight: '1.5',
              }}>
                {statusMessage}
              </div>
            )}

            {/* Các nút hành động */}
            {!isSuccess && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleAccept}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '13px 24px',
                    background: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                    transition: 'all 0.2s',
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>Chấp nhận vào nhóm</span>
                </button>

                <button
                  type="button"
                  onClick={handleDecline}
                  style={{
                    padding: '13px 20px',
                    background: '#FFFFFF',
                    color: '#64748B',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <XCircle size={17} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                  <span>Từ chối</span>
                </button>
              </div>
            )}

            {isSuccess && (
              <div style={{ textAlign: 'center' }}>
                <Link
                  href="/trips/trip-danang-2026?tab=members"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <span>Xem danh sách thành viên chuyến đi</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

