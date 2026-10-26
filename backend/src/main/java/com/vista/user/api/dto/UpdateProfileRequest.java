package com.vista.user.api.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateProfileRequest(
    @Size(min = 1, max = 120, message = "Tên hiển thị không được vượt quá 120 ký tự") String displayName,
    @Pattern(
            regexp = "^$|^(\\+|00)?[0-9]{7,16}$",
            message = "Số điện thoại không đúng định dạng quốc tế (VD: +84912345678)")
        String phoneNumber,
    @Size(max = 2048, message = "URL ảnh đại diện không được vượt quá 2048 ký tự") String avatarUrl,
    @Size(max = 1000, message = "Tiểu sử giới thiệu không được vượt quá 1000 ký tự") String bio,
    @Size(max = 30, message = "Mã ngân hàng không hợp lệ") String bankCode,
    @Size(max = 10, message = "Mã BIN ngân hàng không hợp lệ") String bankBin,
    @Size(max = 50, message = "Số tài khoản ngân hàng không hợp lệ") String bankAccountNumber,
    @Size(max = 120, message = "Tên chủ tài khoản không được vượt quá 120 ký tự") String bankAccountName,
    List<String> travelPreferences) {

  public UpdateProfileRequest(String displayName, String phoneNumber, String avatarUrl) {
    this(displayName, phoneNumber, avatarUrl, null, null, null, null, null, null);
  }
}
