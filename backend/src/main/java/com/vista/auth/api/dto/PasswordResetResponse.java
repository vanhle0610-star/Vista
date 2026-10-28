package com.vista.auth.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Kết quả yêu cầu khôi phục mật khẩu")
public record PasswordResetResponse(
    @Schema(description = "Thông báo kết quả", example = "Mã xác thực đã được gửi đến email của bạn")
    String message,

    @Schema(description = "Mã OTP mô phỏng môi trường phát triển (Dev mode)", example = "849201")
    String devOtp
) {}

