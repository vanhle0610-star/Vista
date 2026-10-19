package com.vista.auth.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "Email không được để trống") @Email(message = "Email không đúng định dạng") String email,
    @NotBlank(message = "Mật khẩu không được để trống") @Size(min = 10, max = 128, message = "Mật khẩu tối thiểu 10 ký tự và tối đa 128 ký tự") String password,
    @NotBlank(message = "Tên hiển thị không được để trống") @Size(max = 120, message = "Tên hiển thị tối đa 120 ký tự") String displayName,
    @Pattern(
            regexp = "^$|^(\\+|00)?[0-9]{7,16}$",
            message =
                "Số điện thoại không đúng định dạng quốc tế (VD: +84912345678, +821012345678)")
        String phoneNumber) {

  public RegisterRequest(String email, String password, String displayName) {
    this(email, password, displayName, null);
  }
}
