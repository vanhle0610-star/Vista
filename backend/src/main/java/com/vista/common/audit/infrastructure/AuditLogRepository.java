package com.vista.common.audit.infrastructure;

import com.vista.common.audit.domain.AuditLogEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntity, UUID> {

  List<AuditLogEntity> findByActorIdOrderByCreatedAtDesc(UUID actorId);

  List<AuditLogEntity> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
      String entityType, UUID entityId);
}
