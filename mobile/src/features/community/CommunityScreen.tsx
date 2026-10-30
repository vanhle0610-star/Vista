import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useIsFocused } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { isAxiosError } from 'axios';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
import { api, apiErrorMessage } from '@/services/api/client';
import { authStorage } from '@/services/auth/authStorage';
import type { components } from '@/types/api.generated';
import { CommunityComments } from './CommunityComments';
import { FeelingPicker, PlacePicker, PublicAvatar, SelectionChip } from './CommunityTools';
import { feelingText, type FeelingCode, type Place } from './model';

type Post = components['schemas']['Post'];
type Payload = components['schemas']['PostCreate'];
type Photo = { asset: ImagePicker.ImagePickerAsset; uploadId?: string };
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const mediaUrl = (path: string) =>
  `${api.defaults.baseURL?.replace(/\/+$/, '')}${path}`;

export function CommunityScreen() {
  const focused = useIsFocused();
  const [userId, setUserId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ displayName?: string; avatarUrl?: string | null } | null>(null);
  const [feeling, setFeeling] = useState<FeelingCode | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [showFeelings, setShowFeelings] = useState(false);
  const [showPlaces, setShowPlaces] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedRevision, setFeedRevision] = useState(0);
  const [page, setPage] = useState(-1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pending, setPending] = useState<Payload | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const loadLock = useRef(false);
  const sendLock = useRef(false);
  const refreshProfile = useCallback(async () => {
    const [user, token] = await Promise.all([authStorage.getUser<{ id: string; displayName?: string; avatarUrl?: string }>(), authStorage.getAccessToken()]);
    setUserId(token ? user?.id ?? null : null); setViewer(token ? user : null);
    if (token) {
      try { const { data } = await api.get<{ id: string; displayName?: string; avatarUrl?: string }>('/users/me');
        if ((await authStorage.getUser<{id:string}>())?.id === data.id) { setViewer(data); setUserId(data.id); }
      } catch { /* Keep the account's own cached display profile while offline. */ }
    }
  }, []);
  const load = useCallback(async (next: number) => {
    if (loadLock.current) return;
    loadLock.current = true;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<components['schemas']['PostPage']>(
        '/posts',
        { params: { page: next, size: 10 } },
      );
      setPosts((old) =>
        next === 0
          ? data.items
          : [
              ...new Map(
                [...old, ...data.items].map((p) => [p.id, p]),
              ).values(),
            ],
      );
      setPage(next);
      setTotal(data.total);
      setFeedRevision(n => n + 1);
    } catch (reason) {
      setError(apiErrorMessage(reason));
    } finally {
      loadLock.current = false;
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!focused) return;
    let alive = true;
    const appState = AppState.addEventListener('change', state => { if (state === 'active') { void refreshProfile(); void load(0); } });
    queueMicrotask(() => {
      if (alive) { void refreshProfile(); void load(0); }
    });
    return () => {
      alive = false;
      appState.remove();
    };
  }, [focused, load, refreshProfile]);
  const pick = async () => {
    if (photos.length >= 4 || sending || pending) return;
    setSendError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 4 - photos.length,
        quality: 0.85,
      });
      if (result.canceled) return;
      if (
        result.assets.length + photos.length > 4 ||
        result.assets.some(
          (p) =>
            (p.fileSize ?? 0) > 5242880 ||
            (p.mimeType && !['image/jpeg', 'image/png'].includes(p.mimeType)),
        )
      ) {
        setSendError('Tối đa 4 ảnh JPEG/PNG, mỗi ảnh tối đa 5 MiB.');
        return;
      }
      setPhotos((old) => [
        ...old,
        ...result.assets.map((asset) => ({ asset })),
      ]);
    } catch {
      setSendError(
        'Không mở được thư viện. Hãy kiểm tra quyền ảnh trong cài đặt.',
      );
    }
  };
  const remove = (index: number) => {
    const photo = photos[index];
    if (photo.uploadId)
      void api.delete(`/post-uploads/${photo.uploadId}`).catch(() => {});
    setPhotos((old) => old.filter((_, i) => i !== index));
  };
  const send = async () => {
    if (sendLock.current || !userId || !body.trim()) return;
    sendLock.current = true;
    setSending(true);
    setSendError('');
    try {
      let payload = pending;
      if (!payload) {
        const ids: string[] = [];
        for (const photo of photos) {
          let uploadId = photo.uploadId;
          if (!uploadId) {
            const form = new FormData(),
              asset = photo.asset;
            if (Platform.OS === 'web' && asset.file)
              form.append('file', asset.file);
            // React Native accepts URI objects; the shared DOM type only lists Blob.
            else
              form.append('file', {
                uri: asset.uri,
                name: asset.fileName ?? 'photo.jpg',
                type: asset.mimeType ?? 'image/jpeg',
              } as unknown as Blob);
            const { data } = await api.post<components['schemas']['Upload']>(
              '/post-uploads',
              form,
              {
                timeout: 30000,
                headers: { 'Content-Type': 'multipart/form-data' },
              },
            );
            uploadId = data.id;
            setPhotos((old) =>
              old.map((p) =>
                p.asset.uri === photo.asset.uri
                  ? { ...p, uploadId: data.id }
                  : p,
              ),
            );
          }
          ids.push(uploadId);
        }
        payload = {
          body,
          destinationId: place?.id,
          feeling,
          uploadIds: ids,
          clientRequestId: Crypto.randomUUID(),
        };
        setPending(payload);
      }
      await api.post<Post>('/posts', payload, { timeout: 30000 });
      setBody('');
      setPlace(null); setFeeling(null);
      setPhotos([]);
      setPending(null);
      await load(0);
    } catch (reason) {
      setSendError(apiErrorMessage(reason));
      if (
        isAxiosError(reason) &&
        [400, 404, 409, 413, 415].includes(reason.response?.status ?? 0)
      ) {
        setPending(null);
        for (const photo of photos)
          if (photo.uploadId)
            void api.delete(`/post-uploads/${photo.uploadId}`).catch(() => {});
        setPhotos((old) => old.map((photo) => ({ asset: photo.asset })));
      }
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshing={loading}
          onRefresh={() => {
            void refreshProfile();
            void load(0);
          }}
          ListHeaderComponent={
            <View style={styles.gap}>
              <AppText style={styles.title}>Cộng đồng du lịch</AppText>
              <AppText>Chia sẻ câu chuyện trên hành trình cùng VISTA.</AppText>
              <View style={styles.card}>
                <AppText style={styles.subtitle}>Chia sẻ trải nghiệm</AppText>
                {userId ? (
                  <>
                    <View style={styles.photoRow}><PublicAvatar author={viewer} /><AppText>{viewer?.displayName || 'Người dùng VISTA'}</AppText></View>
                    <TextInput
                      multiline
                      value={body}
                      maxLength={4000}
                      onChangeText={setBody}
                      editable={!sending && !pending}
                      placeholder="Bạn vừa khám phá điều gì?"
                      placeholderTextColor={tokens.colors.muted}
                      style={styles.input}
                      accessibilityLabel="Nội dung bài đăng"
                    />
                    <View style={styles.photoRow}>
                      {photos.map((p, i) => (
                        <View
                          key={`${p.asset.uri}-${i}`}
                          style={styles.photoItem}
                        >
                          <Image
                            source={{ uri: p.asset.uri }}
                            style={styles.preview}
                          />
                          <AppButton
                            label={`Bỏ ảnh ${i + 1}`}
                            variant="secondary"
                            disabled={sending || Boolean(pending)}
                            onPress={() => remove(i)}
                          />
                        </View>
                      ))}
                    </View>
                    <AppText>JPEG/PNG · tối đa 4 ảnh · 5 MiB mỗi ảnh</AppText>
                    {feeling && <SelectionChip label={feelingText(feeling)} kind="cảm xúc" disabled={sending || !!pending} onEdit={() => { setShowPlaces(false); setShowFeelings(true); }} onRemove={() => setFeeling(null)} />}
                    {place && <SelectionChip label={"📍 " + place.name} kind="địa điểm" disabled={sending || !!pending} onEdit={() => { setShowFeelings(false); setShowPlaces(true); }} onRemove={() => setPlace(null)} />}
                    <AppButton label="Cảm xúc" variant="secondary" disabled={sending || !!pending} onPress={() => { setShowPlaces(false); setShowFeelings(true); }} />
                    <AppButton label="Gắn địa điểm" variant="secondary" disabled={sending || !!pending} onPress={() => { setShowFeelings(false); setShowPlaces(true); }} />
                    {showFeelings && <FeelingPicker value={feeling} onChange={setFeeling} onClose={() => setShowFeelings(false)} />}
                    {showPlaces && <PlacePicker value={place?.id} onSelect={setPlace} onClose={() => setShowPlaces(false)} />}
                    <AppButton
                      label="Chọn ảnh"
                      variant="secondary"
                      disabled={
                        photos.length >= 4 || sending || Boolean(pending)
                      }
                      onPress={() => {
                        void pick();
                      }}
                    />
                    {sendError ? (
                      <AppText accessibilityLiveRegion="polite">
                        {sendError}
                        {pending
                          ? ' Giữ nguyên bản nháp và thử lại để tránh trùng bài.'
                          : ''}
                      </AppText>
                    ) : null}
                    <AppButton
                      label={
                        sending
                          ? 'Đang gửi…'
                          : pending
                            ? 'Thử gửi lại'
                            : 'Đăng bài'
                      }
                      disabled={sending || !body.trim()}
                      onPress={() => {
                        void send();
                      }}
                    />
                  </>
                ) : (
                  <>
                    <AppText>
                      Bạn được xem bài công khai. Đăng nhập để chia sẻ và bình
                      luận.
                    </AppText>
                    <AppButton
                      label="Đăng nhập"
                      onPress={() => router.push('/(auth)/login')}
                    />
                  </>
                )}
              </View>
              <AppText style={styles.subtitle}>Bảng tin cộng đồng</AppText>
              {error ? (
                <View style={styles.card}>
                  <AppText>{error}</AppText>
                  <AppButton
                    label="Thử tải lại"
                    onPress={() => {
                      void load(Math.max(0, page));
                    }}
                  />
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <PostCard
              key={`${item.id}:${userId ?? 'guest'}`}
              post={item}
              userId={userId}
              viewer={viewer}
              revision={feedRevision}
              onUpdate={(post) =>
                setPosts((old) => old.map((p) => (p.id === post.id ? post : p)))
              }
              onDelete={() => {
                setPosts((old) => old.filter((p) => p.id !== item.id));
                setTotal((old) => Math.max(0, old - 1));
              }}
            />
          )}
          ListEmptyComponent={
            !loading && !error ? (
              <AppText>Chưa có bài đăng công khai.</AppText>
            ) : null
          }
          ListFooterComponent={
            <View style={styles.gap}>
              {loading && <ActivityIndicator />}
              {posts.length < total && (
                <AppButton
                  label="Tải thêm bài đăng"
                  disabled={loading}
                  onPress={() => {
                    void load(page + 1);
                  }}
                />
              )}
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function PostCard({
  post,
  userId,
  viewer,
  revision,
  onUpdate,
  onDelete,
}: {
  post: Post;
  userId: string | null;
  viewer: { displayName?: string; avatarUrl?: string | null } | null;
  revision: number;
  onUpdate: (post: Post) => void;
  onDelete: () => void;
}) {
  const [editPlace, setEditPlace] = useState<Place | null>(post.destination ?? null);
  const [editFeeling, setEditFeeling] = useState<FeelingCode | null>(post.feeling ?? null);
  const [placeChanged, setPlaceChanged] = useState(false);
  const [feelingChanged, setFeelingChanged] = useState(false);
  const [editPicker, setEditPicker] = useState<'place' | 'feeling' | null>(null);
  const [editing, setEditing] = useState(false),
    [body, setBody] = useState(post.body),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [comments, setComments] = useState(false);
  const lock = useRef(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  useEffect(() => { queueMicrotask(() => setCommentCount(post.commentCount)); }, [post.commentCount]);
  const mutate = async (remove: boolean) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (remove) {
        await api.delete(`/posts/${post.id}`);
        onDelete();
      } else {
        const { data } = await api.patch<Post>(`/posts/${post.id}`, {
          body,
          version: post.version,
          ...(placeChanged ? { destinationId: editPlace?.id ?? null } : {}),
          ...(feelingChanged ? { feeling: editFeeling } : {}),
        });
        onUpdate(data);
        setEditing(false);
      }
    } catch (reason) {
      setError(apiErrorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={styles.card}>
      <PublicAvatar author={post.author} />
      <AppText style={styles.subtitle}>{post.author.displayName}</AppText>
      <AppText style={styles.time}>{date(post.createdAt)}{feelingText(post.feeling) ? ` · đang cảm thấy ${feelingText(post.feeling)}` : ''}</AppText>
      {editing ? (
        <>
          <TextInput
            multiline
            value={body}
            maxLength={4000}
            onChangeText={setBody}
            style={styles.input}
            accessibilityLabel="Sửa bài đăng"
          />
          {(editPlace || (post.destinationId && !placeChanged)) && <SelectionChip label={'📍 ' + (editPlace?.name || 'Địa điểm không còn công khai')} kind="địa điểm" disabled={busy} onEdit={() => setEditPicker('place')} onRemove={() => { setEditPlace(null); setPlaceChanged(true); }} />}
          {editFeeling && <SelectionChip label={feelingText(editFeeling)} kind="cảm xúc" disabled={busy} onEdit={() => setEditPicker('feeling')} onRemove={() => { setEditFeeling(null); setFeelingChanged(true); }} />}
          <AppButton label="Đổi địa điểm" variant="secondary" disabled={busy} onPress={() => setEditPicker('place')} />
          <AppButton label="Đổi cảm xúc" variant="secondary" disabled={busy} onPress={() => setEditPicker('feeling')} />
          {editPicker === 'place' && <PlacePicker value={editPlace?.id} onSelect={value => { setEditPlace(value); setPlaceChanged(true); }} onClose={() => setEditPicker(null)} />}
          {editPicker === 'feeling' && <FeelingPicker value={editFeeling} onChange={value => { setEditFeeling(value); setFeelingChanged(true); }} onClose={() => setEditPicker(null)} />}
          <AppButton
            label="Lưu thay đổi"
            disabled={busy || !body.trim()}
            onPress={() => {
              void mutate(false);
            }}
          />
          <AppButton
            label="Hủy sửa"
            variant="secondary"
            disabled={busy}
            onPress={() => setEditing(false)}
          />
        </>
      ) : (
        <AppText>{post.body}</AppText>
      )}
      <View style={styles.photoRow}>
        {post.media.map((media) => (
          <Image
            key={media.id}
            source={{ uri: mediaUrl(media.path) }}
            style={styles.postImage}
            accessibilityLabel={`Ảnh của ${post.author.displayName}`}
          />
        ))}
      </View>
      {post.destination && (
        <AppButton
          label={post.destination?.name || 'Xem địa điểm'}
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/destination/[id]',
              params: { id: post.destinationId! },
            })
          }
        />
      )}
      <AppButton
        label={typeof commentCount === 'number' ? `Xem bình luận · ${commentCount} bình luận` : 'Xem bình luận'}
        variant="secondary"
        onPress={() => setComments(true)}
      />
      {post.author.id === userId && (
        <>
          <AppButton
            label="Sửa bài"
            variant="secondary"
            disabled={busy}
            onPress={() => {
              setBody(post.body);
              setEditPlace(post.destination ?? null); setEditFeeling(post.feeling ?? null);
              setPlaceChanged(false); setFeelingChanged(false); setEditPicker(null);
              setEditing(true);
            }}
          />
          <AppButton
            label="Xóa bài"
            variant="secondary"
            disabled={busy}
            onPress={() =>
              Alert.alert('Xóa bài đăng?', 'Bài sẽ được gỡ khỏi bảng tin.', [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Xóa',
                  style: 'destructive',
                  onPress: () => {
                    void mutate(true);
                  },
                },
              ])
            }
          />
        </>
      )}
      {error ? (
        <AppText accessibilityLiveRegion="polite">{error}</AppText>
      ) : null}
      <Modal
        visible={comments}
        onRequestClose={() => setComments(false)}
        animationType="slide"
      >
        <CommunityComments
          postId={post.id}
          userId={userId}
          viewer={viewer}
          revision={revision}
          onCountChange={setCommentCount}
          onClose={() => setComments(false)}
          active={comments}
        />
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.colors.canvas },
  flex: { flex: 1 },
  list: { padding: 16, gap: 16, paddingBottom: 40 },
  gap: { gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: tokens.colors.cyan },
  subtitle: { fontSize: 17, fontWeight: '700' },
  time: { fontSize: 12, color: tokens.colors.muted },
  card: {
    padding: 16,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    gap: 12,
  },
  input: {
    color: tokens.colors.ink,
    borderColor: tokens.colors.borderLight,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoItem: { width: '48%', gap: 8 },
  preview: { width: '100%', height: 130, borderRadius: 12 },
  postImage: { width: '48%', height: 180, borderRadius: 12 },
});
