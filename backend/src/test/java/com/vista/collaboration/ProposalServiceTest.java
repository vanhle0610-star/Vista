package com.vista.collaboration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.collaboration.proposal.CastVoteRequest;
import com.vista.collaboration.proposal.CreateProposalRequest;
import com.vista.collaboration.proposal.Proposal;
import com.vista.collaboration.proposal.ProposalRepository;
import com.vista.collaboration.proposal.ProposalResponse;
import com.vista.collaboration.proposal.ProposalService;
import com.vista.collaboration.proposal.ProposalStatus;
import com.vista.collaboration.proposal.Vote;
import com.vista.collaboration.proposal.VoteRepository;
import com.vista.collaboration.proposal.VoteResponse;
import com.vista.notification.application.NotificationService;
import com.vista.trip.application.TripAccessService;
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

/**
 * W4-TV3-02: Unit tests cho ProposalService.
 * Kiểm tra: vote trùng (upsert), đổi phiếu, đóng biểu quyết, vote sau khi đóng bị từ chối.
 */
@ExtendWith(MockitoExtension.class)
class ProposalServiceTest {

  @Mock private ProposalRepository proposalRepository;
  @Mock private VoteRepository voteRepository;
  @Mock private TripAccessService tripAccessService;
  @Mock private NotificationService notificationService;

  @InjectMocks private ProposalService proposalService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID OWNER_ID = UUID.randomUUID();
  private static final UUID MEMBER_ID = UUID.randomUUID();
  private static final UUID PROPOSAL_ID = UUID.randomUUID();

  private Proposal openProposal;

  @BeforeEach
  void setUp() {
    openProposal = new Proposal(TRIP_ID, OWNER_ID, null, "Đề xuất test");
    ReflectionTestUtils.setField(openProposal, "id", PROPOSAL_ID);
    ReflectionTestUtils.setField(openProposal, "createdAt", Instant.now());
  }

  // ── createProposal ─────────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-02 Tạo đề xuất thành công")
  void createProposal_success() {
    CreateProposalRequest req = new CreateProposalRequest();
    req.setTitle("Đà Nẵng");

    when(proposalRepository.save(any())).thenAnswer(inv -> {
      Proposal p = inv.getArgument(0);
      ReflectionTestUtils.setField(p, "id", UUID.randomUUID());
      ReflectionTestUtils.setField(p, "createdAt", Instant.now());
      return p;
    });

    ProposalResponse response = proposalService.createProposal(TRIP_ID, MEMBER_ID, req);

    assertThat(response.title()).isEqualTo("Đà Nẵng");
    assertThat(response.status()).isEqualTo(ProposalStatus.OPEN);
    verify(tripAccessService).requireMember(TRIP_ID, MEMBER_ID);
  }

  // ── castVote ───────────────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-02 Vote lần đầu → tạo Vote mới")
  void castVote_firstTime_createsNewVote() {
    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));
    when(voteRepository.findByProposalIdAndUserId(PROPOSAL_ID, MEMBER_ID))
        .thenReturn(Optional.empty());
    when(voteRepository.save(any())).thenAnswer(inv -> {
      Vote v = inv.getArgument(0);
      ReflectionTestUtils.setField(v, "id", UUID.randomUUID());
      ReflectionTestUtils.setField(v, "createdAt", Instant.now());
      ReflectionTestUtils.setField(v, "updatedAt", Instant.now());
      return v;
    });

    CastVoteRequest req = new CastVoteRequest();
    req.setVote("UP");
    VoteResponse response = proposalService.castVote(PROPOSAL_ID, MEMBER_ID, req);

    assertThat(response.vote()).isEqualTo("UP");
    verify(voteRepository).save(any());
  }

  @Test
  @DisplayName("W4-02 Vote trùng → đổi phiếu (upsert), không tạo vote mới")
  void castVote_duplicate_updatesExistingVote() {
    Vote existingVote = new Vote(openProposal, MEMBER_ID, "UP");
    ReflectionTestUtils.setField(existingVote, "id", UUID.randomUUID());
    ReflectionTestUtils.setField(existingVote, "createdAt", Instant.now());
    ReflectionTestUtils.setField(existingVote, "updatedAt", Instant.now());

    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));
    when(voteRepository.findByProposalIdAndUserId(PROPOSAL_ID, MEMBER_ID))
        .thenReturn(Optional.of(existingVote));
    when(voteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    // Đổi từ UP → DOWN
    CastVoteRequest req = new CastVoteRequest();
    req.setVote("DOWN");
    VoteResponse response = proposalService.castVote(PROPOSAL_ID, MEMBER_ID, req);

    assertThat(response.vote()).isEqualTo("DOWN");
    // save được gọi đúng 1 lần (upsert chứ không tạo thêm)
    verify(voteRepository, times(1)).save(any());
  }

  @Test
  @DisplayName("W4-02 Vote trùng UP→UP → phiếu vẫn là UP, tổng phiếu không tăng")
  void castVote_sameVote_totalVotesUnchanged() {
    Vote existingVote = new Vote(openProposal, MEMBER_ID, "UP");
    ReflectionTestUtils.setField(existingVote, "id", UUID.randomUUID());
    ReflectionTestUtils.setField(existingVote, "createdAt", Instant.now());
    ReflectionTestUtils.setField(existingVote, "updatedAt", Instant.now());

    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));
    when(voteRepository.findByProposalIdAndUserId(PROPOSAL_ID, MEMBER_ID))
        .thenReturn(Optional.of(existingVote));
    when(voteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    CastVoteRequest req = new CastVoteRequest();
    req.setVote("UP");
    VoteResponse response = proposalService.castVote(PROPOSAL_ID, MEMBER_ID, req);

    assertThat(response.vote()).isEqualTo("UP");
    // Chỉ 1 bản ghi vote (save 1 lần, không tạo thêm)
    verify(voteRepository, times(1)).save(existingVote);
  }

  // ── closeVoting ────────────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-02 Đóng biểu quyết → status CLOSED, notification được gửi")
  void closeVoting_setsClosedStatus_andNotifies() {
    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));
    when(proposalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ProposalResponse response = proposalService.closeVoting(PROPOSAL_ID, OWNER_ID);

    assertThat(response.status()).isEqualTo(ProposalStatus.CLOSED);
    verify(notificationService).notifyTripMembers(
        eq(TRIP_ID), anyString(), anyString(), eq("VOTE_CLOSED"), eq(OWNER_ID));
  }

  @Test
  @DisplayName("W4-02 Vote sau khi biểu quyết đã CLOSED → 409 ConflictException")
  void castVote_afterClose_throws409() {
    ReflectionTestUtils.setField(openProposal, "status", ProposalStatus.CLOSED);

    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));

    CastVoteRequest req = new CastVoteRequest();
    req.setVote("UP");

    assertThatThrownBy(() -> proposalService.castVote(PROPOSAL_ID, MEMBER_ID, req))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("đã đóng");

    verify(voteRepository, never()).save(any());
  }

  @Test
  @DisplayName("W4-02 Vote sau khi biểu quyết APPROVED → 409")
  void castVote_afterApproved_throws409() {
    ReflectionTestUtils.setField(openProposal, "status", ProposalStatus.APPROVED);

    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));

    CastVoteRequest req = new CastVoteRequest();
    req.setVote("UP");

    assertThatThrownBy(() -> proposalService.castVote(PROPOSAL_ID, MEMBER_ID, req))
        .isInstanceOf(ConflictException.class);
  }

  // ── approveProposal ────────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-02 Owner duyệt đề xuất OPEN → APPROVED + notification")
  void approveProposal_success() {
    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));
    when(proposalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ProposalResponse response = proposalService.approveProposal(PROPOSAL_ID, OWNER_ID);

    assertThat(response.status()).isEqualTo(ProposalStatus.APPROVED);
    verify(notificationService).notifyTripMembers(
        eq(TRIP_ID), anyString(), anyString(), eq("PROPOSAL_APPROVED"), eq(OWNER_ID));
  }

  @Test
  @DisplayName("W4-02 Duyệt đề xuất không phải OPEN → 409")
  void approveProposal_notOpen_throws409() {
    ReflectionTestUtils.setField(openProposal, "status", ProposalStatus.CLOSED);
    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));

    assertThatThrownBy(() -> proposalService.approveProposal(PROPOSAL_ID, OWNER_ID))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("OPEN");
  }

  // ── rejectProposal ─────────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-02 Owner từ chối đề xuất OPEN → REJECTED + notification")
  void rejectProposal_success() {
    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));
    when(proposalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ProposalResponse response = proposalService.rejectProposal(PROPOSAL_ID, OWNER_ID);

    assertThat(response.status()).isEqualTo(ProposalStatus.REJECTED);
    verify(notificationService).notifyTripMembers(
        eq(TRIP_ID), anyString(), anyString(), eq("PROPOSAL_REJECTED"), eq(OWNER_ID));
  }

  // ── removeVote ─────────────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-02 Rút phiếu thành công khi biểu quyết OPEN")
  void removeVote_success() {
    Vote existingVote = new Vote(openProposal, MEMBER_ID, "UP");
    ReflectionTestUtils.setField(existingVote, "id", UUID.randomUUID());
    ReflectionTestUtils.setField(existingVote, "updatedAt", Instant.now());
    ReflectionTestUtils.setField(existingVote, "createdAt", Instant.now());

    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));
    when(voteRepository.findByProposalIdAndUserId(PROPOSAL_ID, MEMBER_ID))
        .thenReturn(Optional.of(existingVote));

    proposalService.removeVote(PROPOSAL_ID, MEMBER_ID);

    verify(voteRepository).delete(existingVote);
  }

  @Test
  @DisplayName("W4-02 Rút phiếu khi biểu quyết CLOSED → 409")
  void removeVote_closedProposal_throws409() {
    ReflectionTestUtils.setField(openProposal, "status", ProposalStatus.CLOSED);
    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));

    assertThatThrownBy(() -> proposalService.removeVote(PROPOSAL_ID, MEMBER_ID))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("đã đóng");
  }

  @Test
  @DisplayName("W4-02 Rút phiếu khi chưa bỏ phiếu → 404")
  void removeVote_noVoteExists_throws404() {
    when(proposalRepository.findById(PROPOSAL_ID)).thenReturn(Optional.of(openProposal));
    when(voteRepository.findByProposalIdAndUserId(PROPOSAL_ID, MEMBER_ID))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> proposalService.removeVote(PROPOSAL_ID, MEMBER_ID))
        .isInstanceOf(ResourceNotFoundException.class);
  }
}
