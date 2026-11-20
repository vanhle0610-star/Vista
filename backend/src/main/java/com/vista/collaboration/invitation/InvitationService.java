package com.vista.collaboration.invitation;

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
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class InvitationService {

  private final InvitationRepository invitationRepository;
  private final TripAccessService tripAccessService;
  private final TripRepository tripRepository;
  private final TripMemberRepository tripMemberRepository;
  private final NotificationService notificationService;
  private final UserRepository userRepository;

  @Value("${vista.app.base-url:http://localhost:3000}")
  private String appBaseUrl;

  @Autowired
  public InvitationService(
      InvitationRepository invitationRepository,
      TripAccessService tripAccessService,
      TripRepository tripRepository,
      TripMemberRepository tripMemberRepository,
      @Autowired(required = false) NotificationService notificationService,
      @Autowired(required = false) UserRepository userRepository) {
    this.invitationRepository = invitationRepository;
    this.tripAccessService = tripAccessService;
    this.tripRepository = tripRepository;
    this.tripMemberRepository = tripMemberRepository;
    this.notificationService = notificationService;
    this.userRepository = userRepository;
  }

  public InvitationService(
      InvitationRepository invitationRepository,
      TripAccessService tripAccessService,
      TripRepository tripRepository,
      TripMemberRepository tripMemberRepository) {
    this(invitationRepository, tripAccessService, tripRepository, tripMemberRepository, null, null);
  }

  // ── W3-TV3-01: Tạo lời mời ────────────────────────────────────────────────

  public InvitationResponse createInvitation(
      UUID tripId, UUID userId, CreateInvitationRequest request) {
    tripAccessService.requireMember(tripId, userId);

    // Kiểm tra trip tồn tại
    TripEntity trip =
        tripRepository
            .findById(tripId)
            .orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy chuyến đi với ID: " + tripId));

    if (invitationRepository.existsByTripIdAndInviteeEmailAndStatus(
        tripId, request.getInviteeEmail(), InvitationStatus.PENDING)) {
      throw new ConflictException(
          "Lời mời cho email '" + request.getInviteeEmail() + "' đang ở trạng thái PENDING");
    }

    // Không cho phép mời người đã là thành viên trong chuyến đi (bao gồm cả Owner)
    if (userRepository != null) {
      userRepository
          .findByEmailIgnoreCase(request.getInviteeEmail())
          .ifPresent(
              existingUser -> {
                if (tripAccessService.isMember(tripId, existingUser.getId())) {
                  throw new ConflictException(
                      "Người dùng với email '"
                          + request.getInviteeEmail()
                          + "' đã là thành viên trong chuyến đi này");
                }
              });
    }

    // Sinh raw token ngẫu nhiên đủ mạnh (256-bit entropy), chỉ lưu SHA-256 hash vào DB
    String rawToken =
        UUID.randomUUID().toString().replace("-", "")
            + UUID.randomUUID().toString().replace("-", "");
    String tokenHash = sha256Hex(rawToken);

    Instant expiresAt =
        request.getExpiresAt() != null
            ? request.getExpiresAt()
            : Instant.now().plus(7, ChronoUnit.DAYS);

    Invitation invitation =
        new Invitation(tripId, userId, request.getInviteeEmail(), tokenHash, expiresAt);
    Invitation saved = invitationRepository.save(invitation);

    // W5-TV3-03: Gửi thông báo INVITE_RECEIVED nếu người được mời đã có tài khoản
    if (notificationService != null && userRepository != null) {
      userRepository
          .findByEmailIgnoreCase(request.getInviteeEmail())
          .ifPresent(
              inviteeUser ->
                  notificationService.sendInAppNotification(
                      inviteeUser.getId(),
                      "Lời mời tham gia chuyến đi",
                      "Bạn nhận được lời mời tham gia chuyến đi '" + trip.getTitle() + "'",
                      NotificationType.INVITE_RECEIVED.name(),
                      Map.of(
                          "tripId", tripId.toString(),
                          "invitationId", saved.getId().toString())));
    }

    // Trả về response kèm rawToken + inviteLink — chỉ 1 lần duy nhất
    return InvitationResponse.fromCreated(saved, rawToken, appBaseUrl);
  }

  // ── W3-TV3-01: Thu hồi lời mời (chỉ OWNER) ───────────────────────────────

  public void revokeInvitation(UUID invitationId, UUID userId) {
    Invitation invitation = findOrThrow(invitationId);
    tripAccessService.requireOwner(invitation.getTripId(), userId);

    if (invitation.getStatus() != InvitationStatus.PENDING) {
      throw new ConflictException("Chỉ có thể thu hồi lời mời đang ở trạng thái PENDING");
    }
    invitation.setStatus(InvitationStatus.REVOKED);
    invitationRepository.save(invitation);
  }

  // ── W3-TV3-02: Chấp nhận lời mời + thêm vào trip_members ─────────────────

  public InvitationResponse acceptInvitation(String rawToken, UUID userId) {
    return acceptInvitation(rawToken, userId, null);
  }

  public InvitationResponse acceptInvitation(String rawToken, UUID userId, String userEmail) {
    Invitation invitation = findByTokenOrThrow(rawToken);

    // W6-TV3-03: Kiểm tra đã bị thu hồi
    if (invitation.getStatus() == InvitationStatus.REVOKED) {
      throw new ConflictException("Lời mời tham gia chuyến đi đã bị thu hồi (REVOKED)");
    }

    // W6-TV3-03: Kiểm tra hết hạn
    if (invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(Instant.now())) {
      invitation.setStatus(InvitationStatus.EXPIRED);
      invitationRepository.save(invitation);
      throw new ConflictException("Lời mời tham gia chuyến đi đã hết hạn (EXPIRED)");
    }
    if (invitation.getStatus() == InvitationStatus.EXPIRED) {
      throw new ConflictException("Lời mời tham gia chuyến đi đã hết hạn (EXPIRED)");
    }

    // Kiểm tra trạng thái PENDING
    if (invitation.getStatus() != InvitationStatus.PENDING) {
      throw new ConflictException(
          "Lời mời không ở trạng thái PENDING (hiện tại: " + invitation.getStatus() + ")");
    }

    // Kiểm tra người dùng khớp với inviteeEmail
    verifyInviteeEmail(invitation, userId, userEmail);

    // Thêm user vào trip_members với vai trò MEMBER
    UUID tripId = invitation.getTripId();
    addTripMember(tripId, userId);

    invitation.setStatus(InvitationStatus.ACCEPTED);
    Invitation saved = invitationRepository.save(invitation);

    // W5-TV3-03: Gửi thông báo INVITE_ACCEPTED cho người mời và toàn bộ thành viên
    if (notificationService != null) {
      TripEntity trip = tripRepository.findById(tripId).orElse(null);
      String tripTitle = trip != null ? trip.getTitle() : "chuyến đi";

      notificationService.sendInAppNotification(
          invitation.getInvitedBy(),
          "Lời mời đã được chấp nhận",
          "Thành viên mới đã chấp nhận lời mời tham gia '" + tripTitle + "'",
          NotificationType.INVITE_ACCEPTED.name(),
          Map.of("tripId", tripId.toString(), "acceptedBy", userId.toString()));

      notificationService.notifyTripMembers(
          tripId,
          "Thành viên mới gia nhập",
          "Một thành viên mới đã tham gia chuyến đi '" + tripTitle + "'",
          NotificationType.INVITE_ACCEPTED.name(),
          userId);
    }

    return InvitationResponse.from(saved);
  }

  // ── W4-TV3-03: Xem trước lời mời theo raw token (deep link / nhập mã) ────

  /**
   * Xem trước thông tin lời mời bằng raw token — không yêu cầu đăng nhập. Dùng cho deep link (bấm
   * link mở app) hoặc nhập mã thủ công. Trả về thông tin chuyến đi + trạng thái lời mời để người
   * dùng quyết định chấp nhận/từ chối. Không thay đổi trạng thái.
   */
  @Transactional(readOnly = true)
  public InvitationPreviewResponse previewInvitation(String rawToken) {
    Invitation invitation = findByTokenOrThrow(rawToken);
    TripEntity trip =
        tripRepository
            .findById(invitation.getTripId())
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "Chuyến đi không tồn tại: " + invitation.getTripId()));

    boolean expired =
        invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(Instant.now());
    InvitationStatus effectiveStatus =
        (expired && invitation.getStatus() == InvitationStatus.PENDING)
            ? InvitationStatus.EXPIRED
            : invitation.getStatus();

    return new InvitationPreviewResponse(
        invitation.getId(),
        invitation.getTripId(),
        trip.getTitle(),
        trip.getStartDate(),
        trip.getEndDate(),
        invitation.getInviteeEmail(),
        effectiveStatus,
        invitation.getExpiresAt(),
        invitation.getCreatedAt());
  }

  // ── W3-TV3-02: Từ chối lời mời ───────────────────────────────────────────

  public InvitationResponse declineInvitation(String rawToken, UUID userId) {
    return declineInvitation(rawToken, userId, null);
  }

  public InvitationResponse declineInvitation(String rawToken, UUID userId, String userEmail) {
    Invitation invitation = findByTokenOrThrow(rawToken);

    if (invitation.getStatus() != InvitationStatus.PENDING) {
      throw new ConflictException(
          "Lời mời không ở trạng thái PENDING (hiện tại: " + invitation.getStatus() + ")");
    }
    verifyInviteeEmail(invitation, userId, userEmail);
    invitation.setStatus(InvitationStatus.DECLINED);
    return InvitationResponse.from(invitationRepository.save(invitation));
  }

  // ── W3-TV3-02 & W6-TV3-03: Danh sách lời mời của chuyến đi ───────────────────────────

  public List<InvitationResponse> listInvitations(UUID tripId, UUID userId) {
    tripAccessService.requireMember(tripId, userId);
    List<Invitation> list = invitationRepository.findByTripIdOrderByCreatedAtDesc(tripId);
    Instant now = Instant.now();
    for (Invitation inv : list) {
      if (inv.getStatus() == InvitationStatus.PENDING
          && inv.getExpiresAt() != null
          && inv.getExpiresAt().isBefore(now)) {
        inv.setStatus(InvitationStatus.EXPIRED);
        invitationRepository.save(inv);
      }
    }
    return list.stream().map(InvitationResponse::from).toList();
  }

  // ── W7-SSOT: Lấy danh sách lời mời đang chờ của người dùng hiện tại ─────────

  @Transactional(readOnly = true)
  public List<MyPendingInvitationResponse> getMyPendingInvitations(UUID currentUserId, String email) {
    String searchEmail = email;
    if (searchEmail == null || searchEmail.isBlank()) {
      if (userRepository != null) {
        searchEmail = userRepository.findById(currentUserId).map(UserEntity::getEmail).orElse(null);
      }
    }
    if (searchEmail == null || searchEmail.isBlank()) {
      return List.of();
    }

    List<Invitation> list =
        invitationRepository.findByInviteeEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(
            searchEmail.trim(), InvitationStatus.PENDING);
    Instant now = Instant.now();
    List<MyPendingInvitationResponse> result = new ArrayList<>();

    for (Invitation inv : list) {
      if (inv.getExpiresAt() != null && inv.getExpiresAt().isBefore(now)) {
        continue;
      }
      TripEntity trip = tripRepository.findById(inv.getTripId()).orElse(null);
      String tripTitle = trip != null ? trip.getTitle() : "Chuyến đi VISTA";
      String destSummary = trip != null ? trip.getDestinationSummary() : null;
      LocalDate startDate = trip != null ? trip.getStartDate() : null;
      LocalDate endDate = trip != null ? trip.getEndDate() : null;

      String inviterName = "Trưởng nhóm";
      String inviterAvatar = null;
      if (userRepository != null) {
        UserEntity inviter = userRepository.findById(inv.getInvitedBy()).orElse(null);
        if (inviter != null) {
          inviterName = inviter.getDisplayName();
          inviterAvatar = inviter.getAvatarUrl();
        }
      }

      result.add(
          new MyPendingInvitationResponse(
              inv.getId(),
              inv.getTripId(),
              tripTitle,
              destSummary,
              startDate,
              endDate,
              inv.getInvitedBy(),
              inviterName,
              inviterAvatar,
              inv.getStatus(),
              inv.getExpiresAt(),
              inv.getCreatedAt()));
    }

    return result;
  }

  // ── W7-SSOT: Chấp nhận lời mời trực tiếp bằng ID (từ Navbar) ───────────────

  public InvitationResponse acceptInvitationById(UUID invitationId, UUID userId) {
    return acceptInvitationById(invitationId, userId, null);
  }

  public InvitationResponse acceptInvitationById(UUID invitationId, UUID userId, String userEmail) {
    Invitation invitation = findOrThrow(invitationId);

    if (invitation.getStatus() != InvitationStatus.PENDING) {
      throw new ConflictException(
          "Lời mời không ở trạng thái PENDING (hiện tại: " + invitation.getStatus() + ")");
    }
    if (invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(Instant.now())) {
      invitation.setStatus(InvitationStatus.EXPIRED);
      invitationRepository.save(invitation);
      throw new ConflictException("Lời mời đã hết hạn");
    }

    verifyInviteeEmail(invitation, userId, userEmail);

    UUID tripId = invitation.getTripId();
    addTripMember(tripId, userId);

    invitation.setStatus(InvitationStatus.ACCEPTED);
    Invitation saved = invitationRepository.save(invitation);

    if (notificationService != null) {
      TripEntity trip = tripRepository.findById(tripId).orElse(null);
      String tripTitle = trip != null ? trip.getTitle() : "chuyến đi";

      notificationService.sendInAppNotification(
          invitation.getInvitedBy(),
          "Lời mời đã được chấp nhận",
          "Thành viên mới đã chấp nhận lời mời tham gia '" + tripTitle + "'",
          NotificationType.INVITE_ACCEPTED.name(),
          Map.of("tripId", tripId.toString(), "acceptedBy", userId.toString()));

      notificationService.notifyTripMembers(
          tripId,
          "Thành viên mới gia nhập",
          "Một thành viên mới đã tham gia chuyến đi '" + tripTitle + "'",
          NotificationType.INVITE_ACCEPTED.name(),
          userId);
    }

    return InvitationResponse.from(saved);
  }

  // ── W7-SSOT: Từ chối lời mời bằng ID (từ Navbar) ───────────────────────────

  public InvitationResponse declineInvitationById(UUID invitationId, UUID userId) {
    return declineInvitationById(invitationId, userId, null);
  }

  public InvitationResponse declineInvitationById(UUID invitationId, UUID userId, String userEmail) {
    Invitation invitation = findOrThrow(invitationId);

    if (invitation.getStatus() != InvitationStatus.PENDING) {
      throw new ConflictException(
          "Lời mời không ở trạng thái PENDING (hiện tại: " + invitation.getStatus() + ")");
    }
    verifyInviteeEmail(invitation, userId, userEmail);
    invitation.setStatus(InvitationStatus.DECLINED);
    return InvitationResponse.from(invitationRepository.save(invitation));
  }

  /**
   * Kiểm tra người thao tác (userId / email) có phải đúng là người được mời (inviteeEmail).
   * Nếu không khớp -> trả HTTP 403 Forbidden theo nguyên tắc bảo mật RBAC.
   */
  public void verifyInviteeEmail(Invitation invitation, UUID userId, String explicitEmail) {
    String inviteeEmail = invitation.getInviteeEmail();
    if (inviteeEmail == null || inviteeEmail.isBlank()) {
      return;
    }
    String userEmail = explicitEmail != null && !explicitEmail.isBlank() ? explicitEmail.trim() : null;
    if (userEmail == null && userRepository != null && userId != null) {
      userEmail = userRepository.findById(userId).map(UserEntity::getEmail).orElse(null);
    }
    if (userEmail == null || !inviteeEmail.trim().equalsIgnoreCase(userEmail.trim())) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Lời mời này được gửi đến "
              + inviteeEmail
              + ". Bạn đang đăng nhập bằng "
              + (userEmail != null ? userEmail : "tài khoản khác")
              + ", không có quyền thực hiện thao tác này.");
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Thêm user vào trip_members với role MEMBER. Dùng TripMemberRepository trực tiếp (TV2 đã expose
   * qua domain layer). Nếu đã là member (ACTIVE) thì bỏ qua. Nếu bị REMOVED thì kích hoạt lại.
   */
  private void addTripMember(UUID tripId, UUID userId) {
    TripEntity trip =
        tripRepository
            .findById(tripId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Trip không tồn tại: " + tripId));

    tripMemberRepository
        .findByTripIdAndUserId(tripId, userId)
        .ifPresentOrElse(
            existing -> {
              if (existing.getStatus() == TripMemberStatus.REMOVED) {
                existing.setStatus(TripMemberStatus.ACTIVE);
                existing.setJoinedAt(Instant.now());
                tripMemberRepository.save(existing);
              }
              // Nếu đã ACTIVE thì không làm gì
            },
            () -> {
              TripMemberEntity member = new TripMemberEntity(trip, userId, TripMemberRole.VIEWER);
              tripMemberRepository.save(member);
            });
  }

  private Invitation findOrThrow(UUID id) {
    return invitationRepository
        .findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lời mời với ID: " + id));
  }

  private Invitation findByTokenOrThrow(String rawToken) {
    String hash = sha256Hex(rawToken);
    return invitationRepository
        .findByTokenHash(hash)
        .orElseThrow(() -> new ResourceNotFoundException("Token lời mời không tồn tại"));
  }

  public static String sha256Hex(String input) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] bytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(bytes);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 không khả dụng", e);
    }
  }
}
