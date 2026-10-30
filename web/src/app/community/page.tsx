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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Globe,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import type { components } from '@/types/api.generated';
import { Navbar } from '@/components/common/Navbar';
import { CommunityComments } from '@/features/community/CommunityComments';
import { FeelingPicker, PlacePicker, PublicAvatar } from '@/features/community/CommunityTools';
import { feelingText, type FeelingCode, type Place } from '@/features/community/model';
import extras from '@/features/community/communityExtras.module.css';
import styles from './page.module.css';

type Post = components['schemas']['Post'];
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
  const [place, setPlace] = useState<Place | null>(null);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [feeling, setFeeling] = useState<FeelingCode | null>(null);
  const [showFeelings, setShowFeelings] = useState(false);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // Active filter & left sidebar
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Saved items and post actions
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [savedDests, setSavedDests] = useState<Set<string>>(new Set());
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filterScrollRef = useRef<HTMLDivElement>(null);
  const sendLock = useRef(false);
  const postRequest = useRef<PostCreate | null>(null);
  const loadLock = useRef(false);
  const photoRef = useRef<Photo[]>([]);
  const placeTrigger = useRef<HTMLButtonElement>(null);
  const feelingTrigger = useRef<HTMLButtonElement>(null);

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
          void apiRequest<{ id: string; displayName?: string; avatarUrl?: string }>('/users/me')
            .then(profile => { const current = JSON.parse(localStorage.getItem('vista_user') || '{}'); if (current.id === profile.id && localStorage.getItem('vista_token')) setUserProfile(profile); }).catch(() => {});
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
    const refresh = () => { session(); void load(0); };
    window.addEventListener('focus', refresh);
    window.addEventListener('vista-auth-change', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('vista-auth-change', refresh);
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

  const scrollFiltersRight = () => {
    if (filterScrollRef.current) {
      filterScrollRef.current.scrollBy({ left: 160, behavior: 'smooth' });
    }
  };

  const send = async () => {
    if (sendLock.current) return;
    sendLock.current = true;
    setSending(true);
    setShowFeelings(false);
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
          const res = await apiRequest<components['schemas']['Upload']>('/post-uploads', { method: 'POST', body: form });
          updatePhotos(photoRef.current.map((photo) => photo.preview === item.preview ? { ...photo, uploadId: res.id } : photo));
          uploaded.push(res.id);
        }
      }

      const candidate = {
        body: text,
        destinationId: place?.id,
        feeling,
        uploadIds: uploaded,
      };
      const previous = postRequest.current;
      const payload: PostCreate = previous && previous.body === candidate.body && previous.destinationId === candidate.destinationId && previous.feeling === candidate.feeling && JSON.stringify(previous.uploadIds) === JSON.stringify(candidate.uploadIds)
        ? previous : { ...candidate, clientRequestId: crypto.randomUUID() };
      postRequest.current = payload;
      const created = await apiRequest<Post>('/posts', json('POST', payload));
      postRequest.current = null;
      setPosts((old) => [created, ...old.filter((p) => p.id !== created.id)]);
      setTotal((old) => old + 1);
      setText('');
      setPlace(null); setFeeling(null);
      setShowPlacePicker(false);
      photoRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
      updatePhotos([]);
      setExpanded(false);
      showToast('Đã chia sẻ bài viết thành công!');
    } catch (reason) {
      setSendError(message(reason));
      if ([400, 401, 403, 404, 409, 413, 415].includes((reason as { status?: number }).status ?? 0)) postRequest.current = null;
    } finally {
      setSending(false);
      sendLock.current = false;
    }
  };

  return (
    <div className={styles.pageRoot}>
      {/* ── Top Navbar ── */}
      <Navbar activeModule="community" />

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
              <span className={styles.memberCountBadge}>{total} bài viết công khai</span>
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
            <p>{userProfile?.displayName || (userId ? 'Người dùng VISTA' : 'Đăng nhập để chia sẻ')}</p>
            <div className={styles.composerTopRow}>
              <PublicAvatar author={userProfile} />
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

            {feeling && <span className={extras.chip}><button type="button" disabled={sending} onClick={() => { setShowPlacePicker(false); setShowFeelings(true); }}>{feelingText(feeling)}</button><button type="button" aria-label="Bỏ cảm xúc" disabled={sending} onClick={() => setFeeling(null)}>×</button></span>}
            {place && <span className={extras.chip}><button type="button" disabled={sending} onClick={() => { setShowFeelings(false); setShowPlacePicker(true); }}>📍 {place.name}</button><button type="button" aria-label="Bỏ địa điểm" disabled={sending} onClick={() => setPlace(null)}>×</button></span>}
            {showFeelings && <FeelingPicker value={feeling} onChange={setFeeling} onClose={() => { setShowFeelings(false); feelingTrigger.current?.focus(); }} />}
            {showPlacePicker && <PlacePicker value={place?.id} onSelect={setPlace} onClose={() => { setShowPlacePicker(false); placeTrigger.current?.focus(); }} />}
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
                  ref={placeTrigger}
                  disabled={sending}
                  className={styles.toolButton}
                  onClick={() => {
                    setExpanded(true);
                    setShowFeelings(false);
                    setShowPlacePicker(true);
                  }}
                >
                  <MapPin size={17} strokeWidth={1.8} className={styles.toolIcon} />
                  <span>{place ? place.name : 'Gắn địa điểm'}</span>
                </button>

                <button
                  type="button"
                  ref={feelingTrigger}
                  disabled={sending}
                  aria-expanded={showFeelings}
                  className={styles.toolButton}
                  onClick={() => {
                    setExpanded(true);
                    setShowPlacePicker(false);
                    setShowFeelings(true);
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
                      setPlace(null); setFeeling(null);
                      setShowPlacePicker(false); setShowFeelings(false);
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
            {error && (
              <div role="alert">
                <p>{error}</p>
                <button type="button" onClick={() => void load(0)}>Thử tải lại bảng tin</button>
              </div>
            )}
            {!loading && !error && posts.length === 0 && (
              <p>Chưa có bài viết. Hãy chia sẻ câu chuyện đầu tiên của bạn.</p>
            )}
            {posts.map((post) => (
              <LivePostCard
                key={`${post.id}:${userId ?? 'guest'}`}
                post={post}
                userId={userId}
                viewer={userProfile}
                isSaved={savedPosts.has(post.id)}
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
  viewer,
  isSaved,
  onToggleSave,
  onReport,
  onToast,
  onDelete,
}: {
  post: Post;
  userId: string | null;
  viewer: { displayName?: string; avatarUrl?: string | null } | null;
  isSaved: boolean;
  onToggleSave: () => void;
  onReport: () => void;
  onToast: (msg: string) => void;
  onDelete: () => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  useEffect(() => { queueMicrotask(() => setCommentCount(post.commentCount)); }, [post.commentCount]);
  const [like, setLike] = useState<components['schemas']['PostLike'] | null>(null);
  const [liking, setLiking] = useState(false);
  const [likeError, setLikeError] = useState('');
  const [likeRetry, setLikeRetry] = useState(0);
  const likeLock = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    apiRequest<components['schemas']['PostLike']>(`/posts/${post.id}/like`)
      .then((state) => { if (active) { setLike(state); setLikeError(''); } })
      .catch((reason) => { if (active) setLikeError(message(reason)); });
    return () => { active = false; };
  }, [post.id, userId, likeRetry]);

  const toggleLike = async () => {
    if (!userId) {
      onToast('Vui lòng đăng nhập để thích bài viết.');
      return;
    }
    if (!like || likeLock.current) return;
    likeLock.current = true;
    setLiking(true);
    setLikeError('');
    try {
      const state = await apiRequest<components['schemas']['PostLike']>(`/posts/${post.id}/like`, {
        method: like.liked ? 'DELETE' : 'PUT',
      });
      setLike(state);
    } catch (reason) {
      setLikeError(message(reason));
    } finally {
      likeLock.current = false;
      setLiking(false);
    }
  };

  return (
    <article className={styles.storyPostCard}>
      <header className={styles.postHeaderRow}>
        <div className={styles.authorContainer}>
          <PublicAvatar author={post.author} />
          <div className={styles.authorMetaCol}>
            <div className={`${styles.authorTopLine} ${extras.authorLine}`}>
              <span className={styles.authorDisplayName}>{post.author.displayName}</span>
              {feelingText(post.feeling) && <span className={extras.muted}>đang cảm thấy {feelingText(post.feeling)}</span>}
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

      {post.destination && (
        <div>
          <Link href={`/destination/${post.destinationId}`} className={styles.locationBadgePill}>
            <MapPin size={13} strokeWidth={2} />
            <span>{post.destination?.name || 'Xem điểm đến liên quan'} →</span>
          </Link>
        </div>
      )}

      <footer className={styles.interactionDockRow}>
        <button
          type="button"
          className={`${styles.dockActionBtn} ${like?.liked ? styles.dockBtnLiked : ''}`}
          aria-pressed={like?.liked ?? false}
          disabled={liking || (!!userId && !like)}
          onClick={() => void toggleLike()}
        >
          <Heart size={18} strokeWidth={1.8} />
          <span>{like?.liked ? 'Đã thích' : 'Thích'}{like ? ` (${like.likeCount})` : ''}</span>
        </button>

        <button
          type="button"
          className={styles.dockActionBtn}
          onClick={() => setCommentsOpen(!commentsOpen)}
        >
          <MessageCircle size={18} strokeWidth={1.8} />
          <span>{typeof commentCount === 'number' ? `${commentCount} bình luận` : 'Bình luận'}</span>
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

      {likeError && (
        <div role="alert">
          <p>{likeError}</p>
          {!like && <button type="button" onClick={() => setLikeRetry((value) => value + 1)}>Thử tải lại lượt thích</button>}
        </div>
      )}

      {/* Collapsible Comments Section */}
      {commentsOpen && <CommunityComments postId={post.id} userId={userId} viewer={viewer} onCountChange={setCommentCount} />}
    </article>
  );
}

// ─── POST COMMENTS DRAWER ──────────────────────────────────────────────────
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
