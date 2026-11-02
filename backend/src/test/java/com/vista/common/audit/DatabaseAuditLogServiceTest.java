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
        "user=john password=secret123 access_token=tok123 refresh_token=ref456"
            + " password_hash=$2a$12$xyz";
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
  @DisplayName(
      "sanitize redacts apiKey, geminiApiKey, and credentials in both JSON and URL formats")
  void sanitize_redactsApiKeysAndCredentials() {
    String json =
        """
        {
          "apiKey": "AIzaSySecretApiKey123",
          "api_key": "AIzaSySnakeCase456",
          "geminiApiKey": "AIzaSyGeminiModelKey789",
          "credential": "admin-credential-pass",
          "credentials": "user-credentials-blob",
          "clientSecret": "oauth-client-secret-xyz"
        }
        """;
    String sanitized = auditLogService.sanitize(json);

    assertThat(sanitized).doesNotContain("AIzaSySecretApiKey123");
    assertThat(sanitized).doesNotContain("AIzaSySnakeCase456");
    assertThat(sanitized).doesNotContain("AIzaSyGeminiModelKey789");
    assertThat(sanitized).doesNotContain("admin-credential-pass");
    assertThat(sanitized).doesNotContain("user-credentials-blob");
    assertThat(sanitized).doesNotContain("oauth-client-secret-xyz");

    assertThat(sanitized).contains("\"apiKey\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"api_key\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"geminiApiKey\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"credential\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"credentials\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"clientSecret\":\"[REDACTED]\"");
  }

  @Test
  @DisplayName(
      "sanitize redacts x-api-key, client-secret, secret-key, and private-key across JSON and"
          + " Header formats")
  void sanitize_redactsExtendedSensitiveHeadersAndKeys() {
    String json =
        """
        {
          "x-api-key": "x-api-key-secret-999",
          "x_api_key": "x_api_key_secret_888",
          "X-Api-Key": "X-Api-Key-Secret-777",
          "client-secret": "client-secret-value-123",
          "secret-key": "secret-key-value-456",
          "private-key": "private-key-pem-789"
        }
        """;
    String sanitized = auditLogService.sanitize(json);

    assertThat(sanitized).doesNotContain("x-api-key-secret-999");
    assertThat(sanitized).doesNotContain("x_api_key_secret_888");
    assertThat(sanitized).doesNotContain("X-Api-Key-Secret-777");
    assertThat(sanitized).doesNotContain("client-secret-value-123");
    assertThat(sanitized).doesNotContain("secret-key-value-456");
    assertThat(sanitized).doesNotContain("private-key-pem-789");

    assertThat(sanitized).contains("\"x-api-key\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"x_api_key\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"X-Api-Key\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"client-secret\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"secret-key\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"private-key\":\"[REDACTED]\"");

    // URL & Header styles
    String headerAndUrlInput =
        "Headers: X-Api-Key: my-header-key, client-secret: my-secret-val, Query:"
            + " x-api-key=my-query-key&private-key=my-pk";
    String sanitizedHeader = auditLogService.sanitize(headerAndUrlInput);
    assertThat(sanitizedHeader).doesNotContain("my-header-key");
    assertThat(sanitizedHeader).doesNotContain("my-secret-val");
    assertThat(sanitizedHeader).doesNotContain("my-query-key");
    assertThat(sanitizedHeader).doesNotContain("my-pk");
    assertThat(sanitizedHeader).contains("X-Api-Key: [REDACTED]");
    assertThat(sanitizedHeader).contains("client-secret: [REDACTED]");
    assertThat(sanitizedHeader).contains("x-api-key=[REDACTED]");
    assertThat(sanitizedHeader).contains("private-key=[REDACTED]");
  }

  @Test
  @DisplayName("sanitize does not over-redact generic business fields named 'key'")
  void sanitize_preservesGenericKeyField() {
    String json =
        """
        {"key": "sort_direction", "value": "asc", "itemKey": "ITEM_99"}
        """;
    String sanitized = auditLogService.sanitize(json);

    assertThat(sanitized).contains("\"key\":\"sort_direction\"");
    assertThat(sanitized).contains("\"value\":\"asc\"");
    assertThat(sanitized).contains("\"itemKey\":\"ITEM_99\"");
    assertThat(sanitized).doesNotContain("[REDACTED]");
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
