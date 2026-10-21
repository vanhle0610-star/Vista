package com.vista.collaboration.invitation;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.trip.application.TripAccessService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InvitationService {

  private final InvitationRepository invitationRepository;
  private final TripAccessService tripAccessService;

  public InvitationService(
      InvitationRepository invitationRepository,
      TripAccessService tripAccessService) {
    this.invitationRepository = invitationRepository;
    this.tripAccessService = tripAccessService;
  }

  public InvitationResponse createInvitation(
      UUID tripId, UUID userId, CreateInvitationRequest request) {
    tripAccessService.requireMember(tripId, userId);

    if (invitationRepository.existsByTripIdAndInviteeEmailAndStatus(
        tripId, request.getInviteeEmail(), InvitationStatus.PENDING)) {
      throw new ConflictException(
          "Lời mời cho email '" + request.getInviteeEmail() + "' đang ở trạng thái PENDING");
    }

    // Sinh raw token ngẫu nhiên, lưu SHA-256 hash vào DB
    String rawToken = UUID.randomUUID().toString().replace("-", "");
    String tokenHash = sha256Hex(rawToken);

    Instant expiresAt =
        request.getExpiresAt() != null
            ? request.getExpiresAt()
            : Instant.now().plus(7, ChronoUnit.DAYS);

    Invitation invitation =
        new Invitation(tripId, userId, request.getInviteeEmail(), tokenHash, expiresAt);
    Invitation saved = invitationRepository.save(invitation);

    // Trả về response kèm rawToken để gửi link cho người dùng
    return InvitationResponse.from(saved);
  }

  public void revokeInvitation(UUID invitationId, UUID userId) {
    Invitation invitation = findOrThrow(invitationId);

    tripAccessService.requireOwner(invitation.getTripId(), userId);

    if (invitation.getStatus() != InvitationStatus.PENDING) {
      throw new ConflictException("Chỉ có thể thu hồi lời mời đang ở trạng thái PENDING");
    }
    invitation.setStatus(InvitationStatus.REVOKED);
    invitationRepository.save(invitation);
  }

  public InvitationResponse acceptInvitation(String rawToken, UUID userId) {
    Invitation invitation = findByTokenOrThrow(rawToken);

    if (invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(Instant.now())) {
      invitation.setStatus(InvitationStatus.EXPIRED);
      invitationRepository.save(invitation);
      throw new ConflictException("Lời mời tham gia chuyến đi đã hết hạn");
    }
    if (invitation.getStatus() != InvitationStatus.PENDING) {
      throw new ConflictException(
          "Lời mời không ở trạng thái PENDING (hiện tại: " + invitation.getStatus() + ")");
    }

    invitation.setStatus(InvitationStatus.ACCEPTED);
    return InvitationResponse.from(invitationRepository.save(invitation));
  }

  public InvitationResponse declineInvitation(String rawToken, UUID userId) {
    Invitation invitation = findByTokenOrThrow(rawToken);

    if (invitation.getStatus() != InvitationStatus.PENDING) {
      throw new ConflictException(
          "Lời mời không ở trạng thái PENDING (hiện tại: " + invitation.getStatus() + ")");
    }
    invitation.setStatus(InvitationStatus.DECLINED);
    return InvitationResponse.from(invitationRepository.save(invitation));
  }

  // ── Private helpers ────────────────────────────────────────────────────────

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

  private static String sha256Hex(String input) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] bytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(bytes);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 không khả dụng", e);
    }
  }
}
