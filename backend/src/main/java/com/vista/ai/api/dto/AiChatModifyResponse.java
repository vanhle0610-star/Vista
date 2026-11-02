package com.vista.ai.api.dto;

import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedActivityResponse;

/**
 * Phản hồi chỉnh sửa lịch trình tức thì từ Trợ lý Chat AI Co-Pilot.
 */
public record AiChatModifyResponse(
    String assistantMessage,
    String actionType,
    int targetDayNumber,
    String targetTimeSlot,
    SuggestedActivityResponse replacementActivity,
    String updatedTimeRange) {}

