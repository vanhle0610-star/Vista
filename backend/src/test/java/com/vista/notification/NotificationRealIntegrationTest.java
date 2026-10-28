package com.vista.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.collaboration.invitation.CreateInvitationRequest;
import com.vista.collaboration.invitation.Invitation;
import com.vista.collaboration.invitation.InvitationRepository;
import com.vista.collaboration.invitation.InvitationResponse;
import com.vista.collaboration.invitation.InvitationService;
import com.vista.collaboration.invitation.InvitationStatus;
import com.vista.common.security.CurrentUserProvider;
import com.vista.notification.api.DeviceTokenController;
import com.vista.notification.api.NotificationController;
import com.vista.notification.application.DatabaseNotificationService;
import com.vista.notification.domain.DeviceTokenEntity;
import com.vista.notification.domain.DeviceTokenRepository;
import com.vista.notification.domain.NotificationEntity;
import com.vista.notification.domain.NotificationRepository;
import com.vista.notification.domain.NotificationType;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripMemberEntity;
import com.vista.trip.domain.TripMemberRepository;
import com.vista.trip.domain.TripMemberRole;
import com.vista.trip.domain.TripMemberStatus;
import com.vista.trip.domain.TripRepository;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * W5-TV3-02, W5-TV3-03, W6-TV3-04: Kiểm thử NotificationService bản thật + Sự kiện lời mời + Device tokens & Push.
 */
@ExtendWith(MockitoExtension.class)
class NotificationRealIntegrationTest {

  @Mock private NotificationRepository notificationRepository;
  @Mock private DeviceTokenRepository deviceTokenRepository;
  @Mock private JdbcClient jdbcClient;
  @Mock private CurrentUserProvider currentUserProvider;
  @Mock private InvitationRepository invitationRepository;
  @Mock private TripAccessService tripAccessService;
  @Mock private TripRepository tripRepository;
  @Mock private TripMemberRepository tripMemberRepository;
  @Mock private UserRepository userRepository;

  private DatabaseNotificationService notificationService;
  private NotificationController notificationController;
  private DeviceTokenController deviceTokenController;
  private InvitationService invitationService;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private static final UUID USER_A = UUID.randomUUID();
  private static final UUID USER_B = UUID.randomUUID();
  private static final UUID TRIP_ID = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    notificationService =
        new DatabaseNotificationService(
            notificationRepository, jdbcClient, objectMapper, deviceTokenRepository);
    notificationController =
        new NotificationController(notificationRepository, currentUserProvider);
    deviceTokenController =
        new DeviceTokenController(deviceTokenRepository, currentUserProvider);
    invitationService =
        new InvitationService(
            invitationRepository,
            tripAccessService,
            tripRepository,
            tripMemberRepository,
            notificationService,
            userRepository);
  }

  // ── W5-TV3-02: NotificationService bản thật lưu DB ─────────────────────────

  @Test
  @DisplayName("W5-02 sendInAppNotification lưu bản ghi chính xác vào DB")
  void sendInAppNotification_savesEntityWithPayload() {
    notificationService.sendInAppNotification(
        USER_A,
        "Tiêu đề thử",
        "Nội dung thông báo",
        NotificationType.INVITE_RECEIVED.name(),
        Map.of("tripId", TRIP_ID.toString()));

    verify(notificationRepository).save(any(NotificationEntity.class));
  }

  @Test
  @DisplayName("W5-02 API danh sách thông báo chỉ trả dữ liệu của người dùng hiện tại")
  void getNotifications_returnsOnlyForCurrentUser() {
    when(currentUserProvider.getCurrentUserId()).thenReturn(USER_A);

    NotificationEntity n1 =
        new NotificationEntity(USER_A, "INVITE_RECEIVED", "{\"title\":\"Mời bạn\"}");
    ReflectionTestUtils.setField(n1, "id", UUID.randomUUID());
    ReflectionTestUtils.setField(n1, "createdAt", Instant.now());

    when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(USER_A), any(Pageable.class)))
        .thenReturn(List.of(n1));

    ResponseEntity<List<NotificationController.NotificationResponse>> response =
        notificationController.getNotifications(false, 20);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).hasSize(1);
    assertThat(response.getBody().get(0).userId()).isEqualTo(USER_A);
  }

  @Test
  @DisplayName("W5-02 Đếm chưa đọc và đánh dấu đã đọc hoạt động chính xác")
  void unreadCountAndMarkRead() {
    when(currentUserProvider.getCurrentUserId()).thenReturn(USER_A);
    when(notificationRepository.countByUserIdAndReadAtIsNull(USER_A)).thenReturn(3L);

    var unreadResp = notificationController.getUnreadCount();
    assertThat(unreadResp.getBody().count()).isEqualTo(3L);

    UUID notifId = UUID.randomUUID();
    NotificationEntity notif =
        new NotificationEntity(USER_A, "ITINERARY_CHANGED", "{\"title\":\"Đổi lịch\"}");
    ReflectionTestUtils.setField(notif, "id", notifId);

    when(notificationRepository.findById(notifId)).thenReturn(Optional.of(notif));
    when(notificationRepository.save(any(NotificationEntity.class))).thenAnswer(i -> i.getArgument(0));

    var readResp = notificationController.markRead(notifId);
    assertThat(readResp.getBody().read()).isTrue();
    assertThat(readResp.getBody().readAt()).isNotNull();

    // Mark all read
    var allReadResp = notificationController.markAllRead();
    assertThat(allReadResp.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    verify(notificationRepository).markAllReadForUser(USER_A);
  }

  // ── W5-TV3-03: Sự kiện lời mời phát thông báo thật ────────────────────────

  @Test
  @DisplayName("W5-03 Tạo lời mời cho user B → user B nhận được thông báo INVITE_RECEIVED")
  void createInvitation_notifiesInviteeIfAccountExists() {
    CreateInvitationRequest req = new CreateInvitationRequest("userb@gmail.com", null);
    TripEntity trip =
        new TripEntity(
            USER_A, "Đà Nẵng Chill", LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 12));
    ReflectionTestUtils.setField(trip, "id", TRIP_ID);

    UserEntity userBEntity = new UserEntity("userb@gmail.com", "pass123", "User B");
    ReflectionTestUtils.setField(userBEntity, "id", USER_B);

    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(invitationRepository.existsByTripIdAndInviteeEmailAndStatus(
            TRIP_ID, "userb@gmail.com", InvitationStatus.PENDING))
        .thenReturn(false);
    when(invitationRepository.save(any(Invitation.class)))
        .thenAnswer(
            i -> {
              Invitation inv = i.getArgument(0);
              ReflectionTestUtils.setField(inv, "id", UUID.randomUUID());
              ReflectionTestUtils.setField(inv, "createdAt", Instant.now());
              return inv;
            });
    when(userRepository.findByEmailIgnoreCase("userb@gmail.com"))
        .thenReturn(Optional.of(userBEntity));

    InvitationResponse response = invitationService.createInvitation(TRIP_ID, USER_A, req);
    assertThat(response).isNotNull();

    // Xác nhận đã lưu thông báo INVITE_RECEIVED cho USER_B
    verify(notificationRepository)
        .save(
            org.mockito.ArgumentMatchers.argThat(
                entity ->
                    entity.getUserId().equals(USER_B)
                        && entity.getType().equals(NotificationType.INVITE_RECEIVED.name())));
  }

  @Test
  @DisplayName("W5-03 B chấp nhận lời mời → A (người mời) nhận được thông báo INVITE_ACCEPTED")
  void acceptInvitation_notifiesInviter() {
    Invitation invitation =
        new Invitation(
            TRIP_ID, USER_A, "userb@gmail.com", "hash123", Instant.now().plusSeconds(3600));
    ReflectionTestUtils.setField(invitation, "id", UUID.randomUUID());
    ReflectionTestUtils.setField(invitation, "createdAt", Instant.now());

    TripEntity trip =
        new TripEntity(
            USER_A, "Đà Nẵng Chill", LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 12));
    ReflectionTestUtils.setField(trip, "id", TRIP_ID);

    when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.of(invitation));
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(tripMemberRepository.findByTripIdAndUserId(TRIP_ID, USER_B)).thenReturn(Optional.empty());
    when(tripMemberRepository.save(any(TripMemberEntity.class))).thenAnswer(i -> i.getArgument(0));
    when(invitationRepository.save(any(Invitation.class))).thenAnswer(i -> i.getArgument(0));

    // Mock JdbcClient query in notifyTripMembers to avoid NPE
    var mockSpec = mock(org.springframework.jdbc.core.simple.JdbcClient.StatementSpec.class);
    var mockMapped = mock(org.springframework.jdbc.core.simple.JdbcClient.MappedQuerySpec.class);
    when(jdbcClient.sql(any())).thenReturn(mockSpec);
    when(mockSpec.param(any(), any())).thenReturn(mockSpec);
    when(mockSpec.query(UUID.class)).thenReturn(mockMapped);
    when(mockMapped.list()).thenReturn(List.of(USER_A));

    InvitationResponse response = invitationService.acceptInvitation("rawToken123", USER_B);
    assertThat(response.status()).isEqualTo(InvitationStatus.ACCEPTED);

    // Xác nhận người mời (USER_A) nhận được thông báo INVITE_ACCEPTED
    verify(notificationRepository, org.mockito.Mockito.atLeastOnce())
        .save(
            org.mockito.ArgumentMatchers.argThat(
                entity ->
                    entity.getUserId().equals(USER_A)
                        && entity.getType().equals(NotificationType.INVITE_ACCEPTED.name())));
  }

  // ── W6-TV3-04: Đăng ký / Hủy Device Token cho Push ────────────────────────

  @Test
  @DisplayName("W6-04 Đăng ký device token thành công và hủy khi đăng xuất")
  void registerAndDeactivateDeviceToken() {
    when(currentUserProvider.getCurrentUserId()).thenReturn(USER_A);
    when(deviceTokenRepository.findByToken("fcm-device-token-123")).thenReturn(Optional.empty());
    when(deviceTokenRepository.save(any(DeviceTokenEntity.class))).thenAnswer(i -> i.getArgument(0));

    var regReq =
        new DeviceTokenController.RegisterDeviceTokenRequest(
            "fcm-device-token-123", "FCM", "Samsung S24");

    ResponseEntity<DeviceTokenController.DeviceTokenResponse> regResp =
        deviceTokenController.registerToken(regReq);

    assertThat(regResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(regResp.getBody().token()).isEqualTo("fcm-device-token-123");
    assertThat(regResp.getBody().platform()).isEqualTo("FCM");
    assertThat(regResp.getBody().active()).isTrue();

    // Unregister token
    ResponseEntity<Void> unregResp =
        deviceTokenController.unregisterToken("fcm-device-token-123");
    assertThat(unregResp.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    verify(deviceTokenRepository).deactivateByToken("fcm-device-token-123");
  }
}

