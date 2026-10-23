package com.vista.common.audit.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "audit_logs")
public class AuditLogEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "actor_id")
  private UUID actorId;

  @Column(name = "action", nullable = false, length = 80)
  private String action;

  @Column(name = "entity_type", nullable = false, length = 80)
  private String entityType;

  @Column(name = "entity_id")
  private UUID entityId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "metadata_json", nullable = false, columnDefinition = "jsonb")
  private String metadataJson = "{}";

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected AuditLogEntity() {}

  public AuditLogEntity(
      UUID actorId, String action, String entityType, UUID entityId, String metadataJson) {
    this.id = UUID.randomUUID();
    this.actorId = actorId;
    this.action = action;
    this.entityType = entityType;
    this.entityId = entityId;
    this.metadataJson = metadataJson != null ? metadataJson : "{}";
    this.createdAt = Instant.now();
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

  public UUID getId() {
    return id;
  }

  public UUID getActorId() {
    return actorId;
  }

  public String getAction() {
    return action;
  }

  public String getEntityType() {
    return entityType;
  }

  public UUID getEntityId() {
    return entityId;
  }

  public String getMetadataJson() {
    return metadataJson;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
