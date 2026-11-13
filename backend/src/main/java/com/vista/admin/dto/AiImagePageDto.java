package com.vista.admin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record AiImagePageDto(
    List<DestinationImageAuditItemDto> items,
    int page,
    int size,
    long total,
    AiImageStatsDto stats) {

  @JsonProperty("limit")
  public int limit() {
    return size;
  }

  @JsonProperty("totalPages")
  public int totalPages() {
    return size > 0 ? (int) Math.ceil((double) total / size) : 0;
  }
}
