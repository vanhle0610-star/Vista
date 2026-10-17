package com.vista.common.audit;

import java.util.UUID;

/**
 * Public Service Interface owned by TV2 (Registered User / Trip Owner). Consumed by all modules
 * (TV1 - TV5) to record audit logs for critical security, trip modification, financial, and
 * moderation events.
 */
public interface AuditLogService {

  void logAction(
      UUID userId, String action, String resourceType, String resourceId, String details);
}
