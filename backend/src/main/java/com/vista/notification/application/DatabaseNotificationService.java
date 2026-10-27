package com.vista.notification.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.notification.domain.DeviceTokenEntity;
import com.vista.notification.domain.DeviceTokenRepository;
import com.vista.notification.domain.NotificationEntity;
import com.vista.notification.domain.NotificationRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Triển khai NotificationService lưu thực vào DB (bảng {@code notifications}).
 * Hỗ trợ lưu thông báo in-app và dispatch push notifications tới các thiết bị đã đăng ký.
 */
@Service("realNotificationService")
@Primary
@Transactional
public class DatabaseNotificationService implements NotificationService {

  private static final Logger log = LoggerFactory.getLogger(DatabaseNotificationService.class);

  private final NotificationRepository notificationRepository;
  private final JdbcClient jdbcClient;
  private final ObjectMapper objectMapper;
  private final DeviceTokenRepository deviceTokenRepository;

  @Autowired
  public DatabaseNotificationService(
      NotificationRepository notificationRepository,
      JdbcClient jdbcClient,
      ObjectMapper objectMapper,
      @Autowired(required = false) DeviceTokenRepository deviceTokenRepository) {
    this.notificationRepository = notificationRepository;
    this.jdbcClient = jdbcClient;
    this.objectMapper = objectMapper;
    this.deviceTokenRepository = deviceTokenRepository;
  }

  public DatabaseNotificationService(
      NotificationRepository notificationRepository,
      JdbcClient jdbcClient,
      ObjectMapper objectMapper) {
    this(notificationRepository, jdbcClient, objectMapper, null);
  }

  @Override
  public void sendInAppNotification(
      UUID recipientUserId, String title, String body, String type, Map<String, Object> data) {
    if (recipientUserId == null || type == null || type.isBlank()) {
      log.warn("sendInAppNotification: recipientUserId hoặc type bị null — bỏ qua");
      return;
    }

    String payloadJson =
        toJson(
            Map.of(
                "title", title != null ? title : "",
                "body", body != null ? body : "",
                "data", data != null ? data : Map.of()));

    NotificationEntity notification = new NotificationEntity(recipientUserId, type, payloadJson);
    notificationRepository.save(notification);

    dispatchPushNotification(recipientUserId, title, body, type);
    log.debug("Đã lưu thông báo: type={}, recipientUserId={}", type, recipientUserId);
  }

  @Override
  public void notifyTripMembers(
      UUID tripId, String title, String body, String type, UUID excludeUserId) {
    if (tripId == null) {
      log.warn("notifyTripMembers: tripId null — bỏ qua");
      return;
    }

    // Lấy danh sách thành viên đang hoạt động từ DB
    List<UUID> memberIds =
        jdbcClient
            .sql(
                "SELECT user_id FROM trip_members"
                    + " WHERE trip_id = :tripId AND status != 'REMOVED'")
            .param("tripId", tripId)
            .query(UUID.class)
            .list();

    // Thêm owner nếu chưa có trong trip_members
    List<UUID> ownerList =
        jdbcClient
            .sql("SELECT owner_id FROM trips WHERE id = :tripId")
            .param("tripId", tripId)
            .query(UUID.class)
            .list();

    // Gộp, loại trùng và loại excludeUserId
    List<UUID> recipients =
        java.util.stream.Stream.concat(memberIds.stream(), ownerList.stream())
            .distinct()
            .filter(uid -> !uid.equals(excludeUserId))
            .toList();

    String payloadJson =
        toJson(
            Map.of(
                "title", title != null ? title : "",
                "body", body != null ? body : "",
                "tripId", tripId.toString()));

    for (UUID recipientId : recipients) {
      NotificationEntity notification = new NotificationEntity(recipientId, type, payloadJson);
      notificationRepository.save(notification);
      dispatchPushNotification(recipientId, title, body, type);
    }

    log.info(
        "Đã gửi thông báo '{}' tới {} thành viên của trip {}", type, recipients.size(), tripId);
  }

  // ── Push dispatch helper (W6-TV3-04) ───────────────────────────────────────

  private void dispatchPushNotification(UUID userId, String title, String body, String type) {
    if (deviceTokenRepository == null || userId == null) return;
    try {
      List<DeviceTokenEntity> tokens = deviceTokenRepository.findByUserIdAndActiveTrue(userId);
      for (DeviceTokenEntity token : tokens) {
        // TODO: Tích hợp với Firebase Admin SDK / APNs Gateway để gửi thông báo đẩy từ xa tới mobile/web client.
        log.info(
            "[PUSH-DISPATCH] Gửi push tới thiết bị {} ({}) user {}: type={}, title='{}', body='{}'",
            token.getToken(),
            token.getPlatform(),
            userId,
            type,
            title,
            body);
      }
    } catch (Exception e) {
      log.warn("Không thể dispatch push notification cho user {}: {}", userId, e.getMessage());
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private String toJson(Map<String, Object> data) {
    try {
      return objectMapper.writeValueAsString(data);
    } catch (JsonProcessingException e) {
      log.error("Không thể serialize payload notification", e);
      return "{}";
    }
  }
}
