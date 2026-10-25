package com.vista.trip.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateTripRequest(
    @NotBlank(message = "Tên chuyến đi không được để trống") @Size(max = 200, message = "Tên chuyến đi tối đa 200 ký tự") String title,
    @NotNull(message = "Ngày bắt đầu không được để trống") LocalDate startDate,
    @NotNull(message = "Ngày kết thúc không được để trống") LocalDate endDate,
    String destinationSummary,
    BigDecimal budgetTotal,

    /** Mã tiền tệ ISO 4217, mặc định VND. */
    String currency) {}
