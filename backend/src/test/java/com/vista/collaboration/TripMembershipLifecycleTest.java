package com.vista.collaboration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.invitation.Invitation;
import com.vista.collaboration.invitation.InvitationRepository;
import com.vista.collaboration.invitation.InvitationResponse;
import com.vista.collaboration.invitation.InvitationService;
import com.vista.collaboration.invitation.InvitationStatus;
import com.vista.notification.application.NotificationService;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.application.TripService;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripMemberEntity;
import com.vista.trip.domain.TripMemberRepository;
import com.vista.trip.domain.TripMemberRole;
import com.vista.trip.domain.TripMemberStatus;
import com.vista.trip.domain.TripRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * W6-TV3-01, W6-TV3-02, W6-TV3-03: Kiểm thử toàn diện trải nghiệm thành viên, rời nhóm, và vòng đời lời mời.
 */
@ExtendWith(MockitoExtension.class)
class TripMembershipLifecycleTest {

  @Mock private TripRepository tripRepository;
  @Mock private TripMemberRepository tripMemberRepository;
  @Mock private TripAccessService tripAccessService;
  @Mock private InvitationRepository invitationRepository;
  @Mock private NotificationService notificationService;

  private TripService tripService;
  private InvitationService invitationService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID OWNER_ID = UUID.randomUUID();
  private static final UUID MEMBER_ID = UUID.randomUUID();

  private TripEntity trip;

  @BeforeEach
  void setUp() {
    tripService =
        new TripService(
            tripRepository, tripMemberRepository, tripAccessService);
    invitationService =
        new InvitationService(
            invitationRepository,
            tripAccessService,
            tripRepository,
            tripMemberRepository,
            notificationService,
            null);

    trip =
        new TripEntity(
            OWNER_ID, "Đà Nẵng Hội An", LocalDate.of(2026, 11, 20), LocalDate.of(2026, 11, 25));
    ReflectionTestUtils.setField(trip, "id", TRIP_ID);
  }

  // ── W6-TV3-02: Rời nhóm (Leave Trip) ───────────────────────────────────────

  @Test
  @DisplayName("W6-02 MEMBER rời nhóm → cập nhật REMOVED, mất quyền truy cập")
  void memberLeaveTrip_setsStatusRemoved() {
    TripMemberEntity memberEntity = new TripMemberEntity(trip, MEMBER_ID, TripMemberRole.EDITOR);
    ReflectionTestUtils.setField(memberEntity, "status", TripMemberStatus.ACTIVE);

    when(tripAccessService.isOwner(TRIP_ID, MEMBER_ID)).thenReturn(false);
    when(tripMemberRepository.findByTripIdAndUserId(TRIP_ID, MEMBER_ID))
        .thenReturn(Optional.of(memberEntity));

    tripService.leaveTrip(TRIP_ID, MEMBER_ID);

    assertThat(memberEntity.getStatus()).isEqualTo(TripMemberStatus.REMOVED);
    verify(tripMemberRepository).save(memberEntity);
  }

  @Test
  @DisplayName("W6-02 OWNER rời nhóm khi chưa chuyển chủ → chặn với mã lỗi 409 CONFLICT")
  void ownerLeaveTrip_withoutTransfer_throwsConflict() {
    when(tripAccessService.isOwner(TRIP_ID, OWNER_ID)).thenReturn(true);

    assertThatThrownBy(() -> tripService.leaveTrip(TRIP_ID, OWNER_ID))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(
            ex -> {
              ResponseStatusException rse = (ResponseStatusException) ex;
              assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
              assertThat(rse.getReason()).contains("Vui lòng chuyển quyền trước");
            });
  }

  // ── W6-TV3-03: Vòng đời Lời mời (EXPIRED / REVOKED) ────────────────────────

  @Test
  @DisplayName("W6-03 Lời mời đã hết hạn → accept bị từ chối với mã 409 và trạng thái thành EXPIRED")
  void acceptInvitation_expired_throwsConflictAndUpdatesStatus() {
    // Lời mời hết hạn từ 1 tiếng trước
    Instant expiredTime = Instant.now().minus(1, ChronoUnit.HOURS);
    Invitation invitation =
        new Invitation(TRIP_ID, OWNER_ID, "test@example.com", "hash_expired", expiredTime);
    ReflectionTestUtils.setField(invitation, "id", UUID.randomUUID());
    ReflectionTestUtils.setField(invitation, "status", InvitationStatus.PENDING);

    when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.of(invitation));

    assertThatThrownBy(() -> invitationService.acceptInvitation("raw_token_expired", MEMBER_ID))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("đã hết hạn");

    assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.EXPIRED);
    verify(invitationRepository).save(invitation);
  }

  @Test
  @DisplayName("W6-03 Lời mời đã bị thu hồi (REVOKED) → accept bị từ chối với mã 409")
  void acceptInvitation_revoked_throwsConflict() {
    Invitation invitation =
        new Invitation(
            TRIP_ID,
            OWNER_ID,
            "test@example.com",
            "hash_revoked",
            Instant.now().plus(5, ChronoUnit.DAYS));
    ReflectionTestUtils.setField(invitation, "id", UUID.randomUUID());
    ReflectionTestUtils.setField(invitation, "status", InvitationStatus.REVOKED);

    when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.of(invitation));

    assertThatThrownBy(() -> invitationService.acceptInvitation("raw_token_revoked", MEMBER_ID))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("đã bị thu hồi");
  }

  @Test
  @DisplayName("W6-01 & W6-03 Danh sách lời mời tự động cập nhật trạng thái EXPIRED khi đã quá hạn")
  void listInvitations_autoUpdatesExpiredStatus() {
    Instant pastTime = Instant.now().minus(2, ChronoUnit.DAYS);
    Invitation invExpired =
        new Invitation(TRIP_ID, OWNER_ID, "expired@example.com", "hash1", pastTime);
    ReflectionTestUtils.setField(invExpired, "status", InvitationStatus.PENDING);

    Instant futureTime = Instant.now().plus(2, ChronoUnit.DAYS);
    Invitation invActive =
        new Invitation(TRIP_ID, OWNER_ID, "active@example.com", "hash2", futureTime);
    ReflectionTestUtils.setField(invActive, "status", InvitationStatus.PENDING);

    when(invitationRepository.findByTripIdOrderByCreatedAtDesc(TRIP_ID))
        .thenReturn(List.of(invExpired, invActive));

    List<InvitationResponse> list = invitationService.listInvitations(TRIP_ID, MEMBER_ID);

    assertThat(list).hasSize(2);
    assertThat(invExpired.getStatus()).isEqualTo(InvitationStatus.EXPIRED);
    assertThat(invActive.getStatus()).isEqualTo(InvitationStatus.PENDING);
    verify(invitationRepository).save(invExpired);
  }
}

