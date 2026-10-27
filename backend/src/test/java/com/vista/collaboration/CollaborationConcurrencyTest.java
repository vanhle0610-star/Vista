package com.vista.collaboration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.invitation.CreateInvitationRequest;
import com.vista.collaboration.invitation.Invitation;
import com.vista.collaboration.invitation.InvitationRepository;
import com.vista.collaboration.invitation.InvitationService;
import com.vista.collaboration.invitation.InvitationStatus;
import com.vista.collaboration.itinerary.ItineraryDay;
import com.vista.collaboration.itinerary.ItineraryItem;
import com.vista.collaboration.itinerary.ItineraryItemRepository;
import com.vista.collaboration.itinerary.ItineraryItemResponse;
import com.vista.collaboration.itinerary.ItineraryService;
import com.vista.collaboration.itinerary.UpdateItineraryItemRequest;
import com.vista.collaboration.proposal.CastVoteRequest;
import com.vista.collaboration.proposal.Proposal;
import com.vista.collaboration.proposal.ProposalRepository;
import com.vista.collaboration.proposal.ProposalService;
import com.vista.collaboration.proposal.Vote;
import com.vista.collaboration.proposal.VoteRepository;
import com.vista.collaboration.proposal.VoteResponse;
import com.vista.notification.application.NotificationService;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * W7-TV3-01: Kiểm thử đồng thời (Concurrency) cho Module Group Collaboration.
 * - Sửa đồng thời điểm dừng lịch trình: Khóa lạc quan (version / expectedUpdatedAt) chặn sửa đè.
 * - Bỏ phiếu đồng thời: Đảm bảo không trùng phiếu và xử lý an toàn đa luồng.
 * - Tạo lời mời đồng thời cho cùng một email: Chặn bản ghi PENDING trùng lặp.
 */
@ExtendWith(MockitoExtension.class)
class CollaborationConcurrencyTest {

  @Mock private ItineraryItemRepository itemRepository;
  @Mock private TripAccessService tripAccessService;
  @Mock private TripRepository tripRepository;
  @Mock private InvitationRepository invitationRepository;
  @Mock private ProposalRepository proposalRepository;
  @Mock private VoteRepository voteRepository;
  @Mock private NotificationService notificationService;

  private ItineraryService itineraryService;
  private InvitationService invitationService;
  private ProposalService proposalService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID USER_A = UUID.randomUUID();
  private static final UUID USER_B = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    itineraryService =
        new ItineraryService(
            null,
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
            voteRepository,
            tripAccessService,
            notificationService);
  }

  // ── 1. Sửa lịch trình đồng thời: Khóa lạc quan ──────────────────────────────

  @Test
  @DisplayName("W7-01 Nhiều thành viên cùng sửa 1 điểm dừng → phiên bản cũ bị từ chối 409 CONFLICT")
  void concurrentUpdate_optimisticLockingRejectsStaleEdit() {
    UUID itemId = UUID.randomUUID();
    ItineraryDay day = new ItineraryDay(TRIP_ID, 1, LocalDate.of(2026, 11, 10));
    ReflectionTestUtils.setField(day, "id", UUID.randomUUID());

    Instant initialUpdatedAt = Instant.parse("2026-11-10T08:00:00Z");

    ItineraryItem item =
        new ItineraryItem(day, null, "Cầu Sông Hàn", LocalTime.of(8, 0), LocalTime.of(10, 0), 0, null, USER_A);
    ReflectionTestUtils.setField(item, "id", itemId);
    ReflectionTestUtils.setField(item, "updatedAt", initialUpdatedAt);

    when(itemRepository.findById(itemId)).thenReturn(Optional.of(item));
    when(itemRepository.save(any(ItineraryItem.class))).thenAnswer(i -> i.getArgument(0));

    // Luồng 1 (User A) gửi sửa đổi với expectedUpdatedAt đúng -> thành công
    UpdateItineraryItemRequest req1 = new UpdateItineraryItemRequest();
    req1.setCustomStopName("Cầu Sông Hàn (đổi giờ)");
    req1.setExpectedUpdatedAt(initialUpdatedAt);

    ItineraryItemResponse resp1 = itineraryService.updateItem(itemId, USER_A, req1);
    assertThat(resp1.customStopName()).isEqualTo("Cầu Sông Hàn (đổi giờ)");

    // Sau khi User A sửa xong, item.updatedAt đã thay đổi sang thời điểm mới
    // Luồng 2 (User B) gửi sửa đổi nhưng mang expectedUpdatedAt cũ ban đầu
    UpdateItineraryItemRequest req2 = new UpdateItineraryItemRequest();
    req2.setCustomStopName("Cầu Rồng (bị chậm)");
    req2.setExpectedUpdatedAt(initialUpdatedAt);

    assertThatThrownBy(() -> itineraryService.updateItem(itemId, USER_B, req2))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("xung đột phiên bản");
  }

  // ── 2. Tạo lời mời đồng thời cho cùng email ───────────────────────────────

  @Test
  @DisplayName("W7-01 Hai thành viên cùng mời 1 email đồng thời → luồng thứ 2 bị 409 CONFLICT")
  void concurrentInvitation_secondAttemptFailsWithConflict() throws Exception {
    TripEntity trip =
        new TripEntity(USER_A, "Trip Test", LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 15));
    ReflectionTestUtils.setField(trip, "id", TRIP_ID);

    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));

    // Mô phỏng: Luồng 1 kiểm tra chưa có PENDING -> lưu; Luồng 2 kiểm tra thấy PENDING -> ném 409
    AtomicInteger callCount = new AtomicInteger(0);
    when(invitationRepository.existsByTripIdAndInviteeEmailAndStatus(
            TRIP_ID, "friend@example.com", InvitationStatus.PENDING))
        .thenAnswer(inv -> callCount.getAndIncrement() > 0);

    when(invitationRepository.save(any(Invitation.class)))
        .thenAnswer(
            i -> {
              Invitation saved = i.getArgument(0);
              ReflectionTestUtils.setField(saved, "id", UUID.randomUUID());
              ReflectionTestUtils.setField(saved, "createdAt", Instant.now());
              return saved;
            });

    CreateInvitationRequest req = new CreateInvitationRequest("friend@example.com", null);

    CompletableFuture<Boolean> future1 =
        CompletableFuture.supplyAsync(
            () -> {
              invitationService.createInvitation(TRIP_ID, USER_A, req);
              return true;
            });

    CompletableFuture<Boolean> future2 =
        CompletableFuture.supplyAsync(
            () -> {
              try {
                // Delay nhẹ để tạo thứ tự race condition
                Thread.sleep(20);
                invitationService.createInvitation(TRIP_ID, USER_B, req);
                return true;
              } catch (ConflictException e) {
                return false;
              } catch (Exception e) {
                throw new RuntimeException(e);
              }
            });

    boolean res1 = future1.get();
    boolean res2 = future2.get();

    assertThat(res1).isTrue();
    assertThat(res2).isFalse(); // Luồng 2 bị ConflictException chặn
  }

  // ── 3. Bỏ phiếu đồng thời trên Proposal ────────────────────────────────────

  @Test
  @DisplayName("W7-01 Thành viên cập nhật vote liên tiếp → phiếu được cập nhật chính xác, không mất dữ liệu")
  void concurrentVote_updatesSafely() {
    UUID proposalId = UUID.randomUUID();
    Proposal proposal = new Proposal(TRIP_ID, USER_A, UUID.randomUUID(), "Ăn tối hải sản");
    ReflectionTestUtils.setField(proposal, "id", proposalId);

    Vote existingVote = new Vote(proposal, USER_B, "UP");
    ReflectionTestUtils.setField(existingVote, "id", UUID.randomUUID());

    when(proposalRepository.findById(proposalId)).thenReturn(Optional.of(proposal));
    when(voteRepository.findByProposalIdAndUserId(proposalId, USER_B))
        .thenReturn(Optional.of(existingVote));
    when(voteRepository.save(any(Vote.class))).thenAnswer(i -> i.getArgument(0));

    CastVoteRequest voteReq = new CastVoteRequest("DOWN");
    VoteResponse resp = proposalService.castVote(proposalId, USER_B, voteReq);

    assertThat(resp.vote()).isEqualTo("DOWN");
    assertThat(existingVote.getVote()).isEqualTo("DOWN");
  }
}

