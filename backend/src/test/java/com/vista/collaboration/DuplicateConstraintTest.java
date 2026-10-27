package com.vista.collaboration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.invitation.CreateInvitationRequest;
import com.vista.collaboration.invitation.Invitation;
import com.vista.collaboration.invitation.InvitationRepository;
import com.vista.collaboration.invitation.InvitationResponse;
import com.vista.collaboration.invitation.InvitationService;
import com.vista.collaboration.invitation.InvitationStatus;
import com.vista.collaboration.itinerary.CreateItineraryDayRequest;
import com.vista.collaboration.itinerary.ItineraryDayRepository;
import com.vista.collaboration.itinerary.ItineraryService;
import com.vista.collaboration.proposal.CastVoteRequest;
import com.vista.collaboration.proposal.Proposal;
import com.vista.collaboration.proposal.ProposalRepository;
import com.vista.collaboration.proposal.ProposalService;
import com.vista.collaboration.proposal.ProposalStatus;
import com.vista.collaboration.proposal.Vote;
import com.vista.collaboration.proposal.VoteRepository;
import com.vista.collaboration.proposal.VoteResponse;
import com.vista.notification.application.NotificationService;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripMemberEntity;
import com.vista.trip.domain.TripMemberRepository;
import com.vista.trip.domain.TripRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * W7-TV3-03: Kiểm thử dữ liệu trùng lặp và xung đột trạng thái (Duplicate Constraints).
 * - Mời lại cùng email khi lời mời PENDING còn hạn → 409 Conflict.
 * - Accept 2 lần trên cùng token lời mời → lần 2 bị 409 Conflict.
 * - Thêm trùng số ngày (dayNumber) trong lịch trình → 409 Conflict.
 * - Vote lại trên proposal đang mở → cập nhật phiếu bầu, không sinh bản ghi trùng lặp trong DB.
 * - Vote trên proposal đã CLOSED / hết hạn → 409 Conflict.
 */
@ExtendWith(MockitoExtension.class)
class DuplicateConstraintTest {

  @Mock private InvitationRepository invitationRepository;
  @Mock private TripRepository tripRepository;
  @Mock private TripMemberRepository tripMemberRepository;
  @Mock private TripAccessService tripAccessService;
  @Mock private NotificationService notificationService;
  @Mock private ItineraryDayRepository dayRepository;
  @Mock private ProposalRepository proposalRepository;
  @Mock private VoteRepository voteRepository;

  private InvitationService invitationService;
  private ItineraryService itineraryService;
  private ProposalService proposalService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID USER_A = UUID.randomUUID();
  private static final UUID USER_B = UUID.randomUUID();

  private TripEntity trip;

  @BeforeEach
  void setUp() {
    invitationService =
        new InvitationService(
            invitationRepository,
            tripAccessService,
            tripRepository,
            tripMemberRepository,
            notificationService,
            null);
    itineraryService =
        new ItineraryService(
            dayRepository,
            null,
            tripAccessService,
            tripRepository,
            notificationService,
            null,
            null);
    proposalService =
        new ProposalService(
            proposalRepository,
            voteRepository,
            tripAccessService,
            notificationService);

    trip =
        new TripEntity(USER_A, "Đà Nẵng Hè 2026", LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 5));
    ReflectionTestUtils.setField(trip, "id", TRIP_ID);
  }

  // ── 1. Trùng email lời mời khi PENDING ────────────────────────────────────

  @Test
  @DisplayName("W7-03 Mời lại cùng email khi lời mời PENDING còn hiệu lực → ném 409 CONFLICT")
  void duplicateInvitation_pending_throwsConflict() {
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(invitationRepository.existsByTripIdAndInviteeEmailAndStatus(
            TRIP_ID, "friend@example.com", InvitationStatus.PENDING))
        .thenReturn(true);

    CreateInvitationRequest req = new CreateInvitationRequest("friend@example.com", null);

    assertThatThrownBy(() -> invitationService.createInvitation(TRIP_ID, USER_A, req))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("đang ở trạng thái PENDING");
  }

  // ── 2. Accept lời mời 2 lần ───────────────────────────────────────────────

  @Test
  @DisplayName("W7-03 Accept 2 lần trên cùng một lời mời → lần thứ 2 bị ném 409 CONFLICT")
  void doubleAccept_secondAttemptThrowsConflict() {
    Invitation invitation =
        new Invitation(
            TRIP_ID, USER_A, "friend@example.com", "tok_hash_123", Instant.now().plusSeconds(7200));
    ReflectionTestUtils.setField(invitation, "id", UUID.randomUUID());
    // Trạng thái đã ACCEPTED từ lần chấp nhận đầu tiên
    ReflectionTestUtils.setField(invitation, "status", InvitationStatus.ACCEPTED);

    when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.of(invitation));

    assertThatThrownBy(() -> invitationService.acceptInvitation("raw_token_xyz", USER_B))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("Lời mời không ở trạng thái PENDING");
  }

  // ── 3. Trùng số thứ tự ngày trong lịch trình ──────────────────────────────

  @Test
  @DisplayName("W7-03 Thêm ngày lịch trình trùng số ngày (dayNumber) → ném 409 CONFLICT")
  void duplicateDayNumber_throwsConflict() {
    when(dayRepository.existsByTripIdAndDayNumber(TRIP_ID, 1)).thenReturn(true);

    CreateItineraryDayRequest req = new CreateItineraryDayRequest(1, LocalDate.of(2026, 11, 1));

    assertThatThrownBy(() -> itineraryService.createDay(TRIP_ID, USER_A, req))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("Ngày số 1 đã tồn tại");
  }

  // ── 4. Bỏ phiếu lại (Update vote cũ, không nhân đôi bản ghi) ───────────────

  @Test
  @DisplayName("W7-03 Vote lại trên proposal đang mở → cập nhật phiếu cũ thay vì tạo bản ghi trùng")
  void revote_updatesExistingVoteWithoutDuplication() {
    UUID propId = UUID.randomUUID();
    Proposal proposal = new Proposal(TRIP_ID, USER_A, UUID.randomUUID(), "Đi chơi bán đảo");
    ReflectionTestUtils.setField(proposal, "id", propId);
    proposal.setStatus(ProposalStatus.OPEN);

    Vote vote = new Vote(proposal, USER_B, "UP");
    ReflectionTestUtils.setField(vote, "id", UUID.randomUUID());

    when(proposalRepository.findById(propId)).thenReturn(Optional.of(proposal));
    when(voteRepository.findByProposalIdAndUserId(propId, USER_B)).thenReturn(Optional.of(vote));
    when(voteRepository.save(any(Vote.class))).thenAnswer(i -> i.getArgument(0));

    // Đổi phiếu từ UP sang DOWN
    VoteResponse resp = proposalService.castVote(propId, USER_B, new CastVoteRequest("DOWN"));

    assertThat(resp.vote()).isEqualTo("DOWN");
    assertThat(vote.getVote()).isEqualTo("DOWN");
  }

  // ── 5. Bỏ phiếu khi proposal đã đóng ──────────────────────────────────────

  @Test
  @DisplayName("W7-03 Bỏ phiếu khi proposal đã CLOSED → ném 409 CONFLICT")
  void voteOnClosedProposal_throwsConflict() {
    UUID propId = UUID.randomUUID();
    Proposal proposal = new Proposal(TRIP_ID, USER_A, UUID.randomUUID(), "Đi chơi đêm");
    ReflectionTestUtils.setField(proposal, "id", propId);
    proposal.setStatus(ProposalStatus.CLOSED);

    when(proposalRepository.findById(propId)).thenReturn(Optional.of(proposal));

    assertThatThrownBy(() -> proposalService.castVote(propId, USER_B, new CastVoteRequest("UP")))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("Biểu quyết đã đóng");
  }
}

