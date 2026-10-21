package com.vista.ai.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PromptBuilderTest {

  @Test
  @DisplayName("System prompt phải chứa ràng buộc JSON thuần và quy tắc tiền tệ VND")
  void buildSystemPrompt_shouldContainCriticalConstraints() {
    String systemPrompt = PromptBuilder.buildSystemPrompt();

    assertThat(systemPrompt).contains("valid raw JSON");
    assertThat(systemPrompt).contains("Vietnam Dong (VND)");
    assertThat(systemPrompt).contains("Do NOT wrap output with markdown");
    assertThat(systemPrompt).contains("Optimize daily stops geographically");
  }

  @Test
  @DisplayName("User prompt phải xây dựng đúng thông tin chuyến đi và schema")
  void buildUserPrompt_shouldIncludeTripParameters() {
    PromptBuilder.PlanRequest request =
        new PromptBuilder.PlanRequest(
            "Đà Nẵng",
            3,
            BigDecimal.valueOf(5000000),
            3,
            List.of("Biển", "Ẩm thực"),
            List.of("Bà Nà Hills", "Bán đảo Sơn Trà"));

    String userPrompt = PromptBuilder.buildUserPrompt(request);

    assertThat(userPrompt).contains("Plan a 3-day trip to Đà Nẵng");
    assertThat(userPrompt).contains("3 people");
    assertThat(userPrompt).contains("5000000 VND");
    assertThat(userPrompt).contains("Biển, Ẩm thực");
    assertThat(userPrompt).contains("Bà Nà Hills, Bán đảo Sơn Trà");
    assertThat(userPrompt).contains("Output JSON Schema:");
  }

  @Test
  @DisplayName("Báo lỗi khi số ngày hoặc số người không hợp lệ")
  void planRequest_shouldValidateInputs() {
    assertThatThrownBy(
            () ->
                new PromptBuilder.PlanRequest(
                    "Đà Nẵng", 0, BigDecimal.valueOf(1000000), 2, List.of(), List.of()))
        .isInstanceOf(IllegalArgumentException.class);

    assertThatThrownBy(
            () ->
                new PromptBuilder.PlanRequest(
                    "Đà Nẵng", 3, BigDecimal.valueOf(1000000), 0, List.of(), List.of()))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
