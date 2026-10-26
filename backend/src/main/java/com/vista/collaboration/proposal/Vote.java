package com.vista.collaboration.proposal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

/**
 * Phiếu bầu cho một destination proposal. Bảng: {@code destination_votes} (theo baseline schema).
 * unique(proposal_id, user_id) — mỗi thành viên chỉ bầu 1 lần / proposal.
 */
@Entity
@Table(
    name = "destination_votes",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"proposal_id", "user_id"})})
public class Vote {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "proposal_id", nullable = false)
  private Proposal proposal;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  /** Giá trị phiếu: UP (+1) hoặc DOWN (-1). */
  @Column(name = "vote", nullable = false, length = 20)
  private String vote;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Vote() {}

  public Vote(Proposal proposal, UUID userId, String vote) {
    this.id = UUID.randomUUID();
    this.proposal = proposal;
    this.userId = userId;
    this.vote = vote;
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) this.id = UUID.randomUUID();
    var now = Instant.now();
    if (this.createdAt == null) this.createdAt = now;
    this.updatedAt = now;
  }

  // ── Getters / Setters ──────────────────────────────────────────────────────

  public UUID getId() {
    return id;
  }

  public Proposal getProposal() {
    return proposal;
  }

  public void setProposal(Proposal proposal) {
    this.proposal = proposal;
  }

  public UUID getUserId() {
    return userId;
  }

  public void setUserId(UUID userId) {
    this.userId = userId;
  }

  public String getVote() {
    return vote;
  }

  public void setVote(String vote) {
    this.vote = vote;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
