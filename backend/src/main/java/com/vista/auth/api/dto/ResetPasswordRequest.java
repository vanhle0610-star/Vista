package com.vista.auth.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu xác thực OTP và đổi mật khẩu mới")
public record ResetPasswordRequest(
    @NotBlank(message = "Email không được để trống")
    @Schema(description = "Email tài khoản", example = "traveler@vista.vn")
    String email,

    @NotBlank(message = "Mã OTP không được để trống")
    @Schema(description = "Mã xác thực OTP 6 số", example = "123456")
    String otp,

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 10, max = 128, message = "Mật khẩu mới phải từ 10 đến 128 ký tự")
    @Schema(description = "Mật khẩu mới", example = "NewStrongPassword2026!")
    String newPassword
) {}

