package com.vista.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Thực thể lưu in-app notifications — ánh xạ bảng {@code notifications} trong DB.
 *
 * <p>Cột {@code payload_json} được lưu dạng TEXT (JSON serialized) để tránh phụ thuộc vào
 * dialect cụ thể trong test/dev profile.
 */
@Entity
@Table(name = "notifications")
public class NotificationEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  /** Phân loại thông báo, ví dụ: INVITATION_RECEIVED, TRIP_UPDATED, VOTE_CAST ... */
  @Column(name = "type", nullable = false, length = 50)
  private String type;

  /** Payload JSON thô — serialize từ Map<String,Object> khi lưu. */
  @Column(name = "payload_json", nullable = false, columnDefinition = "jsonb")
  private String payloadJson = "{}";

  @Column(name = "read_at")
  private Instant readAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected NotificationEntity() {}

  public NotificationEntity(UUID userId, String type, String payloadJson) {
    this.id = UUID.randomUUID();
    this.userId = userId;
    this.type = type;
    this.payloadJson = payloadJson != null ? payloadJson : "{}";
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) {
      this.id = UUID.randomUUID();
    }
    if (this.createdAt == null) {
      this.createdAt = Instant.now();
    }
  }

  /** Đánh dấu đã đọc. */
  public void markRead() {
    this.readAt = Instant.now();
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  public UUID getId() { return id; }
  public UUID getUserId() { return userId; }
  public String getType() { return type; }
  public String getPayloadJson() { return payloadJson; }
  public Instant getReadAt() { return readAt; }
  public Instant getCreatedAt() { return createdAt; }

  public boolean isRead() { return readAt != null; }
}
