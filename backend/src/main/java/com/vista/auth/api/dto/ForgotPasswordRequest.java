package com.vista.auth.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Yêu cầu gửi mã OTP khôi phục mật khẩu")
public record ForgotPasswordRequest(
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    @Schema(description = "Email tài khoản cần khôi phục", example = "traveler@vista.vn")
    String email
) {}

