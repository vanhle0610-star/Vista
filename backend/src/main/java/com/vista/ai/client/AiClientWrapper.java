package com.vista.ai.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.ai.config.AiProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Wrapper gọi dịch vụ LLM (Google Gemini REST API). Thiết kế bảo đảm: 1. Timeout an toàn theo cấu
 * hình (mặc định 15s). 2. Graceful degradation: Không làm sập hệ thống khi thiếu API key hoặc khi
 * LLM gặp sự cố.
 */
@Component
@EnableConfigurationProperties(AiProperties.class)
public class AiClientWrapper {
  private static final Logger log = LoggerFactory.getLogger(AiClientWrapper.class);

  private final AiProperties properties;
  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;

  @Autowired
  public AiClientWrapper(AiProperties properties) {
    this(
        properties,
        HttpClient.newBuilder()
            .connectTimeout(
                properties.timeout() != null ? properties.timeout() : Duration.ofSeconds(10))
            .build(),
        new ObjectMapper());
  }

  // Constructor phục vụ kiểm thử đơn vị
  AiClientWrapper(AiProperties properties, HttpClient httpClient, ObjectMapper objectMapper) {
    this.properties = properties;
    this.httpClient = httpClient;
    this.objectMapper = objectMapper;
  }

  public Optional<String> generateContent(String prompt) {
    if (!isAvailable()) {
      log.warn("AI API key is not configured; AI requests are gracefully degraded in development.");
      return Optional.empty();
    }

    try {
      String endpoint =
          String.format(
              "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
              properties.model(), properties.apiKey());

      String requestBody =
          objectMapper.writeValueAsString(
              new GeminiRequestPayload(
                  new GeminiContent[] {
                    new GeminiContent(new GeminiPart[] {new GeminiPart(prompt)})
                  }));

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(endpoint))
              .header("Content-Type", "application/json")
              .timeout(properties.timeout())
              .POST(HttpRequest.BodyPublishers.ofString(requestBody))
              .build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() != 200) {
        log.error("Gemini API returned error code {}: {}", response.statusCode(), response.body());
        return Optional.empty();
      }

      JsonNode rootNode = objectMapper.readTree(response.body());
      JsonNode candidates = rootNode.path("candidates");
      if (candidates.isArray() && !candidates.isEmpty()) {
        JsonNode firstText = candidates.get(0).path("content").path("parts").get(0).path("text");
        if (!firstText.isMissingNode()) {
          return Optional.of(firstText.asText());
        }
      }

      log.warn("Unexpected Gemini API response structure: {}", response.body());
      return Optional.empty();

    } catch (Exception e) {
      log.error("Failed to generate content from AI provider: {}", e.getMessage(), e);
      return Optional.empty();
    }
  }

  public boolean isAvailable() {
    return properties.apiKey() != null && !properties.apiKey().isBlank();
  }

  // Records phục vụ serialize Gemini API request payload
  record GeminiRequestPayload(GeminiContent[] contents) {}

  record GeminiContent(GeminiPart[] parts) {}

  record GeminiPart(String text) {}
}
