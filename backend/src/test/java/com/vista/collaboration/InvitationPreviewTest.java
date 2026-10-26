package com.vista.collaboration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.collaboration.invitation.Invitation;
import com.vista.collaboration.invitation.InvitationPreviewResponse;
import com.vista.collaboration.invitation.InvitationRepository;
import com.vista.collaboration.invitation.InvitationResponse;
import com.vista.collaboration.invitation.InvitationService;
import com.vista.collaboration.invitation.InvitationStatus;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripMemberRepository;
import com.vista.trip.domain.TripRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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

/**
 * W4-TV3-03: Test luồng deep link / nhập mã mời. - previewInvitation: xem trước thông tin chuyến đi
 * theo raw token (không cần login). - acceptInvitation theo raw token: luồng accept đã có từ tuần
 * 3, test lại ngữ cảnh 2 tài khoản.
 */
@ExtendWith(MockitoExtension.class)
class InvitationPreviewTest {

  @Mock private InvitationRepository invitationRepository;
  @Mock private TripRepository tripRepository;
  @Mock private TripMemberRepository tripMemberRepository;
  @Mock private TripAccessService tripAccessService;

  @InjectMocks private InvitationService invitationService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID OWNER_ID = UUID.randomUUID();
  private static final UUID INVITEE_ID = UUID.randomUUID();
  private static final String EMAIL = "invitee@example.com";

  // rawToken sinh ngẫu nhiên 64 ký tự hex (2 UUID ghép)
  private static final String RAW_TOKEN =
      UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
  private static final String TOKEN_HASH = InvitationService.sha256Hex(RAW_TOKEN);

  private Invitation pendingInvitation;
  private TripEntity trip;

  @BeforeEach
  void setUp() {
    trip =
        new TripEntity(
            OWNER_ID, "Đà Nẵng 2026", LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 15));
    ReflectionTestUtils.setField(trip, "id", TRIP_ID);
    ReflectionTestUtils.setField(trip, "createdAt", Instant.now());
    ReflectionTestUtils.setField(trip, "updatedAt", Instant.now());
    ReflectionTestUtils.setField(trip, "version", 0L);

    pendingInvitation =
        new Invitation(
            TRIP_ID, OWNER_ID, EMAIL, TOKEN_HASH, Instant.now().plus(7, ChronoUnit.DAYS));
    ReflectionTestUtils.setField(pendingInvitation, "id", UUID.randomUUID());
    ReflectionTestUtils.setField(pendingInvitation, "createdAt", Instant.now());
  }

  // ── previewInvitation ──────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-03 Preview lời mời hợp lệ → trả thông tin chuyến đi")
  void previewInvitation_validToken_returnsPreview() {
    when(invitationRepository.findByTokenHash(TOKEN_HASH))
        .thenReturn(Optional.of(pendingInvitation));
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));

    InvitationPreviewResponse preview = invitationService.previewInvitation(RAW_TOKEN);

    assertThat(preview.tripId()).isEqualTo(TRIP_ID);
    assertThat(preview.tripTitle()).isEqualTo("Đà Nẵng 2026");
    assertThat(preview.inviteeEmail()).isEqualTo(EMAIL);
    assertThat(preview.status()).isEqualTo(InvitationStatus.PENDING);
    assertThat(preview.tripStartDate()).isEqualTo(LocalDate.of(2026, 11, 10));
    assertThat(preview.tripEndDate()).isEqualTo(LocalDate.of(2026, 11, 15));
  }

  @Test
  @DisplayName("W4-03 Preview với token không tồn tại → 404")
  void previewInvitation_unknownToken_throws404() {
    when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.empty());

    assertThatThrownBy(() -> invitationService.previewInvitation("badtoken"))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("W4-03 Preview lời mời đã hết hạn → status hiển thị là EXPIRED")
  void previewInvitation_expired_showsExpiredStatus() {
    // Đặt expiresAt = quá khứ
    ReflectionTestUtils.setField(
        pendingInvitation, "expiresAt", Instant.now().minus(1, ChronoUnit.DAYS));

    when(invitationRepository.findByTokenHash(TOKEN_HASH))
        .thenReturn(Optional.of(pendingInvitation));
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));

    InvitationPreviewResponse preview = invitationService.previewInvitation(RAW_TOKEN);

    // Dù DB vẫn là PENDING, preview trả ra EXPIRED
    assertThat(preview.status()).isEqualTo(InvitationStatus.EXPIRED);
  }

  // ── acceptInvitation (luồng từ tuần 3, test context 2 tài khoản) ──────────

  @Test
  @DisplayName("W4-03 Tài khoản INVITEE accept lời mời qua token → thành công (ACCEPTED)")
  void acceptInvitation_byInvitee_succeeds() {
    when(invitationRepository.findByTokenHash(TOKEN_HASH))
        .thenReturn(Optional.of(pendingInvitation));
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(tripMemberRepository.findByTripIdAndUserId(TRIP_ID, INVITEE_ID))
        .thenReturn(Optional.empty());
    when(tripMemberRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(invitationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    InvitationResponse response = invitationService.acceptInvitation(RAW_TOKEN, INVITEE_ID);

    assertThat(response.status()).isEqualTo(InvitationStatus.ACCEPTED);
  }

  @Test
  @DisplayName("W4-03 Tài khoản OWNER accept lời mời của người khác → thành công (không bị chặn)")
  void acceptInvitation_byDifferentAccount_succeeds() {
    UUID anotherUser = UUID.randomUUID();
    when(invitationRepository.findByTokenHash(TOKEN_HASH))
        .thenReturn(Optional.of(pendingInvitation));
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(tripMemberRepository.findByTripIdAndUserId(TRIP_ID, anotherUser))
        .thenReturn(Optional.empty());
    when(tripMemberRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(invitationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    InvitationResponse response = invitationService.acceptInvitation(RAW_TOKEN, anotherUser);
    assertThat(response.status()).isEqualTo(InvitationStatus.ACCEPTED);
  }

  @Test
  @DisplayName("W4-03 Accept token đã hết hạn → 409 + status EXPIRED")
  void acceptInvitation_expiredToken_throws409() {
    ReflectionTestUtils.setField(
        pendingInvitation, "expiresAt", Instant.now().minus(1, ChronoUnit.DAYS));

    when(invitationRepository.findByTokenHash(TOKEN_HASH))
        .thenReturn(Optional.of(pendingInvitation));
    when(invitationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    assertThatThrownBy(() -> invitationService.acceptInvitation(RAW_TOKEN, INVITEE_ID))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("hết hạn");
  }
}
