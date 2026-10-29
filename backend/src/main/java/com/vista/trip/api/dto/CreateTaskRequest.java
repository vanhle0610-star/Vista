package com.vista.trip.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record CreateTaskRequest(
    @NotBlank(message = "Tiêu đề nhiệm vụ không được để trống")
    String title,
    UUID assigneeId
) {}

