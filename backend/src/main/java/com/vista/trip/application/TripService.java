package com.vista.trip.application;

import com.vista.common.audit.AuditLogService;
import com.vista.trip.api.dto.CreateTripRequest;
import com.vista.trip.api.dto.TripResponse;
import com.vista.trip.api.dto.UpdateTripRequest;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripMemberEntity;
import com.vista.trip.domain.TripMemberRepository;
import com.vista.trip.domain.TripMemberRole;
import com.vista.trip.domain.TripMemberStatus;
import com.vista.trip.domain.TripRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class TripService {

  private final TripRepository tripRepository;
  private final TripMemberRepository tripMemberRepository;
  private final TripAccessService tripAccessService;
  private final AuditLogService auditLogService;

  public TripService(
      TripRepository tripRepository,
      TripMemberRepository tripMemberRepository,
      TripAccessService tripAccessService) {
    this(tripRepository, tripMemberRepository, tripAccessService, null);
  }

  @org.springframework.beans.factory.annotation.Autowired
  public TripService(
      TripRepository tripRepository,
      TripMemberRepository tripMemberRepository,
      TripAccessService tripAccessService,
      @org.springframework.beans.factory.annotation.Autowired(required = false)
          AuditLogService auditLogService) {
    this.tripRepository = tripRepository;
    this.tripMemberRepository = tripMemberRepository;
    this.tripAccessService = tripAccessService;
    this.auditLogService = auditLogService;
  }

  /** Tạo trip mới — owner tự động trở thành thành viên OWNER. */
  public TripResponse createTrip(UUID ownerId, CreateTripRequest request) {
    if (request.endDate() != null
        && request.startDate() != null
        && request.endDate().isBefore(request.startDate())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
    }

    TripEntity trip =
        new TripEntity(ownerId, request.title(), request.startDate(), request.endDate());
    if (request.destinationSummary() != null)
      trip.setDestinationSummary(request.destinationSummary());
    if (request.budgetTotal() != null) trip.setBudgetTotal(request.budgetTotal());
    if (request.currency() != null && !request.currency().isBlank())
      trip.setCurrency(request.currency());

    TripEntity saved = tripRepository.save(trip);

    // Owner cũng là member đầu tiên với role OWNER
    TripMemberEntity ownerMember = new TripMemberEntity(saved, ownerId, TripMemberRole.OWNER);
    tripMemberRepository.save(ownerMember);

    return TripResponse.from(tripRepository.findById(saved.getId()).orElseThrow());
  }

  /** Lấy thông tin trip — chỉ member hoặc owner mới xem được. */
  @Transactional(readOnly = true)
  public TripResponse getTrip(UUID tripId, UUID requesterId) {
    tripAccessService.requireMember(tripId, requesterId);
    TripEntity trip = findTripOrThrow(tripId);
    return TripResponse.from(trip);
  }

  /** Lấy danh sách trip của user hiện tại (owner + member). */
  @Transactional(readOnly = true)
  public List<TripResponse> getMyTrips(UUID userId) {
    return tripRepository.findAllAccessibleByUser(userId).stream().map(TripResponse::from).toList();
  }

  /** Cập nhật trip — chỉ owner mới được phép. */
  public TripResponse updateTrip(UUID tripId, UUID requesterId, UpdateTripRequest request) {
    tripAccessService.requireOwner(tripId, requesterId);
    TripEntity trip = findTripOrThrow(tripId);

    if (request.title() != null) trip.setTitle(request.title());
    if (request.startDate() != null) trip.setStartDate(request.startDate());
    if (request.endDate() != null) trip.setEndDate(request.endDate());
    if (request.destinationSummary() != null)
      trip.setDestinationSummary(request.destinationSummary());
    if (request.budgetTotal() != null) trip.setBudgetTotal(request.budgetTotal());
    if (request.currency() != null && !request.currency().isBlank())
      trip.setCurrency(request.currency());
    if (request.status() != null) trip.setStatus(request.status());
    if (request.visibility() != null) trip.setVisibility(request.visibility());

    return TripResponse.from(tripRepository.save(trip));
  }

  /** Xóa trip — chỉ owner mới được phép. */
  public void deleteTrip(UUID tripId, UUID requesterId) {
    tripAccessService.requireOwner(tripId, requesterId);
    TripEntity trip = findTripOrThrow(tripId);
    tripRepository.delete(trip);
    if (auditLogService != null) {
      auditLogService.logAction(
          requesterId,
          "DELETE_TRIP",
          "TRIP",
          tripId.toString(),
          "{\"title\":\"" + trip.getTitle() + "\"}");
    }
  }

  /** Xóa thành viên khỏi trip — chỉ owner hoặc chính họ mới được phép. */
  public void removeMember(UUID tripId, UUID targetUserId, UUID requesterId) {
    boolean isOwner = tripAccessService.isOwner(tripId, requesterId);
    boolean isSelf = requesterId.equals(targetUserId);

    if (!isOwner && !isSelf) {
      throw new AccessDeniedException("Bạn không có quyền xóa thành viên này");
    }
    // Owner không thể tự xóa chính mình
    if (isSelf && isOwner) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Chủ sở hữu không thể tự rời khỏi chuyến đi");
    }

    TripMemberEntity member =
        tripMemberRepository
            .findByTripIdAndUserId(tripId, targetUserId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong chuyến đi"));
    member.setStatus(TripMemberStatus.REMOVED);
    tripMemberRepository.save(member);
    if (auditLogService != null) {
      auditLogService.logAction(
          requesterId,
          "REMOVE_MEMBER",
          "TRIP",
          tripId.toString(),
          "{\"removedUserId\":\"" + targetUserId + "\"}");
    }
  }

  /** Rời khỏi trip (TV2 W4) — chỉ member tự rời, owner phải chuyển quyền trước. */
  public void leaveTrip(UUID tripId, UUID userId) {
    boolean isOwner = tripAccessService.isOwner(tripId, userId);
    if (isOwner) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Chủ sở hữu không thể tự rời chuyến đi. Vui lòng chuyển quyền trước.");
    }
    tripAccessService.requireMember(tripId, userId);

    TripMemberEntity member =
        tripMemberRepository
            .findByTripIdAndUserId(tripId, userId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong chuyến đi"));
    member.setStatus(TripMemberStatus.REMOVED);
    tripMemberRepository.save(member);
    if (auditLogService != null) {
      auditLogService.logAction(
          userId,
          "LEAVE_TRIP",
          "TRIP",
          tripId.toString(),
          "{\"userId\":\"" + userId + "\"}");
    }
  }

  /**
   * Chuyển quyền Owner (TV2 W4 / BR-01) — chỉ owner hiện tại mới được phép chuyển cho một active member.
   * Sử dụng isolation = SERIALIZABLE và flush tuần tự để chống Race Condition và đảm bảo invariant
   * chỉ duy nhất 1 OWNER tồn tại tại mọi thời điểm.
   */
  @Transactional(isolation = Isolation.SERIALIZABLE)
  public TripResponse transferOwner(UUID tripId, UUID currentUserId, UUID newOwnerId) {
    if (currentUserId.equals(newOwnerId)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Bạn đã là chủ sở hữu hiện tại của chuyến đi");
    }

    tripAccessService.requireOwner(tripId, currentUserId);

    TripEntity trip = findTripOrThrow(tripId);

    TripMemberEntity newOwnerMember =
        tripMemberRepository
            .findByTripIdAndUserId(tripId, newOwnerId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Người nhận quyền phải là thành viên của chuyến đi"));

    if (newOwnerMember.getStatus() != TripMemberStatus.ACTIVE) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Người nhận quyền phải là thành viên đang hoạt động");
    }

    TripMemberEntity oldOwnerMember =
        tripMemberRepository
            .findByTripIdAndUserId(tripId, currentUserId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy bản ghi thành viên của chủ sở hữu hiện tại"));

    // 1. Demote old owner to VIEWER first and flush to avoid violating uq_trip_single_active_owner
    oldOwnerMember.setRole(TripMemberRole.VIEWER);
    tripMemberRepository.saveAndFlush(oldOwnerMember);

    // 2. Promote new owner to OWNER and flush
    newOwnerMember.setRole(TripMemberRole.OWNER);
    tripMemberRepository.saveAndFlush(newOwnerMember);

    // 3. Update trip ownerId
    trip.setOwnerId(newOwnerId);
    TripEntity savedTrip = tripRepository.saveAndFlush(trip);

    if (auditLogService != null) {
      auditLogService.logAction(
          currentUserId,
          "TRANSFER_OWNER",
          "TRIP",
          tripId.toString(),
          String.format("{\"oldOwnerId\":\"%s\",\"newOwnerId\":\"%s\"}", currentUserId, newOwnerId));
    }

    return TripResponse.from(savedTrip);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private TripEntity findTripOrThrow(UUID tripId) {
    return tripRepository
        .findById(tripId)
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Không tìm thấy chuyến đi với ID: " + tripId));
  }
}
