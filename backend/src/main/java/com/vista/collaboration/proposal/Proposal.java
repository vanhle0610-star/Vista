package com.vista.collaboration.proposal;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Đề xuất điểm đến trong chuyến đi để thành viên bỏ phiếu. Bảng: {@code destination_proposals}
 * (theo baseline schema).
 */
@Entity
@Table(name = "destination_proposals")
public class Proposal {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "trip_id", nullable = false)
  private UUID tripId;

  /** FK đến destinations — null nếu đề xuất tự nhập. */
  @Column(name = "destination_id")
  private UUID destinationId;

  @Column(name = "proposed_by", nullable = false)
  private UUID proposedBy;

  @Column(name = "title", length = 200)
  private String title;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 20)
  private ProposalStatus status = ProposalStatus.OPEN;

  @Column(name = "closes_at")
  private Instant closesAt;

  @OneToMany(mappedBy = "proposal", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<Vote> votes = new ArrayList<>();

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected Proposal() {}

  public Proposal(UUID tripId, UUID proposedBy, UUID destinationId, String title) {
    this.id = UUID.randomUUID();
    this.tripId = tripId;
    this.proposedBy = proposedBy;
    this.destinationId = destinationId;
    this.title = title;
    this.status = ProposalStatus.OPEN;
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) this.id = UUID.randomUUID();
    if (this.createdAt == null) this.createdAt = Instant.now();
    if (this.status == null) this.status = ProposalStatus.OPEN;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  public void addVote(Vote vote) {
    votes.add(vote);
    vote.setProposal(this);
  }

  public void removeVote(Vote vote) {
    votes.remove(vote);
    vote.setProposal(null);
  }

  // ── Getters / Setters ──────────────────────────────────────────────────────

  public UUID getId() {
    return id;
  }

  public UUID getTripId() {
    return tripId;
  }

  public UUID getDestinationId() {
    return destinationId;
  }

  public void setDestinationId(UUID destinationId) {
    this.destinationId = destinationId;
  }

  public UUID getProposedBy() {
    return proposedBy;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public ProposalStatus getStatus() {
    return status;
  }

  public void setStatus(ProposalStatus status) {
    this.status = status;
  }

  public Instant getClosesAt() {
    return closesAt;
  }

  public void setClosesAt(Instant closesAt) {
    this.closesAt = closesAt;
  }

  public List<Vote> getVotes() {
    return votes;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
