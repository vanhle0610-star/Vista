import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
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

type Post = components['schemas']['Post'];
type Comment = components['schemas']['Comment'];
type Payload = components['schemas']['PostCreate'];
type Photo = { asset: ImagePicker.ImagePickerAsset; uploadId?: string };
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const mediaUrl = (path: string) =>
  `${api.defaults.baseURL?.replace(/\/+$/, '')}${path}`;

export function CommunityScreen() {
  const focused = useIsFocused();
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
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
    void Promise.all([
      authStorage.getUser<{ id: string }>(),
      authStorage.getAccessToken(),
    ]).then(([user, token]) => {
      if (alive) setUserId(token ? (user?.id ?? null) : null);
    });
    queueMicrotask(() => {
      if (alive) void load(0);
    });
    return () => {
      alive = false;
    };
  }, [focused, load]);
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
          uploadIds: ids,
          clientRequestId: Crypto.randomUUID(),
        };
        setPending(payload);
      }
      await api.post<Post>('/posts', payload, { timeout: 30000 });
      setBody('');
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
              post={item}
              userId={userId}
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
  onUpdate,
  onDelete,
}: {
  post: Post;
  userId: string | null;
  onUpdate: (post: Post) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false),
    [body, setBody] = useState(post.body),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [comments, setComments] = useState(false);
  const lock = useRef(false);
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
      <AppText style={styles.subtitle}>{post.author.displayName}</AppText>
      <AppText style={styles.time}>{date(post.createdAt)}</AppText>
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
      {post.destinationId && (
        <AppButton
          label="Xem địa điểm"
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
        label="Xem bình luận"
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
        <Comments
          postId={post.id}
          userId={userId}
          onClose={() => setComments(false)}
          active={comments}
        />
      </Modal>
    </View>
  );
}
function Comments({
  postId,
  userId,
  onClose,
  active,
}: {
  postId: string;
  userId: string | null;
  onClose: () => void;
  active: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Comment[]>([]),
    [page, setPage] = useState(-1),
    [total, setTotal] = useState(0),
    [body, setBody] = useState(''),
    [edit, setEdit] = useState<Comment | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  const load = useCallback(
    async (next: number) => {
      setLoading(true);
      try {
        const { data } = await api.get<components['schemas']['CommentPage']>(
          `/posts/${postId}/comments`,
          { params: { page: next, size: 10 } },
        );
        setItems((old) =>
          next === 0
            ? data.items
            : [
                ...new Map(
                  [...old, ...data.items].map((c) => [c.id, c]),
                ).values(),
              ],
        );
        setTotal(data.total);
        setPage(next);
      } finally {
        setLoading(false);
      }
    },
    [postId],
  );
  useEffect(() => {
    if (active)
      queueMicrotask(() => {
        void load(0).catch((reason) => setError(apiErrorMessage(reason)));
      });
  }, [active, load]);
  const run = async (work: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (reason) {
      setError(apiErrorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          <AppButton
            label="Đóng bình luận"
            variant="secondary"
            onPress={onClose}
          />
          <AppText style={styles.title}>Bình luận</AppText>
          {error ? (
            <AppText accessibilityLiveRegion="polite">{error}</AppText>
          ) : null}
          <AppButton
            label="Tải lại bình luận"
            disabled={busy}
            variant="secondary"
            onPress={() => {
              void run(() => load(0));
            }}
          />
          {loading && (
            <ActivityIndicator accessibilityLabel="Đang tải bình luận" />
          )}
          {!loading && !items.length && !error && (
            <AppText>Chưa có bình luận.</AppText>
          )}
          {items.map((comment) => (
            <View style={styles.card} key={comment.id}>
              <AppText style={styles.subtitle}>
                {comment.author.displayName}
              </AppText>
              <AppText style={styles.time}>{date(comment.createdAt)}</AppText>
              <AppText>{comment.body}</AppText>
              {comment.author.id === userId && (
                <>
                  <AppButton
                    label="Sửa bình luận"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => {
                      setEdit(comment);
                      setBody(comment.body);
                    }}
                  />
                  <AppButton
                    label="Xóa bình luận"
                    variant="secondary"
                    disabled={busy}
                    onPress={() =>
                      Alert.alert('Xóa bình luận?', '', [
                        { text: 'Hủy', style: 'cancel' },
                        {
                          text: 'Xóa',
                          style: 'destructive',
                          onPress: () => {
                            void run(async () => {
                              await api.delete(
                                `/posts/${postId}/comments/${comment.id}`,
                              );
                              await load(0);
                            });
                          },
                        },
                      ])
                    }
                  />
                </>
              )}
            </View>
          ))}
          {items.length < total && (
            <AppButton
              label="Tải thêm bình luận"
              disabled={busy}
              onPress={() => {
                void run(() => load(page + 1));
              }}
            />
          )}
          {userId ? (
            <View style={styles.card}>
              <AppText>{edit ? 'Sửa bình luận' : 'Viết bình luận'}</AppText>
              <TextInput
                multiline
                value={body}
                onChangeText={setBody}
                maxLength={2000}
                editable={!busy}
                placeholderTextColor={tokens.colors.muted}
                style={styles.input}
                accessibilityLabel="Nội dung bình luận"
              />
              <AppButton
                label={busy ? 'Đang gửi…' : 'Lưu bình luận'}
                disabled={busy || !body.trim()}
                onPress={() => {
                  void run(async () => {
                    if (edit)
                      await api.patch(`/posts/${postId}/comments/${edit.id}`, {
                        body,
                        version: edit.version,
                      });
                    else await api.post(`/posts/${postId}/comments`, { body });
                    setBody('');
                    setEdit(null);
                    await load(0);
                  });
                }}
              />
              {edit && (
                <AppButton
                  label="Hủy sửa"
                  disabled={busy}
                  variant="secondary"
                  onPress={() => {
                    setEdit(null);
                    setBody('');
                  }}
                />
              )}
            </View>
          ) : (
            <AppButton
              label="Đăng nhập để bình luận"
              onPress={() => {
                onClose();
                router.push('/(auth)/login');
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
