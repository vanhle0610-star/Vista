package com.vista.ai.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AiResponseValidatorTest {

  @Test
  void localRepairAcceptsTrailingCommaWithoutChangingBusinessData() {
    String destinationId = "11111111-1111-1111-1111-111111111111";
    String response =
        """
        Model preface that must be discarded
        {
          "tripTitle": "Huế",
          "destination": "Huế",
          "totalDays": 1,
          "days": [{
            "dayNumber": 1,
            "activities": [{
              "timeSlot": "MORNING",
              "destinationId": "%s",
              "estimatedCostVnd": 0,
            }],
          }],
        }
        ignored suffix
        """
            .formatted(destinationId);

    JsonNode parsed = AiResponseValidator.validateAndParseItineraryWithLocalRepair(response);

    assertThat(parsed.path("days").path(0).path("activities").path(0).path("destinationId").asText())
        .isEqualTo(destinationId);
  }

  @Test
  void localRepairDoesNotRepairSemanticViolations() {
    String response =
        """
        {"tripTitle":"Huế","destination":"Huế","totalDays":1,"days":[{
          "dayNumber":1,"activities":[{"timeSlot":"INVALID","destinationId":"11111111-1111-1111-1111-111111111111"}]
        }]}
        """;

    assertThatThrownBy(
            () -> AiResponseValidator.validateAndParseItineraryWithLocalRepair(response))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("timeSlot");
  }

  @Test
  @DisplayName("Làm sạch markdown ```json bọc ngoài phản hồi của AI")
  void sanitizeRawResponse_shouldStripMarkdownCodeFences() {
    String raw = "```json\n{\"tripTitle\":\"Đà Nẵng Chill\"}\n```";
    String sanitized = AiResponseValidator.sanitizeRawResponse(raw);

    assertThat(sanitized).isEqualTo("{\"tripTitle\":\"Đà Nẵng Chill\"}");
  }

  @Test
  @DisplayName("Phân tích thành công JSON hợp lệ và chứa đủ các trường bắt buộc")
  void validateAndParseItinerary_shouldSucceedOnValidJson() {
    String validJson =
        """
        {
          "tripTitle": "Khám phá Đà Nẵng 3N2Đ",
          "destination": "Đà Nẵng",
          "totalDays": 1,
          "estimatedTotalVnd": 4500000,
          "days": [
            {
              "dayNumber": 1,
              "title": "Bán đảo Sơn Trà & Biển Mỹ Khê",
              "estimatedDayCostVnd": 1200000,
              "activities": [
                {
                  "destinationId": "11111111-1111-1111-1111-111111111111",
                  "timeSlot": "MORNING",
                  "estimatedCostVnd": 0
                }
              ]
            }
          ]
        }
        """;

    JsonNode result = AiResponseValidator.validateAndParseItinerary(validJson);

    assertThat(result).isNotNull();
    assertThat(result.get("tripTitle").asText()).isEqualTo("Khám phá Đà Nẵng 3N2Đ");
    assertThat(result.get("days")).hasSize(1);
  }

  @Test
  @DisplayName("Từ chối activity có destinationId, timeSlot hoặc chi phí không hợp lệ")
  void validateAndParseItinerary_shouldRejectInvalidActivity() {
    String invalidJson =
        """
        {
          "tripTitle": "Lịch trình lỗi",
          "destination": "Huế",
          "totalDays": 1,
          "days": [{
            "dayNumber": 1,
            "activities": [{
              "destinationId": "not-a-uuid",
              "timeSlot": "MIDNIGHT",
              "estimatedCostVnd": -1
            }]
          }]
        }
        """;

    assertThatThrownBy(() -> AiResponseValidator.validateAndParseItinerary(invalidJson))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("destinationId");
  }

  @Test
  @DisplayName("Báo lỗi khi JSON rỗng hoặc sai cú pháp")
  void validateAndParseItinerary_shouldThrowOnMalformedJson() {
    assertThatThrownBy(() -> AiResponseValidator.validateAndParseItinerary(""))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("AI response is empty");

    assertThatThrownBy(() -> AiResponseValidator.validateAndParseItinerary("{malformed_json...}"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Invalid JSON format");
  }

  @Test
  @DisplayName("Báo lỗi khi thiếu mảng days")
  void validateAndParseItinerary_shouldThrowWhenDaysMissing() {
    String jsonMissingDays =
        """
        {
          "tripTitle": "Đà Nẵng",
          "destination": "Đà Nẵng"
        }
        """;

    assertThatThrownBy(() -> AiResponseValidator.validateAndParseItinerary(jsonMissingDays))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("must contain non-empty 'days' array");
  }

  @Test
  @DisplayName("Chấp nhận trường alias và tự động chuẩn hóa timeSlot chữ thường cho model nhỏ")
  void validateAndParseItinerary_shouldAcceptAliasesAndLowercaseSlot() {
    String jsonWithAliases =
        """
        {
          "title": "Chuyến đi Huế ngắn ngày",
          "province": "Thừa Thiên Huế",
          "days": [{
            "activities": [{
              "destinationId": "11111111-1111-1111-1111-111111111111",
              "timeSlot": "morning",
              "estimatedCostVnd": 150000
            }]
          }]
        }
        """;

    JsonNode result = AiResponseValidator.validateAndParseItinerary(jsonWithAliases);

    assertThat(result.path("tripTitle").asText()).isEqualTo("Chuyến đi Huế ngắn ngày");
    assertThat(result.path("destination").asText()).isEqualTo("Thừa Thiên Huế");
    assertThat(result.path("totalDays").asInt()).isEqualTo(1);
    assertThat(result.path("days").path(0).path("dayNumber").asInt()).isEqualTo(1);
    assertThat(result.path("days").path(0).path("activities").path(0).path("timeSlot").asText())
        .isEqualTo("MORNING");
  }
}
