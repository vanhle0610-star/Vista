package com.vista.admin.dto;

public record AdminUserStatsDto(
    long totalUsers,
    long activeUsers,
    long lockedUsers,
    long newUsersLast30Days,
    long newUsersLast7Days,
    long adminCount,
    long moderatorCount,
    long regularUserCount) {}
