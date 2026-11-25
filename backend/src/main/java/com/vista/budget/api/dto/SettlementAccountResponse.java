package com.vista.budget.api.dto;

import java.util.UUID;

/** Thông tin tài khoản nhận tiền quyết toán của thành viên trong chuyến đi (TV4). */
public record SettlementAccountResponse(
    UUID userId,
    String displayName,
    String bankCode,
    String bankBin,
    String bankAccountNumber,
    String bankAccountName) {}
