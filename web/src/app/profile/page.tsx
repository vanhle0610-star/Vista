'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/common/Navbar';
import { uploadFileToCloud } from '@/utils/cloudImage';
import {
  User,
  ShieldCheck,
  Compass,
  CreditCard,
  Lock,
  Check,
  Copy,
  Calendar,
  Users as UsersIcon,
  QrCode,
  ArrowRight,
  Palmtree,
  Landmark,
  UtensilsCrossed,
  Trees,
  FerrisWheel,
  Camera,
  Coffee,
  MoonStar,
  Mountain,
  Flower2,
  Sailboat,
  ShoppingBag,
  Loader2,
} from 'lucide-react';
import styles from './profile.module.css';

interface UserProfileData {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  roles: string[];
  travelPreferences?: string[];
  bankCode?: string | null;
  bankBin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
}

interface TripItem {
  id: string;
  title: string;
  destinationSummary?: string;
  startDate?: string;
  endDate?: string;
  membershipRole?: string;
  memberCount?: number;
  status?: string;
}

const POPULAR_BANKS = [
  { code: 'MB', bin: '970422', name: 'MBBank (Ngân hàng Quân Đội)' },
  { code: 'VCB', bin: '970436', name: 'Vietcombank (Ngoại Thương Việt Nam)' },
  { code: 'TCB', bin: '970407', name: 'Techcombank (Kỹ Thương Việt Nam)' },
  { code: 'BIDV', bin: '970418', name: 'BIDV (Đầu tư và Phát triển Việt Nam)' },
  { code: 'CTG', bin: '970415', name: 'VietinBank (Công Thương Việt Nam)' },
  { code: 'ACB', bin: '970416', name: 'ACB (Ngân hàng Á Châu)' },
  { code: 'VPB', bin: '970432', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { code: 'TPB', bin: '970423', name: 'TPBank (Tiên Phong)' },
  { code: 'VIB', bin: '970441', name: 'VIB (Quốc Tế)' },
  { code: 'STB', bin: '970403', name: 'Sacombank (Sài Gòn Thương Tín)' },
  { code: 'HDB', bin: '970437', name: 'HDBank (Phát triển TP.HCM)' },
  { code: 'MSB', bin: '970426', name: 'MSB (Hàng Hải)' },
  { code: 'SHB', bin: '970443', name: 'SHB (Sài Gòn - Hà Nội)' },
];

const PREFERENCE_OPTIONS = [
  { id: 'BEACH', label: 'Biển & Nghỉ dưỡng', icon: Palmtree, color: '#0284C7', bg: '#E0F2FE' },
  { id: 'CULTURE', label: 'Văn hóa & Di sản', icon: Landmark, color: '#B45309', bg: '#FEF3C7' },
  { id: 'CUISINE', label: 'Ẩm thực bản địa', icon: UtensilsCrossed, color: '#E11D48', bg: '#FFE4E6' },
  { id: 'NATURE', label: 'Thiên nhiên sinh thái', icon: Trees, color: '#16A34A', bg: '#DCFCE7' },
  { id: 'ENTERTAINMENT', label: 'Vui chơi giải trí', icon: FerrisWheel, color: '#7C3AED', bg: '#F3E8FF' },
  { id: 'PHOTO', label: 'Check-in sống ảo', icon: Camera, color: '#DB2777', bg: '#FCE7F3' },
  { id: 'CAFE', label: 'Cà phê & Thư giãn', icon: Coffee, color: '#92400E', bg: '#FEF3C7' },
  { id: 'NIGHTLIFE', label: 'Chợ đêm & Phố đi bộ', icon: MoonStar, color: '#4F46E5', bg: '#EEF2FF' },
  { id: 'ADVENTURE', label: 'Trekking & Khám phá', icon: Mountain, color: '#0D9488', bg: '#CCFBF1' },
  { id: 'WELLNESS', label: 'Khoáng nóng & Spa', icon: Flower2, color: '#059669', bg: '#D1FAE5' },
  { id: 'WATERSPORTS', label: 'Chèo Sup & Lặn biển', icon: Sailboat, color: '#0284C7', bg: '#E0F2FE' },
  { id: 'CRAFTS', label: 'Làng nghề & Mua sắm', icon: ShoppingBag, color: '#D97706', bg: '#FEF3C7' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'trips' | 'banking'>('profile');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  // Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  // Banking Form State
  const [selectedBankCode, setSelectedBankCode] = useState('MB');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankingMsg, setBankingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bankingSaving, setBankingSaving] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1').replace(/\/+$/, '');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vista_token') : null;
    if (!token) {
      router.replace('/login?returnUrl=/profile');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${apiBase}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const data: UserProfileData = await res.json();
          setUser(data);
          setDisplayName(data.displayName || '');
          setPhoneNumber(data.phoneNumber || '');
          setBio(data.bio || '');
          setSelectedPrefs(data.travelPreferences || []);
          setSelectedBankCode(data.bankCode || 'MB');
          setBankAccountNumber(data.bankAccountNumber || '');
          setBankAccountName(data.bankAccountName || '');
        } else if (res.status === 401) {
          localStorage.removeItem('vista_token');
          localStorage.removeItem('vista_user');
          router.replace('/login?returnUrl=/profile');
        }
      } catch (err) {
        console.error('Fetch profile error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [apiBase, router]);

  // Load Trips when Trips Tab is selected
  useEffect(() => {
    if (activeTab === 'trips' && user) {
      const fetchTrips = async () => {
        setTripsLoading(true);
        const token = localStorage.getItem('vista_token');
        try {
          const res = await fetch(`${apiBase}/users/me/trips`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setTrips(Array.isArray(data) ? data : data.content || []);
          }
        } catch (err) {
          console.error('Fetch trips error:', err);
        } finally {
          setTripsLoading(false);
        }
      };
      fetchTrips();
    }
  }, [activeTab, user, apiBase]);

  const isAdmin = useMemo(() => {
    return Boolean(user && Array.isArray(user.roles) && user.roles.some((r) => r.includes('ADMIN')));
  }, [user]);

  const userInitials = useMemo(() => {
    if (!user) return 'U';
    const name = user.displayName || user.email;
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [user]);

  // Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    const token = localStorage.getItem('vista_token');

    try {
      const res = await fetch(`${apiBase}/users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName,
          phoneNumber,
          bio,
          travelPreferences: selectedPrefs,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        // Sync local user cache for Navbar
        const currentSaved = localStorage.getItem('vista_user');
        const parsed = currentSaved ? JSON.parse(currentSaved) : {};
        parsed.displayName = updated.displayName;
        localStorage.setItem('vista_user', JSON.stringify(parsed));
        window.dispatchEvent(new Event('vista-auth-change'));

        setProfileMsg({ type: 'success', text: '✓ Đã cập nhật hồ sơ cá nhân thành công!' });
      } else {
        const err = await res.json().catch(() => null);
        setProfileMsg({ type: 'error', text: err?.detail || 'Không thể lưu hồ sơ. Vui lòng kiểm tra lại.' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Lỗi kết nối máy chủ khi lưu hồ sơ.' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSaving(true);
    setPwdMsg(null);

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      setPwdSaving(false);
      return;
    }

    const token = localStorage.getItem('vista_token');
    try {
      const res = await fetch(`${apiBase}/users/me/password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (res.ok) {
        setPwdMsg({ type: 'success', text: '✓ Đã đổi mật khẩu thành công!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json().catch(() => null);
        setPwdMsg({ type: 'error', text: err?.detail || err?.message || 'Đổi mật khẩu thất bại.' });
      }
    } catch {
      setPwdMsg({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setPwdSaving(false);
    }
  };

  // Save Banking Handler
  const handleSaveBanking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankingSaving(true);
    setBankingMsg(null);

    const bankObj = POPULAR_BANKS.find((b) => b.code === selectedBankCode);
    const token = localStorage.getItem('vista_token');

    try {
      const res = await fetch(`${apiBase}/users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankCode: selectedBankCode,
          bankBin: bankObj?.bin || '',
          bankAccountNumber: bankAccountNumber.trim(),
          bankAccountName: bankAccountName.trim().toUpperCase(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setBankingMsg({ type: 'success', text: '✓ Đã lưu thông tin tài khoản ngân hàng & VietQR!' });
      } else {
        const err = await res.json().catch(() => null);
        setBankingMsg({ type: 'error', text: err?.detail || 'Không thể lưu thông tin ngân hàng.' });
      }
    } catch {
      setBankingMsg({ type: 'error', text: 'Lỗi kết nối máy chủ khi lưu tài khoản.' });
    } finally {
      setBankingSaving(false);
    }
  };

  const currentBankObj = useMemo(() => {
    return POPULAR_BANKS.find((b) => b.code === selectedBankCode) || POPULAR_BANKS[0];
  }, [selectedBankCode]);

  const vietQrUrl = useMemo(() => {
    if (!bankAccountNumber.trim() || !currentBankObj?.bin) return null;
    const cleanAcc = bankAccountNumber.trim();
    const cleanName = encodeURIComponent(bankAccountName.trim().toUpperCase() || 'VISTA MEMBER');
    return `https://img.vietqr.io/image/${currentBankObj.bin}-${cleanAcc}-compact2.png?accountName=${cleanName}`;
  }, [bankAccountNumber, bankAccountName, currentBankObj]);

  const togglePreference = (prefId: string) => {
    setSelectedPrefs((prev) =>
      prev.includes(prefId) ? prev.filter((p) => p !== prefId) : [...prev, prefId]
    );
  };

  const copyAccountToClipboard = () => {
    if (bankAccountNumber) {
      navigator.clipboard.writeText(bankAccountNumber);
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileMsg({ type: 'error', text: 'Chỉ chấp nhận file định dạng hình ảnh (JPG, PNG, WebP).' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Dung lượng ảnh tối đa là 10MB.' });
      return;
    }

    setUploadingAvatar(true);
    setProfileMsg(null);
    try {
      const publicUrl = await uploadFileToCloud(file, 'avatars');
      const token = localStorage.getItem('vista_token');
      const res = await fetch(`${apiBase}/users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarUrl: publicUrl }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setProfileMsg({ type: 'success', text: '✓ Đã cập nhật ảnh đại diện lên Supabase Cloud thành công!' });

        // Sync with localStorage vista_user and notify Navbar
        const userStr = localStorage.getItem('vista_user');
        if (userStr) {
          try {
            const parsed = JSON.parse(userStr);
            parsed.avatarUrl = publicUrl;
            localStorage.setItem('vista_user', JSON.stringify(parsed));
            window.dispatchEvent(new Event('vista-auth-change'));
          } catch {}
        }
      } else {
        const err = await res.json().catch(() => null);
        setProfileMsg({ type: 'error', text: err?.detail || 'Không thể lưu đường dẫn avatar.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối khi tải ảnh lên Cloud.';
      setProfileMsg({ type: 'error', text: msg });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.profilePageContainer}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#64748B', fontWeight: 600 }}>
          Đang tải hồ sơ VISTA...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profilePageContainer}>
      <Navbar />

      <main className={styles.profileContent}>
        {/* ─── 1. HERO HEADER ─── */}
        <section className={styles.profileHeroCard}>
          <div className={styles.profileHeroLeft}>
            <div className={styles.avatarWrapper}>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || 'Avatar'}
                  className={styles.profileAvatarImg}
                />
              ) : (
                <div className={styles.profileAvatarLarge}>{userInitials}</div>
              )}
              <button
                type="button"
                className={styles.avatarUploadBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Thay đổi ảnh đại diện (Lưu lên Supabase Cloud)"
                aria-label="Upload avatar lên Supabase Cloud"
              >
                {uploadingAvatar ? <Loader2 size={14} className={styles.spin} /> : <Camera size={14} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
            </div>
            <div className={styles.profileHeroInfo}>
              <div className={styles.profileDisplayNameRow}>
                <h1 className={styles.profileDisplayName}>{user?.displayName || 'VISTA Traveler'}</h1>
                {isAdmin ? (
                  <span className={styles.roleBadgeAdmin}>
                    <ShieldCheck size={14} />
                    <span>QUẢN TRỊ VIÊN HỆ THỐNG</span>
                  </span>
                ) : (
                  <span className={styles.roleBadgeMember}>
                    <span>✓ THÀNH VIÊN VISTA</span>
                  </span>
                )}
              </div>
              <p className={styles.profileEmail}>{user?.email}</p>
            </div>
          </div>
        </section>

        {/* ─── 2. ADMIN CALLOUT BANNER (Only when ROLE_ADMIN) ─── */}
        {isAdmin && (
          <section className={styles.adminCalloutCard}>
            <div className={styles.adminCalloutLeft}>
              <div className={styles.adminCalloutIcon}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className={styles.adminCalloutTitle}>Đặc quyền Quản trị viên (Super Admin)</h3>
                <p className={styles.adminCalloutDesc}>
                  Tài khoản của bạn được cấp quyền quản lý điểm đến, xử lý vi phạm cộng đồng và cấu hình hệ thống VISTA.
                </p>
              </div>
            </div>
            <Link href="/dashboard" className={styles.adminCalloutBtn}>
              <span>Vào Admin Dashboard</span>
              <ArrowRight size={15} />
            </Link>
          </section>
        )}

        {/* ─── 3. TAB NAVIGATION ─── */}
        <nav className={styles.tabNavList} aria-label="Menu hồ sơ">
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={16} />
            <span>Hồ sơ & Bảo mật</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'trips' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('trips')}
          >
            <Compass size={16} />
            <span>Chuyến đi của tôi</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'banking' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('banking')}
          >
            <CreditCard size={16} />
            <span>Nhận tiền & VietQR</span>
          </button>
        </nav>

        {/* ─── TAB 1: HỒ SƠ CÁ NHÂN & BẢO MẬT ─── */}
        {activeTab === 'profile' && (
          <div>
            {/* Basic Info Form */}
            <div className={styles.panelCard}>
              <h2 className={styles.panelTitle}>Thông tin cá nhân</h2>
              <p className={styles.panelSubtitle}>Quản lý tên hiển thị, số điện thoại và giới thiệu bản thân.</p>

              {profileMsg && (
                <div className={profileMsg.type === 'success' ? styles.alertSuccess : styles.alertError}>
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleSaveProfile}>
                <div className={styles.formGridTwoCol}>
                  <div className={styles.formGroup}>
                    <label className={styles.fieldLabel}>Họ và tên hiển thị</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="VD: Lê Thị Vân Anh"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.fieldLabel}>Số điện thoại (+84)</label>
                    <input
                      type="tel"
                      className={styles.textInput}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="VD: +84912345678"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Giới thiệu ngắn (Bio)</label>
                  <textarea
                    className={styles.textareaInput}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Chia sẻ một vài điều về phong cách du lịch của bạn..."
                  />
                </div>

                {/* Travel Preferences */}
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Sở thích du lịch ưa chuộng</label>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 10px 0' }}>
                    VISTA AI sẽ ưu tiên gợi ý các điểm đến và hoạt động phù hợp với sở thích của bạn.
                  </p>
                  <div className={styles.prefChipsGrid}>
                    {PREFERENCE_OPTIONS.map((opt) => {
                      const isSelected = selectedPrefs.includes(opt.id);
                      const IconCmp = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className={`${styles.prefChipBtn} ${isSelected ? styles.prefChipBtnActive : ''}`}
                          onClick={() => togglePreference(opt.id)}
                        >
                          <div
                            className={styles.prefIconBox}
                            style={{
                              backgroundColor: isSelected ? '#BAE6FD' : opt.bg,
                              color: opt.color,
                            }}
                          >
                            <IconCmp size={14} strokeWidth={2.4} />
                          </div>
                          <span>{opt.label}</span>
                          {isSelected && <Check size={14} style={{ marginLeft: 'auto', color: '#0284C7' }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button type="submit" className={styles.btnPrimary} disabled={profileSaving}>
                  {profileSaving ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}
                </button>
              </form>
            </div>

            {/* Password Change Form */}
            <div className={styles.panelCard}>
              <h2 className={styles.panelTitle}>Bảo mật & Đổi mật khẩu</h2>
              <p className={styles.panelSubtitle}>Để đảm bảo an toàn, không chia sẻ mật khẩu của bạn với bất kỳ ai.</p>

              {pwdMsg && (
                <div className={pwdMsg.type === 'success' ? styles.alertSuccess : styles.alertError}>
                  {pwdMsg.text}
                </div>
              )}

              <form onSubmit={handleChangePassword}>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    className={styles.textInput}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGridTwoCol}>
                  <div className={styles.formGroup}>
                    <label className={styles.fieldLabel}>Mật khẩu mới (Tối thiểu 8 ký tự)</label>
                    <input
                      type="password"
                      className={styles.textInput}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Bao gồm chữ hoa, thường, số & ký tự đặc biệt"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.fieldLabel}>Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      className={styles.textInput}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className={styles.btnPrimary} disabled={pwdSaving}>
                  <Lock size={15} />
                  <span>{pwdSaving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ─── TAB 2: CHUYẾN ĐI CỦA TÔI ─── */}
        {activeTab === 'trips' && (
          <div className={styles.panelCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 className={styles.panelTitle}>Chuyến đi của tôi</h2>
                <p className={styles.panelSubtitle} style={{ marginBottom: 0 }}>
                  Danh sách các chuyến đi bạn đứng ra tổ chức hoặc tham gia cùng bạn bè.
                </p>
              </div>
              <Link href="/trips" className={styles.btnPrimary}>
                + Tạo chuyến đi mới
              </Link>
            </div>

            {tripsLoading ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>Đang tải danh sách chuyến đi...</div>
            ) : trips.length === 0 ? (
              <div className={styles.emptyState}>
                <Compass size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <p>Bạn chưa tham gia chuyến đi nào.</p>
                <Link href="/trips" style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'underline' }}>
                  Khám phá và lên kế hoạch cho chuyến đi đầu tiên ngay!
                </Link>
              </div>
            ) : (
              <div className={styles.tripsGrid}>
                {trips.map((tr) => {
                  const isOwner = tr.membershipRole === 'OWNER';
                  return (
                    <div key={tr.id} className={styles.tripCard}>
                      <div className={styles.tripCardHeader}>
                        <div>
                          <h3 className={styles.tripTitle}>{tr.title}</h3>
                          <p className={styles.tripDestination}>📍 {tr.destinationSummary || 'Việt Nam'}</p>
                        </div>
                        {isOwner ? (
                          <span className={styles.badgeOwner}>👑 Trưởng nhóm</span>
                        ) : (
                          <span className={styles.badgeMember}>👥 Thành viên</span>
                        )}
                      </div>

                      <div className={styles.tripMeta}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} />
                          {tr.startDate || 'Sắp tới'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <UsersIcon size={13} />
                          {tr.memberCount || 1} người
                        </span>
                      </div>

                      <Link href={`/trips/${tr.id}`} className={styles.btnViewTrip}>
                        Xem chi tiết lịch trình & chi phí →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: NHẬN TIỀN & VIETQR ─── */}
        {activeTab === 'banking' && (
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Nhận tiền & Mã VietQR (Dành cho Thủ quỹ & Chi tiêu nhóm)</h2>
            <p className={styles.panelSubtitle}>
              Khi bạn ứng trước tiền vé máy bay, phòng khách sạn hoặc bữa ăn cho cả nhóm, mã VietQR cá nhân sẽ giúp bạn bè quét trả tiền lại cho bạn ngay tức thì.
            </p>

            {bankingMsg && (
              <div className={bankingMsg.type === 'success' ? styles.alertSuccess : styles.alertError}>
                {bankingMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveBanking}>
              <div className={styles.formGridTwoCol}>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Ngân hàng thụ hưởng</label>
                  <select
                    className={styles.selectInput}
                    value={selectedBankCode}
                    onChange={(e) => setSelectedBankCode(e.target.value)}
                  >
                    {POPULAR_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Số tài khoản ngân hàng</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="VD: 09012345678"
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Tên chủ tài khoản (Viết hoa không dấu)</label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                  placeholder="VD: LE THI VAN ANH"
                  required
                />
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={bankingSaving}>
                {bankingSaving ? 'Đang lưu...' : 'Lưu tài khoản nhận tiền'}
              </button>
            </form>

            {/* Dynamic VietQR Preview Box */}
            {vietQrUrl ? (
              <div className={styles.vietQrPreviewBox}>
                <div className={styles.vietQrImageWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vietQrUrl} alt="Mã VietQR cá nhân" className={styles.vietQrImg} />
                </div>
                <div className={styles.vietQrDetails}>
                  <h4 className={styles.qrBankName}>{currentBankObj.name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p className={styles.qrAccountNumber}>{bankAccountNumber}</p>
                    <button
                      type="button"
                      onClick={copyAccountToClipboard}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0284C7' }}
                      title="Sao chép số tài khoản"
                    >
                      {copiedAcc ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className={styles.qrAccountName}>{bankAccountName || 'TÊN CHỦ TÀI KHOẢN'}</p>
                  <p className={styles.qrGuideText}>
                    ✨ <strong>Chuẩn VietQR Napas247:</strong> Bạn bè có thể mở bất kỳ ứng dụng ngân hàng nào (MB, Vietcombank, Techcombank, Momo, VNPay...) quét mã này để hoàn tiền chia chi phí cho bạn 24/7.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '20px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', gap: '12px', color: '#64748B', fontSize: '13px' }}>
                <QrCode size={24} style={{ opacity: 0.5 }} />
                <span>Nhập Số tài khoản và Tên chủ tài khoản ở trên để hệ thống tự động khởi tạo mã VietQR cho bạn.</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
