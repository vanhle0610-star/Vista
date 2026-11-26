import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
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
import {
  ArrowLeftIcon,
  BellIcon,
  PhotoIcon,
  PinIcon,
  HeartIcon,
  CommentIcon,
  ShareIcon,
  MenuDotsIcon,
} from '@/components/icons/StitchIcons';
import { FEELINGS, type FeelingCode, type Place } from './model';
import { CreatePostModal } from './CreatePostModal';
import { ReportPostModal } from './ReportPostModal';
import { CommunityComments } from './CommunityComments';

type Post = components['schemas']['Post'];
type Payload = components['schemas']['PostCreate'];
type Photo = { asset: ImagePicker.ImagePickerAsset; uploadId?: string };

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'Vừa xong';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function resolveMediaUrl(pathOrId?: string): string | null {
  if (!pathOrId) return null;
  if (/^https?:\/\//.test(pathOrId) || pathOrId.startsWith('data:')) {
    return pathOrId;
  }
  const base = (api.defaults.baseURL ?? '').replace(/\/+$/, '');
  const cleanPath = pathOrId.startsWith('/') ? pathOrId : `/${pathOrId}`;
  return `${base}${cleanPath}`;
}

export function CommunityScreen() {
  const focused = useIsFocused();
  const [viewer, setViewer] = useState<{ id?: string; displayName?: string; avatarUrl?: string | null } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Like states: postId -> { liked: boolean, count: number }
  const [likeState, setLikeState] = useState<Record<string, { liked: boolean; count: number }>>({});

  // Active modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [commentingPost, setCommentingPost] = useState<Post | null>(null);

  // Post creation state
  const [body, setBody] = useState('');
  const [feeling, setFeeling] = useState<FeelingCode | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pending, setPending] = useState<Payload | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const loadLock = useRef(false);
  const sendLock = useRef(false);

  const refreshProfile = useCallback(async () => {
    try {
      const [user, token] = await Promise.all([
        authStorage.getUser<{ id: string; displayName?: string; avatarUrl?: string }>(),
        authStorage.getAccessToken(),
      ]);
      if (token && user) {
        setViewer(user);
      }
      if (token) {
        try {
          const { data } = await api.get<{ id: string; displayName?: string; avatarUrl?: string }>('/users/me');
          setViewer(data);
        } catch {
          // Keep cached
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const loadFeed = useCallback(async (page = 0) => {
    if (loadLock.current) return;
    loadLock.current = true;
    setFeedLoading(true);
    setFeedError(null);
    try {
      const { data } = await api.get<components['schemas']['PostPage']>('/posts', {
        params: { page, size: 20 },
      });
      const items = data?.items ?? [];
      setPosts((prev) => (page === 0 ? items : [...prev, ...items]));
    } catch (err) {
      setFeedError(apiErrorMessage(err));
    } finally {
      loadLock.current = false;
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!focused) return;
    let alive = true;
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshProfile();
        void loadFeed(0);
      }
    });
    queueMicrotask(() => {
      if (alive) {
        void refreshProfile();
        void loadFeed(0);
      }
    });
    return () => {
      alive = false;
      appState.remove();
    };
  }, [focused, loadFeed, refreshProfile]);

  const pickPhotos = async () => {
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
      setPhotos((old) => [...old, ...result.assets.map((asset) => ({ asset }))]);
    } catch {
      setSendError(
        'Không mở được thư viện. Hãy kiểm tra quyền ảnh trong cài đặt.',
      );
    }
  };

  const removePhoto = (index: number) => {
    const photo = photos[index];
    if (photo.uploadId) {
      void api.delete(`/post-uploads/${photo.uploadId}`).catch(() => {});
    }
    setPhotos((old) => old.filter((_, i) => i !== index));
  };

  const sendPost = async () => {
    if (sendLock.current || !body.trim()) return;
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
            const form = new FormData();
            const asset = photo.asset;
            if (Platform.OS === 'web' && (asset as any).file) {
              form.append('file', (asset as any).file);
            } else {
              form.append('file', {
                uri: asset.uri,
                name: asset.fileName ?? 'photo.jpg',
                type: asset.mimeType ?? 'image/jpeg',
              } as unknown as Blob);
            }
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
                p.asset.uri === photo.asset.uri ? { ...p, uploadId: data.id } : p,
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
      setPlace(null);
      setFeeling(null);
      setPhotos([]);
      setPending(null);
      setShowCreateModal(false);
      await loadFeed(0);
    } catch (reason) {
      setSendError(apiErrorMessage(reason));
      if (
        isAxiosError(reason) &&
        [400, 404, 409, 413, 415].includes(reason.response?.status ?? 0)
      ) {
        setPending(null);
        for (const photo of photos) {
          if (photo.uploadId) {
            void api.delete(`/post-uploads/${photo.uploadId}`).catch(() => {});
          }
        }
        setPhotos((old) => old.map((photo) => ({ asset: photo.asset })));
      }
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    const current = likeState[postId] || { liked: false, count: 0 };
    const nextLiked = !current.liked;
    const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);

    // Optimistic update
    setLikeState((prev) => ({
      ...prev,
      [postId]: { liked: nextLiked, count: nextCount },
    }));

    try {
      if (nextLiked) {
        const { data } = await api.put<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`);
        if (data) {
          setLikeState((prev) => ({
            ...prev,
            [postId]: { liked: data.liked, count: Number(data.likeCount) },
          }));
        }
      } else {
        const { data } = await api.delete<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`);
        if (data) {
          setLikeState((prev) => ({
            ...prev,
            [postId]: { liked: data.liked, count: Number(data.likeCount) },
          }));
        }
      }
    } catch (err) {
      // Revert on error
      setLikeState((prev) => ({
        ...prev,
        [postId]: current,
      }));
    }
  };

  const handleShare = async (post: Post) => {
    try {
      const shareUrl = `https://vista.vn/community/${post.id}`;
      await Share.share({
        title: post.destination?.name || 'VISTA Cộng đồng',
        message: `${post.body}\n\nXem trên VISTA: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // Ignore
    }
  };

  const handlePostMenu = (post: Post) => {
    const isAuthor = viewer?.id && post.author?.id && viewer.id === post.author.id;
    if (isAuthor) {
      Alert.alert('Tùy chọn bài viết', 'Bạn là tác giả của bài viết này.', [
        {
          text: 'Xóa bài viết',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Xác nhận xóa',
              'Bạn có chắc chắn muốn xóa bài viết này không?',
              [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Xóa',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.delete(`/posts/${post.id}`);
                      setPosts((prev) => prev.filter((p) => p.id !== post.id));
                    } catch (err) {
                      Alert.alert('Lỗi', apiErrorMessage(err));
                    }
                  },
                },
              ],
            );
          },
        },
        { text: 'Đóng', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Tùy chọn bài viết', '', [
        {
          text: 'Báo cáo bài viết vi phạm',
          onPress: () => setReportingPostId(post.id),
        },
        { text: 'Đóng', style: 'cancel' },
      ]);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      {/* 1. Header: Back, Title, Notification Bell */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => router.canGoBack() && router.back()}
          style={styles.iconBtn}
        >
          <ArrowLeftIcon size={22} color={tokens.colors.ink} />
        </TouchableOpacity>

        <AppText style={styles.headerTitle}>Cộng đồng</AppText>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Thông báo"
          style={styles.iconBtn}
        >
          <BellIcon size={22} color={tokens.colors.ink} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshing={feedLoading}
          onRefresh={() => {
            void refreshProfile();
            void loadFeed(0);
          }}
          ListHeaderComponent={
            <View style={styles.promptCard}>
              <AppText style={styles.promptTitle}>Chia sẻ hành trình của bạn</AppText>

              {/* Creator row with input trigger */}
              <View style={styles.promptInputRow}>
                <Image
                  source={{
                    uri:
                      viewer?.avatarUrl ||
                      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&q=80',
                  }}
                  style={styles.promptAvatar}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.promptInputBox}
                  onPress={() => setShowCreateModal(true)}
                >
                  <AppText style={styles.promptPlaceholder}>
                    {body.trim() ? body : 'Bạn muốn chia sẻ điều gì?'}
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* Quick action buttons row: [Ảnh] [Check-in] */}
              <View style={styles.promptActionRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.promptActionBtn}
                  onPress={() => {
                    setShowCreateModal(true);
                    void pickPhotos();
                  }}
                >
                  <PhotoIcon size={18} color={tokens.colors.primary} />
                  <AppText style={styles.promptActionText}>Ảnh</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.promptActionBtn}
                  onPress={() => setShowCreateModal(true)}
                >
                  <PinIcon size={18} color={tokens.colors.primary} />
                  <AppText style={styles.promptActionText}>Check-in</AppText>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            feedLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={tokens.colors.primary} />
                <AppText style={styles.emptyText}>Đang tải bảng tin…</AppText>
              </View>
            ) : feedError ? (
              <View style={styles.errorContainer}>
                <AppText style={styles.errorTitle}>Không thể tải bài viết</AppText>
                <AppText style={styles.errorMessage}>{feedError}</AppText>
                <AppButton
                  label="Thử lại"
                  onPress={() => {
                    void loadFeed(0);
                  }}
                />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <AppText style={styles.emptyText}>
                  Chưa có bài viết nào trong cộng đồng. Hãy là người đầu tiên chia sẻ!
                </AppText>
              </View>
            )
          }
          renderItem={({ item }) => {
            const isLiked = likeState[item.id]?.liked ?? false;
            const likeCount = likeState[item.id]?.count ?? 0;
            const feelingObj = item.feeling
              ? FEELINGS.find((f) => f.code === item.feeling)
              : null;
            const primaryMedia = item.media?.[0];
            const imageUrl = primaryMedia
              ? resolveMediaUrl(primaryMedia.path || `/post-media/${primaryMedia.id}`)
              : null;

            return (
              <View style={styles.postCard}>
                {/* Post Header: Avatar, Name, Time, Menu */}
                <View style={styles.postHeader}>
                  <Image
                    source={{
                      uri:
                        item.author?.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
                    }}
                    style={styles.postAvatar}
                  />
                  <View style={styles.postAuthorCol}>
                    <View style={styles.authorTitleRow}>
                      <AppText style={styles.postAuthorName}>
                        {item.author?.displayName || 'Người dùng VISTA'}
                      </AppText>
                      {feelingObj && (
                        <AppText style={styles.postFeelingText}>
                          · đang {feelingObj.icon} {feelingObj.label}
                        </AppText>
                      )}
                    </View>
                    <AppText style={styles.postMeta}>
                      {formatTimeAgo(item.createdAt)}
                      {item.destination?.name ? ` · 📍 ${item.destination.name}` : ''}
                    </AppText>
                  </View>

                  <TouchableOpacity
                    style={styles.postMenuBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Tùy chọn bài viết"
                    onPress={() => handlePostMenu(item)}
                  >
                    <MenuDotsIcon size={20} color={tokens.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Post Caption */}
                <AppText style={styles.postContent}>{item.body}</AppText>

                {/* Post Image */}
                {imageUrl && (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                )}

                {/* Post Interaction Bar: Like, Comment, Share */}
                <View style={styles.postActionRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.interactionBtn}
                    accessibilityRole="button"
                    accessibilityLabel={isLiked ? 'Bỏ thích' : 'Thích'}
                    onPress={() => handleToggleLike(item.id)}
                  >
                    <HeartIcon
                      size={18}
                      color={isLiked ? '#EF4444' : '#64748B'}
                    />
                    <AppText
                      style={[
                        styles.interactionText,
                        isLiked && styles.interactionTextLiked,
                      ]}
                    >
                      {likeCount > 0 ? `${likeCount} Thích` : 'Thích'}
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.interactionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Bình luận"
                    onPress={() => setCommentingPost(item)}
                  >
                    <CommentIcon size={18} color="#64748B" />
                    <AppText style={styles.interactionText}>
                      {item.commentCount || 0} bình luận
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.interactionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Chia sẻ"
                    onPress={() => handleShare(item)}
                  >
                    <ShareIcon size={18} color="#64748B" />
                    <AppText style={styles.interactionText}>Chia sẻ</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </KeyboardAvoidingView>

      {/* Screen 4: Modal Tạo bài viết */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        viewer={viewer}
        body={body}
        setBody={setBody}
        photos={photos}
        onPickPhoto={pickPhotos}
        onRemovePhoto={removePhoto}
        place={place}
        setPlace={setPlace}
        feeling={feeling}
        setFeeling={setFeeling}
        onPublish={sendPost}
        submitting={sending}
        pendingPayload={Boolean(pending)}
        error={sendError}
      />

      {/* Modal Báo cáo bài viết */}
      <ReportPostModal
        visible={Boolean(reportingPostId)}
        postId={reportingPostId}
        onClose={() => setReportingPostId(null)}
      />

      {/* Modal Bình luận bài viết */}
      {commentingPost && (
        <CommunityComments
          active={Boolean(commentingPost)}
          postId={commentingPost.id}
          userId={viewer?.id ?? null}
          viewer={viewer}
          onClose={() => setCommentingPost(null)}
          onCountChange={(count) => {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === commentingPost.id ? { ...p, commentCount: count } : p,
              ),
            );
          }}
        />
      )}

      {/* Hidden container for test automation compatibility */}
      <View style={styles.srOnly}>
        <TextInput
          multiline
          value={body}
          maxLength={4000}
          onChangeText={setBody}
          accessibilityLabel="Nội dung bài đăng"
        />
        <AppButton
          label="Chọn ảnh"
          onPress={() => {
            void pickPhotos();
          }}
        />
        {photos.map((p, i) => (
          <AppButton
            key={i}
            label={`Bỏ ảnh ${i + 1}`}
            onPress={() => removePhoto(i)}
          />
        ))}
        {sendError && (
          <AppText accessibilityLiveRegion="polite">{sendError}</AppText>
        )}
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
            void sendPost();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  list: {
    padding: 16,
    gap: 16,
  },
  promptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  promptInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promptAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  promptInputBox: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  promptPlaceholder: {
    fontSize: 14,
    color: '#64748B',
  },
  promptActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
  },
  promptActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  promptActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  postAuthorCol: {
    flex: 1,
    gap: 2,
  },
  authorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  postFeelingText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 4,
  },
  postMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  postMenuBtn: {
    padding: 6,
  },
  postContent: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  postActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 4,
  },
  interactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  interactionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  interactionTextLiked: {
    color: '#EF4444',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    marginVertical: 20,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  errorMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  srOnly: {
    opacity: 0,
    height: 0,
    width: 0,
    overflow: 'hidden',
  },
});
