package com.vista.ai.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;

/**
 * Yêu cầu chỉnh sửa lịch trình tương tác qua Trợ lý Chat AI Co-Pilot.
 */
public record AiChatModifyRequest(
    @NotBlank(message = "Điểm đến không được để trống") String destinationProvince,
    @NotBlank(message = "Câu lệnh yêu cầu không được để trống") String userInstruction,
    Integer targetDayNumber,
    String budgetLevel,
    Integer peopleCount,
    String travelWith,
    List<UUID> currentDestinationIds) {}

