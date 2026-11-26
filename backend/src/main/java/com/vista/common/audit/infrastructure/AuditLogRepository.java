package com.vista.common.audit.infrastructure;

import com.vista.common.audit.domain.AuditLogEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntity, UUID> {

  List<AuditLogEntity> findByActorIdOrderByCreatedAtDesc(UUID actorId);

  List<AuditLogEntity> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
      String entityType, UUID entityId);

  Page<AuditLogEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

  Page<AuditLogEntity> findByEntityTypeIgnoreCaseOrderByCreatedAtDesc(
      String entityType, Pageable pageable);

  Page<AuditLogEntity> findByActionContainingIgnoreCaseOrderByCreatedAtDesc(
      String action, Pageable pageable);
}
