"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import type { components } from "@/types/api.generated";
import { PublicAvatar } from "./CommunityTools";
import css from "./communityExtras.module.css";
type Comment = components["schemas"]["Comment"];
type CommentPage = components["schemas"]["CommentPage"];
type Author = { displayName?: string | null; avatarUrl?: string | null } | null;
const problem = (reason: unknown) =>
  reason instanceof Error
    ? reason.message
    : "Không kết nối được máy chủ. Hãy thử lại.";
const json = (method: string, body: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

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
  const [body, setBody] = useState(edit?.body ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [pending, setPending] = useState<{
    body: string;
    replyToId?: string;
    clientRequestId: string;
  } | null>(null);
  const lock = useRef(false);
  return (
    <form
      className={css.form}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!body.trim() || lock.current) return;
        lock.current = true;
        setBusy(true);
        setError("");
        try {
          if (edit)
            await apiRequest(
              `/posts/${postId}/comments/${edit.id}`,
              json("PATCH", { body: body.trim(), version: edit.version }),
            );
          else {
            const payload = pending ?? {
              body: body.trim(),
              replyToId: target?.id,
              clientRequestId: crypto.randomUUID(),
            };
            setPending(payload);
            await apiRequest(
              `/posts/${postId}/comments`,
              json("POST", payload),
            );
          }
          setBody("");
          setPending(null);
          await onDone();
          onCancel?.();
        } catch (reason) {
          setError(problem(reason));
          if (
            [400, 401, 403, 404, 409].includes(
              (reason as { status?: number }).status ?? 0,
            )
          )
            setPending(null);
        } finally {
          lock.current = false;
          setBusy(false);
        }
      }}
    >
      <div className={css.author}>
        <PublicAvatar author={viewer} />
        <span>{viewer?.displayName || "Người dùng VISTA"}</span>
      </div>
      {target && (
        <p>
          Đang trả lời{" "}
          <strong>{target.author.displayName || "Người dùng VISTA"}</strong>
        </p>
      )}
      <textarea
        aria-label={
          edit
            ? "Sửa bình luận"
            : target
              ? `Trả lời ${target.author.displayName}`
              : "Nội dung bình luận"
        }
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={2000}
        disabled={busy || !!pending}
        placeholder="Viết bình luận…"
        rows={2}
      />
      {error && (
        <p role="alert" className={css.error}>
          {error}
          {pending
            ? " Bản nháp được giữ lại; thử gửi lại cùng mã để tránh trùng."
            : ""}
        </p>
      )}
      <button type="submit" disabled={busy || !body.trim()}>
        {busy
          ? "Đang gửi…"
          : edit
            ? "Lưu bình luận"
            : pending
              ? "Thử gửi lại"
              : "Gửi"}
      </button>
      {onCancel && (
        <button type="button" disabled={busy} onClick={onCancel}>
          Hủy
        </button>
      )}
    </form>
  );
}

function Thread({
  root,
  postId,
  userId,
  viewer,
  refresh,
}: {
  root: Comment;
  postId: string;
  userId: string | null;
  viewer: Author;
  refresh: () => Promise<void>;
}) {
  const refreshOpen = useRef<() => void>(() => {});
  const [open, setOpen] = useState(false),
    [items, setItems] = useState<Comment[]>([]),
    [page, setPage] = useState(-1),
    [total, setTotal] = useState(root.replyCount ?? 0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [target, setTarget] = useState<Comment | null>(null),
    [edit, setEdit] = useState<Comment | null>(null);
  const lock = useRef(false);
  const load = async (next: number) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await apiRequest<CommentPage>(
        `/posts/${postId}/comments/${root.id}/replies?page=${next}&size=10`,
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
      setPage(next);
      setTotal(data.total);
      setOpen(true);
    } catch (reason) {
      setError(problem(reason));
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
    const listener = () => refreshOpen.current();
    window.addEventListener("focus", listener);
    window.addEventListener("vista-auth-change", listener);
    return () => {
      window.removeEventListener("focus", listener);
      window.removeEventListener("vista-auth-change", listener);
    };
  }, []);
  const render = (item: Comment, reply = false) => (
    <div key={item.id} className={reply ? css.reply : css.comment}>
      <div className={css.author}>
        <PublicAvatar author={item.author} />
        <span>
          <strong>{item.author.displayName || "Người dùng VISTA"}</strong>
          <br />
          <time className={css.muted} dateTime={item.createdAt}>
            {new Date(item.createdAt).toLocaleString("vi-VN")}
          </time>
        </span>
      </div>
      {item.replyToAuthor && (
        <span className={css.muted}>
          Trả lời {item.replyToAuthor.displayName}
        </span>
      )}
      <p className={css.body}>
        {item.deleted ? "Bình luận đã bị xóa" : item.body}
      </p>
      {!item.deleted && (
        <div className={css.actions}>
          {userId && !root.deleted && (
            <button
              type="button"
              onClick={() => {
                setTarget(item);
                setEdit(null);
              }}
            >
              Trả lời
            </button>
          )}
          {item.author.id === userId && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEdit(item);
                  setTarget(null);
                }}
              >
                Sửa
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (
                    lock.current ||
                    !confirm(
                      "Xóa bình luận này? Các phản hồi hợp lệ sẽ được giữ lại.",
                    )
                  )
                    return;
                  lock.current = true;
                  setBusy(true);
                  setError("");
                  try {
                    await apiRequest(`/posts/${postId}/comments/${item.id}`, {
                      method: "DELETE",
                    });
                    await refresh();
                    lock.current = false;
                    if (open) await load(0);
                  } catch (reason) {
                    setError(problem(reason));
                  } finally {
                    lock.current = false;
                    setBusy(false);
                  }
                }}
              >
                Xóa
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
  return (
    <section aria-label={`Luồng bình luận của ${root.author.displayName}`}>
      {render(root)}
      {(root.replyCount ?? 0) > 0 && (
        <div className={css.actions}>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (open) setOpen(false);
              else void load(0);
            }}
          >
            {open
              ? "Thu gọn câu trả lời"
              : `Xem ${root.replyCount} câu trả lời`}
          </button>
        </div>
      )}
      {open && items.map((item) => render(item, true))}
      {open && items.length < total && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void load(page + 1)}
        >
          Xem thêm câu trả lời
        </button>
      )}
      {busy && <p role="status">Đang tải…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void load(Math.max(0, page))}>
            Thử lại phản hồi
          </button>
        </div>
      )}
      {(target || edit) && (
        <CommentForm
          key={`${target?.id ?? ""}:${edit?.id ?? ""}`}
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
    </section>
  );
}

export function CommunityComments({
  postId,
  userId,
  viewer,
  onCountChange,
}: {
  postId: string;
  userId: string | null;
  viewer: Author;
  onCountChange: (count: number) => void;
}) {
  const pendingRefresh = useRef(false);
  const [revision, setRevision] = useState(0);
  const [items, setItems] = useState<Comment[]>([]),
    [page, setPage] = useState(-1),
    [total, setTotal] = useState(0),
    [count, setCount] = useState<number | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
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
      setError("");
      try {
        const pages = refresh
          ? Array.from(
              { length: Math.max(1, pageRef.current + 1) },
              (_, n) => n,
            )
          : [next];
        const data = await Promise.all(
          pages.map((n) =>
            apiRequest<CommentPage>(
              `/posts/${postId}/comments?page=${n}&size=10`,
            ),
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
        if (typeof data[0].commentCount === "number") {
          setCount(data[0].commentCount);
          callback.current(data[0].commentCount);
        }
      } catch (reason) {
        setError(problem(reason));
      } finally {
        lock.current = false;
        setBusy(false);
        if (pendingRefresh.current) {
          pendingRefresh.current = false;
          setRevision((n) => n + 1);
        }
      }
    },
    [postId],
  );
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load(0, revision > 0);
    });
    return () => {
      active = false;
    };
  }, [load, revision]);
  useEffect(() => {
    const refresh = () => void load(0, true);
    window.addEventListener("focus", refresh);
    window.addEventListener("vista-auth-change", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("vista-auth-change", refresh);
    };
  }, [load]);
  const refresh = () => load(0, true);
  return (
    <div>
      <h3>{count === null ? "Bình luận" : `${count} bình luận`}</h3>
      {busy && <p role="status">Đang tải bình luận…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void refresh()}>
            Thử tải lại bình luận
          </button>
        </div>
      )}
      {!busy && !error && !items.length && (
        <p>Chưa có bình luận. Hãy chia sẻ ý kiến của bạn.</p>
      )}
      {items.map((item) => (
        <Thread
          key={item.id}
          root={item}
          postId={postId}
          userId={userId}
          viewer={viewer}
          refresh={refresh}
        />
      ))}
      {items.length < total && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void load(page + 1)}
        >
          Xem thêm bình luận
        </button>
      )}
      {userId ? (
        <CommentForm postId={postId} viewer={viewer} onDone={refresh} />
      ) : (
        <Link href="/login?returnUrl=%2Fcommunity">
          Đăng nhập để gửi bình luận →
        </Link>
      )}
    </div>
  );
}
