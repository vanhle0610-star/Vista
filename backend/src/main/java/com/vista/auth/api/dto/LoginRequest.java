package com.vista.auth.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @NotBlank(message = "Email không được để trống") @Email(message = "Email không đúng định dạng") String email,
    @NotBlank(message = "Mật khẩu không được để trống") @Size(min = 8, message = "Mật khẩu tối thiểu 8 ký tự") String password) {}
