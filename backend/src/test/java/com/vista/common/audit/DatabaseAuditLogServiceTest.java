package com.vista.common.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.audit.application.DatabaseAuditLogService;
import com.vista.common.audit.domain.AuditLogEntity;
import com.vista.common.audit.infrastructure.AuditLogRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class DatabaseAuditLogServiceTest {

  private AuditLogRepository auditLogRepository;
  private DatabaseAuditLogService auditLogService;

  @BeforeEach
  void setUp() {
    auditLogRepository = mock(AuditLogRepository.class);
    auditLogService = new DatabaseAuditLogService(auditLogRepository, new ObjectMapper());
  }

  @Test
  @DisplayName("logAction persists AuditLogEntity successfully")
  void logAction_persistsEntity() {
    UUID userId = UUID.randomUUID();
    UUID tripId = UUID.randomUUID();

    auditLogService.logAction(
        userId, "TRIP_CREATED", "TRIP", tripId.toString(), "Tạo chuyến đi mới");

    ArgumentCaptor<AuditLogEntity> captor = ArgumentCaptor.forClass(AuditLogEntity.class);
    verify(auditLogRepository).save(captor.capture());

    AuditLogEntity entity = captor.getValue();
    assertThat(entity.getActorId()).isEqualTo(userId);
    assertThat(entity.getAction()).isEqualTo("TRIP_CREATED");
    assertThat(entity.getEntityType()).isEqualTo("TRIP");
    assertThat(entity.getEntityId()).isEqualTo(tripId);
    assertThat(entity.getMetadataJson()).contains("Tạo chuyến đi mới");
  }

  @Test
  @DisplayName("sanitize sanitizes sensitive keywords including snake_case and JSON formats")
  void sanitize_redactsSensitiveData() {
    String input =
        "user=john password=secret123 access_token=tok123 refresh_token=ref456 password_hash=$2a$12$xyz";
    String sanitized = auditLogService.sanitize(input);

    assertThat(sanitized).doesNotContain("secret123");
    assertThat(sanitized).doesNotContain("tok123");
    assertThat(sanitized).doesNotContain("ref456");
    assertThat(sanitized).doesNotContain("$2a$12$xyz");
    assertThat(sanitized).contains("password=[REDACTED]");
    assertThat(sanitized).contains("access_token=[REDACTED]");
    assertThat(sanitized).contains("refresh_token=[REDACTED]");
    assertThat(sanitized).contains("password_hash=[REDACTED]");

    String jsonInput = "{\"access_token\": \"jwt-val-123\", \"password_hash\": \"hash-secret\"}";
    String sanitizedJson = auditLogService.sanitize(jsonInput);
    assertThat(sanitizedJson).doesNotContain("jwt-val-123");
    assertThat(sanitizedJson).doesNotContain("hash-secret");
    assertThat(sanitizedJson).contains("\"access_token\":\"[REDACTED]\"");
    assertThat(sanitizedJson).contains("\"password_hash\":\"[REDACTED]\"");
  }

  @Test
  @DisplayName("logAction does not throw exception when repository saveAndFlush fails")
  void logAction_whenRepositoryFails_doesNotThrow() {
    UUID userId = UUID.randomUUID();
    doThrow(new RuntimeException("DB Connection Timeout")).when(auditLogRepository).save(any());

    // Should not throw exception
    auditLogService.logAction(userId, "USER_LOGIN", "USER", userId.toString(), "Đăng nhập");
  }
}
