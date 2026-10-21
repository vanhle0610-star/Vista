package com.vista.collaboration.itinerary;

import java.util.UUID;

/**
 * Một cảnh báo trong kết quả validate lịch trình.
 * code: mã lỗi (TIME_OVERLAP, OUT_OF_TRIP_DATE, INVALID_TIME_RANGE).
 * dayId: ngày liên quan (null nếu không xác định được).
 * itemId: điểm dừng liên quan (null nếu là lỗi cấp ngày).
 * message: mô tả rõ ràng bằng tiếng Việt.
 */
public record ItineraryValidationWarning(
    String code,
    UUID dayId,
    UUID itemId,
    String message) {}
