package com.vista.collaboration.invitation;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record MyPendingInvitationResponse(
    UUID id,
    UUID tripId,
    String tripTitle,
    String destinationSummary,
    LocalDate startDate,
    LocalDate endDate,
    UUID inviterId,
    String inviterName,
    String inviterAvatar,
    InvitationStatus status,
    Instant expiresAt,
    Instant createdAt) {}
