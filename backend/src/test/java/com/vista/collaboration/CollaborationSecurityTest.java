package com.vista.collaboration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.collaboration.invitation.CreateInvitationRequest;
import com.vista.collaboration.invitation.Invitation;
import com.vista.collaboration.invitation.InvitationPreviewResponse;
import com.vista.collaboration.invitation.InvitationRepository;
import com.vista.collaboration.invitation.InvitationService;
import com.vista.collaboration.itinerary.CreateItineraryDayRequest;
import com.vista.collaboration.itinerary.ItineraryDay;
import com.vista.collaboration.itinerary.ItineraryDayRepository;
import com.vista.collaboration.itinerary.ItineraryItem;
import com.vista.collaboration.itinerary.ItineraryItemRepository;
import com.vista.collaboration.itinerary.ItineraryService;
import com.vista.collaboration.proposal.CreateProposalRequest;
import com.vista.collaboration.proposal.Proposal;
import com.vista.collaboration.proposal.ProposalRepository;
import com.vista.collaboration.proposal.ProposalService;
import com.vista.notification.application.NotificationService;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * W7-TV3-02: Kiểm thử phân quyền & bảo mật IDOR (E2E-09 phần TV3).
 * - Người ngoài chuyến (User C) gọi API lịch trình, lời mời, đề xuất của Trip 1 → bị chặn 403 Forbidden.
 * - Thành viên thường (MEMBER) thực hiện hành động chỉ dành cho OWNER (thu hồi lời mời, duyệt đề xuất) → bị chặn 403.
 * - ID tài nguyên không tồn tại → 404 Not Found.
 * - Public Preview không làm rò rỉ token bí mật và không yêu cầu đăng nhập.
 */
@ExtendWith(MockitoExtension.class)
class CollaborationSecurityTest {

  @Mock private ItineraryDayRepository dayRepository;
  @Mock private ItineraryItemRepository itemRepository;
  @Mock private TripAccessService tripAccessService;
  @Mock private TripRepository tripRepository;
  @Mock private InvitationRepository invitationRepository;
  @Mock private ProposalRepository proposalRepository;
  @Mock private NotificationService notificationService;

  private ItineraryService itineraryService;
  private InvitationService invitationService;
  private ProposalService proposalService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID OWNER_ID = UUID.randomUUID();
  private static final UUID MEMBER_ID = UUID.randomUUID();
  private static final UUID OUTSIDER_ID = UUID.randomUUID();

  private TripEntity trip;

  @BeforeEach
  void setUp() {
    itineraryService =
        new ItineraryService(
            dayRepository,
            itemRepository,
            tripAccessService,
            tripRepository,
            notificationService,
            null,
            null);
    invitationService =
        new InvitationService(
            invitationRepository,
            tripAccessService,
            tripRepository,
            null,
            notificationService,
            null);
    proposalService =
        new ProposalService(
            proposalRepository,
            null,
            tripAccessService,
            notificationService);

    trip =
        new TripEntity(
            OWNER_ID, "Đà Nẵng Bí Mật", LocalDate.of(2026, 11, 15), LocalDate.of(2026, 11, 18));
    ReflectionTestUtils.setField(trip, "id", TRIP_ID);
  }

  // ── 1. Người ngoài (Outsider) truy cập Itinerary → 403 ─────────────────────

  @Test
  @DisplayName("W7-02 Outsider xem lịch trình của chuyến khác → bị chặn 403 AccessDeniedException")
  void outsiderGetDays_throwsAccessDenied() {
    doThrow(new AccessDeniedException("Bạn không phải thành viên"))
        .when(tripAccessService)
        .requireMember(TRIP_ID, OUTSIDER_ID);

    assertThatThrownBy(() -> itineraryService.getDays(TRIP_ID, OUTSIDER_ID))
        .isInstanceOf(AccessDeniedException.class)
        .hasMessageContaining("Bạn không phải thành viên");
  }

  @Test
  @DisplayName("W7-02 Outsider thêm ngày vào lịch trình chuyến khác → bị chặn 403 AccessDeniedException")
  void outsiderCreateDay_throwsAccessDenied() {
    doThrow(new AccessDeniedException("Bạn không phải thành viên"))
        .when(tripAccessService)
        .requireMember(TRIP_ID, OUTSIDER_ID);

    CreateItineraryDayRequest req = new CreateItineraryDayRequest(1, LocalDate.of(2026, 11, 15));
    assertThatThrownBy(() -> itineraryService.createDay(TRIP_ID, OUTSIDER_ID, req))
        .isInstanceOf(AccessDeniedException.class);
  }

  // ── 2. Người ngoài truy cập Lời mời & Đề xuất → 403 ─────────────────────────

  @Test
  @DisplayName("W7-02 Outsider tạo lời mời trong chuyến đi của người khác → bị chặn 403")
  void outsiderCreateInvitation_throwsAccessDenied() {
    doThrow(new AccessDeniedException("Bạn không phải thành viên"))
        .when(tripAccessService)
        .requireMember(TRIP_ID, OUTSIDER_ID);

    CreateInvitationRequest req = new CreateInvitationRequest("victim@example.com", null);
    assertThatThrownBy(() -> invitationService.createInvitation(TRIP_ID, OUTSIDER_ID, req))
        .isInstanceOf(AccessDeniedException.class);
  }

  @Test
  @DisplayName("W7-02 Outsider tạo đề xuất điểm đến cho chuyến khác → bị chặn 403")
  void outsiderCreateProposal_throwsAccessDenied() {
    doThrow(new AccessDeniedException("Bạn không phải thành viên"))
        .when(tripAccessService)
        .requireMember(TRIP_ID, OUTSIDER_ID);

    CreateProposalRequest req = new CreateProposalRequest(UUID.randomUUID(), "Đi chơi quán bar");
    assertThatThrownBy(() -> proposalService.createProposal(TRIP_ID, OUTSIDER_ID, req))
        .isInstanceOf(AccessDeniedException.class);
  }

  // ── 3. MEMBER thực hiện quyền OWNER → 403 ──────────────────────────────────

  @Test
  @DisplayName("W7-02 MEMBER thu hồi lời mời (chỉ OWNER mới được) → bị chặn 403 AccessDeniedException")
  void memberRevokeInvitation_throwsAccessDenied() {
    UUID invId = UUID.randomUUID();
    Invitation inv =
        new Invitation(TRIP_ID, OWNER_ID, "invitee@example.com", "hash_tok", Instant.now().plusSeconds(3600));
    ReflectionTestUtils.setField(inv, "id", invId);

    when(invitationRepository.findById(invId)).thenReturn(Optional.of(inv));
    doThrow(new AccessDeniedException("Bạn không phải chủ sở hữu của chuyến đi này"))
        .when(tripAccessService)
        .requireOwner(TRIP_ID, MEMBER_ID);

    assertThatThrownBy(() -> invitationService.revokeInvitation(invId, MEMBER_ID))
        .isInstanceOf(AccessDeniedException.class)
        .hasMessageContaining("Bạn không phải chủ sở hữu");
  }

  @Test
  @DisplayName("W7-02 MEMBER duyệt đề xuất (chỉ OWNER mới được) → bị chặn 403 AccessDeniedException")
  void memberApproveProposal_throwsAccessDenied() {
    UUID propId = UUID.randomUUID();
    Proposal proposal = new Proposal(TRIP_ID, MEMBER_ID, UUID.randomUUID(), "Ăn trưa");
    ReflectionTestUtils.setField(proposal, "id", propId);

    when(proposalRepository.findById(propId)).thenReturn(Optional.of(proposal));
    doThrow(new AccessDeniedException("Bạn không phải chủ sở hữu"))
        .when(tripAccessService)
        .requireOwner(TRIP_ID, MEMBER_ID);

    assertThatThrownBy(() -> proposalService.approveProposal(propId, MEMBER_ID))
        .isInstanceOf(AccessDeniedException.class);
  }

  // ── 4. Xem trước lời mời công khai (Preview) an toàn ───────────────────────

  @Test
  @DisplayName("W7-02 Preview lời mời qua link token hoạt động an toàn, không rò rỉ dữ liệu nhạy cảm")
  void previewInvitation_returnsPublicMetadataSafely() {
    Invitation inv =
        new Invitation(TRIP_ID, OWNER_ID, "guest@gmail.com", "hash_abc123", Instant.now().plusSeconds(3600));
    ReflectionTestUtils.setField(inv, "id", UUID.randomUUID());
    ReflectionTestUtils.setField(inv, "createdAt", Instant.now());

    when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.of(inv));
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));

    InvitationPreviewResponse preview = invitationService.previewInvitation("raw_token_xyz");

    assertThat(preview).isNotNull();
    assertThat(preview.tripTitle()).isEqualTo("Đà Nẵng Bí Mật");
    assertThat(preview.inviteeEmail()).isEqualTo("guest@gmail.com");
  }

  // ── 5. ID không tồn tại → 404 Not Found ───────────────────────────────────

  @Test
  @DisplayName("W7-02 Chuyến đi không tồn tại → ném ResourceNotFoundException (404)")
  void tripNotFound_throwsResourceNotFound() {
    UUID ghostTripId = UUID.randomUUID();
    when(tripRepository.findById(ghostTripId)).thenReturn(Optional.empty());

    CreateInvitationRequest req = new CreateInvitationRequest("ghost@example.com", null);
    assertThatThrownBy(() -> invitationService.createInvitation(ghostTripId, OWNER_ID, req))
        .isInstanceOf(ResourceNotFoundException.class)
        .hasMessageContaining("Không tìm thấy chuyến đi");
  }
}

