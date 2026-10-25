package com.vista.collaboration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.collaboration.invitation.Invitation;
import com.vista.collaboration.invitation.InvitationRepository;
import com.vista.collaboration.invitation.InvitationResponse;
import com.vista.collaboration.invitation.InvitationService;
import com.vista.collaboration.invitation.InvitationStatus;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.domain.TripMemberRepository;
import com.vista.trip.domain.TripRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {

  @Mock private InvitationRepository invitationRepository;
  @Mock private TripAccessService tripAccessService;
  @Mock private TripRepository tripRepository;
  @Mock private TripMemberRepository tripMemberRepository;

  @InjectMocks private InvitationService invitationService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID INVITER_ID = UUID.randomUUID();
  private static final UUID INVITEE_ID = UUID.randomUUID();
  private static final String RAW_TOKEN = "testrawtoken12345";
  private static final String TOKEN_HASH = InvitationService.sha256Hex(RAW_TOKEN);

  @BeforeEach
  void setUp() {
    // Inject base URL vì @Value không chạy trong unit test
    ReflectionTestUtils.setField(invitationService, "appBaseUrl", "http://localhost:3000");
  }

  /** Tạo Invitation mẫu với token hash đã biết */
  private Invitation makeInvitation(InvitationStatus status, Instant expiresAt) {
    Invitation inv = new Invitation(TRIP_ID, INVITER_ID, "user@vista.vn", TOKEN_HASH, expiresAt);
    // Dùng reflection để set status vì constructor luôn set PENDING
    ReflectionTestUtils.setField(inv, "status", status);
    return inv;
  }

  // ── W3-TV3-01: Accept với token hết hạn ──────────────────────────────────

  @Test
  @DisplayName("W3-01 accept - token hết hạn → ConflictException + status chuyển EXPIRED")
  void accept_expiredToken_throwsConflict() {
    Instant pastExpiry = Instant.now().minusSeconds(3600); // hết hạn 1 giờ trước
    Invitation inv = makeInvitation(InvitationStatus.PENDING, pastExpiry);

    when(invitationRepository.findByTokenHash(TOKEN_HASH)).thenReturn(Optional.of(inv));
    when(invitationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    assertThatThrownBy(() -> invitationService.acceptInvitation(RAW_TOKEN, INVITEE_ID))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("hết hạn");

    assertThat(inv.getStatus()).isEqualTo(InvitationStatus.EXPIRED);
  }

  // ── W3-TV3-01: Accept với token đã REVOKED ───────────────────────────────

  @Test
  @DisplayName("W3-01 accept - token REVOKED → ConflictException, không thêm member")
  void accept_revokedToken_throwsConflict() {
    Invitation inv = makeInvitation(InvitationStatus.REVOKED, Instant.now().plusSeconds(86400));

    when(invitationRepository.findByTokenHash(TOKEN_HASH)).thenReturn(Optional.of(inv));

    assertThatThrownBy(() -> invitationService.acceptInvitation(RAW_TOKEN, INVITEE_ID))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("REVOKED");

    // Không thêm member vào trip
    verify(tripMemberRepository, never()).save(any());
  }

  // ── W3-TV3-01: Dùng lại token đã ACCEPTED ────────────────────────────────

  @Test
  @DisplayName("W3-01 accept - token đã ACCEPTED → ConflictException")
  void accept_alreadyAccepted_throwsConflict() {
    Invitation inv = makeInvitation(InvitationStatus.ACCEPTED, Instant.now().plusSeconds(86400));

    when(invitationRepository.findByTokenHash(TOKEN_HASH)).thenReturn(Optional.of(inv));

    assertThatThrownBy(() -> invitationService.acceptInvitation(RAW_TOKEN, INVITEE_ID))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("ACCEPTED");
  }

  // ── W3-TV3-02: Token không tồn tại → 404 ────────────────────────────────

  @Test
  @DisplayName("W3-02 accept - token không tồn tại → ResourceNotFoundException")
  void accept_unknownToken_throwsNotFound() {
    when(invitationRepository.findByTokenHash(TOKEN_HASH)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> invitationService.acceptInvitation(RAW_TOKEN, INVITEE_ID))
        .isInstanceOf(ResourceNotFoundException.class)
        .hasMessageContaining("Token");
  }

  // ── W3-TV3-02: Accept hợp lệ → status ACCEPTED ───────────────────────────

  @Test
  @DisplayName("W3-02 accept - hợp lệ → trạng thái ACCEPTED, thêm vào trip_members")
  void accept_valid_setsAcceptedAndAddsMember() {
    Invitation inv = makeInvitation(InvitationStatus.PENDING, Instant.now().plusSeconds(86400));
    com.vista.trip.domain.TripEntity mockTrip =
        new com.vista.trip.domain.TripEntity(
            INVITER_ID,
            "Test trip",
            java.time.LocalDate.now(),
            java.time.LocalDate.now().plusDays(3));
    ReflectionTestUtils.setField(mockTrip, "id", TRIP_ID);

    when(invitationRepository.findByTokenHash(TOKEN_HASH)).thenReturn(Optional.of(inv));
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(mockTrip));
    when(tripMemberRepository.findByTripIdAndUserId(TRIP_ID, INVITEE_ID))
        .thenReturn(Optional.empty());
    when(tripMemberRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    when(invitationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    InvitationResponse result = invitationService.acceptInvitation(RAW_TOKEN, INVITEE_ID);

    assertThat(result.status()).isEqualTo(InvitationStatus.ACCEPTED);
    verify(tripMemberRepository).save(any());
  }

  // ── W3-TV3-02: Decline hợp lệ ────────────────────────────────────────────

  @Test
  @DisplayName("W3-02 decline - hợp lệ → trạng thái DECLINED")
  void decline_valid_setsDeclined() {
    Invitation inv = makeInvitation(InvitationStatus.PENDING, Instant.now().plusSeconds(86400));

    when(invitationRepository.findByTokenHash(TOKEN_HASH)).thenReturn(Optional.of(inv));
    when(invitationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    InvitationResponse result = invitationService.declineInvitation(RAW_TOKEN, INVITEE_ID);

    assertThat(result.status()).isEqualTo(InvitationStatus.DECLINED);
  }

  // ── W3-TV3-02: Decline khi không PENDING ─────────────────────────────────

  @Test
  @DisplayName("W3-02 decline - token không PENDING → ConflictException")
  void decline_notPending_throwsConflict() {
    Invitation inv = makeInvitation(InvitationStatus.ACCEPTED, Instant.now().plusSeconds(86400));

    when(invitationRepository.findByTokenHash(TOKEN_HASH)).thenReturn(Optional.of(inv));

    assertThatThrownBy(() -> invitationService.declineInvitation(RAW_TOKEN, INVITEE_ID))
        .isInstanceOf(ConflictException.class);
  }
}
