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

export default function InvitationAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === 'string' ? params.token : 'VISTA-NG2026';

  const [testState, setTestState] = useState<'PENDING' | 'REVOKED' | 'EXPIRED' | 'ACCEPTED'>('PENDING');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [invitationData, setInvitationData] = useState<{
    tripId?: string;
    tripTitle?: string;
    destination?: string;
    inviterName?: string;
    startDate?: string;
    endDate?: string;
  } | null>(null);

  // Load real invitation details and status from server store or fallback
  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const res = await fetch(`/api/invitations?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status) {
            setTestState(data.status);
            setInvitationData(data);
            if (data.status === 'REVOKED') {
              setIsDeclined(true);
              setStatusMessage('❌ Lời mời này đã bị Trưởng nhóm (Owner) thu hồi hoặc bạn đã từ chối!');
            } else if (data.status === 'EXPIRED') {
              setStatusMessage('❌ Lời mời này đã quá thời hạn và bị hết hạn! Vui lòng xin mã mời mới.');
            } else if (data.status === 'ACCEPTED') {
              setIsSuccess(true);
              setStatusMessage('🎉 Lời mời này đã được chấp nhận và tham gia thành công!');
            }
            return;
          }
        }
      } catch {
        // Fallback to local check below
      }

      if (token.toLowerCase().includes('revoked')) {
        setTestState('REVOKED');
        setIsDeclined(true);
      } else if (token.toLowerCase().includes('expired')) {
        setTestState('EXPIRED');
      }
    };

    fetchInvitation();
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

    // RBAC Auth Guard: Verify logged in user
    let currentUser: any = null;
    try {
      const rawUser = localStorage.getItem('vista_user');
      if (rawUser) currentUser = JSON.parse(rawUser);
    } catch {}

    const tokenAuth = typeof window !== 'undefined' ? localStorage.getItem('vista_token') : null;
    if (!tokenAuth || !currentUser) {
      setStatusMessage('⚠️ Vui lòng đăng nhập tài khoản trước khi chấp nhận lời mời gia nhập nhóm!');
      setTimeout(() => {
        router.push(`/login?returnUrl=${encodeURIComponent(`/invitations/${token}`)}`);
      }, 1500);
      return;
    }

    const rawName = currentUser.displayName || currentUser.email || 'Thành viên mới';
    const cleanName = rawName.replace(/\s*\(Bạn.*?\)/gi, '').trim() || 'Thành viên mới';
    const parts = cleanName.split(/\s+/);
    const initials = (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : cleanName.slice(0, 2)).toUpperCase();

    const newMember = {
      name: cleanName,
      avatar: initials || 'TV',
      color: '#0284c7',
      role: 'Thành viên',
      userId: currentUser.id || 'u-me',
      email: currentUser.email || '',
    };

    const targetTripId = invitationData?.tripId || 'trip-1794386330666';
    const targetTripTitle = invitationData?.tripTitle || 'Khám phá chuyến đi VISTA';
    const targetDest = invitationData?.destination || 'Việt Nam';
    const targetStartDate = invitationData?.startDate || '11/11/2026';
    const targetEndDate = invitationData?.endDate || '15/11/2026';

    // Success: Add real logged in user to local storage trip data
    try {
      const stored = localStorage.getItem('vista_custom_trips');
      let trips = stored ? JSON.parse(stored) : [];
      let trip = trips.find((t: any) => t.id === targetTripId);

      if (!trip) {
        trip = {
          id: targetTripId,
          title: targetTripTitle,
          destination: targetDest,
          startDate: targetStartDate,
          endDate: targetEndDate,
          members: [
            { name: invitationData?.inviterName || 'Trưởng nhóm', avatar: 'TN', color: '#0284c7', role: 'Trưởng nhóm' },
            newMember,
          ],
        };
        trips.push(trip);
      } else {
        if (!trip.members) trip.members = [];
        const alreadyIn = trip.members.some(
          (m: any) =>
            (m.userId && m.userId === newMember.userId) ||
            (m.email && newMember.email && m.email.toLowerCase() === newMember.email.toLowerCase()) ||
            m.name.trim().toLowerCase() === newMember.name.trim().toLowerCase()
        );
        if (!alreadyIn) {
          trip.members.push(newMember);
        }
      }
      localStorage.setItem('vista_custom_trips', JSON.stringify(trips));
      window.dispatchEvent(new CustomEvent('vista-trips-change'));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }

    // Notify server about ACCEPT and update trips store synchronously
    try {
      fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACCEPT',
          status: 'ACCEPTED',
          token,
          user: newMember,
          tripId: targetTripId,
          email: currentUser.email || (invitationData as any)?.inviteeEmail || '',
        }),
      }).catch(() => {});

      fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetTripId,
          members: [newMember],
        }),
      }).catch(() => {});
    } catch {}

    setIsSuccess(true);
    setTestState('ACCEPTED');
    setStatusMessage(`🎉 Chúc mừng ${cleanName}! Bạn đã chấp nhận lời mời và trở thành thành viên chính thức của chuyến đi.`);

    setTimeout(() => {
      router.push(`/trips/${targetTripId}?tab=members`);
    }, 1800);
  };

  const handleStartDecline = () => {
    setShowDeclineConfirm(true);
  };

  const handleCancelDecline = () => {
    setShowDeclineConfirm(false);
  };

  const handleConfirmDecline = () => {
    setShowDeclineConfirm(false);
    setIsDeclined(true);
    setTestState('REVOKED');
    setStatusMessage('❌ Bạn đã chọn TỪ CHỐI lời mời. Bạn không tham gia chuyến đi này.');

    try {
      fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REVOKE', token }),
      }).catch(() => {});
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', paddingBottom: '80px' }}>
      <main style={{ maxWidth: '640px', margin: '40px auto 0', padding: '0 20px' }}>
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
              Trưởng nhóm <strong>{invitationData?.inviterName || 'Lê Vân Anh'}</strong> đã mời bạn cùng đồng hành!
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
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: isDeclined || testState === 'REVOKED' ? '#FEE2E2' : testState === 'ACCEPTED' ? '#E0F2FE' : testState === 'EXPIRED' ? '#FFEDD5' : '#DCFCE7',
                  color: isDeclined || testState === 'REVOKED' ? '#991B1B' : testState === 'ACCEPTED' ? '#0369A1' : testState === 'EXPIRED' ? '#C2410C' : '#15803D'
                }}>
                  {isDeclined ? 'Đã từ chối' : testState === 'REVOKED' ? 'Đã thu hồi' : testState === 'ACCEPTED' ? 'Đã tham gia' : testState === 'EXPIRED' ? 'Hết hạn' : 'Có hiệu lực'}
                </span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px' }}>
                {invitationData?.tripTitle || 'Khám phá Đà Nẵng - Hội An 4N3Đ'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13.5px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} style={{ color: '#0EA5E9' }} />
                  <span>{invitationData?.destination || 'Đà Nẵng & Hội An'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} style={{ color: '#6366F1' }} />
                  <span>{invitationData?.startDate && invitationData?.endDate ? `${invitationData.startDate} – ${invitationData.endDate}` : '15 – 18/11/2026'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} style={{ color: '#F59E0B' }} />
                  <span>Thành viên đang chờ</span>
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

            {/* Hộp xác nhận khi nhấn Từ chối */}
            {showDeclineConfirm && (
              <div style={{
                background: '#FFF1F2',
                border: '1.5px solid #FECDD3',
                borderRadius: '16px',
                padding: '18px 20px',
                marginBottom: '20px',
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <strong style={{ fontSize: '15px', color: '#9F1239' }}>
                    Bạn có muốn từ chối lời mời này không?
                  </strong>
                </div>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#881337', lineHeight: '1.5' }}>
                  Nếu chọn <strong>"Có, từ chối"</strong>, lời mời sẽ bị hủy bỏ và bạn sẽ không thể tham gia chuyến đi bằng mã này nữa.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCancelDecline}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Không, giữ lại
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDecline}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#E11D48',
                      color: '#FFFFFF',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
                    }}
                  >
                    Có, từ chối
                  </button>
                </div>
              </div>
            )}

            {/* Các nút hành động chính: MẤT ĐI khi đã từ chối (isDeclined) hoặc đã chấp nhận (isSuccess) */}
            {!isSuccess && !isDeclined && testState === 'PENDING' && !showDeclineConfirm && (
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
                  onClick={handleStartDecline}
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

            {/* Sau khi đã chấp nhận: Nút dẫn vào nhóm */}
            {isSuccess && (
              <div style={{ textAlign: 'center' }}>
                <Link
                  href={`/trips/${invitationData?.tripId || 'demo-danang-2026'}?tab=members`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '13px 24px',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    borderRadius: '12px',
                    fontSize: '14.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    width: '100%',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  <span>Xem danh sách thành viên chuyến đi</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}

            {/* Sau khi đã từ chối: Nút biến mất, hiện nút quay về trang chủ */}
            {(isDeclined || testState === 'REVOKED' || testState === 'EXPIRED') && !isSuccess && (
              <div style={{ textAlign: 'center' }}>
                <Link
                  href="/"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '13px 24px',
                    background: '#F1F5F9',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    width: '100%',
                  }}
                >
                  <span>← Quay về Trang chủ</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

