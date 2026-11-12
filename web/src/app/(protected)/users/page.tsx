'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Eye,
  Shield,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  X,
  Mail,
  Phone,
  Calendar,
  Clock,
  CreditCard,
  Compass,
  RotateCcw,
  FileText,
} from 'lucide-react';
import { PaginationBar } from '@/components/PaginationBar';
import styles from './users.module.css';

interface AdminUserSummary {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  status: string;
  roles: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface AdminUserDetail extends AdminUserSummary {
  bio?: string | null;
  travelPreferences?: string[];
  bankCode?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
}

interface AdminUserPageResponse {
  items: AdminUserSummary[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

interface AdminUserStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  newUsersLast30Days: number;
  newUsersLast7Days: number;
  adminCount: number;
  moderatorCount: number;
  regularUserCount: number;
}

type RoleFilter = 'ALL' | 'ADMIN' | 'MODERATOR' | 'USER';
type StatusFilter = 'ALL' | 'ACTIVE' | 'LOCKED';
type SortDirection = 'desc' | 'asc';

const ROLE_OPTIONS: Array<{
  code: 'USER' | 'MODERATOR' | 'ADMIN';
  title: string;
  description: string;
}> = [
  {
    code: 'USER',
    title: 'Người dùng (USER)',
    description: 'Quyền sử dụng các tính năng lập lịch trình, chuyến đi, cộng đồng và đánh giá điểm đến.',
  },
  {
    code: 'MODERATOR',
    title: 'Kiểm duyệt viên (MODERATOR)',
    description: 'Quyền kiểm duyệt điểm đến, phê duyệt hoặc từ chối nội dung trong hàng đợi kiểm duyệt.',
  },
  {
    code: 'ADMIN',
    title: 'Quản trị viên (ADMIN)',
    description: 'Toàn quyền quản trị hệ thống, quản lý người dùng, phân quyền và cấu hình dữ liệu.',
  },
];

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name && name.trim()) || (email && email.trim()) || 'U';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRoleLabel(role: string): string {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return 'ADMIN';
    case 'MODERATOR':
      return 'MODERATOR';
    default:
      return 'USER';
  }
}

export default function UsersPage() {
  const apiUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1').replace(/\/+$/, ''),
    []
  );

  // Current logged-in user identification for self-protection UI
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Stats & Table Data
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  // Filters & Pagination
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetail | null>(null);

  // Status Lock/Unlock Confirmation Modal State
  const [statusModalTarget, setStatusModalTarget] = useState<{
    user: AdminUserSummary;
    nextStatus: 'ACTIVE' | 'LOCKED';
  } | null>(null);
  const [statusReason, setStatusReason] = useState<string>('');
  const [statusSubmitting, setStatusSubmitting] = useState<boolean>(false);

  // Role Change Modal State
  const [roleModalTarget, setRoleModalTarget] = useState<AdminUserSummary | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['USER']);
  const [roleReason, setRoleReason] = useState<string>('');
  const [roleSubmitting, setRoleSubmitting] = useState<boolean>(false);

  // Toast State
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Load current user info from localStorage or JWT payload
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawUser = localStorage.getItem('vista_user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser) as { id?: string; email?: string };
        if (parsed.id) setCurrentUserId(parsed.id);
        if (parsed.email) setCurrentUserEmail(parsed.email);
      }
      const token = localStorage.getItem('vista_token');
      if (token) {
        const segments = token.split('.');
        if (segments.length === 3) {
          const payload = JSON.parse(atob(segments[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
            sub?: string;
            email?: string;
          };
          if (payload.sub) setCurrentUserId((prev) => prev || payload.sub || null);
          if (payload.email) setCurrentUserEmail((prev) => prev || payload.email || null);
        }
      }
    } catch {
      // Ignore malformed local storage
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('vista_token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    return headers;
  }, []);

  const isCurrentUser = useCallback(
    (user: { id: string; email: string }): boolean => {
      if (currentUserId && user.id.toLowerCase() === currentUserId.toLowerCase()) {
        return true;
      }
      if (currentUserEmail && user.email.toLowerCase() === currentUserEmail.toLowerCase()) {
        return true;
      }
      return false;
    },
    [currentUserId, currentUserEmail]
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/users/stats`, {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as AdminUserStats;
        setStats(data);
      }
    } catch {
      // Handled by main list fetch
    }
  }, [apiUrl, getAuthHeaders]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);

    try {
      const params = new URLSearchParams();
      params.set('role', roleFilter);
      params.set('status', statusFilter);
      params.set('sortDir', sortDir);
      params.set('page', String(page));
      params.set('size', String(size));
      if (debouncedQuery) {
        params.set('keyword', debouncedQuery);
      }

      const res = await fetch(`${apiUrl}/admin/users?${params.toString()}`, {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });

      if (res.status === 401 || res.status === 403) {
        setIsForbidden(true);
        setErrorMessage(
          res.status === 401
            ? 'Phiên đăng nhập đã hết hạn hoặc chưa xác thực. Vui lòng đăng nhập lại bằng tài khoản Quản trị viên (ADMIN).'
            : 'Tài khoản hiện tại không có quyền ADMIN để truy cập phân hệ Quản lý người dùng.'
        );
        setUsers([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.detail || `Lỗi máy chủ (${res.status}) khi tải danh sách người dùng.`);
      }

      const data = (await res.json()) as AdminUserPageResponse;
      const items = Array.isArray(data.items) ? data.items : [];
      setUsers(items);
      setTotal(typeof data.total === 'number' ? data.total : items.length);
      setTotalPages(
        typeof data.totalPages === 'number'
          ? data.totalPages
          : Math.ceil((typeof data.total === 'number' ? data.total : items.length) / size)
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Không thể kết nối tới máy chủ Backend để tải dữ liệu.'
      );
    } finally {
      setLoading(false);
    }
  }, [apiUrl, debouncedQuery, getAuthHeaders, page, roleFilter, size, sortDir, statusFilter]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleRefreshAll = () => {
    void fetchStats();
    void fetchUsers();
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSortDir('desc');
    setPage(0);
  };

  // Open User Detail Modal
  const openUserDetailModal = async (user: AdminUserSummary) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setSelectedUserDetail({
      ...user,
      bio: null,
      travelPreferences: [],
    });

    try {
      const res = await fetch(`${apiUrl}/admin/users/${user.id}`, {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.detail || 'Không thể tải thông tin chi tiết người dùng.');
      }
      const detail = (await res.json()) as AdminUserDetail;
      setSelectedUserDetail(detail);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi tải chi tiết người dùng.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Lock/Unlock Confirmation Modal
  const openStatusConfirmation = (user: AdminUserSummary) => {
    if (isCurrentUser(user) && user.status === 'ACTIVE') {
      showToast('error', 'Quản trị viên không thể tự khóa tài khoản của chính mình.');
      return;
    }
    const nextStatus: 'ACTIVE' | 'LOCKED' = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    setStatusModalTarget({ user, nextStatus });
    setStatusReason('');
  };

  const handleConfirmStatusUpdate = async () => {
    if (!statusModalTarget) return;
    setStatusSubmitting(true);

    try {
      const { user, nextStatus } = statusModalTarget;
      const res = await fetch(`${apiUrl}/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: nextStatus,
          reason:
            statusReason.trim() ||
            (nextStatus === 'LOCKED'
              ? 'Khóa tài khoản từ bảng điều khiển Admin'
              : 'Mở khóa tài khoản từ bảng điều khiển Admin'),
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.detail || 'Cập nhật trạng thái tài khoản thất bại.');
      }

      const updated = (await res.json()) as AdminUserDetail;
      showToast(
        'success',
        nextStatus === 'LOCKED'
          ? `Đã khóa tài khoản "${updated.displayName}" và thu hồi phiên đăng nhập.`
          : `Đã mở khóa tài khoản "${updated.displayName}" thành công.`
      );

      setStatusModalTarget(null);
      if (selectedUserDetail && selectedUserDetail.id === updated.id) {
        setSelectedUserDetail(updated);
      }
      void fetchStats();
      void fetchUsers();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái tài khoản.');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Open Role Update Modal
  const openRoleModal = (user: AdminUserSummary) => {
    setRoleModalTarget(user);
    setSelectedRoles(user.roles && user.roles.length > 0 ? [...user.roles] : ['USER']);
    setRoleReason('');
  };

  const toggleRoleSelection = (roleCode: 'USER' | 'MODERATOR' | 'ADMIN') => {
    if (!roleModalTarget) return;

    // Prevent self-demotion from ADMIN in UI
    if (roleCode === 'ADMIN' && isCurrentUser(roleModalTarget) && selectedRoles.includes('ADMIN')) {
      showToast('error', 'Bạn không thể tự gỡ quyền ADMIN khỏi tài khoản của chính mình.');
      return;
    }

    setSelectedRoles((prev) => {
      if (prev.includes(roleCode)) {
        const next = prev.filter((r) => r !== roleCode);
        return next.length > 0 ? next : ['USER'];
      }
      return [...prev, roleCode];
    });
  };

  const handleConfirmRoleUpdate = async () => {
    if (!roleModalTarget) return;
    if (selectedRoles.length === 0) {
      showToast('error', 'Vui lòng chọn ít nhất một vai trò cho tài khoản.');
      return;
    }

    setRoleSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/admin/users/${roleModalTarget.id}/roles`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          roles: selectedRoles,
          reason: roleReason.trim() || 'Cập nhật phân quyền từ trang Quản lý người dùng',
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.detail || 'Cập nhật vai trò người dùng thất bại.');
      }

      const updated = (await res.json()) as AdminUserDetail;
      showToast(
        'success',
        `Đã cập nhật vai trò của "${updated.displayName}" thành: ${updated.roles.join(', ')}.`
      );

      setRoleModalTarget(null);
      if (selectedUserDetail && selectedUserDetail.id === updated.id) {
        setSelectedUserDetail(updated);
      }
      void fetchStats();
      void fetchUsers();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi cập nhật vai trò người dùng.');
    } finally {
      setRoleSubmitting(false);
    }
  };

  const activePercent =
    stats && stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0;

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.eyebrow}>Hệ thống quản trị • Phân quyền & Tài khoản</div>
          <h1 className={styles.pageTitle}>Quản lý người dùng</h1>
          <p className={styles.pageSubtitle}>
            Giám sát danh sách tài khoản, kiểm soát trạng thái truy cập và phân quyền vai trò trên toàn hệ thống VISTA.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={loading}
            className={styles.refreshBtn}
          >
            <RefreshCw size={15} className={loading ? styles.spinning : undefined} />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </header>

      {/* Section A: User Statistics Dashboard */}
      <section className={styles.statsGrid} aria-label="Thống kê người dùng">
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Tổng số người dùng</span>
            <div className={styles.statIconWrap}>
              <Users size={17} strokeWidth={1.85} />
            </div>
          </div>
          <div className={styles.statValue}>{stats ? stats.totalUsers.toLocaleString('vi-VN') : '—'}</div>
          <div className={styles.statMeta}>
            <span>{stats ? `${stats.adminCount} Admin` : '—'}</span>
            <span>•</span>
            <span>{stats ? `${stats.moderatorCount} Kiểm duyệt` : '—'}</span>
            <span>•</span>
            <span>{stats ? `${stats.regularUserCount} Thành viên` : '—'}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Đang hoạt động</span>
            <div className={styles.statIconWrap}>
              <UserCheck size={17} strokeWidth={1.85} />
            </div>
          </div>
          <div className={styles.statValue}>{stats ? stats.activeUsers.toLocaleString('vi-VN') : '—'}</div>
          <div className={styles.statMeta}>
            <span>Chiếm {activePercent}% tổng số tài khoản</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Đã khóa / Vô hiệu hóa</span>
            <div className={styles.statIconWrap}>
              <UserX size={17} strokeWidth={1.85} />
            </div>
          </div>
          <div className={styles.statValue}>{stats ? stats.lockedUsers.toLocaleString('vi-VN') : '—'}</div>
          <div className={styles.statMeta}>
            <span>Đã thu hồi quyền đăng nhập và làm mới phiên</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Mới đăng ký (30 ngày)</span>
            <div className={styles.statIconWrap}>
              <UserPlus size={17} strokeWidth={1.85} />
            </div>
          </div>
          <div className={styles.statValue}>
            {stats ? stats.newUsersLast30Days.toLocaleString('vi-VN') : '—'}
          </div>
          <div className={styles.statMeta}>
            <span>{stats ? `+${stats.newUsersLast7Days} tài khoản trong 7 ngày qua` : '—'}</span>
          </div>
        </div>
      </section>

      {/* Section C: Search & Filter Bar */}
      <section className={styles.filterCard} aria-label="Bộ lọc và tìm kiếm người dùng">
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm theo họ tên, địa chỉ email hoặc số điện thoại..."
            className={styles.searchInput}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className={styles.clearSearchBtn}
              title="Xóa từ khóa"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.selectWrap}>
            <Shield size={15} className={styles.selectIcon} />
            <select
              aria-label="Lọc theo vai trò"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as RoleFilter);
                setPage(0);
              }}
              className={styles.selectControl}
            >
              <option value="ALL">Vai trò: Tất cả</option>
              <option value="ADMIN">Vai trò: Quản trị viên (ADMIN)</option>
              <option value="MODERATOR">Vai trò: Kiểm duyệt viên (MODERATOR)</option>
              <option value="USER">Vai trò: Người dùng (USER)</option>
            </select>
          </div>

          <div className={styles.selectWrap}>
            <Filter size={15} className={styles.selectIcon} />
            <select
              aria-label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(0);
              }}
              className={styles.selectControl}
            >
              <option value="ALL">Trạng thái: Tất cả</option>
              <option value="ACTIVE">Trạng thái: Đang hoạt động</option>
              <option value="LOCKED">Trạng thái: Đã khóa</option>
            </select>
          </div>

          <div className={styles.selectWrap}>
            <ArrowUpDown size={15} className={styles.selectIcon} />
            <select
              aria-label="Sắp xếp theo ngày đăng ký"
              value={sortDir}
              onChange={(e) => {
                setSortDir(e.target.value as SortDirection);
                setPage(0);
              }}
              className={styles.selectControl}
            >
              <option value="desc">Ngày đăng ký: Mới nhất</option>
              <option value="asc">Ngày đăng ký: Cũ nhất</option>
            </select>
          </div>

          {(searchInput || roleFilter !== 'ALL' || statusFilter !== 'ALL' || sortDir !== 'desc') && (
            <button type="button" onClick={handleResetFilters} className={styles.resetBtn}>
              <RotateCcw size={14} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </section>

      {/* Section B: User List Table */}
      <section className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>
            <div className={styles.stateIconWrap}>
              <RefreshCw size={20} className={styles.spinning} />
            </div>
            <p className={styles.stateTitle}>Đang tải danh sách người dùng...</p>
            <p className={styles.stateDesc}>
              Hệ thống đang đồng bộ dữ liệu tài khoản và quyền hạn từ máy chủ.
            </p>
          </div>
        ) : errorMessage ? (
          <div className={styles.stateBox}>
            <div
              className={styles.stateIconWrap}
              style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
            >
              <AlertCircle size={20} />
            </div>
            <p className={styles.stateTitle}>
              {isForbidden ? 'Yêu cầu quyền Quản trị viên (ADMIN)' : 'Không thể tải danh sách người dùng'}
            </p>
            <p className={styles.stateDesc}>{errorMessage}</p>
            {!isForbidden && (
              <button
                type="button"
                onClick={handleRefreshAll}
                className={styles.btnPrimary}
                style={{ marginTop: '8px' }}
              >
                Thử lại
              </button>
            )}
          </div>
        ) : users.length === 0 ? (
          <div className={styles.stateBox}>
            <div className={styles.stateIconWrap}>
              <Users size={20} />
            </div>
            <p className={styles.stateTitle}>Không tìm thấy tài khoản phù hợp</p>
            <p className={styles.stateDesc}>
              Không có người dùng nào khớp với bộ lọc hoặc từ khóa hiện tại. Hãy thử điều chỉnh lại điều kiện tìm kiếm.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className={styles.btnSecondary}
              style={{ marginTop: '8px' }}
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.sttCell}>STT</th>
                    <th style={{ width: '58px' }}>Avatar</th>
                    <th>Họ và tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Ngày đăng ký</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => {
                    const stt = page * size + index + 1;
                    const selfAccount = isCurrentUser(user);
                    const isLocked = user.status !== 'ACTIVE';

                    return (
                      <tr key={user.id} className={styles.tableRow}>
                        <td className={styles.sttCell}>{stt}</td>
                        <td>
                          <div className={styles.avatarBox}>
                            {user.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={user.avatarUrl}
                                alt={user.displayName}
                                className={styles.avatarImg}
                              />
                            ) : (
                              <span>{getInitials(user.displayName, user.email)}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className={styles.userNameWrap}>
                            <button
                              type="button"
                              onClick={() => void openUserDetailModal(user)}
                              className={styles.userNameBtn}
                              title="Nhấn để xem hồ sơ chi tiết"
                            >
                              <span>{user.displayName || 'Chưa cập nhật tên'}</span>
                              {selfAccount && <span className={styles.selfTag}>Bạn</span>}
                            </button>
                            {user.phoneNumber && (
                              <span className={styles.userPhoneSub}>{user.phoneNumber}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={styles.emailText}>{user.email}</span>
                        </td>
                        <td>
                          <div className={styles.badgeList}>
                            {(user.roles && user.roles.length > 0 ? user.roles : ['USER']).map(
                              (role) => {
                                const upper = role.toUpperCase();
                                const roleClass =
                                  upper === 'ADMIN'
                                    ? styles.roleAdmin
                                    : upper === 'MODERATOR'
                                      ? styles.roleModerator
                                      : styles.roleUser;
                                return (
                                  <span key={role} className={`${styles.roleBadge} ${roleClass}`}>
                                    {formatRoleLabel(upper)}
                                  </span>
                                );
                              }
                            )}
                          </div>
                        </td>
                        <td className={styles.dateCell}>{formatDateTime(user.createdAt)}</td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              isLocked ? styles.statusLocked : styles.statusActive
                            }`}
                          >
                            <span className={styles.statusDot} />
                            <span>{isLocked ? 'Đã khóa' : 'Đang hoạt động'}</span>
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionGroup}>
                            <button
                              type="button"
                              onClick={() => void openUserDetailModal(user)}
                              className={styles.iconActionBtn}
                              title="Xem chi tiết tài khoản"
                            >
                              <Eye size={14} />
                              <span>Chi tiết</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openRoleModal(user)}
                              className={styles.iconActionBtn}
                              title="Thay đổi vai trò"
                            >
                              <Shield size={14} />
                              <span>Vai trò</span>
                            </button>
                            {isLocked ? (
                              <button
                                type="button"
                                onClick={() => openStatusConfirmation(user)}
                                className={`${styles.iconActionBtn} ${styles.unlockActionBtn}`}
                                title="Mở khóa tài khoản này"
                              >
                                <Unlock size={14} />
                                <span>Mở khóa</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openStatusConfirmation(user)}
                                disabled={selfAccount}
                                className={`${styles.iconActionBtn} ${styles.lockActionBtn}`}
                                title={
                                  selfAccount
                                    ? 'Quản trị viên không thể tự khóa tài khoản của chính mình'
                                    : 'Khóa tài khoản này'
                                }
                              >
                                <Lock size={14} />
                                <span>Khóa</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.paginationWrap}>
              <PaginationBar
                page={page}
                size={size}
                total={total}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
                onSizeChange={(newSize) => {
                  setSize(newSize);
                  setPage(0);
                }}
              />
            </div>
          </>
        )}
      </section>

      {/* Section D: User Detail Modal */}
      {detailModalOpen && selectedUserDetail && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setDetailModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-detail-modal-title"
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="user-detail-modal-title" className={styles.modalTitle}>
                Chi tiết tài khoản người dùng
              </h2>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className={styles.modalCloseBtn}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.profileBanner}>
                <div className={styles.avatarLarge}>
                  {selectedUserDetail.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedUserDetail.avatarUrl}
                      alt={selectedUserDetail.displayName}
                      className={styles.avatarImg}
                    />
                  ) : (
                    <span>
                      {getInitials(selectedUserDetail.displayName, selectedUserDetail.email)}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                      {selectedUserDetail.displayName || 'Chưa cập nhật tên'}
                    </h3>
                    {isCurrentUser(selectedUserDetail) && (
                      <span className={styles.selfTag}>Tài khoản của bạn</span>
                    )}
                    <span
                      className={`${styles.statusBadge} ${
                        selectedUserDetail.status === 'ACTIVE'
                          ? styles.statusActive
                          : styles.statusLocked
                      }`}
                    >
                      <span className={styles.statusDot} />
                      <span>
                        {selectedUserDetail.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </span>
                  </div>

                  <p style={{ margin: '4px 0 8px 0', fontSize: '0.85rem', color: '#64748b' }}>
                    ID: <code style={{ fontSize: '0.78rem' }}>{selectedUserDetail.id}</code>
                  </p>

                  <div className={styles.badgeList}>
                    {(selectedUserDetail.roles && selectedUserDetail.roles.length > 0
                      ? selectedUserDetail.roles
                      : ['USER']
                    ).map((role) => {
                      const upper = role.toUpperCase();
                      const roleClass =
                        upper === 'ADMIN'
                          ? styles.roleAdmin
                          : upper === 'MODERATOR'
                            ? styles.roleModerator
                            : styles.roleUser;
                      return (
                        <span key={role} className={`${styles.roleBadge} ${roleClass}`}>
                          {formatRoleLabel(upper)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {detailLoading ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                  Đang tải thêm thông tin hồ sơ...
                </div>
              ) : (
                <>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <div className={styles.detailLabel}>
                        <Mail size={13} />
                        <span>Địa chỉ Email</span>
                      </div>
                      <div className={styles.detailValue}>{selectedUserDetail.email}</div>
                    </div>

                    <div className={styles.detailItem}>
                      <div className={styles.detailLabel}>
                        <Phone size={13} />
                        <span>Số điện thoại</span>
                      </div>
                      <div className={styles.detailValue}>
                        {selectedUserDetail.phoneNumber || 'Chưa cung cấp'}
                      </div>
                    </div>

                    <div className={styles.detailItem}>
                      <div className={styles.detailLabel}>
                        <Calendar size={13} />
                        <span>Ngày tạo tài khoản</span>
                      </div>
                      <div className={styles.detailValue}>
                        {formatDateTime(selectedUserDetail.createdAt)}
                      </div>
                    </div>

                    <div className={styles.detailItem}>
                      <div className={styles.detailLabel}>
                        <Clock size={13} />
                        <span>Cập nhật gần nhất</span>
                      </div>
                      <div className={styles.detailValue}>
                        {formatDateTime(selectedUserDetail.updatedAt)}
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailSection}>
                    <div className={styles.detailLabel}>
                      <FileText size={13} />
                      <span>Giới thiệu bản thân (Bio)</span>
                    </div>
                    <div className={styles.detailValue} style={{ color: '#334155', lineHeight: 1.5 }}>
                      {selectedUserDetail.bio || 'Người dùng chưa cập nhật lời giới thiệu.'}
                    </div>
                  </div>

                  <div className={styles.detailSection}>
                    <div className={styles.detailLabel}>
                      <Compass size={13} />
                      <span>Sở thích du lịch</span>
                    </div>
                    {selectedUserDetail.travelPreferences &&
                    selectedUserDetail.travelPreferences.length > 0 ? (
                      <div className={styles.badgeList} style={{ marginTop: '6px' }}>
                        {selectedUserDetail.travelPreferences.map((pref) => (
                          <span key={pref} className={`${styles.roleBadge} ${styles.roleUser}`}>
                            {pref}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.detailValue} style={{ color: '#64748b' }}>
                        Chưa thiết lập sở thích du lịch.
                      </div>
                    )}
                  </div>

                  {(selectedUserDetail.bankCode ||
                    selectedUserDetail.bankAccountNumber ||
                    selectedUserDetail.bankAccountName) && (
                    <div className={styles.detailSection}>
                      <div className={styles.detailLabel}>
                        <CreditCard size={13} />
                        <span>Thông tin nhận quyết toán chuyến đi (Thủ quỹ)</span>
                      </div>
                      <div className={styles.detailValue} style={{ marginTop: '4px' }}>
                        {[
                          selectedUserDetail.bankCode,
                          selectedUserDetail.bankAccountNumber,
                          selectedUserDetail.bankAccountName,
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => openRoleModal(selectedUserDetail)}
                className={styles.btnSecondary}
              >
                Phân quyền vai trò
              </button>
              {selectedUserDetail.status === 'ACTIVE' ? (
                <button
                  type="button"
                  disabled={isCurrentUser(selectedUserDetail)}
                  onClick={() => openStatusConfirmation(selectedUserDetail)}
                  className={styles.btnDanger}
                  title={
                    isCurrentUser(selectedUserDetail)
                      ? 'Không thể tự khóa tài khoản của chính mình'
                      : undefined
                  }
                >
                  Khóa tài khoản
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openStatusConfirmation(selectedUserDetail)}
                  className={styles.btnSuccess}
                >
                  Mở khóa tài khoản
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className={styles.btnPrimary}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section E1: Lock / Unlock Confirmation Modal */}
      {statusModalTarget && (
        <div
          className={styles.modalBackdrop}
          onClick={() => !statusSubmitting && setStatusModalTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-confirm-modal-title"
        >
          <div
            className={`${styles.modalCard} ${styles.modalCardSmall}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="status-confirm-modal-title" className={styles.modalTitle}>
                {statusModalTarget.nextStatus === 'LOCKED'
                  ? 'Xác nhận khóa tài khoản'
                  : 'Xác nhận mở khóa tài khoản'}
              </h2>
              <button
                type="button"
                disabled={statusSubmitting}
                onClick={() => setStatusModalTarget(null)}
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: '#334155', lineHeight: 1.55 }}>
                Bạn đang thực hiện{' '}
                <strong>
                  {statusModalTarget.nextStatus === 'LOCKED' ? 'khóa' : 'mở khóa'}
                </strong>{' '}
                tài khoản của người dùng{' '}
                <strong>{statusModalTarget.user.displayName}</strong> ({statusModalTarget.user.email}).
              </p>

              {statusModalTarget.nextStatus === 'LOCKED' ? (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                  }}
                >
                  Khi bị khóa, người dùng này sẽ không thể đăng nhập và toàn bộ phiên đăng nhập hiện tại (Refresh Token) sẽ bị thu hồi ngay lập tức.
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                  }}
                >
                  Sau khi mở khóa, người dùng có thể đăng nhập và sử dụng lại các tính năng của hệ thống bình thường.
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="status-reason-input" className={styles.formLabel}>
                  Lý do thực hiện (lưu vào Nhật ký kiểm toán - Audit Log)
                </label>
                <textarea
                  id="status-reason-input"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder={
                    statusModalTarget.nextStatus === 'LOCKED'
                      ? 'Nhập lý do khóa tài khoản (ví dụ: Vi phạm quy tắc cộng đồng, spam nội dung...)'
                      : 'Nhập ghi chú mở khóa tài khoản...'
                  }
                  className={styles.textareaInput}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                disabled={statusSubmitting}
                onClick={() => setStatusModalTarget(null)}
                className={styles.btnSecondary}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={statusSubmitting}
                onClick={() => void handleConfirmStatusUpdate()}
                className={
                  statusModalTarget.nextStatus === 'LOCKED'
                    ? styles.btnDanger
                    : styles.btnSuccess
                }
              >
                {statusSubmitting
                  ? 'Đang xử lý...'
                  : statusModalTarget.nextStatus === 'LOCKED'
                    ? 'Xác nhận khóa tài khoản'
                    : 'Xác nhận mở khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section E2: Role Management Modal */}
      {roleModalTarget && (
        <div
          className={styles.modalBackdrop}
          onClick={() => !roleSubmitting && setRoleModalTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
        >
          <div
            className={`${styles.modalCard} ${styles.modalCardSmall}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="role-modal-title" className={styles.modalTitle}>
                Phân quyền vai trò người dùng
              </h2>
              <button
                type="button"
                disabled={roleSubmitting}
                onClick={() => setRoleModalTarget(null)}
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.875rem', color: '#334155' }}>
                Thiết lập quyền hạn cho tài khoản{' '}
                <strong>{roleModalTarget.displayName}</strong> ({roleModalTarget.email}):
              </p>

              <div className={styles.roleOptionList}>
                {ROLE_OPTIONS.map((opt) => {
                  const checked = selectedRoles.includes(opt.code);
                  const lockedSelfAdmin =
                    opt.code === 'ADMIN' && isCurrentUser(roleModalTarget) && checked;

                  return (
                    <label
                      key={opt.code}
                      className={`${styles.roleOptionCard} ${
                        checked ? styles.roleOptionSelected : ''
                      } ${lockedSelfAdmin ? styles.roleOptionDisabled : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={lockedSelfAdmin}
                        onChange={() => toggleRoleSelection(opt.code)}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#0f172a' }}>
                          {opt.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', lineHeight: 1.45 }}>
                          {opt.description}
                        </div>
                        {lockedSelfAdmin && (
                          <div style={{ fontSize: '0.74rem', color: '#0284c7', marginTop: '4px', fontWeight: 500 }}>
                            Không thể tự gỡ quyền ADMIN của chính bạn.
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="role-reason-input" className={styles.formLabel}>
                  Ghi chú phân quyền (Audit Log)
                </label>
                <textarea
                  id="role-reason-input"
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                  placeholder="Nhập lý do thay đổi vai trò (tùy chọn)..."
                  className={styles.textareaInput}
                  style={{ minHeight: '68px' }}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                disabled={roleSubmitting}
                onClick={() => setRoleModalTarget(null)}
                className={styles.btnSecondary}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={roleSubmitting}
                onClick={() => void handleConfirmRoleUpdate()}
                className={styles.btnPrimary}
              >
                {roleSubmitting ? 'Đang lưu...' : 'Lưu thay đổi vai trò'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'success' ? styles.toastSuccess : styles.toastError
          }`}
          role="status"
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
