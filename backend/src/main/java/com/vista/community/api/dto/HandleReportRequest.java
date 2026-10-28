package com.vista.community.api.dto;

import jakarta.validation.constraints.NotBlank;

public record HandleReportRequest(
    @NotBlank(message = "Hành động xử lý không được để trống (HIDE hoặc DISMISS)") String action,
    String note) {
  public String normalizedAction() {
    return action == null ? "" : action.trim().toUpperCase();
  }
}
