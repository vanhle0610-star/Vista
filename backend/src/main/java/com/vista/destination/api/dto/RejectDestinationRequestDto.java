package com.vista.destination.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectDestinationRequestDto(
    @NotBlank(message = "Lý do từ chối không được để trống") @Size(min = 10, max = 500, message = "Lý do từ chối phải có độ dài từ 10 đến 500 ký tự") String reason) {}
