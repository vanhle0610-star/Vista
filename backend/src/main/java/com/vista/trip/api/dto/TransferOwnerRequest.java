package com.vista.trip.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

@Schema(description = "Yêu cầu chuyển quyền Chủ sở hữu chuyến đi (Transfer Owner)")
public record TransferOwnerRequest(
    @NotNull(message = "ID của chủ sở hữu mới không được để trống")
    @Schema(description = "ID người dùng nhận quyền Owner (phải là thành viên ACTIVE của chuyến đi)")
    UUID newOwnerId) {}

