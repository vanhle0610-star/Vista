package com.vista.notification.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.notification.domain.NotificationEntity;
import com.vista.notification.domain.NotificationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications", description = "Đọc và đánh dấu đã đọc thông báo in-app")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

  private final NotificationRepository notificationRepository;
  private final CurrentUserProvider currentUserProvider;

  public NotificationController(
      NotificationRepository notificationRepository, CurrentUserProvider currentUserProvider) {
    this.notificationRepository = notificationRepository;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping
  @Operation(summary = "Lấy danh sách thông báo của người dùng hiện tại (mặc định 20 gần nhất)")
  @Transactional(readOnly = true)
  public ResponseEntity<List<NotificationResponse>> getNotifications(
      @RequestParam(defaultValue = "false") boolean unreadOnly,
      @RequestParam(defaultValue = "20") int size) {
    UUID userId = currentUserProvider.getCurrentUserId();
    int safeSize = Math.min(size, 100);
    List<NotificationEntity> entities =
        unreadOnly
            ? notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(
                userId, PageRequest.of(0, safeSize))
            : notificationRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(0, safeSize));

    return ResponseEntity.ok(entities.stream().map(NotificationResponse::from).toList());
  }

  @GetMapping("/unread-count")
  @Operation(summary = "Số lượng thông báo chưa đọc — dùng để hiển thị badge")
  @Transactional(readOnly = true)
  public ResponseEntity<UnreadCountResponse> getUnreadCount() {
    UUID userId = currentUserProvider.getCurrentUserId();
    long count = notificationRepository.countByUserIdAndReadAtIsNull(userId);
    return ResponseEntity.ok(new UnreadCountResponse(count));
  }

  @PatchMapping("/{id}/read")
  @Operation(summary = "Đánh dấu một thông báo đã đọc")
  @Transactional
  public ResponseEntity<NotificationResponse> markRead(@PathVariable UUID id) {
    UUID userId = currentUserProvider.getCurrentUserId();
    NotificationEntity notification =
        notificationRepository
            .findById(id)
            .filter(n -> n.getUserId().equals(userId))
            .orElseThrow(
                () ->
                    new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy thông báo"));
    notification.markRead();
    return ResponseEntity.ok(NotificationResponse.from(notificationRepository.save(notification)));
  }

  @PatchMapping("/read-all")
  @Operation(summary = "Đánh dấu tất cả thông báo đã đọc")
  @Transactional
  public ResponseEntity<Void> markAllRead() {
    UUID userId = currentUserProvider.getCurrentUserId();
    notificationRepository.markAllReadForUser(userId);
    return ResponseEntity.noContent().build();
  }

  // ── Nested response records ────────────────────────────────────────────────

  public record NotificationResponse(
      UUID id,
      UUID userId,
      String type,
      String payloadJson,
      boolean read,
      Instant readAt,
      Instant createdAt) {
    public static NotificationResponse from(NotificationEntity n) {
      return new NotificationResponse(
          n.getId(),
          n.getUserId(),
          n.getType(),
          n.getPayloadJson(),
          n.isRead(),
          n.getReadAt(),
          n.getCreatedAt());
    }
  }

  public record UnreadCountResponse(long count) {}
}
