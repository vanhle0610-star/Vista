package com.vista.admin.api;

import com.vista.common.audit.domain.AuditLogEntity;
import com.vista.common.audit.infrastructure.AuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@Tag(
    name = "Admin Audit Logs",
    description = "Tra cứu nhật ký thao tác quản trị (W6-TV1-03 - Chỉ dành riêng cho ADMIN)")
@SecurityRequirement(name = "bearerAuth")
public class AdminAuditLogController {

  private final AuditLogRepository auditLogRepository;

  public AdminAuditLogController(AuditLogRepository auditLogRepository) {
    this.auditLogRepository = auditLogRepository;
  }

  public record AuditLogItemDto(
      UUID id,
      UUID actorId,
      String action,
      String entityType,
      UUID entityId,
      String metadataJson,
      Instant createdAt) {
    public static AuditLogItemDto fromEntity(AuditLogEntity entity) {
      return new AuditLogItemDto(
          entity.getId(),
          entity.getActorId(),
          entity.getAction(),
          entity.getEntityType(),
          entity.getEntityId(),
          entity.getMetadataJson(),
          entity.getCreatedAt());
    }
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  @Operation(
      summary = "Xem danh sách nhật ký quản trị (Audit Logs - Chỉ ROLE_ADMIN)",
      description =
          "Trả về danh sách nhật ký thao tác quản trị có phân trang. MODERATOR và USER bị từ chối (403 Forbidden).")
  public ResponseEntity<Map<String, Object>> listAuditLogs(
      @RequestParam(required = false) String entityType,
      @RequestParam(required = false) String action,
      @RequestParam(required = false) UUID actorId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {

    int validPage = Math.max(0, page);
    int validSize = Math.min(100, Math.max(1, size));
    Pageable pageable = PageRequest.of(validPage, validSize);

    if (actorId != null) {
      List<AuditLogItemDto> allByActor =
          auditLogRepository.findByActorIdOrderByCreatedAtDesc(actorId).stream()
              .map(AuditLogItemDto::fromEntity)
              .toList();
      int fromIndex = Math.min(validPage * validSize, allByActor.size());
      int toIndex = Math.min(fromIndex + validSize, allByActor.size());
      List<AuditLogItemDto> pagedItems = allByActor.subList(fromIndex, toIndex);
      int totalPages = (int) Math.ceil((double) allByActor.size() / validSize);
      Map<String, Object> body = new LinkedHashMap<>();
      body.put("items", pagedItems);
      body.put("page", validPage);
      body.put("size", validSize);
      body.put("total", (long) allByActor.size());
      body.put("totalPages", Math.max(1, totalPages));
      return ResponseEntity.ok(body);
    }

    Page<AuditLogEntity> pageResult;
    if (entityType != null && !entityType.isBlank()) {
      pageResult =
          auditLogRepository.findByEntityTypeIgnoreCaseOrderByCreatedAtDesc(
              entityType.trim(), pageable);
    } else if (action != null && !action.isBlank()) {
      pageResult =
          auditLogRepository.findByActionContainingIgnoreCaseOrderByCreatedAtDesc(
              action.trim(), pageable);
    } else {
      pageResult = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    List<AuditLogItemDto> items =
        pageResult.getContent().stream().map(AuditLogItemDto::fromEntity).toList();

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("items", items);
    response.put("page", pageResult.getNumber());
    response.put("size", pageResult.getSize());
    response.put("total", pageResult.getTotalElements());
    response.put("totalPages", Math.max(1, pageResult.getTotalPages()));
    return ResponseEntity.ok(response);
  }
}
