package com.vista.ai.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Tiện ích làm sạch và kiểm tra tính hợp lệ của phản hồi JSON từ Gemini AI. */
public final class AiResponseValidator {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private AiResponseValidator() {}

  /** Làm sạch chuỗi phản hồi thô: bóc tách các khối markdown ```json hoặc ``` nếu có. */
  public static String sanitizeRawResponse(String rawText) {
    if (rawText == null || rawText.isBlank()) {
      return "";
    }
    String trimmed = rawText.trim();
    if (trimmed.startsWith("```json")) {
      trimmed = trimmed.substring(7);
    } else if (trimmed.startsWith("```")) {
      trimmed = trimmed.substring(3);
    }
    if (trimmed.endsWith("```")) {
      trimmed = trimmed.substring(0, trimmed.length() - 3);
    }
    return trimmed.trim();
  }

  /**
   * Phân tích và kiểm tra tính hợp lệ của JSON theo lược đồ kế hoạch du lịch.
   *
   * @param rawResponse phản hồi từ LLM
   * @return JsonNode đã phân tích
   * @throws IllegalArgumentException nếu JSON rỗng, lỗi cú pháp hoặc thiếu trường bắt buộc
   */
  public static JsonNode validateAndParseItinerary(String rawResponse) {
    String cleanJson = sanitizeRawResponse(rawResponse);
    if (cleanJson.isBlank()) {
      throw new IllegalArgumentException("AI response is empty");
    }

    JsonNode rootNode;
    try {
      rootNode = MAPPER.readTree(cleanJson);
    } catch (Exception e) {
      throw new IllegalArgumentException(
          "Invalid JSON format from AI response: " + e.getMessage(), e);
    }

    if (!rootNode.isObject()) {
      throw new IllegalArgumentException("AI response root must be a JSON object");
    }

    // Kiểm tra các trường bắt buộc
    validateField(rootNode, "tripTitle");
    validateField(rootNode, "destination");

    JsonNode daysNode = rootNode.get("days");
    if (daysNode == null || !daysNode.isArray() || daysNode.isEmpty()) {
      throw new IllegalArgumentException("AI response must contain non-empty 'days' array");
    }

    return rootNode;
  }

  private static void validateField(JsonNode node, String fieldName) {
    JsonNode field = node.get(fieldName);
    if (field == null || field.isNull() || (field.isTextual() && field.asText().isBlank())) {
      throw new IllegalArgumentException("Missing or empty required field: " + fieldName);
    }
  }
}
