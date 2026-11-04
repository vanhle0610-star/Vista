package com.vista.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserStatusRequest(
    @NotBlank(message = "Trạng thái tài khoản không được để trống") String status,
    @Size(max = 500, message = "Lý do không được vượt quá 500 ký tự") String reason) {}
