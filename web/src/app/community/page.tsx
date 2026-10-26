'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import type { components } from '@/types/api.generated';
import { Navbar } from '@/components/common/Navbar';
import styles from './page.module.css';

type Post = components['schemas']['Post'];
type Comment = components['schemas']['Comment'];
type PostCreate = components['schemas']['PostCreate'];
type Photo = { file: File; preview: string; uploadId?: string };
const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').replace(/\/+$/, '');
const message = (error: unknown) => error instanceof Error ? error.message : 'Không kết nối được máy chủ. Vui lòng thử lại.';
const json = (method: string, value?: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, ...(value ? { body: JSON.stringify(value) } : {}) });
const date = (value: string) => new Date(value).toLocaleString('vi-VN');

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [pending, setPending] = useState<PostCreate | null>(null);
  const sendLock = useRef(false);
  const loadLock = useRef(false);
  const photoRef = useRef<Photo[]>([]);
  const load = useCallback(async (next: number) => {
    if (loadLock.current) return;
    loadLock.current = true; setLoading(true); setError('');
    try {
      const data = await apiRequest<components['schemas']['PostPage']>(`/posts?page=${next}&size=10`);
      setPosts((old) => next === 0 ? data.items : [...new Map([...old, ...data.items].map((p) => [p.id, p])).values()]);
      setTotal(data.total); setPage(next);
    } catch (reason) { setError(message(reason)); }
    finally { loadLock.current = false; setLoading(false); }
  }, []);
  useEffect(() => {
    const session = () => { try { setUserId(localStorage.getItem('vista_token') ? JSON.parse(localStorage.getItem('vista_user') ?? '{}').id ?? null : null); } catch { setUserId(null); } };
    queueMicrotask(() => { session(); void load(0); }); window.addEventListener('vista-auth-change', session);
    return () => { window.removeEventListener('vista-auth-change', session); };
  }, [load]);
  useEffect(() => () => { photoRef.current.forEach((p) => URL.revokeObjectURL(p.preview)); }, []);
  const updatePhotos = (value: Photo[]) => { photoRef.current = value; setPhotos(value); };
  const removePhoto = (index: number) => {
    const photo = photos[index]; URL.revokeObjectURL(photo.preview);
    if (photo.uploadId) void apiRequest(`/post-uploads/${photo.uploadId}`, { method: 'DELETE' }).catch(() => {});
    updatePhotos(photos.filter((_, i) => i !== index));
  };
  const send = async () => {
    if (sendLock.current || !userId) return;
    sendLock.current = true; setSending(true); setSendError('');
    try {
      let payload = pending;
      if (!payload) {
        const ids: string[] = [];
        for (const photo of photos) {
          let uploadId = photo.uploadId;
          if (!uploadId) {
            const form = new FormData(); form.append('file', photo.file);
            const uploaded = await apiRequest<components['schemas']['Upload']>('/post-uploads', { method: 'POST', body: form });
            uploadId = uploaded.id;
            updatePhotos(photoRef.current.map((p) => p.preview === photo.preview ? { ...p, uploadId: uploaded.id } : p));
          }
          ids.push(uploadId);
        }
        payload = { body: text, uploadIds: ids, clientRequestId: crypto.randomUUID() };
        setPending(payload);
      }
      await apiRequest<Post>('/posts', json('POST', payload));
      setText(''); setPending(null); photos.forEach((p) => URL.revokeObjectURL(p.preview)); updatePhotos([]);
      await load(0);
    } catch (reason) {
      setSendError(message(reason));
      const status = typeof reason === 'object' && reason !== null && 'status' in reason ? Number(reason.status) : 0;
      if ([400, 404, 409, 413, 415].includes(status)) {
        setPending(null);
        for (const photo of photoRef.current) if (photo.uploadId) void apiRequest(`/post-uploads/${photo.uploadId}`, { method: 'DELETE' }).catch(() => {});
        updatePhotos(photoRef.current.map((photo) => ({ file: photo.file, preview: photo.preview })));
      }
    }
    finally { sendLock.current = false; setSending(false); }
  };
  return <div className={styles.page}><Navbar activeModule="community" /><main className={styles.main}>
    <div className={styles.hero}><p>CÙNG NHAU KHÁM PHÁ VIỆT NAM</p><h1>Câu chuyện trên mỗi hành trình</h1><span>Chia sẻ trải nghiệm và trao đổi cùng cộng đồng VISTA.</span></div>
    <section className={styles.card} aria-label="Tạo bài đăng">
      <h2>Chia sẻ chuyến đi của bạn</h2>
      {!userId ? <p>Bạn có thể đọc các bài công khai. <Link href="/login?returnUrl=%2Fcommunity">Đăng nhập để đăng bài hoặc bình luận →</Link></p> : <form onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <label>Nội dung<textarea aria-label="Nội dung bài đăng" placeholder="Bạn vừa khám phá điều gì?" value={text} maxLength={4000} disabled={sending || Boolean(pending)} onChange={(event) => setText(event.target.value)} required /></label>
        <div className={styles.photos}>{photos.map((p, i) => <div key={p.preview}>
          {/* User-created local previews and API media cannot use a static Next image allowlist. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.preview} alt={`Ảnh đã chọn ${i + 1}`} /><button type="button" disabled={sending || Boolean(pending)} onClick={() => removePhoto(i)}>Bỏ ảnh {i + 1}</button>
        </div>)}</div>
        <label className={styles.file}>Chọn ảnh (JPEG/PNG, tối đa 4 ảnh, 5 MiB/ảnh)<input type="file" accept="image/jpeg,image/png" multiple disabled={sending || Boolean(pending)} onChange={(event) => {
          const files = [...(event.target.files ?? [])]; event.target.value = '';
          if (photos.length + files.length > 4 || files.some((f) => !['image/jpeg', 'image/png'].includes(f.type) || f.size > 5242880)) { setSendError('Chọn tối đa 4 ảnh JPEG/PNG, mỗi ảnh không quá 5 MiB.'); return; }
          updatePhotos([...photos, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
        }} /></label>
        {sendError && <p role="alert">{sendError}</p>}
        {pending && sendError && <p>Giữ nguyên bản nháp để thử lại yêu cầu vừa gửi, tránh tạo bài trùng.</p>}
        <button className={styles.primary} disabled={sending || !text.trim()}>{sending ? 'Đang gửi…' : pending ? 'Thử gửi lại' : 'Đăng bài'}</button>
      </form>}
    </section>
    <div className={styles.feedHeading}><h2>Bảng tin cộng đồng</h2><button disabled={loading} onClick={() => { void load(0); }}>Làm mới</button></div>
    {error && <p role="alert" className={styles.card}>{error} <button onClick={() => { void load(Math.max(0, page)); }}>Thử lại</button></p>}
    {!loading && !error && posts.length === 0 && <p className={styles.card}>Chưa có bài đăng công khai. Hãy chia sẻ câu chuyện đầu tiên.</p>}
    {posts.map((post) => <PostCard key={post.id} post={post} userId={userId} onUpdate={(updated) => setPosts((old) => old.map((p) => p.id === updated.id ? updated : p))} onDelete={() => { setPosts((old) => old.filter((p) => p.id !== post.id)); setTotal((old) => Math.max(0, old - 1)); }} />)}
    {loading && <p role="status">Đang tải bài đăng…</p>}
    {posts.length < total && <button className={styles.primary} disabled={loading} onClick={() => { void load(page + 1); }}>Tải thêm bài đăng</button>}
  </main></div>;
}

function PostCard({ post, userId, onUpdate, onDelete }: { post: Post; userId: string | null; onUpdate: (post: Post) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(post.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const lock = useRef(false);
  const mutate = async (remove: boolean) => {
    if (lock.current || (remove && !window.confirm('Xóa bài đăng này?'))) return;
    lock.current = true; setBusy(true); setError('');
    try { if (remove) { await apiRequest(`/posts/${post.id}`, { method: 'DELETE' }); onDelete(); }
      else { onUpdate(await apiRequest<Post>(`/posts/${post.id}`, json('PATCH', { body, version: post.version }))); setEditing(false); }
    } catch (reason) { setError(message(reason)); } finally { lock.current = false; setBusy(false); }
  };
  return <article className={styles.card}>
    <header className={styles.postHeading}><div><strong>{post.author.displayName}</strong><time dateTime={post.createdAt}>{date(post.createdAt)}</time></div><span className={styles.avatar}>{post.author.displayName.slice(0, 1).toLocaleUpperCase('vi')}</span></header>
    {editing ? <><textarea aria-label="Sửa nội dung bài đăng" value={body} maxLength={4000} onChange={(event) => setBody(event.target.value)} /><button disabled={busy || !body.trim()} onClick={() => { void mutate(false); }}>Lưu thay đổi</button><button disabled={busy} onClick={() => setEditing(false)}>Hủy sửa</button></> : <p className={styles.body}>{post.body}</p>}
    <div className={styles.photos}>{post.media.map((photo) => <a key={photo.id} href={`${base}${photo.path}`} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${base}${photo.path}`} alt={`Ảnh chuyến đi của ${post.author.displayName}`} loading="lazy" />
    </a>)}</div>
    {post.destinationId && <Link href={`/destination/${post.destinationId}`}>Xem địa điểm →</Link>}
    <div className={styles.actions}><button onClick={() => setOpen(!open)}>{open ? 'Ẩn bình luận' : 'Xem bình luận'}</button>
      {post.author.id === userId && <><button disabled={busy} onClick={() => { setBody(post.body); setEditing(true); }}>Sửa bài</button><button disabled={busy} onClick={() => { void mutate(true); }}>Xóa bài</button></>}
    </div>
    {error && <p role="alert">{error}</p>}
    {open && <Comments postId={post.id} userId={userId} />}
  </article>;
}
function Comments({ postId, userId }: { postId: string; userId: string | null }) {
  const [items, setItems] = useState<Comment[]>([]); const [total, setTotal] = useState(0); const [page, setPage] = useState(-1);
  const [body, setBody] = useState(''); const [edit, setEdit] = useState<Comment | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (next: number) => {
    setLoading(true);
    try {
    const data = await apiRequest<components['schemas']['CommentPage']>(`/posts/${postId}/comments?page=${next}&size=10`);
    setItems((old) => next === 0 ? data.items : [...new Map([...old, ...data.items].map((c) => [c.id, c])).values()]); setTotal(data.total); setPage(next);
    } finally { setLoading(false); }
  }, [postId]);
  const run = async (work: () => Promise<unknown>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await work(); } catch (reason) { setError(message(reason)); } finally { lock.current = false; setBusy(false); }
  };
  useEffect(() => { queueMicrotask(() => { void load(0).catch((reason) => setError(message(reason))); }); }, [load]);
  return <section className={styles.comments} aria-label="Bình luận">
    {error && <p role="alert">{error} <button disabled={busy} onClick={() => { void run(() => load(0)); }}>Tải lại bình luận</button></p>}
    {loading && <p role="status">Đang tải bình luận…</p>}
    {!loading && !items.length && !error && <p>Chưa có bình luận.</p>}
    {items.map((comment) => <div className={styles.comment} key={comment.id}><strong>{comment.author.displayName}</strong><time>{date(comment.createdAt)}</time><p className={styles.body}>{comment.body}</p>
      {comment.author.id === userId && <div className={styles.actions}><button disabled={busy} onClick={() => { setEdit(comment); setBody(comment.body); }}>Sửa bình luận</button><button disabled={busy} onClick={() => { if (window.confirm('Xóa bình luận này?')) void run(async () => { await apiRequest(`/posts/${postId}/comments/${comment.id}`, { method: 'DELETE' }); await load(0); }); }}>Xóa bình luận</button></div>}
    </div>)}
    {items.length < total && <button disabled={busy} onClick={() => { void run(() => load(page + 1)); }}>Tải thêm bình luận</button>}
    {userId ? <form onSubmit={(event) => { event.preventDefault(); void run(async () => {
      await apiRequest(`/posts/${postId}/comments${edit ? '/' + edit.id : ''}`, json(edit ? 'PATCH' : 'POST', { body, ...(edit ? { version: edit.version } : {}) }));
      setBody(''); setEdit(null); await load(0);
    }); }}><label>{edit ? 'Sửa bình luận' : 'Viết bình luận'}<textarea aria-label="Nội dung bình luận" value={body} maxLength={2000} disabled={busy} onChange={(event) => setBody(event.target.value)} required /></label><button disabled={busy || !body.trim()}>{busy ? 'Đang gửi…' : 'Lưu bình luận'}</button>{edit && <button type="button" disabled={busy} onClick={() => { setEdit(null); setBody(''); }}>Hủy sửa</button>}</form> : <Link href="/login?returnUrl=%2Fcommunity">Đăng nhập để bình luận</Link>}
  </section>;
}
