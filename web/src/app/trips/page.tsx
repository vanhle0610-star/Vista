'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/common/Navbar';
import styles from './trips.module.css';

interface TripItem {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  budgetTotal: number;
  budgetSpent: number;
  members: Array<{ name: string; avatar: string; role: string }>;
  image: string;
  treasuryPath: string;
  votingCount: number;
}

export default function TripsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New trip form state
  const [newTitle, setNewTitle] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newBudget, setNewBudget] = useState('20000000');
  const [newStartDate, setNewStartDate] = useState('2026-11-20');
  const [newEndDate, setNewEndDate] = useState('2026-11-24');
  const [joinCode, setJoinCode] = useState('');

  // Proposals for voting demo
  const [proposals, setProposals] = useState([
    { id: 1, name: 'Cáp treo & Làng Pháp Bà Nà Hills', votes: 4, userVoted: true, category: 'Tham quan' },
    { id: 2, name: 'Thả hoa đăng trên sông Hoài Hội An', votes: 3, userVoted: false, category: 'Văn hóa' },
    { id: 3, name: 'Hải sản Bé Mặn đêm biển Mỹ Khê', votes: 4, userVoted: true, category: 'Ẩm thực' },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [tripsList, setTripsList] = useState<TripItem[]>([
    {
      id: 'demo-danang-2026',
      title: 'Hành Trình Khám Phá Đà Nẵng - Hội An 2026',
      destination: 'Đà Nẵng & Hội An, Quảng Nam',
      startDate: '15/11/2026',
      endDate: '18/11/2026',
      status: 'ACTIVE',
      budgetTotal: 25000000,
      budgetSpent: 14850000,
      members: [
        { name: 'Lê Vân Anh', avatar: 'VA', role: 'OWNER' },
        { name: 'Trần Nam', avatar: 'TN', role: 'MEMBER' },
        { name: 'Minh Thư', avatar: 'MT', role: 'MEMBER' },
        { name: 'Quốc Bảo', avatar: 'QB', role: 'MEMBER' },
      ],
      image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
      treasuryPath: '/trips/demo-danang-2026/treasury',
      votingCount: 3,
    },
    {
      id: 'trip-hagiang-2026',
      title: 'Chinh Phục Cung Đường Vàng Hà Giang - Mèo Vạc',
      destination: 'Hà Giang & Đèo Mã Pí Lèng',
      startDate: '05/12/2026',
      endDate: '08/12/2026',
      status: 'PLANNING',
      budgetTotal: 18000000,
      budgetSpent: 4200000,
      members: [
        { name: 'Lê Vân Anh', avatar: 'VA', role: 'MEMBER' },
        { name: 'Hoàng Long', avatar: 'HL', role: 'OWNER' },
        { name: 'Thu Thảo', avatar: 'TT', role: 'MEMBER' },
      ],
      image: 'https://images.unsplash.com/photo-1570789210967-2cac24afeb00?auto=format&fit=crop&w=800&q=80',
      treasuryPath: '/trips/demo-danang-2026/treasury',
      votingCount: 2,
    },
    {
      id: 'trip-phuquoc-2026',
      title: 'Nghỉ Dưỡng Biển Đảo Hoàng Hôn Phú Quốc',
      destination: 'Phú Quốc, Kiên Giang',
      startDate: '10/09/2026',
      endDate: '14/09/2026',
      status: 'COMPLETED',
      budgetTotal: 30000000,
      budgetSpent: 28900000,
      members: [
        { name: 'Lê Vân Anh', avatar: 'VA', role: 'OWNER' },
        { name: 'Tuấn Khải', avatar: 'TK', role: 'MEMBER' },
      ],
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
      treasuryPath: '/trips/demo-danang-2026/treasury',
      votingCount: 0,
    },
  ]);

  const filteredTrips = tripsList.filter((trip) => {
    if (activeTab === 'active') return trip.status === 'ACTIVE' || trip.status === 'PLANNING';
    if (activeTab === 'completed') return trip.status === 'COMPLETED';
    return true;
  });

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDestination.trim()) {
      showToast('⚠️ Vui lòng nhập đầy đủ tiêu đề và điểm đến!');
      return;
    }

    const newTrip: TripItem = {
      id: `trip-${Date.now()}`,
      title: newTitle,
      destination: newDestination,
      startDate: newStartDate,
      endDate: newEndDate,
      status: 'PLANNING',
      budgetTotal: Number(newBudget) || 20000000,
      budgetSpent: 0,
      members: [{ name: 'Lê Vân Anh (Bạn)', avatar: 'VA', role: 'OWNER' }],
      image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
      treasuryPath: '/trips/demo-danang-2026/treasury',
      votingCount: 0,
    };

    setTripsList([newTrip, ...tripsList]);
    setShowCreateModal(false);
    setNewTitle('');
    setNewDestination('');
    showToast(`🎉 Đã tạo thành công chuyến đi "${newTrip.title}"!`);
  };

  const handleJoinTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      showToast('⚠️ Vui lòng nhập mã mời từ trưởng nhóm!');
      return;
    }
    setShowJoinModal(false);
    setJoinCode('');
    showToast('✨ Gia nhập nhóm thành công! Bạn đã được thêm vào chuyến đi.');
  };

  const toggleVote = (id: number) => {
    setProposals((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextVoted = !item.userVoted;
          return {
            ...item,
            userVoted: nextVoted,
            votes: nextVoted ? item.votes + 1 : item.votes - 1,
          };
        }
        return item;
      })
    );
  };

  return (
    <div className={styles.tripsPage}>
      {/* ─── 1. GLOBAL NAVBAR WITH 5 FUNCTIONAL PILLARS ─────────────────── */}
      <Navbar activeModule="trips" />

      {/* ─── 2. HERO BANNER ────────────────────────────────────────────── */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.heroBadge}>
              <span>👥</span>
              <span>Tổ Chức Chuyến Đi Nhóm Thông Minh</span>
            </div>
            <h1 className={styles.heroTitle}>
              Lên Kế Hoạch, Biểu Quyết & Đồng Hành Cùng Bạn Bè
            </h1>
            <p className={styles.heroSubtitle}>
              Quản lý chuyến đi nhóm tập trung: mời thành viên bằng mã bảo mật, phân quyền
              chủ nhóm, biểu quyết điểm đến yêu thích và liên kết trực tiếp với Thủ quỹ chia tiền tự động.
            </p>
          </div>

          <div className={styles.heroButtons}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => setShowCreateModal(true)}
              id="btn-create-trip-modal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>+ Tạo Chuyến Đi Mới</span>
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setShowJoinModal(true)}
              id="btn-join-trip-modal"
            >
              <span>🔑 Nhập Mã Lời Mời</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── 3. MAIN DASHBOARD CONTENT ─────────────────────────────────── */}
      <main className={styles.mainContainer}>
        {/* Filter Tabs */}
        <div className={styles.tabsBar}>
          <div className={styles.tabsList}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>Tất cả chuyến đi</span>
              <span className={styles.tabCount}>{tripsList.length}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'active' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('active')}
            >
              <span>Đang lên kế hoạch</span>
              <span className={styles.tabCount}>2</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'completed' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              <span>Đã hoàn thành</span>
              <span className={styles.tabCount}>1</span>
            </button>
          </div>

          <Link href="/planner" className={styles.btnActionPlan} style={{ textDecoration: 'none' }}>
            <span>✨ Thử AI Lập Lịch Trình</span>
          </Link>
        </div>

        {/* Trips Grid */}
        <div className={styles.tripsGrid}>
          {filteredTrips.map((trip) => {
            const progressPercent = Math.min(
              100,
              Math.round((trip.budgetSpent / trip.budgetTotal) * 100)
            );

            return (
              <div key={trip.id} className={styles.tripCard} id={`trip-card-${trip.id}`}>
                <div
                  className={styles.tripCardHero}
                  style={{ backgroundImage: `url(${trip.image})` }}
                >
                  <span
                    className={`${styles.tripStatusBadge} ${
                      trip.status === 'ACTIVE'
                        ? styles.statusActive
                        : trip.status === 'PLANNING'
                        ? styles.statusPlanning
                        : styles.statusCompleted
                    }`}
                  >
                    {trip.status === 'ACTIVE'
                      ? '🟢 Đang diễn ra'
                      : trip.status === 'PLANNING'
                      ? '🔵 Đang lên lịch'
                      : '⚪ Đã hoàn thành'}
                  </span>

                  <div className={styles.tripHeroOverlay}>
                    <div className={styles.tripDestination}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{trip.destination}</span>
                    </div>
                    <h3 className={styles.tripCardTitle}>{trip.title}</h3>
                  </div>
                </div>

                <div className={styles.tripCardBody}>
                  <div className={styles.tripMetaRow}>
                    <div className={styles.metaItem}>
                      <span>📅</span>
                      <span>{trip.startDate} – {trip.endDate}</span>
                    </div>
                    {trip.votingCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowVoteModal(true)}
                        style={{
                          background: '#eff6ff',
                          color: '#0284c7',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        🗳️ {trip.votingCount} biểu quyết
                      </button>
                    )}
                  </div>

                  {/* Budget Spent Progress */}
                  <div className={styles.budgetProgressBar}>
                    <div className={styles.budgetHeader}>
                      <span className={styles.budgetSpent}>
                        {trip.budgetSpent.toLocaleString('vi-VN')} đ
                      </span>
                      <span className={styles.budgetTotal}>
                        Ngân sách: {trip.budgetTotal.toLocaleString('vi-VN')} đ ({progressPercent}%)
                      </span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Members Avatar Group */}
                  <div className={styles.membersRow}>
                    <div className={styles.avatarGroup}>
                      {trip.members.map((m, idx) => (
                        <div key={idx} className={styles.avatar} title={`${m.name} (${m.role})`}>
                          {m.avatar}
                        </div>
                      ))}
                    </div>
                    <span className={styles.memberCount}>
                      {trip.members.length} thành viên tham gia
                    </span>
                  </div>

                  {/* Direct Functional Actions */}
                  <div className={styles.tripCardActions}>
                    <Link
                      href={trip.treasuryPath}
                      className={styles.btnActionTreasury}
                      id={`btn-treasury-${trip.id}`}
                    >
                      <span>💰 Thủ Quỹ & Chia Tiền</span>
                    </Link>
                    <Link
                      href="/planner"
                      className={styles.btnActionPlan}
                      id={`btn-plan-${trip.id}`}
                    >
                      <span>📅 Lịch Trình Chi Tiết</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── 4. CORE FUNCTIONAL PILLARS SHOWCASE ─────────────────────── */}
        <section className={styles.showcaseSection}>
          <div className={styles.showcaseHeader}>
            <div className={styles.showcaseBadge}>KIẾN TRÚC TÍNH NĂNG VISTA</div>
            <h2 className={styles.showcaseTitle}>
              Các Tính Năng Cốt Lõi Phục Vụ Chuyến Đi Của Bạn
            </h2>
            <p className={styles.showcaseDesc}>
              Được xây dựng đồng bộ theo kiến trúc nghiệp vụ chuẩn của dự án VISTA: từ khâu gợi ý
              điểm đến, AI tạo lịch trình, biểu quyết nhóm cho tới quản lý tài chính quỹ chung.
            </p>
          </div>

          <div className={styles.pillarsGrid}>
            <div className={styles.pillarCard}>
              <div className={styles.pillarIconWrapper}>✨</div>
              <h4 className={styles.pillarTitle}>1. AI Lập Lịch Trình (Gemini LLM)</h4>
              <p className={styles.pillarText}>
                Trợ lý AI phân tích sở thích, quỹ thời gian và điều kiện thời tiết thực tế để thiết kế
                lịch trình tối ưu từng ngày kèm chi phí dự trù.
              </p>
            </div>

            <div className={styles.pillarCard}>
              <div className={styles.pillarIconWrapper}>🗳️</div>
              <h4 className={styles.pillarTitle}>2. Biểu Quyết Địa Điểm (Vote Up/Down)</h4>
              <p className={styles.pillarText}>
                Mọi thành viên đều có quyền đề xuất điểm dừng. Tính năng bỏ phiếu dân chủ giúp chốt
                lịch trình nhanh chóng mà không gây tranh cãi.
              </p>
            </div>

            <div className={styles.pillarCard}>
              <div className={styles.pillarIconWrapper}>💰</div>
              <h4 className={styles.pillarTitle}>3. Thủ Quỹ & Chia Tiền Minh Bạch</h4>
              <p className={styles.pillarText}>
                Ghi nhận các hóa đơn ăn uống, khách sạn, vé tham quan; tự động tính toán ma trận
                đối soát công nợ &quot;ai nợ ai&quot; với độ chính xác tuyệt đối.
              </p>
            </div>

            <div className={styles.pillarCard}>
              <div className={styles.pillarIconWrapper}>📍</div>
              <h4 className={styles.pillarTitle}>4. Điểm Hẹn Meetup & An Toàn</h4>
              <p className={styles.pillarText}>
                Cố định điểm tập trung khẩn cấp (sân bay, khách sạn, ga tàu) và chia sẻ vị trí chủ động
                khi nhóm di chuyển giữa các địa danh.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ─── MODAL: CREATE TRIP ────────────────────────────────────────── */}
      {showCreateModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Tạo Chuyến Đi Nhóm Mới</h3>
              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTrip}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên chuyến đi</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Ví dụ: Khám phá Quy Nhơn - Phú Yên 4N3Đ"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Điểm đến chính</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Ví dụ: Quy Nhơn, Bình Định"
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ngày bắt đầu</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ngày kết thúc</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ngân sách nhóm dự kiến (VNĐ)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="20000000"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                />
              </div>

              <button type="submit" className={styles.btnSubmitForm}>
                Hoàn tất & Khởi tạo chuyến đi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: JOIN BY INVITE CODE ────────────────────────────────── */}
      {showJoinModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowJoinModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Gia Nhập Bằng Mã Mời</h3>
              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={() => setShowJoinModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Nhập mã token gồm 6 ký tự hoặc liên kết lời mời mà trưởng nhóm đã chia sẻ cho bạn:
            </p>

            <form onSubmit={handleJoinTrip}>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Ví dụ: VISTA-DN2026 hoặc mã token hash"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}
                  required
                />
              </div>

              <button type="submit" className={styles.btnSubmitForm}>
                Xác thực & Tham gia nhóm
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DESTINATION VOTING PREVIEW ──────────────────────────── */}
      {showVoteModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowVoteModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>🗳️ Biểu Quyết Địa Điểm Nhóm</h3>
              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={() => setShowVoteModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              Các địa điểm được thành viên trong nhóm đề xuất. Bình chọn để chốt lịch trình chính thức:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {proposals.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: item.userVoted ? '#f0fdf4' : '#ffffff',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        color: '#475569',
                      }}
                    >
                      {item.category}
                    </span>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '4px' }}>
                      {item.name}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleVote(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: item.userVoted ? '#86efac' : '#cbd5e1',
                      background: item.userVoted ? '#22c55e' : '#ffffff',
                      color: item.userVoted ? '#ffffff' : '#334155',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>👍</span>
                    <span>{item.votes}</span>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={styles.btnSubmitForm}
              onClick={() => {
                setShowVoteModal(false);
                showToast('✅ Đã lưu kết quả biểu quyết của bạn!');
              }}
            >
              Đóng & Lưu kết quả
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toast}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
