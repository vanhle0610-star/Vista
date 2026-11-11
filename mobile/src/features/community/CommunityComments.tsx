import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { isAxiosError } from 'axios';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { api, apiErrorMessage } from '@/services/api/client';
import type { components } from '@/types/api.generated';
import { PublicAvatar, ui } from './CommunityTools';
type Comment = components['schemas']['Comment'];
type Page = components['schemas']['CommentPage'];
type Author = { displayName?: string | null; avatarUrl?: string | null } | null;

function CommentForm({
  postId,
  target,
  edit,
  viewer,
  onDone,
  onCancel,
}: {
  postId: string;
  target?: Comment;
  edit?: Comment;
  viewer: Author;
  onDone: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState(edit?.body ?? ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [pending, setPending] = useState<{
    body: string;
    replyToId?: string;
    clientRequestId: string;
  } | null>(null);
  const lock = useRef(false);
  const send = async () => {
    if (lock.current || !body.trim()) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (edit)
        await api.patch(`/posts/${postId}/comments/${edit.id}`, {
          body: body.trim(),
          version: edit.version,
        });
      else {
        const payload = pending ?? {
          body: body.trim(),
          replyToId: target?.id,
          clientRequestId: Crypto.randomUUID(),
        };
        setPending(payload);
        await api.post(`/posts/${postId}/comments`, payload);
      }
      setBody('');
      setPending(null);
      await onDone();
      onCancel?.();
    } catch (reason) {
      setError(apiErrorMessage(reason));
      if (
        isAxiosError(reason) &&
        [400, 401, 403, 404, 409].includes(reason.response?.status ?? 0)
      )
        setPending(null);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={ui.gap}>
      <View style={styles.author}>
        <PublicAvatar author={viewer} />
        <AppText>{viewer?.displayName || 'Người dùng VISTA'}</AppText>
      </View>
      {target && <AppText>Đang trả lời {target.author.displayName}</AppText>}
      <TextInput
        multiline
        style={ui.input}
        maxLength={2000}
        value={body}
        onChangeText={setBody}
        editable={!busy && !pending}
        placeholder="Viết bình luận…"
        accessibilityLabel={
          edit
            ? 'Sửa nội dung bình luận'
            : target
              ? `Trả lời ${target.author.displayName}`
              : 'Nội dung bình luận'
        }
      />
      {error && (
        <AppText accessibilityLiveRegion="polite">
          {error}
          {pending
            ? ' Giữ nguyên bản nháp và thử lại cùng mã để tránh trùng.'
            : ''}
        </AppText>
      )}
      <AppButton
        label={
          busy
            ? 'Đang gửi…'
            : pending
              ? 'Thử gửi lại bình luận'
              : edit
                ? 'Lưu sửa bình luận'
                : target
                  ? 'Gửi phản hồi'
                  : 'Lưu bình luận'
        }
        disabled={busy || !body.trim()}
        onPress={() => void send()}
      />
      {onCancel && (
        <AppButton
          label="Hủy"
          variant="secondary"
          disabled={busy}
          onPress={onCancel}
        />
      )}
    </View>
  );
}

function Thread({
  root,
  postId,
  userId,
  viewer,
  revision,
  refresh,
}: {
  root: Comment;
  postId: string;
  userId: string | null;
  viewer: Author;
  revision: number;
  refresh: () => Promise<void>;
}) {
  const refreshOpen = useRef<() => void>(() => {});
  const [open, setOpen] = useState(false),
    [items, setItems] = useState<Comment[]>([]),
    [page, setPage] = useState(-1),
    [total, setTotal] = useState(root.replyCount ?? 0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [target, setTarget] = useState<Comment | null>(null),
    [edit, setEdit] = useState<Comment | null>(null);
  const lock = useRef(false);
  const load = async (next: number) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get<Page>(
        `/posts/${postId}/comments/${root.id}/replies`,
        { params: { page: next, size: 10 } },
      );
      setItems((old) =>
        next === 0
          ? data.items
          : [
              ...new Map(
                [...old, ...data.items].map((item) => [item.id, item]),
              ).values(),
            ],
      );
      setTotal(data.total);
      setPage(next);
      setOpen(true);
    } catch (reason) {
      setError(apiErrorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const changed = async () => {
    await refresh();
    await load(0);
  };
  useEffect(() => {
    refreshOpen.current = () => {
      if (open) void load(0);
    };
  });
  useEffect(() => {
    refreshOpen.current();
  }, [viewer?.displayName, viewer?.avatarUrl, revision]);
  const remove = (item: Comment) =>
    Alert.alert('Xóa bình luận?', 'Các phản hồi hợp lệ vẫn được giữ lại.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError('');
          void api
            .delete(`/posts/${postId}/comments/${item.id}`)
            .then(async () => {
              await refresh();
              lock.current = false;
              if (open) await load(0);
            })
            .catch((reason) => setError(apiErrorMessage(reason)))
            .finally(() => {
              lock.current = false;
              setBusy(false);
            });
        },
      },
    ]);
  const render = (item: Comment, reply = false) => (
    <View key={item.id} style={[styles.comment, reply && styles.reply]}>
      <View style={styles.author}>
        <PublicAvatar author={item.author} />
        <View style={ui.flex}>
          <AppText style={ui.strong}>
            {item.author.displayName || 'Người dùng VISTA'}
          </AppText>
          <AppText>{new Date(item.createdAt).toLocaleString('vi-VN')}</AppText>
        </View>
      </View>
      {item.replyToAuthor && (
        <AppText>Trả lời {item.replyToAuthor.displayName}</AppText>
      )}
      <AppText>{item.deleted ? 'Bình luận đã bị xóa' : item.body}</AppText>
      {!item.deleted && (
        <View style={styles.actions}>
          {userId && !root.deleted && (
            <AppButton
              label="Trả lời"
              variant="secondary"
              disabled={busy}
              onPress={() => {
                setTarget(item);
                setEdit(null);
              }}
            />
          )}
          {item.author.id === userId && (
            <>
              <AppButton
                label="Sửa bình luận"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  setEdit(item);
                  setTarget(null);
                }}
              />
              <AppButton
                label="Xóa bình luận"
                variant="secondary"
                disabled={busy}
                onPress={() => remove(item)}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
  return (
    <View style={styles.thread}>
      {render(root)}
      {(root.replyCount ?? 0) > 0 && (
        <AppButton
          label={
            open ? 'Thu gọn câu trả lời' : `Xem ${root.replyCount} câu trả lời`
          }
          variant="secondary"
          disabled={busy}
          onPress={() => {
            if (open) setOpen(false);
            else void load(0);
          }}
        />
      )}
      {open && items.map((item) => render(item, true))}
      {open && items.length < total && (
        <AppButton
          label="Xem thêm câu trả lời"
          variant="secondary"
          disabled={busy}
          onPress={() => void load(page + 1)}
        />
      )}
      {busy && <ActivityIndicator />}
      {error && (
        <>
          <AppText accessibilityLiveRegion="polite">{error}</AppText>
          <AppButton
            label="Thử lại phản hồi"
            onPress={() => void load(Math.max(0, page))}
          />
        </>
      )}
      {(target || edit) && (
        <CommentForm
          key={`${target?.id ?? ''}:${edit?.id ?? ''}`}
          postId={postId}
          viewer={viewer}
          target={target ?? undefined}
          edit={edit ?? undefined}
          onDone={changed}
          onCancel={() => {
            setTarget(null);
            setEdit(null);
          }}
        />
      )}
    </View>
  );
}

export function CommunityComments({
  postId,
  userId,
  viewer,
  active,
  revision = 0,
  onClose,
  onCountChange,
}: {
  postId: string;
  userId: string | null;
  viewer: Author;
  active: boolean;
  revision?: number;
  onClose: () => void;
  onCountChange: (count: number) => void;
}) {
  const pendingRefresh = useRef(false);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [items, setItems] = useState<Comment[]>([]),
    [page, setPage] = useState(-1),
    [total, setTotal] = useState(0),
    [count, setCount] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const callback = useRef(onCountChange),
    pageRef = useRef(-1),
    lock = useRef(false);
  useEffect(() => {
    callback.current = onCountChange;
  }, [onCountChange]);
  const load = useCallback(
    async (next: number, refresh = false) => {
      if (lock.current) {
        if (refresh) pendingRefresh.current = true;
        return;
      }
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        const pages = refresh
          ? Array.from(
              { length: Math.max(1, pageRef.current + 1) },
              (_, n) => n,
            )
          : [next];
        const data = await Promise.all(
          pages.map(
            async (n) =>
              (
                await api.get<Page>(`/posts/${postId}/comments`, {
                  params: { page: n, size: 10 },
                })
              ).data,
          ),
        );
        const rows = data.flatMap((p) => p.items);
        setItems((old) =>
          refresh || next === 0
            ? rows
            : [
                ...new Map(
                  [...old, ...rows].map((item) => [item.id, item]),
                ).values(),
              ],
        );
        setTotal(data[0].total);
        pageRef.current = refresh ? pages.length - 1 : next;
        setPage(pageRef.current);
        if (typeof data[0].commentCount === 'number') {
          setCount(data[0].commentCount);
          callback.current(data[0].commentCount);
        }
      } catch (reason) {
        setError(apiErrorMessage(reason));
      } finally {
        lock.current = false;
        setBusy(false);
        if (pendingRefresh.current) {
          pendingRefresh.current = false;
          setRefreshRevision((n) => n + 1);
        }
      }
    },
    [postId],
  );
  useEffect(() => {
    if (active) queueMicrotask(() => void load(0, true));
  }, [
    active,
    load,
    viewer?.displayName,
    viewer?.avatarUrl,
    revision,
    refreshRevision,
  ]);
  const refresh = () => load(0, true);
  return (
    <SafeAreaView style={ui.screen}>
      <KeyboardAvoidingView
        style={ui.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={ui.list}
        >
          <AppButton
            label="Đóng bình luận"
            variant="secondary"
            onPress={onClose}
          />
          <AppText style={ui.title}>
            {count === null ? 'Bình luận' : `${count} bình luận`}
          </AppText>
          <AppButton
            label="Tải lại bình luận"
            variant="secondary"
            disabled={busy}
            onPress={() => void refresh()}
          />
          {busy && (
            <ActivityIndicator accessibilityLabel="Đang tải bình luận" />
          )}
          {error && <AppText accessibilityLiveRegion="polite">{error}</AppText>}
          {!busy && !error && !items.length && (
            <AppText>Chưa có bình luận.</AppText>
          )}
          {items.map((item) => (
            <Thread
              key={item.id}
              root={item}
              postId={postId}
              userId={userId}
              viewer={viewer}
              revision={revision}
              refresh={refresh}
            />
          ))}
          {items.length < total && (
            <AppButton
              label="Tải thêm bình luận"
              variant="secondary"
              disabled={busy}
              onPress={() => void load(page + 1)}
            />
          )}
          {userId ? (
            <CommentForm postId={postId} viewer={viewer} onDone={refresh} />
          ) : (
            <AppText>Đăng nhập để bình luận.</AppText>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  thread: {
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 8,
  },
  comment: { gap: 8, paddingVertical: 10 },
  reply: {
    marginLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#dbeafe',
    paddingLeft: 10,
  },
  author: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
