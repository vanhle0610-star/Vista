package com.vista.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Thực thể lưu push-notification device tokens (FCM / APNs). Ánh xạ bảng {@code device_tokens}. */
@Entity
@Table(name = "device_tokens")
public class DeviceTokenEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  /** Token FCM hoặc APNs — unique toàn bảng. */
  @Column(name = "token", nullable = false, unique = true, columnDefinition = "TEXT")
  private String token;

  /** Nền tảng thiết bị: FCM (Android/Web) hoặc APNS (iOS). */
  @Column(name = "platform", nullable = false, length = 10)
  private String platform;

  @Column(name = "device_name", length = 200)
  private String deviceName;

  @Column(name = "is_active", nullable = false)
  private boolean active = true;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected DeviceTokenEntity() {}

  public DeviceTokenEntity(UUID userId, String token, String platform) {
    this.id = UUID.randomUUID();
    this.userId = userId;
    this.token = token;
    this.platform = platform;
    this.active = true;
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) this.id = UUID.randomUUID();
    var now = Instant.now();
    if (this.createdAt == null) this.createdAt = now;
    this.updatedAt = now;
  }

  @PreUpdate
  protected void onUpdate() {
    this.updatedAt = Instant.now();
  }

  // ── Getters / Setters ──────────────────────────────────────────────────────

  public UUID getId() {
    return id;
  }

  public UUID getUserId() {
    return userId;
  }

  public void setUserId(UUID userId) {
    this.userId = userId;
  }

  public String getToken() {
    return token;
  }

  public void setToken(String token) {
    this.token = token;
  }

  public String getPlatform() {
    return platform;
  }

  public void setPlatform(String platform) {
    this.platform = platform;
  }

  public String getDeviceName() {
    return deviceName;
  }

  public void setDeviceName(String deviceName) {
    this.deviceName = deviceName;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
