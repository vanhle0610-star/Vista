package com.vista.common.audit.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.audit.infrastructure.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class DatabaseAuditLogServiceSanitiseTest {

  private DatabaseAuditLogService service;

  @BeforeEach
  void setUp() {
    AuditLogRepository repo = Mockito.mock(AuditLogRepository.class);
    service = new DatabaseAuditLogService(repo, new ObjectMapper());
  }

  @Test
  @DisplayName("sanitize null and empty")
  void sanitize_nullAndEmpty() {
    assertThat(service.sanitize(null)).isEqualTo("");
    assertThat(service.sanitize("")).isEqualTo("");
    assertThat(service.sanitize("   ")).isEqualTo("");
  }

  @Test
  @DisplayName("sanitize flat JSON with various casing")
  void sanitize_flatJson() {
    String json = "{\"password\":\"secret123\",\"accessToken\":\"tok-abc\",\"REFRESH_TOKEN\":\"ref-xyz\"}";
    String sanitized = service.sanitize(json);

    assertThat(sanitized).doesNotContain("secret123");
    assertThat(sanitized).doesNotContain("tok-abc");
    assertThat(sanitized).doesNotContain("ref-xyz");
    assertThat(sanitized).contains("\"password\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"accessToken\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"REFRESH_TOKEN\":\"[REDACTED]\"");
  }

  @Test
  @DisplayName("sanitize nested JSON object and arrays")
  void sanitize_nestedJsonAndArrays() {
    String json = """
        {
          "user": {
            "email": "test@example.com",
            "passwordHash": "$2a$12$securehash123",
            "metadata": {
              "jwt": "eyJhbGciOi...",
              "bearer": "token123",
              "creditCard": 4111222233334444
            }
          },
          "items": [
            {"id": 1, "secret": "shhh"},
            {"id": 2, "normalField": "publicVal"}
          ]
        }
        """;
    String sanitized = service.sanitize(json);

    assertThat(sanitized).doesNotContain("$2a$12$securehash123");
    assertThat(sanitized).doesNotContain("eyJhbGciOi...");
    assertThat(sanitized).doesNotContain("token123");
    assertThat(sanitized).doesNotContain("4111222233334444");
    assertThat(sanitized).doesNotContain("shhh");

    assertThat(sanitized).contains("test@example.com");
    assertThat(sanitized).contains("publicVal");
    assertThat(sanitized).contains("\"passwordHash\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"secret\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"creditCard\":\"[REDACTED]\"");
  }

  @Test
  @DisplayName("sanitize plain text and URL encoded key=value")
  void sanitize_plainTextAndUrlEncoded() {
    String input = "user=john&password=secret123&access_token=tok123&authorization=Bearer my-fake-jwt-token";
    String sanitized = service.sanitize(input);

    assertThat(sanitized).doesNotContain("secret123");
    assertThat(sanitized).doesNotContain("tok123");
    assertThat(sanitized).doesNotContain("my-fake-jwt-token");
    assertThat(sanitized).contains("password=[REDACTED]");
    assertThat(sanitized).contains("access_token=[REDACTED]");
    assertThat(sanitized).contains("authorization=[REDACTED]");
  }

  @Test
  @DisplayName("sanitize malformed JSON falls back gracefully without throwing")
  void sanitize_malformedJson() {
    String malformed = "{\"password\": \"secret123\", \"token\": \"abc";
    String sanitized = service.sanitize(malformed);

    assertThat(sanitized).doesNotContain("secret123");
    assertThat(sanitized).doesNotContain("abc");
    assertThat(sanitized).contains("\"password\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"token\":\"[REDACTED]\"");
  }

  @Test
  @DisplayName("sanitize Header style Authorization: Bearer fake-token")
  void sanitize_headerStyleAuthorization() {
    String header = "Authorization: Bearer super-secret-token-xyz";
    String sanitized = service.sanitize(header);

    assertThat(sanitized).doesNotContain("super-secret-token-xyz");
    assertThat(sanitized).contains("Authorization: [REDACTED]");
  }

  @Test
  @DisplayName("sanitize JSON with string, number, boolean, and null sensitive fields")
  void sanitize_jsonTypes() {
    String json = """
        {
          "password": "plain-password",
          "creditCard": 1234567890123456,
          "secret": true,
          "token": null,
          "normalField": 42
        }
        """;
    String sanitized = service.sanitize(json);

    assertThat(sanitized).doesNotContain("plain-password");
    assertThat(sanitized).doesNotContain("1234567890123456");
    assertThat(sanitized).contains("\"password\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"creditCard\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"secret\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"token\":\"[REDACTED]\"");
    assertThat(sanitized).contains("\"normalField\":42");
  }
}

