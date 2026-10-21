package com.vista.collaboration.invitation;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.UUID;

/**
 * Response cho lời mời chuyến đi.
 *
 * <p>{@code rawToken} và {@code inviteLink} chỉ có giá trị ngay sau khi TẠO lời mời —
 * sau đó 2 trường này là null (token gốc không bao giờ lưu vào DB).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record InvitationResponse(
    UUID id,
    UUID tripId,
    UUID invitedBy,
    String inviteeEmail,
    InvitationStatus status,
    Instant expiresAt,
    Instant createdAt,
    /** Raw token — chỉ trả về 1 lần duy nhất khi tạo, sau đó null. */
    String rawToken,
    /** Link mời hoàn chỉnh — chỉ trả về 1 lần duy nhất khi tạo, sau đó null. */
    String inviteLink) {

  /** Factory cho các operation không cần trả token (revoke, accept, decline). */
  public static InvitationResponse from(Invitation inv) {
    return new InvitationResponse(
        inv.getId(),
        inv.getTripId(),
        inv.getInvitedBy(),
        inv.getInviteeEmail(),
        inv.getStatus(),
        inv.getExpiresAt(),
        inv.getCreatedAt(),
        null,
        null);
  }

  /** Factory khi tạo mới — trả kèm rawToken và inviteLink. */
  public static InvitationResponse fromCreated(Invitation inv, String rawToken, String baseUrl) {
    String link = baseUrl + "/invite/" + rawToken;
    return new InvitationResponse(
        inv.getId(),
        inv.getTripId(),
        inv.getInvitedBy(),
        inv.getInviteeEmail(),
        inv.getStatus(),
        inv.getExpiresAt(),
        inv.getCreatedAt(),
        rawToken,
        link);
  }
}
