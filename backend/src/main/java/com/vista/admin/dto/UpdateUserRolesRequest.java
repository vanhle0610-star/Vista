package com.vista.admin.dto;

import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateUserRolesRequest(
    List<String> roles,
    String role,
    @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự") String reason) {}
