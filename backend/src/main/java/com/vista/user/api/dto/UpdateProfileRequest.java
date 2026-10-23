package com.vista.user.api.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(min = 1, max = 120, message = "Tên hiển thị không được vượt quá 120 ký tự") String displayName,
    @Pattern(
            regexp = "^$|^(\\+|00)?[0-9]{7,16}$",
            message = "Số điện thoại không đúng định dạng quốc tế (VD: +84912345678)")
        String phoneNumber,
    @Size(max = 2048, message = "URL ảnh đại diện không được vượt quá 2048 ký tự") String avatarUrl) {}
