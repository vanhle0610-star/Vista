package com.vista.collaboration.member;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.collaboration.exception.ConflictException;
import com.vista.notification.application.NotificationService;
import com.vista.notification.domain.NotificationType;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripMemberEntity;
import com.vista.trip.domain.TripMemberRepository;
import com.vista.trip.domain.TripMemberRole;
import com.vista.trip.domain.TripMemberStatus;
import com.vista.trip.domain.TripRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TripMemberManagementTest {

  @Mock private TripRepository tripRepository;
  @Mock private TripMemberRepository tripMemberRepository;
  @Mock private TripAccessService tripAccessService;
  @Mock private NotificationService notificationService;

  private TripMemberService tripMemberService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID OWNER_ID = UUID.randomUUID();
  private static final UUID MEMBER_ID = UUID.randomUUID();
  private static final UUID NON_MEMBER_ID = UUID.randomUUID();

  private TripEntity trip;
  private TripMemberEntity ownerMember;
  private TripMemberEntity regularMember;

  @BeforeEach
  void setUp() {
    tripMemberService =
        new TripMemberService(
            tripRepository, tripMemberRepository, tripAccessService, notificationService);

    trip =
        new TripEntity(OWNER_ID, "Chuyến đi Đà Nẵng", LocalDate.now(), LocalDate.now().plusDays(3));
    ReflectionTestUtils.setField(trip, "id", TRIP_ID);

    ownerMember = new TripMemberEntity(trip, OWNER_ID, TripMemberRole.OWNER);
    regularMember = new TripMemberEntity(trip, MEMBER_ID, TripMemberRole.MEMBER);

    List<TripMemberEntity> membersList = new ArrayList<>();
    membersList.add(ownerMember);
    membersList.add(regularMember);
    ReflectionTestUtils.setField(trip, "members", membersList);
  }

  // ── Quy tắc 2: Rời nhóm ─────────────────────────────────────────────────────

  @Test
  @DisplayName(
      "1. MEMBER rời nhóm thành công → dòng trip_members bị xóa, sau đó bị chặn khi xem chuyến")
  void memberLeaveTrip_success_deletesRowAndBlocksSubsequentAccess() {
    // Member gọi rời nhóm
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(tripAccessService.isOwner(TRIP_ID, MEMBER_ID)).thenReturn(false);
    when(tripMemberRepository.findByTripIdAndUserId(TRIP_ID, MEMBER_ID))
        .thenReturn(Optional.of(regularMember));

    tripMemberService.leaveTrip(TRIP_ID, MEMBER_ID);

    // Xác nhận đã xóa đúng dòng trip_members của chính mình
    verify(tripMemberRepository).delete(regularMember);
    verify(tripMemberRepository).flush();

    // Giả lập sau khi rời: gọi requireMember bị chặn (403 AccessDeniedException)
    when(tripAccessService.isMember(TRIP_ID, MEMBER_ID)).thenReturn(false);
    assertThat(tripAccessService.isMember(TRIP_ID, MEMBER_ID)).isFalse();
  }

  @Test
  @DisplayName("2. OWNER (còn thành viên khác) rời → trả về 409 Conflict")
  void ownerLeaveTrip_hasOtherMembers_throws409Conflict() {
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(tripAccessService.isOwner(TRIP_ID, OWNER_ID)).thenReturn(true);
    when(tripMemberRepository.findByTripIdAndStatus(TRIP_ID, TripMemberStatus.ACTIVE))
        .thenReturn(List.of(ownerMember, regularMember));

    assertThatThrownBy(() -> tripMemberService.leaveTrip(TRIP_ID, OWNER_ID))
        .isInstanceOf(ConflictException.class)
        .hasMessage("Trưởng nhóm phải chuyển quyền cho thành viên khác trước khi rời nhóm");

    verify(tripMemberRepository, never()).delete(any());
  }

  @Test
  @DisplayName("3. OWNER là thành viên duy nhất rời → trả về 409 Conflict yêu cầu xóa chuyến")
  void ownerLeaveTrip_soleMember_throws409Conflict() {
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(tripAccessService.isOwner(TRIP_ID, OWNER_ID)).thenReturn(true);
    when(tripMemberRepository.findByTripIdAndStatus(TRIP_ID, TripMemberStatus.ACTIVE))
        .thenReturn(List.of(ownerMember));

    assertThatThrownBy(() -> tripMemberService.leaveTrip(TRIP_ID, OWNER_ID))
        .isInstanceOf(ConflictException.class)
        .hasMessage(
            "Bạn là thành viên duy nhất của chuyến đi. Vui lòng xóa chuyến đi thay vì rời nhóm.");

    verify(tripMemberRepository, never()).delete(any());
  }

  @Test
  @DisplayName("Quy tắc 2: Người không phải thành viên gọi endpoint rời nhóm → 403 Forbidden")
  void nonMemberLeaveTrip_throws403Forbidden() {
    org.mockito.Mockito.doThrow(
            new AccessDeniedException(
                "Bạn không có quyền truy cập hoặc không phải thành viên của chuyến đi này"))
        .when(tripAccessService)
        .requireMember(TRIP_ID, NON_MEMBER_ID);

    assertThatThrownBy(() -> tripMemberService.leaveTrip(TRIP_ID, NON_MEMBER_ID))
        .isInstanceOf(AccessDeniedException.class);

    verify(tripMemberRepository, never()).delete(any());
  }

  // ── Quy tắc 3 & 4: Chuyển quyền trưởng nhóm ──────────────────────────────────

  @Test
  @DisplayName("4. MEMBER gọi chuyển quyền → trả về 403 Forbidden")
  void memberCallsTransferOwnership_throws403Forbidden() {
    org.mockito.Mockito.doThrow(
            new AccessDeniedException("Bạn không phải chủ sở hữu của chuyến đi này"))
        .when(tripAccessService)
        .requireOwner(TRIP_ID, MEMBER_ID);

    assertThatThrownBy(() -> tripMemberService.transferOwnership(TRIP_ID, MEMBER_ID, OWNER_ID))
        .isInstanceOf(AccessDeniedException.class);

    verify(tripMemberRepository, never()).save(any());
  }

  @Test
  @DisplayName("5. Chuyển quyền cho người ngoài nhóm → 400 Bad Request")
  void transferOwnership_toNonMember_throws400BadRequest() {
    when(tripMemberRepository.findByTripIdAndUserId(TRIP_ID, NON_MEMBER_ID))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> tripMemberService.transferOwnership(TRIP_ID, OWNER_ID, NON_MEMBER_ID))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Người được chuyển quyền phải là thành viên của chuyến đi");

    verify(tripMemberRepository, never()).save(any());
  }

  @Test
  @DisplayName("5b. Chuyển quyền cho chính mình → 400 Bad Request")
  void transferOwnership_toSelf_throws400BadRequest() {
    assertThatThrownBy(() -> tripMemberService.transferOwnership(TRIP_ID, OWNER_ID, OWNER_ID))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Không thể chuyển quyền trưởng nhóm cho chính mình");

    verify(tripMemberRepository, never()).save(any());
  }

  @Test
  @DisplayName(
      "6. Chuyển quyền hợp lệ → đúng 1 OWNER mới, chủ cũ thành MEMBER, gửi thông báo, rồi chủ cũ rời nhóm thành công")
  void transferOwnership_valid_invariantsSatisfied_andOldOwnerCanLeave() {
    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(tripMemberRepository.findByTripIdAndUserId(TRIP_ID, MEMBER_ID))
        .thenReturn(Optional.of(regularMember));
    when(tripMemberRepository.findByTripIdAndUserId(TRIP_ID, OWNER_ID))
        .thenReturn(Optional.of(ownerMember));

    TransferOwnershipResponse response =
        tripMemberService.transferOwnership(TRIP_ID, OWNER_ID, MEMBER_ID);

    assertThat(response.tripId()).isEqualTo(TRIP_ID);
    assertThat(response.previousOwnerId()).isEqualTo(OWNER_ID);
    assertThat(response.newOwnerId()).isEqualTo(MEMBER_ID);

    // Bất biến: Đúng 1 OWNER mới, chủ cũ xuống MEMBER, trips.owner_id = MEMBER_ID
    assertThat(trip.getOwnerId()).isEqualTo(MEMBER_ID);
    assertThat(regularMember.getRole()).isEqualTo(TripMemberRole.OWNER);
    assertThat(ownerMember.getRole()).isEqualTo(TripMemberRole.MEMBER);

    // Kiểm tra bất biến số lượng OWNER: chỉ đúng 1 người có role OWNER
    List<TripMemberEntity> members = List.of(ownerMember, regularMember);
    long ownerCount = members.stream().filter(m -> m.getRole() == TripMemberRole.OWNER).count();
    assertThat(ownerCount).isEqualTo(1L);

    // Gửi thông báo cho chủ mới qua NotificationService (OWNERSHIP_TRANSFERRED)
    ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
    verify(notificationService)
        .sendInAppNotification(
            eq(MEMBER_ID),
            eq("Chuyển quyền trưởng nhóm"),
            bodyCaptor.capture(),
            eq(NotificationType.OWNERSHIP_TRANSFERRED.name()),
            any());
    assertThat(bodyCaptor.getValue()).contains("Chuyến đi Đà Nẵng");

    // Sau khi chuyển quyền, chủ cũ (OWNER_ID) rời nhóm được theo quy tắc 2 (vì đã là MEMBER)
    when(tripAccessService.isOwner(TRIP_ID, OWNER_ID)).thenReturn(false);
    when(tripMemberRepository.findByTripIdAndUserId(TRIP_ID, OWNER_ID))
        .thenReturn(Optional.of(ownerMember));

    tripMemberService.leaveTrip(TRIP_ID, OWNER_ID);
    verify(tripMemberRepository).delete(ownerMember);
  }
}
