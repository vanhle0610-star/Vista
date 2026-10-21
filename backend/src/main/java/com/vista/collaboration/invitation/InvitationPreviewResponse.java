package com.vista.collaboration.invitation;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * W4-TV3-03: Thông tin xem trước lời mời — trả về khi người dùng bấm deep link hoặc nhập mã mời.
 * Không yêu cầu đăng nhập để xem.
 */
public record InvitationPreviewResponse(
    UUID invitationId,
    UUID tripId,
    String tripTitle,
    LocalDate tripStartDate,
    LocalDate tripEndDate,
    String inviteeEmail,
    InvitationStatus status,
    Instant expiresAt,
    Instant createdAt) {}
