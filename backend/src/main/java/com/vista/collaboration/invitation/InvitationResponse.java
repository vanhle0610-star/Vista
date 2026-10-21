package com.vista.collaboration.invitation;

import java.time.Instant;
import java.util.UUID;

public record InvitationResponse(
    UUID id,
    UUID tripId,
    UUID invitedBy,
    String inviteeEmail,
    InvitationStatus status,
    Instant expiresAt,
    Instant createdAt
) {
  public static InvitationResponse from(Invitation inv) {
    return new InvitationResponse(
        inv.getId(),
        inv.getTripId(),
        inv.getInvitedBy(),
        inv.getInviteeEmail(),
        inv.getStatus(),
        inv.getExpiresAt(),
        inv.getCreatedAt());
  }
}
