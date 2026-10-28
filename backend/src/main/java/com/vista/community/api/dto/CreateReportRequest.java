package com.vista.community.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateReportRequest(
    @NotBlank(message = "Lý do báo cáo không được để trống") @Size(max = 500, message = "Lý do báo cáo tối đa 500 ký tự") String reason,
    String targetType) {
  public String resolvedTargetType() {
    return (targetType == null || targetType.isBlank()) ? "POST" : targetType.toUpperCase();
  }
}
