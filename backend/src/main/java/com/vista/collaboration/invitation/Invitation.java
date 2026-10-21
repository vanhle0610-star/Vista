package com.vista.collaboration.invitation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Lời mời tham gia chuyến đi qua link/token.
 * Bảng: {@code trip_invitations} (tên chính thức trong baseline schema).
 */
@Entity
@Table(name = "trip_invitations")
public class Invitation {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "trip_id", nullable = false)
  private UUID tripId;

  @Column(name = "invited_by", nullable = false)
  private UUID invitedBy;

  @Column(name = "invited_email", nullable = false, length = 320)
  private String inviteeEmail;

  /**
   * Hash của token — tránh lộ raw token trong DB.
   * Collaboration service lưu SHA-256 hex của raw token vào đây.
   */
  @Column(name = "token_hash", nullable = false, unique = true, length = 255)
  private String tokenHash;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 20)
  private InvitationStatus status = InvitationStatus.PENDING;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected Invitation() {}

  public Invitation(UUID tripId, UUID invitedBy, String inviteeEmail, String tokenHash, Instant expiresAt) {
    this.id = UUID.randomUUID();
    this.tripId = tripId;
    this.invitedBy = invitedBy;
    this.inviteeEmail = inviteeEmail;
    this.tokenHash = tokenHash;
    this.expiresAt = expiresAt;
    this.status = InvitationStatus.PENDING;
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) this.id = UUID.randomUUID();
    if (this.createdAt == null) this.createdAt = Instant.now();
    if (this.status == null) this.status = InvitationStatus.PENDING;
  }

  // ── Getters / Setters ──────────────────────────────────────────────────────

  public UUID getId() { return id; }

  public UUID getTripId() { return tripId; }
  public void setTripId(UUID tripId) { this.tripId = tripId; }

  public UUID getInvitedBy() { return invitedBy; }

  public String getInviteeEmail() { return inviteeEmail; }
  public void setInviteeEmail(String inviteeEmail) { this.inviteeEmail = inviteeEmail; }

  public String getTokenHash() { return tokenHash; }

  public InvitationStatus getStatus() { return status; }
  public void setStatus(InvitationStatus status) { this.status = status; }

  public Instant getExpiresAt() { return expiresAt; }
  public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

  public Instant getCreatedAt() { return createdAt; }
}
