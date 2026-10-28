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
import java.time.temporal.ChronoUnit;
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
    Invitation invitation = findByTokenOrThrow(rawToken);

    if (invitation.getStatus() != InvitationStatus.PENDING) {
      throw new ConflictException(
          "Lời mời không ở trạng thái PENDING (hiện tại: " + invitation.getStatus() + ")");
    }
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
