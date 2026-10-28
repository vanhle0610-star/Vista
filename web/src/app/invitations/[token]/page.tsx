'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Ticket,
  Copy,
  Crown,
} from 'lucide-react';
import { Navbar } from '@/components/common/Navbar';

interface TripData {
  id: string;
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  role?: string;
  members?: Array<{ name: string; avatar?: string; color?: string; role?: string; email?: string }>;
}

export default function InvitationAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = typeof params?.token === 'string' ? params.token : 'VISTA-NG2026';
  const isDevMode = searchParams.get('dev') === 'true';

  const [testState, setTestState] = useState<'PENDING' | 'REVOKED' | 'EXPIRED' | 'ACCEPTED'>('PENDING');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // User and membership state
  const [currentUser, setCurrentUser] = useState<{ id?: string; email?: string; displayName?: string; name?: string } | null>(null);
  const [tripData, setTripData] = useState<TripData>({
    id: 'trip-danang-2026',
    title: 'Khám phá Đà Nẵng - Hội An 4N3Đ',
    destination: 'Đà Nẵng & Hội An',
    startDate: '15/11/2026',
    endDate: '18/11/2026',
    members: [
      { name: 'Quý Nguyễn Đào Văn', avatar: 'QV', color: '#0284c7', role: 'Trưởng nhóm' },
      { name: 'Trần Minh Tuấn', avatar: 'MT', color: '#10b981', role: 'Thành viên' },
      { name: 'Lê Vân Anh', avatar: 'VA', color: '#f59e0b', role: 'Thành viên' },
    ],
  });

  const [invitationMeta, setInvitationMeta] = useState<{
    id?: string;
    email?: string;
    token: string;
    status: 'PENDING' | 'REVOKED' | 'EXPIRED' | 'ACCEPTED';
    expiresAt?: string;
    tripId?: string;
  } | null>(null);

  // Load user & trip data
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Read current logged in user
    let user: { id?: string; email?: string; displayName?: string; name?: string } | null = null;
    try {
      const userStr = localStorage.getItem('vista_user');
      if (userStr) {
        user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch {}

    // 2. Search for the invitation token in localStorage
    let matchedTripId: string | null = null;
    let matchedInv: any = null;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vista_invitations_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            const found = list.find((it: any) => it.token === token);
            if (found) {
              matchedTripId = key.replace('vista_invitations_', '');
              matchedInv = found;
              break;
            }
          }
        }
      }
    } catch {}

    // Parse status from token string as fallback for demo tokens
    if (!matchedInv) {
      if (token.toLowerCase().includes('revoked')) {
        setTestState('REVOKED');
      } else if (token.toLowerCase().includes('expired')) {
        setTestState('EXPIRED');
      }
    } else {
      setTestState(matchedInv.status || 'PENDING');
      setInvitationMeta({ ...matchedInv, tripId: matchedTripId });
    }

    // 3. Find the matched trip
    try {
      const storedTrips = localStorage.getItem('vista_custom_trips');
      if (storedTrips) {
        const trips: TripData[] = JSON.parse(storedTrips);
        const found = trips.find((t) => t.id === (matchedTripId || 'trip-danang-2026'));
        if (found) {
          setTripData(found);
        }
      }
    } catch {}
  }, [token]);

  // Determine user role in this trip
  const userRole = useMemo<'OWNER' | 'MEMBER' | 'GUEST'>(() => {
    if (!currentUser) return 'GUEST';

    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const userName = (currentUser.displayName || currentUser.name || '').toLowerCase().trim();

    // Check if user is trip creator/owner
    const isOwner =
      tripData.role === 'OWNER' ||
      tripData.members?.some((m) => {
        const mRole = m.role?.toLowerCase() || '';
        const isOwnerRole = mRole.includes('trưởng') || mRole.includes('owner');
        const mEmail = (m.email || '').toLowerCase().trim();
        const mName = (m.name || '').toLowerCase().trim();
        return isOwnerRole && ((userEmail && mEmail === userEmail) || (userName && mName.includes(userName)));
      });

    if (isOwner) return 'OWNER';

    // Check if user is already a member
    const isMember = tripData.members?.some((m) => {
      const mEmail = (m.email || '').toLowerCase().trim();
      const mName = (m.name || '').toLowerCase().trim();
      return (userEmail && mEmail === userEmail) || (userName && mName.includes(userName));
    });

    if (isMember) return 'MEMBER';

    return 'GUEST';
  }, [currentUser, tripData]);

  // Trip owner name
  const tripOwnerName = useMemo(() => {
    const owner = tripData.members?.find((m) => {
      const r = (m.role || '').toLowerCase();
      return r.includes('trưởng') || r.includes('owner');
    });
    return owner?.name?.replace(/\s*\([^)]*\)/, '') || 'Trưởng nhóm';
  }, [tripData]);

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

    // Success: Add new member with real account info to trip
    try {
      const stored = localStorage.getItem('vista_custom_trips');
      let trips = stored ? JSON.parse(stored) : [];
      let trip = trips.find((t: any) => t.id === tripData.id);

      const actualName = currentUser?.displayName || currentUser?.name || currentUser?.email || 'Thành viên mới';
      const initials = actualName.slice(0, 2).toUpperCase();

      const newMember = {
        name: `${actualName} (Bạn vừa tham gia)`,
        email: currentUser?.email,
        avatar: initials,
        color: '#10B981',
        role: 'Thành viên',
      };

      if (!trip) {
        trip = {
          ...tripData,
          members: [...(tripData.members || []), newMember],
        };
        trips.push(trip);
      } else {
        if (!trip.members) trip.members = [];
        if (!trip.members.some((m: any) => m.email && currentUser?.email && m.email === currentUser?.email)) {
          trip.members.push(newMember);
        }
      }
      localStorage.setItem('vista_custom_trips', JSON.stringify(trips));

      // Mark invitation as ACCEPTED in vista_invitations_*
      if (invitationMeta?.tripId) {
        const invKey = `vista_invitations_${invitationMeta.tripId}`;
        const storedInvs = localStorage.getItem(invKey);
        if (storedInvs) {
          const invList = JSON.parse(storedInvs);
          const updated = invList.map((it: any) => (it.token === token ? { ...it, status: 'ACCEPTED' } : it));
          localStorage.setItem(invKey, JSON.stringify(updated));
        }
      }
    } catch {
      // ignore
    }

    setIsSuccess(true);
    setTestState('ACCEPTED');
    setStatusMessage('🎉 Chúc mừng! Bạn đã chấp nhận lời mời và trở thành thành viên chính thức của nhóm.');

    setTimeout(() => {
      router.push(`/trips/${tripData.id}?tab=members`);
    }, 1800);
  };

  const handleDecline = () => {
    setStatusMessage('⚠️ Bạn đã chọn TỪ CHỐI lời mời. Bạn không được thêm vào danh sách thành viên của nhóm.');
  };

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', paddingBottom: '80px' }}>
      <Navbar activeModule="trips" />

      <main style={{ maxWidth: '640px', margin: '40px auto 0', padding: '0 20px' }}>
        {/* Banner kiểm thử dev (Chỉ hiện khi có query param ?dev=true) */}
        {isDevMode && (
          <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: '16px', padding: '14px 18px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>🎯</span>
              <strong style={{ fontSize: '14px', color: '#1E40AF' }}>
                Bảng thử nghiệm trạng thái Lời mời (Dev mode)
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
        )}

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
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14.5px' }}>
              Trưởng nhóm <strong>{tripOwnerName}</strong> đã mời bạn cùng đồng hành!
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
                  background: testState === 'PENDING' ? '#DCFCE7' : testState === 'REVOKED' ? '#FEE2E2' : '#F1F5F9',
                  color: testState === 'PENDING' ? '#15803D' : testState === 'REVOKED' ? '#991B1B' : '#475569',
                }}>
                  {testState === 'REVOKED' ? 'ĐÃ THU HỒI' : testState}
                </span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px' }}>
                {tripData.title}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13.5px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} style={{ color: '#0EA5E9' }} />
                  <span>{tripData.destination}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} style={{ color: '#6366F1' }} />
                  <span>{tripData.startDate && tripData.endDate ? `${tripData.startDate} – ${tripData.endDate}` : 'Thời gian linh hoạt'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} style={{ color: '#F59E0B' }} />
                  <span>{tripData.members?.length || 1} thành viên</span>
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

            {/* XỬ LÝ THEO VAI TRÒ CỦA NGƯỜI ĐANG ĐĂNG NHẬP */}

            {/* CASE 1: BẠN LÀ TRƯỞNG NHÓM (CHỦ SỞ HỮU / NGƯỜI PHÁT HÀNH LỜI MỜI) */}
            {userRole === 'OWNER' && (
              <div style={{ background: '#EFF6FF', border: '1.5px solid #93C5FD', borderRadius: '16px', padding: '22px 20px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#DBEAFE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <Crown size={24} style={{ color: '#0284C7' }} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 800, color: '#1E40AF' }}>
                  Bạn là Trưởng nhóm của chuyến đi này
                </h4>
                <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: '#1E3A8A', lineHeight: '1.5' }}>
                  Bạn chính là người đã tạo chuyến đi và phát hành lời mời này. Bạn đã có toàn quyền quản trị và <strong>không thể tự chấp nhận lời mời của chính mình</strong>.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href={`/trips/${tripData.id}?tab=members`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 22px',
                      background: '#0284C7',
                      color: '#FFFFFF',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                    }}
                  >
                    <span>Quay lại trang Chuyến đi</span>
                    <ArrowRight size={16} />
                  </Link>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '11px 18px',
                      background: '#FFFFFF',
                      border: '1.5px solid #93C5FD',
                      color: '#0369A1',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Copy size={15} />
                    <span>{copiedLink ? 'Đã chép link!' : 'Sao chép link gửi bạn'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* CASE 2: BẠN ĐÃ LÀ THÀNH VIÊN TRONG CHUYẾN ĐI NÀY RỒI */}
            {userRole === 'MEMBER' && (
              <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '16px', padding: '22px 20px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#DCFCE7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <CheckCircle2 size={24} style={{ color: '#16A34A' }} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 800, color: '#15803D' }}>
                  Bạn đã là thành viên của chuyến đi này rồi!
                </h4>
                <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: '#166534', lineHeight: '1.5' }}>
                  Tài khoản của bạn đã có trong danh sách thành viên. Lịch trình và các hoạt động của nhóm đã sẵn sàng cho bạn.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href={`/trips/${tripData.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 22px',
                      background: '#16A34A',
                      color: '#FFFFFF',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                    }}
                  >
                    <span>Vào xem lịch trình chuyến đi</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            )}

            {/* CASE 3: KHÁCH MỚI / NGƯỜI ĐƯỢC MỜI (CHƯA PHẢI THÀNH VIÊN) */}
            {userRole === 'GUEST' && (
              <>
                {testState === 'REVOKED' && (
                  <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#FEE2E2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                      <XCircle size={22} style={{ color: '#DC2626' }} />
                    </div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#991B1B' }}>
                      Lời mời này đã bị thu hồi
                    </h4>
                    <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#7F1D1D', lineHeight: '1.5' }}>
                      Trưởng nhóm đã thu hồi mã mời này. Bạn không thể sử dụng mã này để gia nhập chuyến đi.
                    </p>
                    <Link
                      href="/trips"
                      style={{
                        display: 'inline-block',
                        padding: '9px 18px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#475569',
                        textDecoration: 'none',
                      }}
                    >
                      Về trang danh sách chuyến đi
                    </Link>
                  </div>
                )}

                {testState === 'EXPIRED' && (
                  <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#FFEDD5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                      <XCircle size={22} style={{ color: '#EA580C' }} />
                    </div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#9A3412' }}>
                      Lời mời này đã hết hạn
                    </h4>
                    <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#7C2D12', lineHeight: '1.5' }}>
                      Thời hạn 7 ngày của lời mời đã trôi qua. Vui lòng liên hệ Trưởng nhóm để nhận mã lời mời mới.
                    </p>
                    <Link
                      href="/trips"
                      style={{
                        display: 'inline-block',
                        padding: '9px 18px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#475569',
                        textDecoration: 'none',
                      }}
                    >
                      Về trang danh sách chuyến đi
                    </Link>
                  </div>
                )}

                {testState === 'PENDING' && !isSuccess && (
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
                      href={`/trips/${tripData.id}?tab=members`}
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
