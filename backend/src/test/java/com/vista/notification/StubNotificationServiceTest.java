package com.vista.notification;

import static org.assertj.core.api.Assertions.assertThatCode;

import com.vista.notification.application.NotificationService;
import com.vista.notification.application.StubNotificationService;
import com.vista.notification.domain.NotificationType;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * W1-TV3-05: Test stub NotificationService và enum NotificationType.
 */
class StubNotificationServiceTest {

  private final NotificationService notificationService = new StubNotificationService();

  @Test
  @DisplayName("W1-TV3-05: StubNotificationService ghi log không ném lỗi khi gửi thông báo")
  void sendNotification_success() {
    UUID userId = UUID.randomUUID();
    UUID tripId = UUID.randomUUID();

    assertThatCode(
            () ->
                notificationService.sendInAppNotification(
                    userId,
                    "Lời mời mới",
                    "Bạn được mời tham gia chuyến đi",
                    NotificationType.INVITE_RECEIVED.name(),
                    Map.of("tripId", tripId.toString())))
        .doesNotThrowAnyException();

    assertThatCode(
            () ->
                notificationService.notifyTripMembers(
                    tripId,
                    "Thay đổi lịch trình",
                    "Thành viên vừa cập nhật điểm dừng",
                    NotificationType.ITINERARY_CHANGED.name(),
                    userId))
        .doesNotThrowAnyException();
  }
}

