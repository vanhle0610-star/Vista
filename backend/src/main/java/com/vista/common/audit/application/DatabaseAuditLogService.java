package com.vista.common.audit.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import com.vista.common.audit.AuditLogService;
import com.vista.common.audit.domain.AuditLogEntity;
import com.vista.common.audit.infrastructure.AuditLogRepository;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Primary
public class DatabaseAuditLogService implements AuditLogService {

  private static final Logger log = LoggerFactory.getLogger(DatabaseAuditLogService.class);

  private static final Set<String> SENSITIVE_KEYWORDS =
      Set.of(
          "password",
          "password_hash",
          "passwordhash",
          "token",
          "accesstoken",
          "access_token",
          "refreshtoken",
          "refresh_token",
          "secret",
          "authorization",
          "credit_card",
          "creditcard",
          "key",
          "jwt",
          "bearer");

  // Regex fallback: key=value or key: value (Header style like Authorization: Bearer <token>)
  private static final Pattern URL_KEY_VALUE_PATTERN =
      Pattern.compile(
          "(?i)(password|password_hash|passwordhash|access_token|accesstoken|refresh_token|refreshtoken|token|secret|authorization|credit_card|creditcard|key|jwt|bearer)(=|:\\s*)(?:Bearer\\s+)?([^&\\s,;]+)");

  // JSON-like key: value
  private static final Pattern JSON_KEY_VALUE_PATTERN =
      Pattern.compile(
          "(?i)\"(password|password_hash|passwordhash|access_token|accesstoken|refresh_token|refreshtoken|token|secret|authorization|credit_card|creditcard|key|jwt|bearer)\"\\s*:\\s*(?:\"[^\"]*\"|'[^']*'|[^&\\s,;}\\]]+)");

  private static final Pattern BEARER_PATTERN =
      Pattern.compile("(?i)Bearer\\s+([A-Za-z0-9._~+/-]+=*)");

  private final AuditLogRepository auditLogRepository;
  private final ObjectMapper objectMapper;

  @org.springframework.beans.factory.annotation.Autowired
  public DatabaseAuditLogService(AuditLogRepository auditLogRepository) {
    this(auditLogRepository, new ObjectMapper());
  }

  public DatabaseAuditLogService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
    this.auditLogRepository = auditLogRepository;
    this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
  }

  @Override
  @Transactional
  public void logAction(
      UUID userId, String action, String resourceType, String resourceId, String details) {
    try {
      UUID entityUuid = null;
      if (resourceId != null) {
        try {
          entityUuid = UUID.fromString(resourceId);
        } catch (IllegalArgumentException ignored) {
          // Keep null if resourceId is not a UUID
        }
      }

      String sanitizedDetails = sanitize(details);
      Map<String, Object> metaMap = new HashMap<>();
      metaMap.put("details", sanitizedDetails);
      if (entityUuid == null && resourceId != null) {
        metaMap.put("rawResourceId", resourceId);
      }
      String metadataJson = objectMapper.writeValueAsString(metaMap);

      AuditLogEntity entity =
          new AuditLogEntity(userId, action, resourceType, entityUuid, metadataJson);
      auditLogRepository.save(entity);

      log.debug(
          "AuditLog recorded: actorId={}, action={}, resourceType={}, resourceId={}",
          userId,
          action,
          resourceType,
          resourceId);
    } catch (Exception ex) {
      log.error(
          "Failed to persist audit log (action={}, resource={}): {}",
          action,
          resourceType,
          ex.getMessage());
      // Non-blocking: Do not fail caller transaction
    }
  }

  public String sanitize(String input) {
    if (input == null) {
      return "";
    }
    String trimmed = input.trim();
    if (trimmed.isEmpty()) {
      return "";
    }

    // Check if input might be JSON
    if ((trimmed.startsWith("{") && trimmed.endsWith("}"))
        || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        JsonNode root = objectMapper.readTree(trimmed);
        sanitizeJsonNode(root);
        return objectMapper.writeValueAsString(root);
      } catch (JsonProcessingException ignored) {
        // Fallback to regex sanitization if JSON is malformed
      }
    }

    return sanitizeRegex(input);
  }

  private void sanitizeJsonNode(JsonNode node) {
    if (node.isObject()) {
      ObjectNode objectNode = (ObjectNode) node;
      Iterator<Map.Entry<String, JsonNode>> fields = objectNode.fields();
      while (fields.hasNext()) {
        Map.Entry<String, JsonNode> entry = fields.next();
        String fieldName = entry.getKey();
        JsonNode childNode = entry.getValue();

        if (isSensitiveKey(fieldName)) {
          // Redact completely regardless of value type (string, number, boolean, object, etc.)
          entry.setValue(new TextNode("[REDACTED]"));
        } else {
          sanitizeJsonNode(childNode);
        }
      }
    } else if (node.isArray()) {
      ArrayNode arrayNode = (ArrayNode) node;
      for (JsonNode element : arrayNode) {
        sanitizeJsonNode(element);
      }
    }
  }

  private boolean isSensitiveKey(String key) {
    if (key == null) {
      return false;
    }
    String normalized = key.toLowerCase().replace("-", "").replace("_", "");
    for (String sensitive : SENSITIVE_KEYWORDS) {
      String normSensitive = sensitive.replace("_", "");
      if (normalized.equals(normSensitive)) {
        return true;
      }
    }
    return false;
  }

  private String sanitizeRegex(String input) {
    String sanitized = input;
    // Replace URL-style key=value or Header-style Key: value
    sanitized = URL_KEY_VALUE_PATTERN.matcher(sanitized).replaceAll("$1$2[REDACTED]");
    // Replace JSON-style "key": "value"
    sanitized = JSON_KEY_VALUE_PATTERN.matcher(sanitized).replaceAll("\"$1\":\"[REDACTED]\"");
    // Replace standalone Bearer tokens if any remains
    sanitized = BEARER_PATTERN.matcher(sanitized).replaceAll("Bearer [REDACTED]");
    return sanitized;
  }
}
