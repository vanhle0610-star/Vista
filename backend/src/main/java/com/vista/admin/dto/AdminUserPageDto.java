package com.vista.admin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record AdminUserPageDto(
    List<AdminUserSummaryDto> items, int page, int size, long total, int totalPages) {

  @JsonProperty("limit")
  public int limit() {
    return size;
  }
}
