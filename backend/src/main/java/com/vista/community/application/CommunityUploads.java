package com.vista.community.application;

import static com.vista.community.application.CommunityProblem.of;
import static org.springframework.http.HttpStatus.*;

import com.vista.community.api.CommunityModels.Upload;
import com.vista.community.infrastructure.CommunityLimits;
import com.vista.community.infrastructure.CommunityStorage;
import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CommunityUploads {
  private final JdbcTemplate db;
  private final CommunityStorage storage;
  private final TransactionTemplate tx;
  private final CommunityLimits limits;

  public CommunityUploads(
      JdbcTemplate db,
      CommunityStorage storage,
      PlatformTransactionManager manager,
      CommunityLimits limits) {
    this.db = db;
    this.storage = storage;
    this.tx = new TransactionTemplate(manager);
    this.limits = limits;
  }

  public record Image(byte[] bytes, String mime) {}

  public static Image validate(MultipartFile file) {
    return validate(file, 5242880);
  }

  private static Image validate(MultipartFile file, long maxBytes) {
    if (file == null || file.isEmpty())
      throw of(BAD_REQUEST, "EMPTY_IMAGE", "Hãy chọn ảnh JPEG hoặc PNG.");
    if (file.getSize() > maxBytes)
      throw of(
          PAYLOAD_TOO_LARGE, "IMAGE_TOO_LARGE", "Ảnh vượt giới hạn " + (maxBytes / 1024) + " KiB.");
    try {
      byte[] bytes = file.getBytes();
      String mime = null;
      if (bytes.length > 8
          && (bytes[0] & 255) == 255
          && (bytes[1] & 255) == 216
          && (bytes[2] & 255) == 255) mime = "image/jpeg";
      if (bytes.length > 8
          && bytes[0] == (byte) 137
          && bytes[1] == 80
          && bytes[2] == 78
          && bytes[3] == 71
          && bytes[4] == 13
          && bytes[5] == 10
          && bytes[6] == 26
          && bytes[7] == 10) mime = "image/png";
      if (mime == null || !mime.equals(file.getContentType()))
        throw of(UNSUPPORTED_MEDIA_TYPE, "INVALID_IMAGE", "Chỉ nhận file JPEG/PNG đúng định dạng.");
      try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
        var readers = ImageIO.getImageReaders(input);
        if (!readers.hasNext()) throw new IllegalArgumentException();
        var reader = readers.next();
        try {
          reader.setInput(input);
          int width = reader.getWidth(0), height = reader.getHeight(0);
          if (width <= 0 || height <= 0 || (long) width * height > 25000000)
            throw new IllegalArgumentException();
          if (reader.read(0) == null) throw new IllegalArgumentException();
        } finally {
          reader.dispose();
        }
      }
      return new Image(bytes, mime);
    } catch (org.springframework.web.ErrorResponseException ex) {
      throw ex;
    } catch (Exception ex) {
      throw of(
          UNSUPPORTED_MEDIA_TYPE,
          "INVALID_IMAGE",
          "Ảnh bị lỗi hoặc vượt 25 triệu điểm ảnh. Hãy chọn ảnh khác.");
    }
  }

  public Upload upload(UUID user, MultipartFile file) {
    Image image = validate(file, limits.maxPhotoBytes());
    storage.requireConfigured();
    UUID id = UUID.randomUUID();
    Instant expires = Instant.now().plusSeconds(limits.uploadTtlHours() * 3600L);
    String path =
        "community/" + user + "/" + id + (image.mime().equals("image/png") ? ".png" : ".jpg");
    tx.executeWithoutResult(
        status -> {
          db.queryForList(
              "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", "uploads:" + user);
          long count =
              db.queryForObject(
                  "SELECT count(*) FROM community_uploads WHERE user_id=? AND status IN ('RESERVED','UPLOADED','DELETE_PENDING')",
                  Long.class,
                  user);
          if (count >= limits.maxPendingUploads())
            throw of(
                TOO_MANY_REQUESTS,
                "TOO_MANY_UPLOADS",
                "Bạn có nhiều ảnh chưa dùng. Hãy bỏ ảnh cũ hoặc thử lại sau.");
          db.update(
              "INSERT INTO community_uploads(id,user_id,storage_path,mime_type,size_bytes,status,expires_at) VALUES (?,?,?,?,?,'RESERVED',?)",
              id,
              user,
              path,
              image.mime(),
              image.bytes().length,
              java.sql.Timestamp.from(expires));
        });
    try {
      storage.upload(path, image.mime(), image.bytes());
      db.update(
          "UPDATE community_uploads SET status='UPLOADED' WHERE id=? AND status='RESERVED'", id);
      return new Upload(id, expires);
    } catch (RuntimeException ex) {
      db.update("UPDATE community_uploads SET status='DELETE_PENDING' WHERE id=?", id);
      throw ex;
    }
  }

  public void cancel(UUID user, UUID id) {
    tx.executeWithoutResult(
        status -> {
          var rows = db.queryForList("SELECT * FROM community_uploads WHERE id=? FOR UPDATE", id);
          if (rows.isEmpty()) throw of(NOT_FOUND, "UPLOAD_NOT_FOUND", "Không tìm thấy ảnh.");
          var row = rows.getFirst();
          if (!user.equals(row.get("user_id")))
            throw of(FORBIDDEN, "NOT_OWNER", "Bạn chỉ được bỏ ảnh của mình.");
          if ("ATTACHED".equals(row.get("status")))
            throw of(CONFLICT, "IMAGE_IN_USE", "Ảnh đã gắn với bài đăng.");
          db.update("UPDATE community_uploads SET status='DELETE_PENDING' WHERE id=?", id);
        });
  }

  public Image read(UUID id) {
    var rows =
        db.queryForList(
            "SELECT m.storage_path,m.media_type FROM post_media m JOIN posts p ON p.id=m.post_id WHERE m.id=? AND p.status='VISIBLE' AND p.deleted_at IS NULL",
            id);
    if (rows.isEmpty()) throw of(NOT_FOUND, "IMAGE_NOT_FOUND", "Không tìm thấy ảnh công khai.");
    var row = rows.getFirst();
    return new Image(
        storage.read((String) row.get("storage_path")), (String) row.get("media_type"));
  }

  @Scheduled(fixedDelayString = "${vista.community.cleanup-delay-ms:60000}")
  public void cleanup() {
    // Lock ledger rows across instances, including the remote delete; claims cannot race cleanup.
    tx.executeWithoutResult(
        status -> {
          var rows =
              db.queryForList(
                  "SELECT id,storage_path FROM community_uploads WHERE status='DELETE_PENDING' OR (status IN ('RESERVED','UPLOADED') AND expires_at<now()) ORDER BY expires_at LIMIT 4 FOR UPDATE SKIP LOCKED");
          for (var row : rows) {
            try {
              storage.delete((String) row.get("storage_path"));
              db.update("DELETE FROM post_media WHERE id=?", row.get("id"));
              db.update("DELETE FROM community_uploads WHERE id=?", row.get("id"));
            } catch (RuntimeException ex) {
              db.update(
                  "UPDATE community_uploads SET status='DELETE_PENDING' WHERE id=?", row.get("id"));
            }
          }
        });
  }
}
