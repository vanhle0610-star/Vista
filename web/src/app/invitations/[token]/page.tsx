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
import { apiRequest } from '@/lib/api';

export default function InvitationAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [testState, setTestState] = useState<'PENDING' | 'REVOKED' | 'EXPIRED' | 'ACCEPTED'>('PENDING');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [invitationData, setInvitationData] = useState<{
    id?: string;
    tripId?: string;
    tripTitle?: string;
    destinationSummary?: string;
    inviteeEmail?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    expiresAt?: string;
  } | null>(null);

  // Load real invitation preview from backend (SSOT)
  useEffect(() => {
    if (!token) return;

    const fetchInvitation = async () => {
      try {
        const data = await apiRequest<any>(`/invitations/${encodeURIComponent(token)}/preview`);
        if (data) {
          setInvitationData(data);
          const st = data.status || 'PENDING';
          setTestState(st);

          if (st === 'REVOKED') {
            setIsDeclined(true);
            setErrorMessage('❌ Lời mời này đã bị Trưởng nhóm (Owner) thu hồi hoặc đã bị hủy.');
          } else if (st === 'EXPIRED') {
            setErrorMessage('❌ Lời mời này đã quá thời hạn và bị hết hạn! Vui lòng xin mã mời mới.');
          } else if (st === 'ACCEPTED') {
            setIsSuccess(true);
            setStatusMessage('🎉 Lời mời này đã được chấp nhận và tham gia thành công trước đó.');
          }
        }
      } catch (err: any) {
        console.error('Failed to preview invitation:', err);
        setErrorMessage(err?.message || 'Không thể tìm thấy thông tin lời mời. Vui lòng kiểm tra lại liên kết.');
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (testState === 'REVOKED') {
      setErrorMessage('❌ Lời mời này đã bị thu hồi! Bạn không thể tham gia chuyến đi.');
      return;
    }
    if (testState === 'EXPIRED') {
      setErrorMessage('❌ Lời mời này đã hết hạn! Vui lòng xin mã mời mới từ Trưởng nhóm.');
      return;
    }
    if (testState === 'ACCEPTED') {
      setErrorMessage('❌ Lời mời này đã được sử dụng trước đó (Conflict 409)! Không thể tái sử dụng.');
      return;
    }

    // RBAC Auth Guard: Verify logged in user
    let tokenAuth: string | null = null;
    let currentUser: any = null;
    try {
      tokenAuth = localStorage.getItem('vista_token');
      const rawUser = localStorage.getItem('vista_user');
      if (rawUser) currentUser = JSON.parse(rawUser);
    } catch {}

    if (!tokenAuth || !currentUser) {
      setErrorMessage('⚠️ Vui lòng đăng nhập tài khoản trước khi chấp nhận lời mời gia nhập nhóm!');
      setTimeout(() => {
        router.push(`/login?returnUrl=${encodeURIComponent(`/invitations/${token}`)}`);
      }, 1500);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Gọi trực tiếp Spring Boot API: Single Source of Truth
      const response = await apiRequest<any>(`/invitations/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
      });

      const cleanName = currentUser.displayName || currentUser.email || 'Thành viên';
      setIsSuccess(true);
      setTestState('ACCEPTED');
      setStatusMessage(`🎉 Chúc mừng ${cleanName}! Bạn đã được thêm vào cơ sở dữ liệu chuyến đi với vai trò Thành viên (MEMBER).`);

      const targetTripId = response?.tripId || invitationData?.tripId;
      if (targetTripId && /^[0-9a-f-]{36}$/i.test(targetTripId)) {
        try {
          await apiRequest('/invitations/sync-membership', {
            method: 'POST',
            body: JSON.stringify({ tripId: targetTripId }),
          });
        } catch {}
      }

      if (targetTripId) {
        setTimeout(() => {
          router.push(`/trips/${targetTripId}?tab=members`);
        }, 1500);
      }
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      setIsSuccess(false);
      setErrorMessage(
        err?.message ||
        'Không thể tham gia chuyến đi. Vui lòng kiểm tra xem tài khoản đăng nhập có khớp với email được mời hay không.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartDecline = () => {
    setShowDeclineConfirm(true);
  };

  const handleCancelDecline = () => {
    setShowDeclineConfirm(false);
  };

  const handleConfirmDecline = async () => {
    setShowDeclineConfirm(false);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest<any>(`/invitations/${encodeURIComponent(token)}/decline`, {
        method: 'POST',
      });

      setIsDeclined(true);
      setTestState('REVOKED');
      setStatusMessage('❌ Bạn đã từ chối lời mời. Bạn không tham gia chuyến đi này.');
    } catch (err: any) {
      console.error('Failed to decline invitation:', err);
      setErrorMessage(err?.message || 'Không thể từ chối lời mời vào lúc này. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
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
              Bạn nhận được lời mời tham gia chuyến đi từ nền tảng <strong>VISTA</strong>!
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
                {invitationData?.tripTitle || 'Chuyến đi VISTA'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13.5px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} style={{ color: '#0EA5E9' }} />
                  <span>{invitationData?.destinationSummary || 'Việt Nam'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} style={{ color: '#6366F1' }} />
                  <span>{invitationData?.startDate && invitationData?.endDate ? `${invitationData.startDate} – ${invitationData.endDate}` : 'Lịch trình linh hoạt'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} style={{ color: '#F59E0B' }} />
                  <span>Người nhận: {invitationData?.inviteeEmail || 'Theo thư mời'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} style={{ color: '#10B981' }} />
                  <span>Vai trò: Thành viên (MEMBER)</span>
                </div>
              </div>
            </div>

            {/* Thông báo thành công */}
            {statusMessage && (
              <div style={{
                background: '#F0FDF4',
                border: '1.5px solid #86EFAC',
                borderRadius: '14px',
                padding: '14px 18px',
                marginBottom: '20px',
                fontSize: '13.5px',
                color: '#15803D',
                fontWeight: 600,
                lineHeight: '1.5',
              }}>
                {statusMessage}
              </div>
            )}

            {/* Thông báo lỗi thực tế từ Backend */}
            {errorMessage && (
              <div style={{
                background: '#FEF2F2',
                border: '1.5px solid #FECACA',
                borderRadius: '14px',
                padding: '14px 18px',
                marginBottom: '20px',
                fontSize: '13.5px',
                color: '#991B1B',
                fontWeight: 600,
                lineHeight: '1.5',
              }}>
                {errorMessage}
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
                  Nếu chọn <strong>"Có, từ chối"</strong>, trạng thái lời mời sẽ cập nhật thành DECLINED và bạn sẽ không thể tham gia chuyến đi bằng mã này nữa.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCancelDecline}
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                    {isSubmitting ? 'Đang xử lý...' : 'Có, từ chối'}
                  </button>
                </div>
              </div>
            )}

            {/* Các nút hành động chính */}
            {!isSuccess && !isDeclined && testState === 'PENDING' && !showDeclineConfirm && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={isSubmitting}
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
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                    opacity: isSubmitting ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>{isSubmitting ? 'Đang xác thực...' : 'Chấp nhận vào nhóm'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartDecline}
                  disabled={isSubmitting}
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
                  href={`/trips/${invitationData?.tripId}?tab=members`}
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

            {/* Sau khi đã từ chối: Nút quay về trang chủ */}
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
