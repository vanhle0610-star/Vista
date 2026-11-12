package com.vista.community.application;

import static com.vista.community.application.CommunityProblem.of;
import static org.springframework.http.HttpStatus.*;

import com.vista.community.api.CommunityModels.*;
import com.vista.destination.application.DestinationQueryService;
import com.vista.user.application.UserService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Primary
public class CommunityService implements PostVisibilityService {
  private static final Set<String> FEELINGS =
      Set.of("HAPPY", "DELIGHTED", "EXCITED", "RELAXED", "GRATEFUL", "CONFIDENT", "SAD", "TIRED");
  private static final String POST_SELECT =
      "SELECT p.*,COALESCE(cc.comment_count,0) AS comment_count FROM posts p LEFT JOIN (SELECT c.post_id,count(*) AS comment_count FROM comments c WHERE c.status='VISIBLE' AND c.deleted_at IS NULL AND (c.root_id IS NULL OR EXISTS(SELECT 1 FROM comments root WHERE root.id=c.root_id AND root.status='VISIBLE')) GROUP BY c.post_id) cc ON cc.post_id=p.id ";
  private static final String COMMENT_SELECT =
      "SELECT c.*,COALESCE(rc.reply_count,0) AS reply_count,t.user_id AS target_user_id FROM comments c LEFT JOIN (SELECT root_id,count(*) AS reply_count FROM comments WHERE status='VISIBLE' AND deleted_at IS NULL AND root_id IS NOT NULL GROUP BY root_id) rc ON rc.root_id=c.id LEFT JOIN comments t ON t.id=c.reply_to_id ";
  private static final String ROOT_VISIBLE =
      "c.post_id=? AND c.root_id IS NULL AND c.status='VISIBLE' AND (c.deleted_at IS NULL OR EXISTS(SELECT 1 FROM comments r WHERE r.root_id=c.id AND r.status='VISIBLE' AND r.deleted_at IS NULL))";
  private final JdbcTemplate db;
  private final UserService users;
  private final DestinationQueryService destinations;

  public CommunityService(
      JdbcTemplate db, UserService users, DestinationQueryService destinations) {
    this.db = db;
    this.users = users;
    this.destinations = destinations;
  }

  private Author author(UUID id) {
    try {
      var profile = users.getProfile(id);
      return new Author(
          id,
          profile.displayName() == null || profile.displayName().isBlank()
              ? "Người dùng VISTA"
              : profile.displayName(),
          profile.avatarUrl());
    } catch (BadCredentialsException missing) {
      return new Author(id, "Tài khoản không còn hoạt động", null);
    }
  }

  private Post post(ResultSet row, int n) throws SQLException {
    UUID id = row.getObject("id", UUID.class);
    var media =
        db.query(
            "SELECT id FROM post_media WHERE post_id = ? ORDER BY id",
            (r, i) -> {
              UUID mediaId = r.getObject("id", UUID.class);
              return new Media(mediaId, "/post-media/" + mediaId);
            },
            id);
    return new Post(
        id,
        row.getString("body"),
        row.getLong("version"),
        row.getTimestamp("created_at").toInstant(),
        row.getTimestamp("updated_at").toInstant(),
        author(row.getObject("user_id", UUID.class)),
        row.getObject("destination_id", UUID.class),
        media,
        row.getString("feeling"),
        row.getLong("comment_count"),
        Optional.ofNullable(row.getObject("destination_id", UUID.class))
            .flatMap(destinations::findPublishedById)
            .map(
                d ->
                    new CommunityPlace(
                        d.id(),
                        d.name(),
                        d.provinceName(),
                        d.imageUrl(),
                        d.latitude(),
                        d.longitude()))
            .orElse(null));
  }

  private Comment comment(ResultSet row, int n) throws SQLException {
    return new Comment(
        row.getObject("id", UUID.class),
        row.getObject("post_id", UUID.class),
        row.getTimestamp("deleted_at") == null ? row.getString("body") : "Bình luận đã bị xóa",
        row.getLong("version"),
        row.getTimestamp("created_at").toInstant(),
        row.getTimestamp("updated_at").toInstant(),
        author(row.getObject("user_id", UUID.class)),
        row.getObject("root_id", UUID.class),
        row.getObject("reply_to_id", UUID.class),
        row.getObject("target_user_id", UUID.class) == null
            ? null
            : author(row.getObject("target_user_id", UUID.class)),
        row.getLong("reply_count"),
        row.getTimestamp("deleted_at") != null);
  }

  private static void pagination(int page, int size) {
    if (page < 0 || page > 100000 || size < 1 || size > 50)
      throw of(BAD_REQUEST, "INVALID_PAGE", "Phân trang không hợp lệ (tối đa 50 mục mỗi trang).");
  }

  private static String body(String value, int max) {
    if (value == null || value.isBlank() || value.length() > max)
      throw of(BAD_REQUEST, "INVALID_BODY", "Nội dung phải có từ 1 đến " + max + " ký tự.");
    return value.trim();
  }

  private static void version(long version) {
    if (version < 0) throw of(BAD_REQUEST, "INVALID_VERSION", "Phiên bản nội dung không hợp lệ.");
  }

  @Transactional(readOnly = true)
  public Page<Post> list(int page, int size) {
    pagination(page, size);
    var items =
        db.query(
            POST_SELECT
                + "WHERE p.status='VISIBLE' AND p.deleted_at IS NULL ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?",
            this::post,
            size,
            (long) page * size);
    long total =
        db.queryForObject(
            "SELECT count(*) FROM posts WHERE status='VISIBLE' AND deleted_at IS NULL", Long.class);
    return new Page<>(items, total, page, size);
  }

  @Transactional(readOnly = true)
  public Post detail(UUID id) {
    return db
        .query(
            POST_SELECT + "WHERE p.id=? AND p.status='VISIBLE' AND p.deleted_at IS NULL",
            this::post,
            id)
        .stream()
        .findFirst()
        .orElseThrow(() -> of(NOT_FOUND, "POST_NOT_FOUND", "Không tìm thấy bài đăng công khai."));
  }

  private Map<String, Object> lockPost(UUID id) {
    return db
        .queryForList("SELECT * FROM posts WHERE id=? AND deleted_at IS NULL FOR UPDATE", id)
        .stream()
        .findFirst()
        .orElseThrow(() -> of(NOT_FOUND, "POST_NOT_FOUND", "Không tìm thấy bài đăng."));
  }

  private Map<String, Object> moderationPost(UUID id) {
    var row =
        db.queryForList("SELECT * FROM posts WHERE id=? FOR UPDATE", id).stream()
            .findFirst()
            .orElseThrow(() -> of(NOT_FOUND, "POST_NOT_FOUND", "Không tìm thấy bài đăng."));
    if (row.get("deleted_at") != null)
      throw of(CONFLICT, "POST_DELETED", "Bài đã được tác giả xóa; không thể ẩn hoặc khôi phục.");
    return row;
  }

  private static void owner(Map<String, Object> row, UUID user) {
    if (!user.equals(row.get("user_id")))
      throw of(FORBIDDEN, "NOT_OWNER", "Bạn chỉ được sửa hoặc xóa nội dung của mình.");
  }

  private static void expected(Map<String, Object> row, long version) {
    version(version);
    if (((Number) row.get("version")).longValue() != version)
      throw of(CONFLICT, "VERSION_CONFLICT", "Nội dung đã thay đổi. Hãy tải lại trước khi sửa.");
  }

  @Transactional
  public Post create(UUID user, CreatePost input) {
    String text = body(input.body(), 4000);
    if (input.feeling() != null && !FEELINGS.contains(input.feeling()))
      throw of(BAD_REQUEST, "INVALID_FEELING", "Cảm xúc không hợp lệ.");
    List<UUID> uploads = input.uploadIds() == null ? List.of() : input.uploadIds();
    if (input.clientRequestId() == null
        || uploads.size() > 4
        || uploads.stream().anyMatch(Objects::isNull)
        || new HashSet<>(uploads).size() != uploads.size())
      throw of(BAD_REQUEST, "INVALID_POST", "Mỗi bài có tối đa 4 ảnh và cần mã gửi bài hợp lệ.");
    String hash;
    try {
      hash =
          HexFormat.of()
              .formatHex(
                  MessageDigest.getInstance("SHA-256")
                      .digest(
                          (text
                                  + "\n"
                                  + input.destinationId()
                                  + "\n"
                                  + uploads
                                  + (input.feeling() == null ? "" : "\n" + input.feeling()))
                              .getBytes(StandardCharsets.UTF_8)));
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
    // Serializes concurrent retries of this user's exact request without a duplicate insert.
    db.queryForList(
        "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
        user + ":" + input.clientRequestId());
    var existing =
        db.queryForList(
            "SELECT id, request_hash, deleted_at FROM posts WHERE user_id=? AND client_request_id=?",
            user,
            input.clientRequestId());
    if (!existing.isEmpty()) {
      var row = existing.getFirst();
      if (!hash.equals(row.get("request_hash")) || row.get("deleted_at") != null)
        throw of(
            CONFLICT,
            "REQUEST_REUSED",
            "Mã gửi đã được dùng cho nội dung khác. Hãy làm mới bản nháp.");
      return db.query(POST_SELECT + "WHERE p.id=?", this::post, row.get("id")).getFirst();
    }
    if (input.destinationId() != null
        && destinations.findPublishedById(input.destinationId()).isEmpty())
      throw of(BAD_REQUEST, "DESTINATION_NOT_FOUND", "Địa điểm chưa được công bố.");
    UUID id = UUID.randomUUID();
    // New posts are public in the basic week-3 feed; future moderation can hide them via the
    // boundary.
    db.update(
        "INSERT INTO posts(id,user_id,destination_id,body,status,client_request_id,request_hash,feeling) VALUES (?,?,?,?,'VISIBLE',?,?,?)",
        id,
        user,
        input.destinationId(),
        text,
        input.clientRequestId(),
        hash,
        input.feeling());
    for (UUID upload : uploads) {
      var found =
          db.queryForList(
              "SELECT * FROM community_uploads WHERE id=? AND user_id=? AND status='UPLOADED' AND expires_at>now() FOR UPDATE",
              upload,
              user);
      if (found.isEmpty())
        throw of(
            BAD_REQUEST,
            "INVALID_UPLOAD",
            "Ảnh không thuộc bạn, đã được dùng hoặc hết hạn. Hãy chọn ảnh lại.");
      var row = found.getFirst();
      db.update(
          "INSERT INTO post_media(id,post_id,storage_path,media_type) VALUES (?,?,?,?)",
          upload,
          id,
          row.get("storage_path"),
          row.get("mime_type"));
      db.update("UPDATE community_uploads SET status='ATTACHED',post_id=? WHERE id=?", id, upload);
    }
    return detail(id);
  }

  @Transactional
  public Post edit(UUID user, UUID id, Edit input) {
    var patch = new PostEdit();
    patch.body = input.body();
    patch.version = input.version();
    return editPost(user, id, patch);
  }

  @Transactional
  public Post editPost(UUID user, UUID id, PostEdit input) {
    var row = lockPost(id);
    owner(row, user);
    expected(row, input.version);
    if (!"VISIBLE".equals(row.get("status")))
      throw of(CONFLICT, "POST_HIDDEN", "Bài hiện không cho phép chỉnh sửa.");
    if (input.feelingSupplied() && input.feeling() != null && !FEELINGS.contains(input.feeling()))
      throw of(BAD_REQUEST, "INVALID_FEELING", "Cảm xúc không hợp lệ.");
    if (input.destinationSupplied()
        && input.destinationId() != null
        && destinations.findPublishedById(input.destinationId()).isEmpty())
      throw of(BAD_REQUEST, "DESTINATION_NOT_FOUND", "Địa điểm chưa được công bố.");
    db.update(
        "UPDATE posts SET body=?,destination_id=?,feeling=?,version=version+1,updated_at=now() WHERE id=?",
        body(input.body, 4000),
        input.destinationSupplied() ? input.destinationId() : row.get("destination_id"),
        input.feelingSupplied() ? input.feeling() : row.get("feeling"),
        id);
    return detail(id);
  }

  @Transactional
  public void delete(UUID user, UUID id) {
    var row = lockPost(id);
    owner(row, user);
    db.update(
        "UPDATE posts SET deleted_at=now(),updated_at=now(),version=version+1 WHERE id=?", id);
    db.update("UPDATE community_uploads SET status='DELETE_PENDING' WHERE post_id=?", id);
  }

  private void visiblePost(UUID id) {
    if (!Boolean.TRUE.equals(
        db.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM posts WHERE id=? AND status='VISIBLE' AND deleted_at IS NULL)",
            Boolean.class,
            id))) throw of(NOT_FOUND, "POST_NOT_FOUND", "Không tìm thấy bài đăng công khai.");
  }

  @Transactional(readOnly = true)
  public Page<Comment> comments(UUID postId, int page, int size) {
    pagination(page, size);
    visiblePost(postId);
    var items =
        db.query(
            COMMENT_SELECT
                + "WHERE "
                + ROOT_VISIBLE
                + " ORDER BY c.created_at DESC,c.id DESC LIMIT ? OFFSET ?",
            this::comment,
            postId,
            size,
            (long) page * size);
    long total =
        db.queryForObject(
            "SELECT count(*) FROM comments c WHERE " + ROOT_VISIBLE, Long.class, postId);
    return new Page<>(items, total, page, size, commentCount(postId));
  }

  private long commentCount(UUID postId) {
    return db.queryForObject(
        "SELECT count(*) FROM comments c WHERE c.post_id=? AND c.status='VISIBLE' AND c.deleted_at IS NULL AND (c.root_id IS NULL OR EXISTS(SELECT 1 FROM comments root WHERE root.id=c.root_id AND root.status='VISIBLE'))",
        Long.class,
        postId);
  }

  @Transactional(readOnly = true)
  public Page<Comment> replies(UUID postId, UUID rootId, int page, int size) {
    pagination(page, size);
    visiblePost(postId);
    var roots =
        db.queryForList(
            "SELECT id FROM comments WHERE id=? AND post_id=? AND root_id IS NULL AND status='VISIBLE'",
            rootId,
            postId);
    if (roots.isEmpty())
      throw of(NOT_FOUND, "COMMENT_NOT_FOUND", "Không tìm thấy luồng bình luận.");
    var items =
        db.query(
            COMMENT_SELECT
                + "WHERE c.post_id=? AND c.root_id=? AND c.status='VISIBLE' AND c.deleted_at IS NULL ORDER BY c.created_at,c.id LIMIT ? OFFSET ?",
            this::comment,
            postId,
            rootId,
            size,
            (long) page * size);
    long total =
        db.queryForObject(
            "SELECT count(*) FROM comments WHERE post_id=? AND root_id=? AND status='VISIBLE' AND deleted_at IS NULL",
            Long.class,
            postId,
            rootId);
    return new Page<>(items, total, page, size, commentCount(postId));
  }

  @Transactional(readOnly = true)
  public PostLike likeState(UUID user, UUID postId) {
    visiblePost(postId);
    return db.queryForObject(
        "SELECT count(*) AS like_count, count(*) FILTER (WHERE user_id=?) > 0 AS liked FROM post_likes WHERE post_id=?",
        (row, n) -> new PostLike(postId, row.getBoolean("liked"), row.getLong("like_count")),
        user,
        postId);
  }

  @Transactional
  public PostLike setLiked(UUID user, UUID postId, boolean liked) {
    lockPost(postId);
    visiblePost(postId);
    if (liked) {
      db.update(
          "INSERT INTO post_likes(post_id,user_id) VALUES (?,?) ON CONFLICT (post_id,user_id) DO NOTHING",
          postId,
          user);
    } else {
      db.update("DELETE FROM post_likes WHERE post_id=? AND user_id=?", postId, user);
    }
    return likeState(user, postId);
  }

  @Transactional
  public Comment addComment(UUID user, UUID postId, String text) {
    return createComment(user, postId, new CreateComment(text));
  }

  @Transactional
  public Comment createComment(UUID user, UUID postId, CreateComment input) {
    String text = body(input.body(), 2000);
    if (input.replyToId() != null && input.clientRequestId() == null)
      throw of(
          BAD_REQUEST,
          "COMMENT_REQUEST_ID_REQUIRED",
          "Không thể gửi phản hồi. Hãy thử lại hoặc cập nhật ứng dụng.");
    lockPost(postId);
    visiblePost(postId);
    String hash = postId + "\n" + input.replyToId() + "\n" + text;
    if (input.clientRequestId() != null) {
      db.queryForList(
          "SELECT pg_advisory_xact_lock(hashtextextended(?,0))",
          user + ":comment:" + input.clientRequestId());
      var existing =
          db.queryForList(
              "SELECT id,request_hash,deleted_at,status,root_id FROM comments WHERE user_id=? AND client_request_id=?",
              user,
              input.clientRequestId());
      if (!existing.isEmpty()) {
        var saved = existing.getFirst();
        if (!"VISIBLE".equals(saved.get("status"))
            || (saved.get("root_id") != null
                && !Boolean.TRUE.equals(
                    db.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM comments WHERE id=? AND status='VISIBLE')",
                        Boolean.class,
                        saved.get("root_id")))))
          throw of(NOT_FOUND, "COMMENT_NOT_FOUND", "Bình luận không còn cho phép xem.");
        if (!digest(hash).equals(saved.get("request_hash")) || saved.get("deleted_at") != null)
          throw of(CONFLICT, "REQUEST_REUSED", "Mã gửi đã dùng cho bình luận khác.");
        return db.query(COMMENT_SELECT + "WHERE c.id=?", this::comment, saved.get("id")).getFirst();
      }
    }
    UUID rootId = null;
    if (input.replyToId() != null) {
      var targets =
          db.queryForList(
              "SELECT id,root_id FROM comments WHERE id=? AND post_id=? AND status='VISIBLE' AND deleted_at IS NULL FOR UPDATE",
              input.replyToId(),
              postId);
      if (targets.isEmpty())
        throw of(
            NOT_FOUND,
            "COMMENT_NOT_FOUND",
            "Bình luận không thuộc bài này hoặc không còn cho phép trả lời.");
      var target = targets.getFirst();
      rootId =
          target.get("root_id") == null ? (UUID) target.get("id") : (UUID) target.get("root_id");
      var root =
          db.queryForList(
              "SELECT id FROM comments WHERE id=? AND post_id=? AND root_id IS NULL AND status='VISIBLE' AND deleted_at IS NULL",
              rootId,
              postId);
      if (root.isEmpty()) throw of(NOT_FOUND, "COMMENT_NOT_FOUND", "Luồng bình luận đã đóng.");
    }
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO comments(id,post_id,user_id,body,status,root_id,reply_to_id,client_request_id,request_hash) VALUES (?,?,?,?,'VISIBLE',?,?,?,?)",
        id,
        postId,
        user,
        text,
        rootId,
        input.replyToId(),
        input.clientRequestId(),
        digest(hash));
    return db.query(COMMENT_SELECT + "WHERE c.id=?", this::comment, id).getFirst();
  }

  private static String digest(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception error) {
      throw new IllegalStateException(error);
    }
  }

  private Map<String, Object> lockComment(UUID postId, UUID commentId, UUID user) {
    lockPost(postId);
    visiblePost(postId);
    var row =
        db
            .queryForList(
                "SELECT * FROM comments WHERE id=? AND post_id=? AND deleted_at IS NULL AND status='VISIBLE' FOR UPDATE",
                commentId,
                postId)
            .stream()
            .findFirst()
            .orElseThrow(() -> of(NOT_FOUND, "COMMENT_NOT_FOUND", "Không tìm thấy bình luận."));
    owner(row, user);
    return row;
  }

  @Transactional
  public Comment editComment(UUID user, UUID postId, UUID id, Edit input) {
    var row = lockComment(postId, id, user);
    expected(row, input.version());
    db.update(
        "UPDATE comments SET body=?,updated_at=now(),version=version+1 WHERE id=?",
        body(input.body(), 2000),
        id);
    return db.query(COMMENT_SELECT + "WHERE c.id=?", this::comment, id).getFirst();
  }

  @Transactional
  public void deleteComment(UUID user, UUID postId, UUID id) {
    lockComment(postId, id, user);
    db.update(
        "UPDATE comments SET deleted_at=now(),updated_at=now(),version=version+1 WHERE id=?", id);
  }

  @Override
  @Transactional
  public void hide(UUID postId, UUID actorId, long expectedVersion) {
    Objects.requireNonNull(actorId);
    var row = moderationPost(postId);
    expected(row, expectedVersion);
    if ("HIDDEN".equals(row.get("status"))) throw of(CONFLICT, "ALREADY_HIDDEN", "Bài đã bị ẩn.");
    db.update(
        "UPDATE posts SET status_before_hidden=status,status='HIDDEN',version=version+1,updated_at=now() WHERE id=?",
        postId);
  }

  @Override
  @Transactional
  public void restore(UUID postId, UUID actorId, long expectedVersion) {
    Objects.requireNonNull(actorId);
    var row = moderationPost(postId);
    expected(row, expectedVersion);
    if (!"HIDDEN".equals(row.get("status"))
        || !("PENDING".equals(row.get("status_before_hidden"))
            || "VISIBLE".equals(row.get("status_before_hidden"))))
      throw of(CONFLICT, "NOT_HIDDEN", "Bài không có trạng thái ẩn có thể khôi phục.");
    db.update(
        "UPDATE posts SET status=status_before_hidden,status_before_hidden=NULL,version=version+1,updated_at=now() WHERE id=?",
        postId);
  }
}
