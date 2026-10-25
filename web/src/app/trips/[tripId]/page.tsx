'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Wallet,
  Clock,
  Sparkles,
  Share2,
  ThumbsUp,
  ExternalLink,
  Copy,
  CheckCircle2,
  DollarSign,
  Compass,
} from 'lucide-react';
import { Navbar } from '@/components/common/Navbar';
import styles from './tripDetail.module.css';

interface ActivityItem {
  id: string;
  timeSlot?: string;
  timeRange?: string;
  title: string;
  description?: string;
  location?: string;
  costVnd?: number;
  costLabel?: string;
  category?: string;
}

interface DayPlanItem {
  dayNumber: number;
  dateStr?: string;
  title: string;
  activities: ActivityItem[];
}

interface MemberItem {
  name: string;
  avatar: string;
  color: string;
  role?: string;
}

interface TripDetailData {
  id: string;
  title: string;
  destination: string;
  durationBadge: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'PLANNING' | 'COMPLETED';
  role: 'OWNER' | 'MEMBER';
  budgetTotal: number;
  budgetSpent: number;
  progressPercent: number;
  members: MemberItem[];
  image: string;
  treasuryPath: string;
  alertType?: 'AMBER' | 'BLUE' | 'COMPLETED';
  alertText?: string;
  itineraryDays?: DayPlanItem[];
}

const DEFAULT_DEMO_TRIPS: TripDetailData[] = [];

export default function TripDetailPage() {
  const params = useParams();
  const tripId = typeof params?.tripId === 'string' ? params.tripId : '';

  const [trip, setTrip] = useState<TripDetailData | null>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'members' | 'treasury' | 'voting'>('itinerary');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Voting state
  const [proposals, setProposals] = useState([
    {
      id: 'prop-1',
      title: 'Buffet hải sản Biển Rạng đêm thứ 2',
      category: 'Ẩm thực',
      votes: 3,
      voted: false,
    },
    {
      id: 'prop-2',
      title: 'Trải nghiệm dù lượn ngắm toàn cảnh Bán đảo Sơn Trà',
      category: 'Trải nghiệm mạo hiểm',
      votes: 4,
      voted: true,
    },
    {
      id: 'prop-3',
      title: 'Xem show Ký Ức Hội An lúc 20:00',
      category: 'Nghệ thuật & Di sản',
      votes: 2,
      voted: false,
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!tripId) return;

    const timer = setTimeout(() => {
      // 1. Try finding in custom trips in localStorage
      try {
        const stored = localStorage.getItem('vista_custom_trips');
        if (stored) {
          const parsed: TripDetailData[] = JSON.parse(stored);
          const match = parsed.find((item) => item.id === tripId);
          if (match) {
            // Normalize fields
            setTrip({
              ...match,
              members: match.members && match.members.length > 0
                ? match.members
                : [{ name: 'Lê Vân Anh', avatar: 'VA', color: '#0284c7', role: 'Trưởng nhóm' }],
              treasuryPath: match.treasuryPath || `/trips/${match.id}/treasury`,
              itineraryDays: match.itineraryDays && match.itineraryDays.length > 0
                ? match.itineraryDays
                : undefined,
            });
            return;
          }
        }
      } catch (e) {
        console.error('Error reading vista_custom_trips from localStorage:', e);
      }

      // 2. Try finding in DEFAULT_DEMO_TRIPS
      const demoMatch = DEFAULT_DEMO_TRIPS.find((item) => item.id === tripId);
      if (demoMatch) {
        setTrip(demoMatch);
        return;
      }

      // 3. Fallback: generate a clean stub trip for any custom ID
      setTrip({
        id: tripId,
        title: `Hành trình ${tripId.replace(/^trip-/, '')}`,
        destination: 'Việt Nam',
        durationBadge: '3 ngày',
        startDate: 'Hôm nay',
        endDate: 'Sắp tới',
        status: 'PLANNING',
        role: 'OWNER',
        budgetTotal: 10000000,
        budgetSpent: 0,
        progressPercent: 20,
        members: [{ name: 'Bạn (Trưởng nhóm)', avatar: 'BN', color: '#0284c7', role: 'Trưởng nhóm' }],
        image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
        treasuryPath: `/trips/${tripId}/treasury`,
        alertType: 'BLUE',
        alertText: 'Hành trình mới tạo, bạn có thể chỉnh sửa lịch trình với AI Planner',
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [tripId]);

  const handleVoteToggle = (propId: string) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === propId) {
          const newVoted = !p.voted;
          showToast(newVoted ? 'Đã bỏ phiếu đồng thuận (+1)!' : 'Đã hủy bỏ phiếu.');
          return {
            ...p,
            voted: newVoted,
            votes: newVoted ? p.votes + 1 : p.votes - 1,
          };
        }
        return p;
      })
    );
  };

  const inviteCode = useMemo(() => {
    if (!trip) return 'VISTA-TRIP';
    const cleanId = trip.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `VISTA-${cleanId.slice(-6) || 'TRIP26'}`;
  }, [trip]);

  const handleCopyInviteCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(inviteCode);
      showToast(`Đã sao chép mã mời: ${inviteCode}`);
    } else {
      showToast(`Mã mời của chuyến đi: ${inviteCode}`);
    }
  };

  if (!trip) {
    return (
      <div className={styles.tripDetailPage}>
        <Navbar activeModule="trips" />
        <div className={styles.container} style={{ paddingTop: '80px', textAlign: 'center' }}>
          <p style={{ color: '#64748B', fontSize: '16px' }}>Đang tải thông tin chuyến đi...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalDays = trip.itineraryDays?.length || 3;
  const totalActivities = trip.itineraryDays
    ? trip.itineraryDays.reduce((acc, d) => acc + (d.activities?.length || 0), 0)
    : 8;

  return (
    <div className={styles.tripDetailPage}>
      <Navbar activeModule="trips" />

      <main className={styles.container}>
        {/* ─── 1. BREADCRUMBS & TOP NAV ROW ──────────────────────────────── */}
        <div className={styles.topNavRow}>
          <div className={styles.breadcrumb}>
            <Link href="/trips">Chuyến đi</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span>{trip.title}</span>
          </div>

          <Link href="/trips" className={styles.topBackBtn}>
            <ArrowLeft size={16} />
            <span>Quay lại danh sách</span>
          </Link>
        </div>

        {/* ─── 2. HERO COVER BANNER ──────────────────────────────────────── */}
        <div
          className={styles.heroBanner}
          style={{ backgroundImage: `url(${trip.image})` }}
        >
          <div className={styles.heroOverlay}>
            <div className={styles.heroTopBadges}>
              <div className={styles.badgeGroup}>
                {trip.status === 'ACTIVE' && (
                  <span className={styles.statusPillActive}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                    Đang diễn ra
                  </span>
                )}
                {trip.status === 'PLANNING' && (
                  <span className={styles.statusPillPlanning}>
                    <Clock size={13} />
                    Đang lên kế hoạch
                  </span>
                )}
                {trip.status === 'COMPLETED' && (
                  <span className={styles.statusPillCompleted}>
                    <CheckCircle2 size={13} />
                    Đã hoàn thành
                  </span>
                )}

                <span className={styles.roleBadgeLeader}>
                  {trip.role === 'OWNER' ? 'Bạn là trưởng nhóm' : 'Thành viên'}
                </span>
              </div>

              <button
                type="button"
                className={styles.btnActionWhite}
                onClick={handleCopyInviteCode}
                title="Sao chép mã mời thành viên"
              >
                <Share2 size={15} />
                <span>Mã mời: {inviteCode}</span>
              </button>
            </div>

            <div className={styles.heroContentBottom}>
              <div className={styles.heroTitleBlock}>
                <div className={styles.heroLocationRow}>
                  <MapPin size={16} />
                  <span>{trip.destination}</span>
                  <span>•</span>
                  <span>{trip.durationBadge}</span>
                </div>
                <h1 className={styles.heroTitle}>{trip.title}</h1>
                <div className={styles.heroMetaRow}>
                  <span>
                    <Calendar size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: -2 }} />
                    {trip.startDate} – {trip.endDate}
                  </span>
                  <span>•</span>
                  <span>
                    <Users size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: -2 }} />
                    {trip.members?.length || 1} thành viên tham gia
                  </span>
                </div>
              </div>

              <div className={styles.heroActionsRow}>
                <Link
                  href={`/planner?tripId=${trip.id}&dest=${encodeURIComponent(trip.destination)}`}
                  className={styles.btnActionPrimary}
                  id="btn-edit-planner"
                >
                  <Sparkles size={16} />
                  <span>Chỉnh sửa (AI Planner)</span>
                </Link>

                <Link
                  href={trip.treasuryPath || `/trips/${trip.id}/treasury`}
                  className={styles.btnActionWhite}
                  id="btn-open-treasury"
                >
                  <Wallet size={16} />
                  <span>Sổ quỹ & Chi tiêu</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. STATS KPI GRID ─────────────────────────────────────────── */}
        <div className={styles.kpiStatsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Tổng ngân sách</span>
              <span className={styles.statValue}>
                {trip.budgetTotal.toLocaleString('vi-VN')}đ
              </span>
              <span className={styles.statSubtext}>Dự kiến ban đầu</span>
            </div>
            <div className={styles.statIconBox}>
              <DollarSign size={22} />
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Đã chi tiêu</span>
              <span className={styles.statValue} style={{ color: '#0070BA' }}>
                {trip.budgetSpent.toLocaleString('vi-VN')}đ
              </span>
              <span className={styles.statSubtext}>
                Tiến độ: {trip.progressPercent}% ngân sách
              </span>
            </div>
            <div className={styles.statIconBox} style={{ background: '#F0FDF4', color: '#16A34A' }}>
              <Wallet size={22} />
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Thành viên nhóm</span>
              <span className={styles.statValue}>{trip.members?.length || 1} người</span>
              <span className={styles.statSubtext}>Sẵn sàng đồng hành</span>
            </div>
            <div className={styles.statIconBox} style={{ background: '#FAF5FF', color: '#9333EA' }}>
              <Users size={22} />
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Hoạt động & Lộ trình</span>
              <span className={styles.statValue}>{totalActivities} điểm</span>
              <span className={styles.statSubtext}>{totalDays} ngày trải nghiệm</span>
            </div>
            <div className={styles.statIconBox} style={{ background: '#FFF7ED', color: '#EA580C' }}>
              <Compass size={22} />
            </div>
          </div>
        </div>

        {/* ─── 4. MAIN WORKSPACE WITH TABS ───────────────────────────────── */}
        <div className={styles.tabsBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'itinerary' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('itinerary')}
            id="tab-btn-itinerary"
          >
            Lộ trình từng ngày ({totalDays} ngày)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'members' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('members')}
            id="tab-btn-members"
          >
            Thành viên nhóm ({trip.members?.length || 1})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'treasury' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('treasury')}
            id="tab-btn-treasury"
          >
            Chi tiêu & Sổ quỹ
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'voting' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('voting')}
            id="tab-btn-voting"
          >
            Biểu quyết địa điểm ({proposals.length})
          </button>
        </div>

        {/* TAB 1: ITINERARY TIMELINE */}
        {activeTab === 'itinerary' && (
          <div className={styles.itineraryContainer}>
            {trip.itineraryDays && trip.itineraryDays.length > 0 ? (
              trip.itineraryDays.map((day) => (
                <div key={day.dayNumber} className={styles.daySectionCard}>
                  <div className={styles.dayHeader}>
                    <div className={styles.dayHeaderLeft}>
                      <span className={styles.dayNumberBadge}>Ngày {day.dayNumber}</span>
                      <h3 className={styles.dayTitle}>{day.title}</h3>
                    </div>
                    {day.dateStr && (
                      <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                        {day.dateStr}
                      </span>
                    )}
                  </div>

                  <div className={styles.activitiesTimeline}>
                    {day.activities && day.activities.length > 0 ? (
                      day.activities.map((act) => (
                        <div key={act.id} className={styles.activityRow}>
                          <span className={styles.timeSlotBadge}>
                            {act.timeSlot || act.timeRange || 'Trong ngày'}
                          </span>
                          <div className={styles.activityDetails}>
                            <div className={styles.activityTitleRow}>
                              <h4 className={styles.activityTitle}>{act.title}</h4>
                              {act.costLabel && (
                                <span className={styles.activityCost}>{act.costLabel}</span>
                              )}
                            </div>
                            {act.description && (
                              <p className={styles.activityDescription}>{act.description}</p>
                            )}
                            {act.location && (
                              <span className={styles.activityLocation}>
                                <MapPin size={13} />
                                {act.location}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#94A3B8', fontSize: '14px', fontStyle: 'italic' }}>
                        Chưa có hoạt động cụ thể cho ngày này. Hãy bấm vào Chỉnh sửa với AI để thêm điểm đến!
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '20px',
                  padding: '48px 24px',
                  textAlign: 'center',
                }}
              >
                <Sparkles size={40} style={{ color: '#0070BA', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                  Lịch trình chưa được tạo chi tiết
                </h3>
                <p style={{ color: '#64748B', maxWidth: '520px', margin: '0 auto 24px', fontSize: '14.5px' }}>
                  Bạn có thể dùng AI Planner để tự động gợi ý lịch trình thông minh theo số ngày, ngân sách và sở thích.
                </p>
                <Link
                  href={`/planner?tripId=${trip.id}&dest=${encodeURIComponent(trip.destination)}`}
                  className={styles.btnActionPrimary}
                >
                  <Sparkles size={16} />
                  <span>Khám phá và tối ưu lịch trình với AI</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEMBERS & INVITE */}
        {activeTab === 'members' && (
          <div>
            <div className={styles.membersGrid}>
              {(trip.members || []).map((m, idx) => (
                <div key={idx} className={styles.memberCard}>
                  <div className={styles.memberAvatarCircle} style={{ background: m.color || '#0070BA' }}>
                    {m.avatar}
                  </div>
                  <div className={styles.memberInfo}>
                    <h4 className={styles.memberName}>{m.name}</h4>
                    <span className={styles.memberRole}>{m.role || (idx === 0 ? 'Trưởng nhóm' : 'Thành viên')}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.inviteCardBanner}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0' }}>
                  Mời bạn bè cùng tham gia nhóm
                </h3>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                  Chia sẻ mã mời để mọi người cùng xem lịch trình, thêm địa điểm và chia tiền chuyến đi.
                </p>
              </div>

              <div className={styles.inviteCodeBox}>
                <span className={styles.inviteCodeText}>{inviteCode}</span>
                <button
                  type="button"
                  className={styles.btnCopyCode}
                  onClick={handleCopyInviteCode}
                  id="btn-copy-invite-code"
                >
                  <Copy size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  Sao chép
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TREASURY PREVIEW */}
        {activeTab === 'treasury' && (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
                paddingBottom: '20px',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Thủ quỹ & Quản lý ngân sách nhóm
                </h3>
                <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
                  Theo dõi từng khoản chi tiêu, hóa đơn và tự động đối soát nợ giữa các thành viên.
                </p>
              </div>

              <Link
                href={trip.treasuryPath || `/trips/${trip.id}/treasury`}
                className={styles.btnActionPrimary}
              >
                <Wallet size={16} />
                <span>Mở Sổ quỹ & Chia tiền đầy đủ</span>
              </Link>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '28px',
              }}
            >
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Tổng hạn mức</span>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: '4px 0 0' }}>
                  {trip.budgetTotal.toLocaleString('vi-VN')}đ
                </p>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Thực tế đã chi</span>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#0070BA', margin: '4px 0 0' }}>
                  {trip.budgetSpent.toLocaleString('vi-VN')}đ
                </p>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Ngân sách còn lại</span>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#16A34A', margin: '4px 0 0' }}>
                  {Math.max(0, trip.budgetTotal - trip.budgetSpent).toLocaleString('vi-VN')}đ
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Link
                href={trip.treasuryPath || `/trips/${trip.id}/treasury`}
                style={{
                  color: '#0070BA',
                  fontWeight: 700,
                  fontSize: '14.5px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Xem chi tiết các hóa đơn và đối soát thanh toán nhóm</span>
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* TAB 4: VOTING PROPOSALS */}
        {activeTab === 'voting' && (
          <div className={styles.votingList}>
            <div
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <ThumbsUp size={20} style={{ color: '#0070BA', flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: '0 0 2px', fontSize: '14.5px', fontWeight: 700, color: '#1E40AF' }}>
                  Biểu quyết dân chủ cho chuyến đi
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#3B82F6' }}>
                  Các thành viên bình chọn cho điểm đến và trải nghiệm yêu thích để trưởng nhóm chốt lịch trình chính thức.
                </p>
              </div>
            </div>

            {proposals.map((prop) => (
              <div
                key={prop.id}
                className={`${styles.proposalCard} ${prop.voted ? styles.proposalVoted : ''}`}
              >
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0284C7',
                      background: '#E0F2FE',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginBottom: '6px',
                    }}
                  >
                    {prop.category}
                  </span>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {prop.title}
                  </h4>
                </div>

                <button
                  type="button"
                  className={`${styles.btnVote} ${prop.voted ? styles.btnVotedActive : ''}`}
                  onClick={() => handleVoteToggle(prop.id)}
                >
                  <ThumbsUp size={15} />
                  <span>{prop.votes} đồng thuận</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating toast notification */}
      {toastMessage && (
        <div className={styles.toastNotice}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
