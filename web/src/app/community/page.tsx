'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  House,
  Compass,
  CalendarDays,
  UsersRound,
  Bookmark,
  Hash,
  Utensils,
  Lightbulb,
  Camera,
  Mountain,
  ImagePlus,
  MapPin,
  PenLine,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Link as LinkIcon,
  Flag,
  X,
  Smile,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Globe,
  Send,
  Trash2,
  Clock,
  DollarSign,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import type { components } from '@/types/api.generated';
import { Navbar } from '@/components/common/Navbar';
import styles from './page.module.css';

type Post = components['schemas']['Post'];
type Comment = components['schemas']['Comment'];
type PostCreate = components['schemas']['PostCreate'];
type Photo = { file: File; preview: string; uploadId?: string };
const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081/api/v1').replace(/\/+$/, '');
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Không kết nối được máy chủ. Vui lòng thử lại.';
const json = (method: string, value?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  ...(value ? { body: JSON.stringify(value) } : {}),
});
const date = (value: string) => new Date(value).toLocaleString('vi-VN');

// ─── STATIC DATA MATCHING VISTA COMMUNITY SPECIFICATION ─────────────────────
const FILTER_CHIPS = [
  'Tất cả',
  'Khoảnh khắc',
  'Review',
  'Kinh nghiệm',
  'Ẩm thực',
  'Thiên nhiên',
  'Văn hóa',
  'Du lịch tự túc',
];

const POPULAR_DESTINATIONS = [
  {
    name: 'Đà Nẵng',
    desc: 'Biển Mỹ Khê & Cầu Vàng Bà Nà',
    count: '12.4K bài viết',
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_golden_bridge.jpg',
  },
  {
    name: 'Hội An',
    desc: 'Phố cổ đèn lồng & sông Hoài êm đềm',
    count: '8.7K bài viết',
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&auto=format&fit=crop',
  },
  {
    name: 'Hà Giang',
    desc: 'Cột cờ Lũng Cú & đèo Mã Pì Lèng',
    count: '6.1K bài viết',
    image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_lungcu_hero.jpg',
  },
  {
    name: 'Nha Trang',
    desc: 'Vịnh biển nhiệt đới & lặn san hô',
    count: '5.9K bài viết',
    image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600&auto=format&fit=crop',
  },
  {
    name: 'Sa Pa',
    desc: 'Ruộng bậc thang & đỉnh Fansipan',
    count: '5.2K bài viết',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=600&auto=format&fit=crop',
  },
];

const RANKED_TOPICS = [
  { rank: 1, name: 'Check-in đẹp', count: '24.1K bài viết', icon: Camera },
  { rank: 2, name: 'Ẩm thực & Đặc sản', count: '18.3K bài viết', icon: Utensils },
  { rank: 3, name: 'Kinh nghiệm du lịch', count: '15.6K bài viết', icon: Lightbulb },
  { rank: 4, name: 'Du lịch cùng gia đình', count: '12.8K bài viết', icon: UsersRound },
  { rank: 5, name: 'Homestay & Khách sạn', count: '11.4K bài viết', icon: House },
];

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ displayName?: string; avatarUrl?: string } | null>(null);

  // Composer state
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState<'Khoảnh khắc' | 'Review' | 'Kinh nghiệm' | 'Cẩm nang'>('Khoảnh khắc');
  const [locationTag, setLocationTag] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [pending, setPending] = useState<PostCreate | null>(null);

  // Active filter & left sidebar
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Interactive sample post states (likes, saved, comments)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [savedDests, setSavedDests] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filterScrollRef = useRef<HTMLDivElement>(null);
  const sendLock = useRef(false);
  const loadLock = useRef(false);
  const photoRef = useRef<Photo[]>([]);

  const load = useCallback(async (next: number) => {
    if (loadLock.current) return;
    loadLock.current = true;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<components['schemas']['PostPage']>(`/posts?page=${next}&size=10`);
      setPosts((old) =>
        next === 0 ? data.items : [...new Map([...old, ...data.items].map((p) => [p.id, p])).values()]
      );
      setTotal(data.total);
      setPage(next);
    } catch (reason) {
      setError(message(reason));
    } finally {
      loadLock.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const session = () => {
      try {
        const token = localStorage.getItem('vista_token');
        const userStr = localStorage.getItem('vista_user');
        if (token && userStr) {
          const user = JSON.parse(userStr);
          setUserId(user.id ?? null);
          setUserProfile(user);
        } else {
          setUserId(null);
          setUserProfile(null);
        }
      } catch {
        setUserId(null);
        setUserProfile(null);
      }
    };
    queueMicrotask(() => {
      session();
      void load(0);
    });
    window.addEventListener('vista-auth-change', session);
    return () => {
      window.removeEventListener('vista-auth-change', session);
    };
  }, [load]);

  useEffect(() => () => {
    photoRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
  }, []);

  const updatePhotos = (value: Photo[]) => {
    photoRef.current = value;
    setPhotos(value);
  };

  const removePhoto = (index: number) => {
    const photo = photos[index];
    URL.revokeObjectURL(photo.preview);
    if (photo.uploadId) void apiRequest(`/post-uploads/${photo.uploadId}`, { method: 'DELETE' }).catch(() => {});
    updatePhotos(photos.filter((_, i) => i !== index));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleLike = (id: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSave = (postId: string) => {
    setSavedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        showToast('Đã bỏ lưu bài viết.');
      } else {
        next.add(postId);
        showToast('Đã lưu bài viết vào mục cá nhân.');
      }
      return next;
    });
  };

  const toggleSaveDest = (destName: string) => {
    setSavedDests((prev) => {
      const next = new Set(prev);
      if (next.has(destName)) {
        next.delete(destName);
        showToast(`Đã bỏ lưu điểm đến ${destName}.`);
      } else {
        next.add(destName);
        showToast(`Đã lưu điểm đến ${destName}.`);
      }
      return next;
    });
  };

  const toggleCommentBox = (id: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const scrollFiltersRight = () => {
    if (filterScrollRef.current) {
      filterScrollRef.current.scrollBy({ left: 160, behavior: 'smooth' });
    }
  };

  const send = async () => {
    if (sendLock.current) return;
    sendLock.current = true;
    setSending(true);
    setSendError('');
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < photos.length; i += 1) {
        const item = photos[i];
        if (item.uploadId) {
          uploaded.push(item.uploadId);
        } else {
          const form = new FormData();
          form.append('file', item.file);
          const res = await apiRequest<{ uploadId: string }>('/post-uploads', { method: 'POST', body: form });
          item.uploadId = res.uploadId;
          uploaded.push(res.uploadId);
        }
      }

      const postBody = locationTag ? `${text}\n\n📍 ${locationTag}` : text;
      const clientRequestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}`;
      const payload: PostCreate = {
        body: postBody,
        clientRequestId,
        uploadIds: uploaded,
      };
      setPending(payload);
      const created = await apiRequest<Post>('/posts', json('POST', payload));
      setPosts((old) => [created, ...old.filter((p) => p.id !== created.id)]);
      setTotal((old) => old + 1);
      setText('');
      setLocationTag('');
      setShowLocationInput(false);
      photoRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
      updatePhotos([]);
      setExpanded(false);
      showToast('Đã chia sẻ bài viết thành công!');
    } catch (reason) {
      setSendError(message(reason));
    } finally {
      setSending(false);
      setPending(null);
      sendLock.current = false;
    }
  };

  return (
    <div className={styles.pageRoot}>
      {/* ── 3-Column Layout Container ── */}
      <div className={styles.container3Col}>
        {/* ══════════════════════════════════════════════════════════════════
            COLUMN 1: LEFT SIDEBAR (PLATFORM NAVIGATION & TOPICS)
           ══════════════════════════════════════════════════════════════════ */}
        <aside className={styles.leftSidebar} aria-label="Điều hướng cộng đồng">
          {/* Nhóm Điều Hướng */}
          <div className={styles.navSection}>
            <Link href="/" className={styles.navItem}>
              <span className={styles.navIcon}>
                <House size={19} strokeWidth={1.8} />
              </span>
              <span>Trang chủ</span>
            </Link>

            <Link href="/explore" className={styles.navItem}>
              <span className={styles.navIcon}>
                <Compass size={19} strokeWidth={1.8} />
              </span>
              <span>Khám phá</span>
            </Link>

            <Link href="/trips" className={styles.navItem}>
              <span className={styles.navIcon}>
                <CalendarDays size={19} strokeWidth={1.8} />
              </span>
              <span>Lịch trình của tôi</span>
            </Link>

            <Link href="/community" className={`${styles.navItem} ${styles.navItemActive}`}>
              <span className={styles.navIcon}>
                <UsersRound size={19} strokeWidth={1.8} />
              </span>
              <span>Cộng đồng</span>
            </Link>

            <button
              type="button"
              className={`${styles.navItem} ${activeFilter === 'Đã lưu' ? styles.navItemActive : ''}`}
              onClick={() => {
                setActiveFilter(activeFilter === 'Đã lưu' ? 'Tất cả' : 'Đã lưu');
                showToast(activeFilter === 'Đã lưu' ? 'Hiển thị tất cả bài viết' : 'Đang lọc bài viết đã lưu');
              }}
            >
              <span className={styles.navIcon}>
                <Bookmark size={19} strokeWidth={1.8} />
              </span>
              <span>Bài viết đã lưu</span>
            </button>
          </div>

          <div className={styles.sidebarDivider} />

          {/* Nhóm Chủ Đề */}
          <div className={styles.navSection}>
            <h4 className={styles.topicHeading}>Chủ đề nổi bật</h4>

            <button
              type="button"
              className={`${styles.topicItem} ${activeFilter === 'Tất cả' ? styles.topicItemActive : ''}`}
              onClick={() => setActiveFilter('Tất cả')}
            >
              <span className={styles.topicIcon}>
                <Hash size={18} strokeWidth={1.8} />
              </span>
              <span>Tất cả bài viết</span>
            </button>

            <button
              type="button"
              className={`${styles.topicItem} ${activeFilter === 'Khoảnh khắc' ? styles.topicItemActive : ''}`}
              onClick={() => setActiveFilter('Khoảnh khắc')}
            >
              <span className={styles.topicIcon}>
                <Camera size={18} strokeWidth={1.8} />
              </span>
              <span>Khoảnh khắc du lịch</span>
            </button>

            <button
              type="button"
              className={`${styles.topicItem} ${activeFilter === 'Kinh nghiệm' ? styles.topicItemActive : ''}`}
              onClick={() => setActiveFilter('Kinh nghiệm')}
            >
              <span className={styles.topicIcon}>
                <Lightbulb size={18} strokeWidth={1.8} />
              </span>
              <span>Kinh nghiệm & cẩm nang</span>
            </button>

            <button
              type="button"
              className={`${styles.topicItem} ${activeFilter === 'Ẩm thực' ? styles.topicItemActive : ''}`}
              onClick={() => setActiveFilter('Ẩm thực')}
            >
              <span className={styles.topicIcon}>
                <Utensils size={18} strokeWidth={1.8} />
              </span>
              <span>Ẩm thực địa phương</span>
            </button>

            <button
              type="button"
              className={`${styles.topicItem} ${activeFilter === 'Review' ? styles.topicItemActive : ''}`}
              onClick={() => setActiveFilter('Review')}
            >
              <span className={styles.topicIcon}>
                <MapPin size={18} strokeWidth={1.8} />
              </span>
              <span>Check-in & khám phá</span>
            </button>

            <button
              type="button"
              className={`${styles.topicItem} ${activeFilter === 'Du lịch tự túc' ? styles.topicItemActive : ''}`}
              onClick={() => setActiveFilter('Du lịch tự túc')}
            >
              <span className={styles.topicIcon}>
                <Mountain size={18} strokeWidth={1.8} />
              </span>
              <span>Du lịch tự túc</span>
            </button>

            {showAllTopics && (
              <>
                <button
                  type="button"
                  className={styles.topicItem}
                  onClick={() => setActiveFilter('Gia đình')}
                >
                  <span className={styles.topicIcon}>
                    <UsersRound size={18} strokeWidth={1.8} />
                  </span>
                  <span>Du lịch cùng gia đình</span>
                </button>
                <button
                  type="button"
                  className={styles.topicItem}
                  onClick={() => setActiveFilter('Cặp đôi')}
                >
                  <span className={styles.topicIcon}>
                    <Heart size={18} strokeWidth={1.8} />
                  </span>
                  <span>Du lịch cặp đôi</span>
                </button>
                <button
                  type="button"
                  className={styles.topicItem}
                  onClick={() => setActiveFilter('Homestay')}
                >
                  <span className={styles.topicIcon}>
                    <House size={18} strokeWidth={1.8} />
                  </span>
                  <span>Homestay & Khách sạn</span>
                </button>
              </>
            )}

            <button
              type="button"
              className={styles.seeMoreTopicsBtn}
              onClick={() => setShowAllTopics(!showAllTopics)}
            >
              <span>{showAllTopics ? 'Thu gọn' : 'Xem thêm chủ đề'}</span>
              {showAllTopics ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════════════════
            COLUMN 2: CENTER COMMUNITY FEED
           ══════════════════════════════════════════════════════════════════ */}
        <main className={styles.feedCenter}>
          {/* Header Banner */}
          <div className={styles.communityHeader}>
            <div>
              <h1 className={styles.communityTitle}>Cộng đồng VISTA</h1>
              <p className={styles.communitySubtitle}>Chia sẻ hành trình, kết nối đam mê.</p>
            </div>

            <div className={styles.headerWidgets}>
              <div className={styles.memberAvatars}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop"
                  alt="Thành viên 1"
                  className={styles.memberAvatarImg}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop"
                  alt="Thành viên 2"
                  className={styles.memberAvatarImg}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop"
                  alt="Thành viên 3"
                  className={styles.memberAvatarImg}
                />
              </div>
              <span className={styles.memberCountBadge}>128.4K thành viên</span>
              <button
                type="button"
                className={styles.btnWritePost}
                onClick={() => {
                  setExpanded(true);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
              >
                <PenLine size={16} strokeWidth={2} />
                <span>Viết bài</span>
              </button>
            </div>
          </div>

          {/* Story Composer Card */}
          <section className={styles.composerCard} aria-label="Soạn bài chia sẻ">
            <div className={styles.composerTopRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  userProfile?.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop'
                }
                alt="Avatar của bạn"
                className={styles.composerAvatar}
              />
              {!expanded ? (
                <div className={styles.composerInputFake} onClick={() => setExpanded(true)}>
                  Bạn vừa khám phá điều gì?
                </div>
              ) : (
                <div style={{ flex: 1 }}>
                  {/* Category selector pills */}
                  <div className={styles.categoryPillsRow}>
                    {(['Khoảnh khắc', 'Review', 'Kinh nghiệm', 'Cẩm nang'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`${styles.categoryPill} ${category === cat ? styles.categoryPillActive : ''}`}
                        onClick={() => setCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <textarea
                    className={styles.composerTextarea}
                    placeholder="Chia sẻ trải nghiệm, mẹo nhỏ hoặc cảm xúc của bạn..."
                    value={text}
                    maxLength={4000}
                    disabled={sending}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                  />

                  {showLocationInput && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <input
                        type="text"
                        placeholder="Nhập tên địa điểm (VD: Cầu Vàng Đà Nẵng)..."
                        value={locationTag}
                        onChange={(e) => setLocationTag(e.target.value)}
                        className={styles.commentInput}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLocationInput(false)}
                        className={styles.toolButton}
                        style={{ padding: '0 8px' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {photos.length > 0 && (
                    <div className={styles.photoFilmstrip}>
                      {photos.map((p, i) => (
                        <div key={p.preview} className={styles.photoFrame}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.preview} alt={`Ảnh ${i + 1}`} />
                          <button
                            type="button"
                            className={styles.photoRemoveBtn}
                            onClick={() => removePhoto(i)}
                            title="Xóa ảnh này"
                          >
                            <X size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.composerBottomBar}>
              <div className={styles.composerToolsLeft}>
                <label className={styles.toolButton} style={{ cursor: 'pointer' }}>
                  <ImagePlus size={17} strokeWidth={1.8} className={styles.toolIcon} />
                  <span>Thêm ảnh</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    style={{ display: 'none' }}
                    disabled={sending || photos.length >= 4}
                    onChange={(e) => {
                      setExpanded(true);
                      const files = [...(e.target.files ?? [])];
                      e.target.value = '';
                      if (
                        photos.length + files.length > 4 ||
                        files.some((f) => !['image/jpeg', 'image/png'].includes(f.type) || f.size > 5242880)
                      ) {
                        setSendError('Chọn tối đa 4 ảnh định dạng JPEG/PNG, mỗi ảnh ≤ 5 MiB.');
                        return;
                      }
                      updatePhotos([
                        ...photos,
                        ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
                      ]);
                    }}
                  />
                </label>

                <button
                  type="button"
                  className={styles.toolButton}
                  onClick={() => {
                    setExpanded(true);
                    setShowLocationInput(true);
                  }}
                >
                  <MapPin size={17} strokeWidth={1.8} className={styles.toolIcon} />
                  <span>{locationTag ? locationTag : 'Gắn địa điểm'}</span>
                </button>

                <button
                  type="button"
                  className={styles.toolButton}
                  onClick={() => {
                    setExpanded(true);
                    setText((prev) => `${prev} ✨`);
                  }}
                >
                  <Smile size={17} strokeWidth={1.8} className={styles.toolIcon} />
                  <span>Cảm xúc</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {expanded && (
                  <button
                    type="button"
                    className={styles.btnCancelModal}
                    onClick={() => {
                      setExpanded(false);
                      setText('');
                      setLocationTag('');
                      setShowLocationInput(false);
                      setPhotos([]);
                    }}
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="button"
                  className={styles.btnShareSubmit}
                  disabled={sending || !text.trim()}
                  onClick={() => void send()}
                >
                  {sending ? 'Đang chia sẻ…' : 'Chia sẻ'}
                </button>
              </div>
            </div>

            {sendError && (
              <p style={{ color: '#E11D48', fontSize: 13, margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flag size={14} />
                <span>{sendError}</span>
              </p>
            )}
          </section>

          {/* Filter Chips Bar */}
          <div className={styles.filterChipsWrapper}>
            <div className={styles.filterChipsScroll} ref={filterScrollRef}>
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`${styles.filterChip} ${activeFilter === chip ? styles.filterChipActive : ''}`}
                  onClick={() => setActiveFilter(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.filterArrowBtn}
              onClick={scrollFiltersRight}
              title="Xem thêm bộ lọc"
            >
              <ChevronRight size={17} strokeWidth={2} />
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              POSTS FEED LIST
             ══════════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* ── Post 1: Cầu Vàng, Đà Nẵng ── */}
            <article className={styles.storyPostCard}>
              <header className={styles.postHeaderRow}>
                <div className={styles.authorContainer}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop"
                    alt="Nguyễn Hải Đăng"
                    className={styles.authorAvatarImg}
                  />
                  <div className={styles.authorMetaCol}>
                    <div className={styles.authorTopLine}>
                      <span className={styles.authorDisplayName}>Nguyễn Hải Đăng</span>
                      <span className={styles.verifiedIcon} title="Đã xác thực">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    </div>
                    <div className={styles.postSubMeta}>
                      <span>3 giờ trước</span>
                      <span>•</span>
                      <span>Cầu Vàng, Đà Nẵng</span>
                      <span>•</span>
                      <span className={styles.categoryTagText}>Khoảnh khắc</span>
                    </div>
                  </div>
                </div>

                <PostDropdownMenu
                  onCopy={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Đã sao chép liên kết bài viết!');
                  }}
                  onReport={() =>
                    setReportingPost({
                      id: 'sample-danang',
                      body: 'Đón bình minh tại Bà Nà Hills lúc 6 giờ sáng...',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      version: 1,
                      author: { id: 'danang-user', displayName: 'Nguyễn Hải Đăng' },
                      media: [],
                    })
                  }
                />
              </header>

              <p className={styles.postBodyContent}>
                Đón bình minh tại Bà Nà Hills lúc 6 giờ sáng. Khi sương mù vừa tan và những tia nắng đầu tiên
                rọi qua đôi bàn tay đá khổng lồ, cảm giác như lạc vào cõi tiên vậy. Mọi người nên đi chuyến cáp
                treo sớm nhất để tránh đông nhé!
              </p>

              <div className={styles.mediaSingleWrapper}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_golden_bridge.jpg"
                  alt="Cầu Vàng Bà Nà Hills Đà Nẵng"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div>
                <span className={styles.locationBadgePill}>
                  <MapPin size={13} strokeWidth={2} />
                  <span>Cầu Vàng - Bà Nà Hills, Đà Nẵng</span>
                </span>
              </div>

              <div className={styles.postTagsRow}>
                <span className={styles.hashtagItem}>#ĐàNẵng</span>
                <span className={styles.hashtagItem}>#SănBìnhMinh</span>
                <span className={styles.hashtagItem}>#BàNàHills</span>
              </div>

              <div className={styles.reactionsCountRow}>
                <div className={styles.likesCounter}>
                  <Heart size={14} fill="#E11D48" color="#E11D48" />
                  <span style={{ fontWeight: 600, color: '#334155', marginLeft: 4 }}>
                    {likedPosts.has('post-danang') ? 143 : 142} yêu thích
                  </span>
                </div>
                <div className={styles.commentsSharesCounter}>
                  <span>28 bình luận</span>
                  <span>•</span>
                  <span>12 chia sẻ</span>
                </div>
              </div>

              <footer className={styles.interactionDockRow}>
                <button
                  type="button"
                  className={`${styles.dockActionBtn} ${likedPosts.has('post-danang') ? styles.dockBtnLiked : ''}`}
                  onClick={() => toggleLike('post-danang')}
                >
                  <Heart size={18} strokeWidth={1.8} />
                  <span>{likedPosts.has('post-danang') ? 'Đã thích' : 'Thích'}</span>
                </button>

                <button
                  type="button"
                  className={styles.dockActionBtn}
                  onClick={() => toggleCommentBox('post-danang')}
                >
                  <MessageCircle size={18} strokeWidth={1.8} />
                  <span>Bình luận</span>
                </button>

                <button
                  type="button"
                  className={styles.dockActionBtn}
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Đã sao chép liên kết bài viết!');
                  }}
                >
                  <Share2 size={18} strokeWidth={1.8} />
                  <span>Chia sẻ</span>
                </button>

                <button
                  type="button"
                  className={`${styles.dockActionBtn} ${savedPosts.has('post-danang') ? styles.dockBtnSaved : ''}`}
                  onClick={() => toggleSave('post-danang')}
                >
                  <Bookmark size={18} strokeWidth={1.8} />
                  <span>{savedPosts.has('post-danang') ? 'Đã lưu' : 'Lưu'}</span>
                </button>
              </footer>

              {openComments.has('post-danang') && (
                <div className={styles.commentsDrawer}>
                  <div className={styles.commentBubble}>
                    <div className={styles.commentAuthorRow}>
                      <span className={styles.commentAuthorName}>Trần Bích Phương</span>
                      <span className={styles.commentTimeText}>1 giờ trước</span>
                    </div>
                    <p className={styles.commentBodyText}>
                      Ảnh chụp góc máy đỉnh quá bạn ơi! Cáp treo lên sớm có bị lạnh không vậy?
                    </p>
                  </div>
                  <div className={styles.commentBubble}>
                    <div className={styles.commentAuthorRow}>
                      <span className={styles.commentAuthorName}>Nguyễn Hải Đăng</span>
                      <span className={styles.commentTimeText}>45 phút trước</span>
                    </div>
                    <p className={styles.commentBodyText}>
                      Sáng sớm trên đỉnh Bà Nà hơi se se lạnh khoảng 18-20 độ, nên khoác thêm áo gió mỏng nhé bạn!
                    </p>
                  </div>
                  <CommentInputForm onSubmit={(val) => showToast(`Đã gửi bình luận: "${val}"`)} />
                </div>
              )}
            </article>

            {/* ── Post 2: Phố cổ Hội An ── */}
            <article className={styles.storyPostCard}>
              <header className={styles.postHeaderRow}>
                <div className={styles.authorContainer}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop"
                    alt="Trần Bích Phương"
                    className={styles.authorAvatarImg}
                  />
                  <div className={styles.authorMetaCol}>
                    <div className={styles.authorTopLine}>
                      <span className={styles.authorDisplayName}>Trần Bích Phương</span>
                      <span className={styles.verifiedIcon} title="Đã xác thực">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    </div>
                    <div className={styles.postSubMeta}>
                      <span>Hôm qua</span>
                      <span>•</span>
                      <span>Phố cổ Hội An</span>
                      <span>•</span>
                      <span className={styles.categoryTagText}>Trải nghiệm địa phương</span>
                    </div>
                  </div>
                </div>

                <PostDropdownMenu
                  onCopy={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Đã sao chép liên kết bài viết!');
                  }}
                  onReport={() =>
                    setReportingPost({
                      id: 'sample-hoian',
                      body: 'Một buổi chiều thật dịu dàng ở Hội An...',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      version: 1,
                      author: { id: 'hoian-user', displayName: 'Trần Bích Phương' },
                      media: [],
                    })
                  }
                />
              </header>

              <p className={styles.postBodyContent}>
                Một buổi chiều thật dịu dàng ở Hội An 🌿 Những mái nhà rêu phong, giàn hoa giấy rực rỡ và những chiếc
                đèn lồng lung linh khi phố lên đèn. Đừng quên ghé ăn một tô cao lầu gia truyền đậm đà!
              </p>

              <div className={styles.mediaDoubleWrapper}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&auto=format&fit=crop"
                  alt="Sông Hoài Hội An rực rỡ đèn hoa đăng"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&auto=format&fit=crop"
                  alt="Cao lầu đặc sản Hội An"
                />
              </div>

              <div>
                <span className={styles.locationBadgePill}>
                  <MapPin size={13} strokeWidth={2} />
                  <span>Phố cổ Hội An, Quảng Nam</span>
                </span>
              </div>

              <div className={styles.postTagsRow}>
                <span className={styles.hashtagItem}>#HộiAn</span>
                <span className={styles.hashtagItem}>#ẨmThựcĐịaPhương</span>
                <span className={styles.hashtagItem}>#CaoLầu</span>
              </div>

              <div className={styles.reactionsCountRow}>
                <div className={styles.likesCounter}>
                  <Heart size={14} fill="#E11D48" color="#E11D48" />
                  <span style={{ fontWeight: 600, color: '#334155', marginLeft: 4 }}>
                    {likedPosts.has('post-hoian') ? 90 : 89} yêu thích
                  </span>
                </div>
                <div className={styles.commentsSharesCounter}>
                  <span>14 bình luận</span>
                  <span>•</span>
                  <span>8 chia sẻ</span>
                </div>
              </div>

              <footer className={styles.interactionDockRow}>
                <button
                  type="button"
                  className={`${styles.dockActionBtn} ${likedPosts.has('post-hoian') ? styles.dockBtnLiked : ''}`}
                  onClick={() => toggleLike('post-hoian')}
                >
                  <Heart size={18} strokeWidth={1.8} />
                  <span>{likedPosts.has('post-hoian') ? 'Đã thích' : 'Thích'}</span>
                </button>

                <button
                  type="button"
                  className={styles.dockActionBtn}
                  onClick={() => toggleCommentBox('post-hoian')}
                >
                  <MessageCircle size={18} strokeWidth={1.8} />
                  <span>Bình luận</span>
                </button>

                <button
                  type="button"
                  className={styles.dockActionBtn}
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Đã sao chép liên kết bài viết!');
                  }}
                >
                  <Share2 size={18} strokeWidth={1.8} />
                  <span>Chia sẻ</span>
                </button>

                <button
                  type="button"
                  className={`${styles.dockActionBtn} ${savedPosts.has('post-hoian') ? styles.dockBtnSaved : ''}`}
                  onClick={() => toggleSave('post-hoian')}
                >
                  <Bookmark size={18} strokeWidth={1.8} />
                  <span>{savedPosts.has('post-hoian') ? 'Đã lưu' : 'Lưu'}</span>
                </button>
              </footer>

              {openComments.has('post-hoian') && (
                <div className={styles.commentsDrawer}>
                  <div className={styles.commentBubble}>
                    <div className={styles.commentAuthorRow}>
                      <span className={styles.commentAuthorName}>Lê Minh Anh</span>
                      <span className={styles.commentTimeText}>3 giờ trước</span>
                    </div>
                    <p className={styles.commentBodyText}>
                      Quán cao lầu nào ngon nhất vậy bạn, cho mình xin địa chỉ với!
                    </p>
                  </div>
                  <CommentInputForm onSubmit={(val) => showToast(`Đã gửi bình luận: "${val}"`)} />
                </div>
              )}
            </article>

            {/* ── Post 3: Hà Giang Travel Guide / Review ── */}
            <article className={styles.storyPostCard}>
              <header className={styles.postHeaderRow}>
                <div className={styles.authorContainer}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop"
                    alt="Lê Minh Anh"
                    className={styles.authorAvatarImg}
                  />
                  <div className={styles.authorMetaCol}>
                    <div className={styles.authorTopLine}>
                      <span className={styles.authorDisplayName}>Lê Minh Anh</span>
                      <span className={styles.verifiedIcon} title="Đã xác thực">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    </div>
                    <div className={styles.postSubMeta}>
                      <span>2 ngày trước</span>
                      <span>•</span>
                      <span>Hà Giang</span>
                      <span>•</span>
                      <span className={styles.categoryTagText}>Cẩm nang & Kinh nghiệm</span>
                    </div>
                  </div>
                </div>

                <PostDropdownMenu
                  onCopy={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Đã sao chép liên kết bài viết!');
                  }}
                  onReport={() =>
                    setReportingPost({
                      id: 'sample-hagiang',
                      body: 'Hành trình 3N2Đ chinh phục những cung đèo ngoạn mục...',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      version: 1,
                      author: { id: 'hagiang-user', displayName: 'Lê Minh Anh' },
                      media: [],
                    })
                  }
                />
              </header>

              <p className={styles.postBodyContent}>
                Hành trình 3N2Đ chinh phục những cung đèo ngoạn mục nhất miền cực Bắc. Đứng trên đỉnh Mã Pì Lèng nhìn
                xuống dòng sông Nho Quế xanh ngắt như dải lụa là trải nghiệm nhất định phải thử một lần trong đời!
              </p>

              {/* Structured Travel Review Guide Box */}
              <div className={styles.travelReviewGuideBox}>
                <div className={styles.guideItem}>
                  <Clock size={16} color="#0284C7" />
                  <span className={styles.guideLabel}>Thời gian:</span>
                  <span className={styles.guideValue}>3 ngày 2 đêm</span>
                </div>

                <div className={styles.guideItem}>
                  <DollarSign size={16} color="#0284C7" />
                  <span className={styles.guideLabel}>Chi phí:</span>
                  <span className={styles.guideValue}>~2.500.000đ/người</span>
                </div>

                <div className={styles.guideItem}>
                  <Calendar size={16} color="#0284C7" />
                  <span className={styles.guideLabel}>Thời điểm:</span>
                  <span className={styles.guideValue}>Tháng 9 – 11</span>
                </div>

                <div className={styles.guideItem} style={{ gridColumn: '1 / -1' }}>
                  <Sparkles size={16} color="#0284C7" />
                  <span className={styles.guideLabel}>Mẹo nhỏ:</span>
                  <span className={styles.guideValue}>
                    Thuê xe máy có số khỏe, đổ đầy xăng trước các cung đèo và nhớ mang áo ấm vì đêm trên cao nguyên rất lạnh.
                  </span>
                </div>
              </div>

              <div className={styles.mediaSingleWrapper}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_lungcu_hero.jpg"
                  alt="Đèo Mã Pì Lèng và sông Nho Quế Hà Giang"
                />
              </div>

              <div>
                <span className={styles.locationBadgePill}>
                  <MapPin size={13} strokeWidth={2} />
                  <span>Đèo Mã Pì Lèng, Hà Giang</span>
                </span>
              </div>

              <div className={styles.postTagsRow}>
                <span className={styles.hashtagItem}>#HàGiang</span>
                <span className={styles.hashtagItem}>#PhượtTâyBắc</span>
                <span className={styles.hashtagItem}>#SôngNhoQuế</span>
              </div>

              <div className={styles.reactionsCountRow}>
                <div className={styles.likesCounter}>
                  <Heart size={14} fill="#E11D48" color="#E11D48" />
                  <span style={{ fontWeight: 600, color: '#334155', marginLeft: 4 }}>
                    {likedPosts.has('post-hagiang') ? 216 : 215} yêu thích
                  </span>
                </div>
                <div className={styles.commentsSharesCounter}>
                  <span>42 bình luận</span>
                  <span>•</span>
                  <span>31 chia sẻ</span>
                </div>
              </div>

              <footer className={styles.interactionDockRow}>
                <button
                  type="button"
                  className={`${styles.dockActionBtn} ${likedPosts.has('post-hagiang') ? styles.dockBtnLiked : ''}`}
                  onClick={() => toggleLike('post-hagiang')}
                >
                  <Heart size={18} strokeWidth={1.8} />
                  <span>{likedPosts.has('post-hagiang') ? 'Đã thích' : 'Thích'}</span>
                </button>

                <button
                  type="button"
                  className={styles.dockActionBtn}
                  onClick={() => toggleCommentBox('post-hagiang')}
                >
                  <MessageCircle size={18} strokeWidth={1.8} />
                  <span>Bình luận</span>
                </button>

                <button
                  type="button"
                  className={styles.dockActionBtn}
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Đã sao chép liên kết bài viết!');
                  }}
                >
                  <Share2 size={18} strokeWidth={1.8} />
                  <span>Chia sẻ</span>
                </button>

                <button
                  type="button"
                  className={`${styles.dockActionBtn} ${savedPosts.has('post-hagiang') ? styles.dockBtnSaved : ''}`}
                  onClick={() => toggleSave('post-hagiang')}
                >
                  <Bookmark size={18} strokeWidth={1.8} />
                  <span>{savedPosts.has('post-hagiang') ? 'Đã lưu' : 'Lưu'}</span>
                </button>
              </footer>

              {openComments.has('post-hagiang') && (
                <div className={styles.commentsDrawer}>
                  <div className={styles.commentBubble}>
                    <div className={styles.commentAuthorRow}>
                      <span className={styles.commentAuthorName}>Đỗ Hoàng Long</span>
                      <span className={styles.commentTimeText}>1 ngày trước</span>
                    </div>
                    <p className={styles.commentBodyText}>
                      Review chi tiết và thiết thực quá! Cảm ơn bạn nhiều.
                    </p>
                  </div>
                  <CommentInputForm onSubmit={(val) => showToast(`Đã gửi bình luận: "${val}"`)} />
                </div>
              )}
            </article>

            {/* ── Dynamic Live Posts from Spring Boot Backend ── */}
            {posts.map((post) => (
              <LivePostCard
                key={post.id}
                post={post}
                userId={userId}
                isSaved={savedPosts.has(post.id)}
                isLiked={likedPosts.has(post.id)}
                onToggleLike={() => toggleLike(post.id)}
                onToggleSave={() => toggleSave(post.id)}
                onReport={() => setReportingPost(post)}
                onToast={showToast}
                onDelete={() => {
                  setPosts((old) => old.filter((p) => p.id !== post.id));
                  setTotal((old) => Math.max(0, old - 1));
                  showToast('Đã xóa bài viết.');
                }}
              />
            ))}

            {loading && (
              <p style={{ textAlign: 'center', color: '#64748B', padding: '16px 0', fontSize: 13.5 }}>
                Đang tải thêm những câu chuyện tiếp theo…
              </p>
            )}

            {posts.length < total && !loading && (
              <button
                type="button"
                className={styles.btnShareSubmit}
                style={{ width: '100%', margin: '10px 0 20px', background: '#F1F5F9', color: '#0284C7' }}
                onClick={() => void load(page + 1)}
              >
                Xem thêm câu chuyện khác
              </button>
            )}
          </div>
        </main>

        {/* ══════════════════════════════════════════════════════════════════
            COLUMN 3: RIGHT SIDEBAR (DESTINATIONS & TOPICS)
           ══════════════════════════════════════════════════════════════════ */}
        <aside className={styles.rightSidebar} aria-label="Khám phá điểm đến & chủ đề">
          {/* Card 1: Điểm đến đang nổi bật */}
          <div className={styles.sidebarCardBlock}>
            <div className={styles.sidebarCardTop}>
              <h3 className={styles.sidebarSectionTitle}>Điểm đến đang nổi bật</h3>
              <Link href="/map" className={styles.seeAllLink}>
                Xem tất cả ›
              </Link>
            </div>

            <div className={styles.destinationList}>
              {POPULAR_DESTINATIONS.map((dest) => (
                <div key={dest.name} className={styles.destinationRowItem}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className={styles.destinationThumbImg}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop';
                    }}
                  />
                  <div className={styles.destinationDetails}>
                    <h4 className={styles.destinationNameTitle}>{dest.name}</h4>
                    <p className={styles.destinationShortDesc}>{dest.desc}</p>
                    <div className={styles.destinationPostCountLabel}>{dest.count}</div>
                  </div>
                  <button
                    type="button"
                    className={`${styles.destSaveBookmarkBtn} ${savedDests.has(dest.name) ? styles.destSaveBookmarkBtnActive : ''}`}
                    onClick={() => toggleSaveDest(dest.name)}
                    title={savedDests.has(dest.name) ? 'Đã lưu điểm đến' : 'Lưu điểm đến'}
                  >
                    <Bookmark size={16} strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Chủ đề được yêu thích */}
          <div className={styles.sidebarCardBlock}>
            <div className={styles.sidebarCardTop}>
              <h3 className={styles.sidebarSectionTitle}>Chủ đề được yêu thích</h3>
              <Link href="/community" className={styles.seeAllLink}>
                Xem tất cả ›
              </Link>
            </div>

            <div className={styles.popularTopicsList}>
              {RANKED_TOPICS.map((topic) => {
                const IconComp = topic.icon;
                return (
                  <Link
                    key={topic.name}
                    href={`/community?topic=${encodeURIComponent(topic.name)}`}
                    className={styles.popularTopicRow}
                    onClick={() => {
                      setActiveFilter(topic.name);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <span className={styles.topicRankIndex}>{topic.rank}</span>
                    <div className={styles.topicIconSquircle}>
                      <IconComp size={18} strokeWidth={1.8} />
                    </div>
                    <div className={styles.topicMetaText}>
                      <h5 className={styles.topicTextName}>{topic.name}</h5>
                      <span className={styles.topicPostsCount}>{topic.count}</span>
                    </div>
                    <span className={styles.topicChevronIcon}>
                      <ChevronRight size={16} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Report Dialog Modal ── */}
      {reportingPost && (
        <ReportDialogModal
          post={reportingPost}
          onClose={() => setReportingPost(null)}
          onSuccess={() => {
            setReportingPost(null);
            showToast('Đã gửi báo cáo vi phạm tới ban kiểm duyệt VISTA.');
          }}
        />
      )}

      {/* ── Toast Feedback Notification ── */}
      {toastMessage && (
        <div className={styles.toastPill}>
          <Sparkles size={16} color="#38BDF8" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

// ─── POST DROPDOWN MENU COMPONENT ───────────────────────────────────────────
function PostDropdownMenu({
  onCopy,
  onReport,
  onDelete,
}: {
  onCopy: () => void;
  onReport: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div className={styles.moreMenuWrap} ref={menuRef}>
      <button
        type="button"
        className={styles.moreMenuBtn}
        onClick={() => setOpen(!open)}
        title="Tùy chọn bài viết"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className={styles.dropdownBox}>
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              setOpen(false);
              onCopy();
            }}
          >
            <LinkIcon size={15} strokeWidth={1.8} />
            <span>Sao chép liên kết</span>
          </button>

          <button
            type="button"
            className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
            onClick={() => {
              setOpen(false);
              onReport();
            }}
          >
            <Flag size={15} strokeWidth={1.8} />
            <span>Báo cáo vi phạm</span>
          </button>

          {onDelete && (
            <button
              type="button"
              className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 size={15} strokeWidth={1.8} />
              <span>Xóa bài viết</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LIVE POST COMPONENT (CONNECTING TO SPRING BOOT BACKEND) ────────────────
function LivePostCard({
  post,
  userId,
  isSaved,
  isLiked,
  onToggleLike,
  onToggleSave,
  onReport,
  onToast,
  onDelete,
}: {
  post: Post;
  userId: string | null;
  isSaved: boolean;
  isLiked: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onReport: () => void;
  onToast: (msg: string) => void;
  onDelete: () => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <article className={styles.storyPostCard}>
      <header className={styles.postHeaderRow}>
        <div className={styles.authorContainer}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#E0F2FE',
              color: '#0284C7',
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
              fontSize: 15,
            }}
          >
            {post.author.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className={styles.authorMetaCol}>
            <div className={styles.authorTopLine}>
              <span className={styles.authorDisplayName}>{post.author.displayName}</span>
            </div>
            <div className={styles.postSubMeta}>
              <span>{date(post.createdAt)}</span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Globe size={12} />
                <span>Công khai</span>
              </span>
            </div>
          </div>
        </div>

        <PostDropdownMenu
          onCopy={() => {
            navigator.clipboard?.writeText(window.location.href);
            onToast('Đã sao chép liên kết bài viết!');
          }}
          onReport={onReport}
          onDelete={
            post.author.id === userId
              ? async () => {
                  if (window.confirm('Bạn có chắc muốn xóa bài đăng này?')) {
                    await apiRequest(`/posts/${post.id}`, { method: 'DELETE' });
                    onDelete();
                  }
                }
              : undefined
          }
        />
      </header>

      <p className={styles.postBodyContent}>{post.body}</p>

      {post.media.length > 0 && (
        <div className={styles.mediaSingleWrapper}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${base}${post.media[0].path}`}
            alt="Ảnh chuyến đi"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop';
            }}
          />
        </div>
      )}

      {post.destinationId && (
        <div>
          <Link href={`/destination/${post.destinationId}`} className={styles.locationBadgePill}>
            <MapPin size={13} strokeWidth={2} />
            <span>Xem điểm đến liên quan →</span>
          </Link>
        </div>
      )}

      <footer className={styles.interactionDockRow}>
        <button
          type="button"
          className={`${styles.dockActionBtn} ${isLiked ? styles.dockBtnLiked : ''}`}
          onClick={onToggleLike}
        >
          <Heart size={18} strokeWidth={1.8} />
          <span>{isLiked ? 'Đã thích' : 'Thích'}</span>
        </button>

        <button
          type="button"
          className={styles.dockActionBtn}
          onClick={() => setCommentsOpen(!commentsOpen)}
        >
          <MessageCircle size={18} strokeWidth={1.8} />
          <span>Bình luận</span>
        </button>

        <button
          type="button"
          className={styles.dockActionBtn}
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            onToast('Đã sao chép liên kết!');
          }}
        >
          <Share2 size={18} strokeWidth={1.8} />
          <span>Chia sẻ</span>
        </button>

        <button
          type="button"
          className={`${styles.dockActionBtn} ${isSaved ? styles.dockBtnSaved : ''}`}
          onClick={onToggleSave}
        >
          <Bookmark size={18} strokeWidth={1.8} />
          <span>{isSaved ? 'Đã lưu' : 'Lưu'}</span>
        </button>
      </footer>

      {/* Collapsible Comments Section */}
      {commentsOpen && <PostCommentsDrawer postId={post.id} userId={userId} />}
    </article>
  );
}

// ─── POST COMMENTS DRAWER ──────────────────────────────────────────────────
function PostCommentsDrawer({ postId, userId }: { postId: string; userId: string | null }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<components['schemas']['CommentPage']>(
        `/posts/${postId}/comments?page=0&size=10`
      );
      setItems(data.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await apiRequest(`/posts/${postId}/comments`, json('POST', { body }));
      setBody('');
      void load();
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.commentsDrawer}>
      {loading && <p style={{ fontSize: 13, color: '#94A3B8' }}>Đang tải bình luận…</p>}
      {items.map((c) => (
        <div key={c.id} className={styles.commentBubble}>
          <div className={styles.commentAuthorRow}>
            <span className={styles.commentAuthorName}>{c.author.displayName}</span>
            <span className={styles.commentTimeText}>{date(c.createdAt)}</span>
          </div>
          <p className={styles.commentBodyText}>{c.body}</p>
        </div>
      ))}

      {userId ? (
        <form onSubmit={addComment} className={styles.commentFormRow}>
          <input
            type="text"
            placeholder="Gửi lời nhắn tới tác giả..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={styles.commentInput}
          />
          <button type="submit" className={styles.btnSubmitComment} disabled={!body.trim()}>
            <Send size={14} />
            <span>Gửi</span>
          </button>
        </form>
      ) : (
        <Link href="/login?returnUrl=%2Fcommunity" style={{ fontSize: 12.5, color: '#0284C7', textDecoration: 'none' }}>
          Đăng nhập để gửi bình luận →
        </Link>
      )}
    </div>
  );
}

// ─── GENERIC COMMENT INPUT FORM FOR STATIC EXEMPLARS ────────────────────────
function CommentInputForm({ onSubmit }: { onSubmit: (val: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (val.trim()) {
          onSubmit(val.trim());
          setVal('');
        }
      }}
      className={styles.commentFormRow}
    >
      <input
        type="text"
        placeholder="Gửi lời nhắn tới tác giả..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className={styles.commentInput}
      />
      <button type="submit" className={styles.btnSubmitComment} disabled={!val.trim()}>
        <Send size={14} />
        <span>Gửi</span>
      </button>
    </form>
  );
}

// ─── REPORT DIALOG MODAL (FAITHFUL TO VISTA MASTER SPEC) ────────────────────
function ReportDialogModal({
  post,
  onClose,
  onSuccess,
}: {
  post: Post;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedReason, setSelectedReason] = useState('Spam hoặc quảng cáo không liên quan');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const REASONS = [
    'Spam hoặc quảng cáo không liên quan',
    'Nội dung phản cảm, kích động hoặc độc hại',
    'Thông tin sai lệch hoặc lừa đảo du khách',
    'Xúc phạm cá nhân hoặc tổ chức',
    'Lý do khác',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const fullReason = note.trim() ? `${selectedReason}: ${note.trim()}` : selectedReason;
      await apiRequest(
        `/posts/${post.id}/reports`,
        json('POST', { reason: fullReason, targetType: 'POST' })
      );
      onSuccess();
    } catch (err) {
      setError(message(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContentCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 className={styles.modalTitleText}>
            <Flag size={18} color="#E11D48" />
            <span>Báo cáo vi phạm nội dung</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.5, margin: '0 0 14px' }}>
          Vui lòng cho ban kiểm duyệt VISTA biết lý do bài viết này vi phạm tiêu chuẩn cộng đồng:
        </p>

        <form onSubmit={handleSubmit}>
          <div className={styles.reportOptionsStack}>
            {REASONS.map((r) => (
              <label key={r} className={styles.radioRowLabel}>
                <input
                  type="radio"
                  name="reportReason"
                  value={r}
                  checked={selectedReason === r}
                  onChange={() => setSelectedReason(r)}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>

          <textarea
            className={styles.reportNoteTextarea}
            placeholder="Mô tả bổ sung nếu có (không bắt buộc)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />

          {error && (
            <p style={{ color: '#E11D48', fontSize: 13, marginTop: 10 }}>⚠️ {error}</p>
          )}

          <div className={styles.modalActionsRow}>
            <button
              type="button"
              className={styles.btnCancelModal}
              disabled={submitting}
              onClick={onClose}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className={styles.btnSubmitReport}
              disabled={submitting}
            >
              {submitting ? 'Đang gửi…' : 'Gửi báo cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
