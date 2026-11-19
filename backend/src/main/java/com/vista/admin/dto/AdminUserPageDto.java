package com.vista.admin.dto;

import java.util.List;

public record AdminUserPageDto(
    List<AdminUserSummaryDto> items, int page, int size, long total, int totalPages) {}
