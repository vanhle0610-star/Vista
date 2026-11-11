package com.vista.collaboration.member;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.notification.application.NotificationService;
import com.vista.notification.domain.NotificationType;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripMemberEntity;
import com.vista.trip.domain.TripMemberRepository;
import com.vista.trip.domain.TripMemberRole;
import com.vista.trip.domain.TripMemberStatus;
import com.vista.trip.domain.TripRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service xử lý nghiệp vụ Quản lý thành viên (TV3):
 * - Rời nhóm chuyến đi (MEMBER / OWNER).
 * - Chuyển quyền trưởng nhóm (OWNER -> MEMBER).
 */
@Service
public class TripMemberService {

  private static final Logger log = LoggerFactory.getLogger(TripMemberService.class);

  private final TripRepository tripRepository;
  private final TripMemberRepository tripMemberRepository;
  private final TripAccessService tripAccessService;
  private final NotificationService notificationService;

  public TripMemberService(
      TripRepository tripRepository,
      TripMemberRepository tripMemberRepository,
      TripAccessService tripAccessService,
      NotificationService notificationService) {
    this.tripRepository = tripRepository;
    this.tripMemberRepository = tripMemberRepository;
    this.tripAccessService = tripAccessService;
    this.notificationService = notificationService;
  }

  /**
   * Rời nhóm chuyến đi:
   * - Người không phải thành viên: 403.
   * - OWNER còn thành viên khác trong nhóm: 409 ("Trưởng nhóm phải chuyển quyền cho thành viên khác trước khi rời nhóm").
   * - OWNER là thành viên duy nhất của chuyến: 409 (yêu cầu xóa chuyến thay vì rời).
   * - MEMBER: xóa đúng dòng trip_members của chính mình. Dữ liệu họ tạo giữ nguyên. Sau khi rời bị chặn quyền truy cập.
   */
  @Transactional
  public void leaveTrip(UUID tripId, UUID userId) {
    // 1. Kiểm tra quyền thành viên — không phải thành viên ném AccessDeniedException -> 403
    tripAccessService.requireMember(tripId, userId);

    TripEntity trip =
        tripRepository
            .findById(tripId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến đi"));

    boolean isOwner = tripAccessService.isOwner(tripId, userId);
    if (isOwner) {
      // Đếm số thành viên ACTIVE khác ngoài chủ chuyến đi
      List<TripMemberEntity> activeMembers =
          tripMemberRepository.findByTripIdAndStatus(tripId, TripMemberStatus.ACTIVE);
      long otherActiveMembersCount =
          activeMembers.stream().filter(m -> !m.getUserId().equals(userId)).count();

      if (otherActiveMembersCount > 0) {
        throw new ConflictException(
            "Trưởng nhóm phải chuyển quyền cho thành viên khác trước khi rời nhóm");
      } else {
        throw new ConflictException(
            "Bạn là thành viên duy nhất của chuyến đi. Vui lòng xóa chuyến đi thay vì rời nhóm.");
      }
    }

    // 2. MEMBER rời nhóm: xóa bản ghi trip_members của chính mình
    tripMemberRepository
        .findByTripIdAndUserId(tripId, userId)
        .ifPresent(
            member -> {
              if (trip.getMembers() != null) {
                trip.getMembers().remove(member);
              }
              tripMemberRepository.delete(member);
            });
    tripMemberRepository.flush();

    log.info("Người dùng {} đã rời khỏi chuyến đi {}", userId, tripId);
  }

  /**
   * Chuyển quyền trưởng nhóm:
   * - Chỉ OWNER hiện tại mới gọi được, người khác -> 403.
   * - Người được chuyển phải là MEMBER active của chuyến; chuyển cho chính mình hoặc ngoài nhóm -> 400.
   * - Nằm trong 1 transaction: người nhận -> OWNER, chủ cũ -> MEMBER, cập nhật trip.ownerId.
   * - Không bao giờ tồn tại trạng thái chuyến có 0 hoặc 2 OWNER.
   * - Gửi thông báo cho chủ mới qua NotificationService (OWNERSHIP_TRANSFERRED).
   */
  @Transactional
  public TransferOwnershipResponse transferOwnership(
      UUID tripId, UUID currentUserId, UUID newOwnerId) {
    // 1. Kiểm tra người gọi có phải là OWNER — nếu không phải ném AccessDeniedException -> 403
    tripAccessService.requireOwner(tripId, currentUserId);

    // 2. Kiểm tra newOwnerId hợp lệ và không chuyển cho chính mình
    if (newOwnerId == null || currentUserId.equals(newOwnerId)) {
      throw new IllegalArgumentException("Không thể chuyển quyền trưởng nhóm cho chính mình");
    }

    // 3. Người được chuyển phải là thành viên của đúng chuyến đó
    TripMemberEntity newOwnerMember =
        tripMemberRepository
            .findByTripIdAndUserId(tripId, newOwnerId)
            .orElseThrow(
                () ->
                    new IllegalArgumentException(
                        "Người được chuyển quyền phải là thành viên của chuyến đi"));

    if (newOwnerMember.getStatus() != TripMemberStatus.ACTIVE) {
      throw new IllegalArgumentException(
          "Người được chuyển quyền phải là thành viên đang tham gia chuyến đi");
    }

    TripEntity trip =
        tripRepository
            .findById(tripId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến đi"));

    // 4. Cập nhật quyền trong cùng 1 transaction:
    // a. Đặt người mới thành OWNER
    newOwnerMember.setRole(TripMemberRole.OWNER);
    tripMemberRepository.save(newOwnerMember);

    // b. Hạ chủ cũ xuống MEMBER
    TripMemberEntity oldOwnerMember =
        tripMemberRepository
            .findByTripIdAndUserId(tripId, currentUserId)
            .orElseGet(() -> new TripMemberEntity(trip, currentUserId, TripMemberRole.MEMBER));
    oldOwnerMember.setRole(TripMemberRole.MEMBER);
    tripMemberRepository.save(oldOwnerMember);

    // c. Cập nhật ownerId trên chuyến đi
    trip.setOwnerId(newOwnerId);
    tripRepository.save(trip);

    tripMemberRepository.flush();
    tripRepository.flush();

    log.info(
        "Chuyển quyền trưởng nhóm chuyến đi {} từ {} sang {}",
        tripId,
        currentUserId,
        newOwnerId);

    // 5. Gửi thông báo cho chủ mới qua NotificationService
    try {
      notificationService.sendInAppNotification(
          newOwnerId,
          "Chuyển quyền trưởng nhóm",
          "Bạn đã được chỉ định làm trưởng nhóm mới của chuyến đi: " + trip.getTitle(),
          NotificationType.OWNERSHIP_TRANSFERRED.name(),
          Map.of(
              "tripId", tripId.toString(),
              "tripTitle", trip.getTitle(),
              "previousOwnerId", currentUserId.toString()));
    } catch (Exception e) {
      log.warn(
          "Không thể gửi thông báo chuyển quyền tới user {}: {}", newOwnerId, e.getMessage());
    }

    return new TransferOwnershipResponse(
        tripId,
        currentUserId,
        newOwnerId,
        "Chuyển quyền trưởng nhóm thành công cho chuyến đi: " + trip.getTitle());
  }
}

