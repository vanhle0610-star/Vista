package com.vista.collaboration.member;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

@Schema(description = "Phản hồi kết quả chuyển quyền trưởng nhóm chuyến đi")
public record TransferOwnershipResponse(
    @Schema(description = "ID chuyến đi")
    UUID tripId,

    @Schema(description = "ID trưởng nhóm cũ")
    UUID previousOwnerId,

    @Schema(description = "ID trưởng nhóm mới")
    UUID newOwnerId,

    @Schema(description = "Thông báo kết quả")
    String message
) {}

