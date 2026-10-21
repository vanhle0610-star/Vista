package com.vista.ai.util;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

/**
 * Tiện ích xây dựng Prompt chuẩn mực cho mô hình Google Gemini. Đảm bảo prompt chứa đầy đủ ràng
 * buộc ngân sách, định dạng JSON và tối ưu hóa tuyến đường.
 */
public final class PromptBuilder {

  private PromptBuilder() {}

  public record PlanRequest(
      String destination,
      int numberOfDays,
      BigDecimal totalBudgetVnd,
      int numberOfMembers,
      List<String> travelPreferences,
      List<String> mustVisitPlaces) {
    public PlanRequest {
      Objects.requireNonNull(destination, "destination must not be null");
      if (numberOfDays <= 0) {
        throw new IllegalArgumentException("numberOfDays must be strictly positive");
      }
      if (numberOfMembers <= 0) {
        throw new IllegalArgumentException("numberOfMembers must be strictly positive");
      }
    }
  }

  /** Tạo System Prompt chuẩn hóa cho Gemini. */
  public static String buildSystemPrompt() {
    return """
        You are VISTA AI Travel Concierge, an elite travel planning expert.
        Generate a multi-day travel itinerary with intelligent budget estimation in Vietnam Dong (VND).

        RULES:
        1. Return ONLY valid raw JSON conforming strictly to the requested schema.
        2. Do NOT wrap output with markdown formatting like ```json or ```.
        3. All costs must be positive integers representing Vietnam Dong (VND).
        4. Optimize daily stops geographically to minimize transit time and taxi costs.
        5. Ensure the total estimated cost stays within the provided budget.
        """;
  }

  /** Tạo User Prompt chi tiết dựa trên yêu cầu chuyến đi. */
  public static String buildUserPrompt(PlanRequest request) {
    Objects.requireNonNull(request, "request must not be null");

    StringBuilder sb = new StringBuilder();
    sb.append("Plan a ")
        .append(request.numberOfDays())
        .append("-day trip to ")
        .append(request.destination())
        .append(".\n");
    sb.append("- Number of travelers: ").append(request.numberOfMembers()).append(" people\n");

    if (request.totalBudgetVnd() != null
        && request.totalBudgetVnd().compareTo(BigDecimal.ZERO) > 0) {
      sb.append("- Total Budget Limit: ").append(request.totalBudgetVnd()).append(" VND\n");
    }

    if (request.travelPreferences() != null && !request.travelPreferences().isEmpty()) {
      sb.append("- Preferences: ")
          .append(String.join(", ", request.travelPreferences()))
          .append("\n");
    }

    if (request.mustVisitPlaces() != null && !request.mustVisitPlaces().isEmpty()) {
      sb.append("- Must-visit attractions: ")
          .append(String.join(", ", request.mustVisitPlaces()))
          .append("\n");
    }

    sb.append("\nOutput JSON Schema:\n");
    sb.append(
        """
        {
          "tripTitle": "string",
          "destination": "string",
          "totalDays": number,
          "estimatedTotalVnd": number,
          "days": [
            {
              "dayNumber": number,
              "title": "string",
              "estimatedDayCostVnd": number,
              "activities": [
                {
                  "timeSlot": "MORNING|AFTERNOON|EVENING",
                  "placeName": "string",
                  "activityDescription": "string",
                  "estimatedCostVnd": number,
                  "latitude": number,
                  "longitude": number
                }
              ]
            }
          ]
        }
        """);

    return sb.toString();
  }
}
