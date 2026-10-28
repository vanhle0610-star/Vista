package com.vista.ai.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Tiện ích làm sạch và kiểm tra tính hợp lệ của phản hồi JSON từ AI (Gemini / Local LLM). */
public final class AiResponseValidator {

  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final int MAX_DAYS = 7;
  private static final int MAX_ACTIVITIES_PER_DAY = 12;
  private static final Set<String> ALLOWED_TIME_SLOTS = Set.of("MORNING", "AFTERNOON", "EVENING");

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

    // Chuẩn hóa và dung sai các trường metadata root (hỗ trợ alias cho model nhỏ)
    normalizeRootField(
        rootNode, "tripTitle", List.of("title", "planTitle", "name"), "Lịch trình gợi ý");
    normalizeRootField(
        rootNode,
        "destination",
        List.of("province", "destinationProvince", "location", "city"),
        "Điểm đến");

    JsonNode daysNode = rootNode.get("days");
    if (daysNode == null || !daysNode.isArray() || daysNode.isEmpty()) {
      throw new IllegalArgumentException("AI response must contain non-empty 'days' array");
    }
    if (daysNode.size() > MAX_DAYS) {
      throw new IllegalArgumentException("AI response exceeds maximum number of days");
    }

    int actualDaysSize = daysNode.size();
    int expectedTotalDays = rootNode.path("totalDays").asInt(actualDaysSize);
    if (expectedTotalDays < 1 || expectedTotalDays > MAX_DAYS) {
      expectedTotalDays = actualDaysSize;
    }
    // Dung sai cho model nhỏ: nếu totalDays lệch với kích thước mảng days thật, tự đồng bộ theo kích thước mảng days
    if (rootNode instanceof ObjectNode objectNode) {
      objectNode.put("totalDays", actualDaysSize);
    }
    expectedTotalDays = actualDaysSize;

    int dayIdx = 1;
    for (JsonNode day : daysNode) {
      int dayNumber = day.path("dayNumber").asInt(dayIdx);
      if (dayNumber < 1 || dayNumber > expectedTotalDays) {
        dayNumber = dayIdx;
        if (day instanceof ObjectNode dayObj) {
          dayObj.put("dayNumber", dayNumber);
        }
      }
      dayIdx++;

      JsonNode activities = day.get("activities");
      if (activities == null || !activities.isArray() || activities.isEmpty()) {
        throw new IllegalArgumentException("Each day must contain at least one activity");
      }
      if (activities.size() > MAX_ACTIVITIES_PER_DAY) {
        throw new IllegalArgumentException("A day contains too many activities");
      }
      for (JsonNode activity : activities) {
        validateActivity(activity);
      }
    }

    return rootNode;
  }

  /**
   * Thử đúng một lần sửa lỗi cú pháp JSON phổ biến hoàn toàn nội bộ. Không gọi lại model và không
   * thay đổi dữ liệu nghiệp vụ hoặc destinationId.
   */
  public static JsonNode validateAndParseItineraryWithLocalRepair(String rawResponse) {
    try {
      return validateAndParseItinerary(rawResponse);
    } catch (IllegalArgumentException firstFailure) {
      if (!firstFailure.getMessage().startsWith("Invalid JSON format")) throw firstFailure;
      String repaired = repairJsonSyntaxOnly(rawResponse);
      if (repaired.equals(sanitizeRawResponse(rawResponse))) throw firstFailure;
      return validateAndParseItinerary(repaired);
    }
  }

  private static String repairJsonSyntaxOnly(String rawResponse) {
    String value = sanitizeRawResponse(rawResponse);
    int objectStart = value.indexOf('{');
    int objectEnd = value.lastIndexOf('}');
    if (objectStart >= 0 && objectEnd > objectStart) {
      value = value.substring(objectStart, objectEnd + 1);
    }
    return value.replaceAll(",(\\s*[}\\]])", "$1");
  }

  private static void validateActivity(JsonNode activity) {
    try {
      UUID.fromString(activity.path("destinationId").asText());
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException("Activity destinationId must be a valid UUID", exception);
    }

    String timeSlot = activity.path("timeSlot").asText("").trim().toUpperCase();
    if (!ALLOWED_TIME_SLOTS.contains(timeSlot)) {
      throw new IllegalArgumentException("Activity timeSlot is not supported: " + timeSlot);
    }
    if (activity instanceof ObjectNode activityObj) {
      activityObj.put("timeSlot", timeSlot);
    }

    JsonNode cost = activity.get("estimatedCostVnd");
    if (cost != null && (!cost.isIntegralNumber() || cost.asLong() < 0)) {
      throw new IllegalArgumentException(
          "Activity estimatedCostVnd must be a non-negative integer");
    }
  }

  private static void normalizeRootField(
      JsonNode node, String targetField, List<String> aliases, String defaultValue) {
    if (node instanceof ObjectNode objectNode) {
      JsonNode current = objectNode.get(targetField);
      if (current == null || current.isNull() || (current.isTextual() && current.asText().isBlank())) {
        for (String alias : aliases) {
          JsonNode aliasNode = objectNode.get(alias);
          if (aliasNode != null && !aliasNode.isNull() && (!aliasNode.isTextual() || !aliasNode.asText().isBlank())) {
            objectNode.set(targetField, aliasNode);
            return;
          }
        }
        objectNode.put(targetField, defaultValue);
      }
    }
  }
}
