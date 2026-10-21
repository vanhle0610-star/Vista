package com.vista.ai.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AiResponseValidatorTest {

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
          "totalDays": 3,
          "estimatedTotalVnd": 4500000,
          "days": [
            {
              "dayNumber": 1,
              "title": "Bán đảo Sơn Trà & Biển Mỹ Khê",
              "estimatedDayCostVnd": 1200000,
              "activities": []
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
}
