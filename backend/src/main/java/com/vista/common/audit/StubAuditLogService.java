package com.vista.common.audit;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

/**
 * Stub implementation of AuditLogService provided by TV2 during Week 1. Allows TV1-TV5 to write
 * audit logs without waiting for TV2's database table and persistence logic in Week 4.
 */
@Service
@ConditionalOnMissingBean(name = "realAuditLogService")
public class StubAuditLogService implements AuditLogService {

  private static final Logger log = LoggerFactory.getLogger(StubAuditLogService.class);

  @Override
  public void logAction(
      UUID userId, String action, String resourceType, String resourceId, String details) {
    log.info(
        "AUDIT_LOG: userId={}, action='{}', resourceType='{}', resourceId='{}', details='{}'",
        userId,
        action,
        resourceType,
        resourceId,
        details);
  }
}
