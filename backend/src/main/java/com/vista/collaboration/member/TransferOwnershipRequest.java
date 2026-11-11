package com.vista.collaboration.member;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

@Schema(description = "Yêu cầu chuyển quyền trưởng nhóm chuyến đi")
public record TransferOwnershipRequest(
    @NotNull(message = "ID trưởng nhóm mới không được để trống")
    @Schema(description = "ID người dùng nhận quyền Owner (phải là thành viên ACTIVE của chuyến đi)")
    UUID newOwnerId
) {}

