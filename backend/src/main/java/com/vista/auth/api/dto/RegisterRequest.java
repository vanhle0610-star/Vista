package com.vista.auth.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "Email không được để trống") @Email(message = "Email không đúng định dạng") String email,
    @NotBlank(message = "Mật khẩu không được để trống") @Size(min = 8, message = "Mật khẩu tối thiểu 8 ký tự") String password,
    @NotBlank(message = "Tên hiển thị không được để trống") @Size(max = 120, message = "Tên hiển thị tối đa 120 ký tự") String displayName) {}
