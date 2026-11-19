package com.vista.ai.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.ai.config.AiProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
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
  private final AtomicInteger activeKeyIndex = new AtomicInteger(0);

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
              "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent",
              properties.model());

      String requestBody =
          objectMapper.writeValueAsString(
              new GeminiRequestPayload(
                  new GeminiContent[] {
                    new GeminiContent(new GeminiPart[] {new GeminiPart(prompt)})
                  }));

      HttpResponse<String> response = sendWithKeyFailover(endpoint, requestBody);
      if (response == null) {
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

      log.warn("Unexpected Gemini API response structure");
      return Optional.empty();

    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn("AI request was interrupted");
      return Optional.empty();
    } catch (Exception e) {
      log.warn("Failed to generate content from AI provider: {}", e.getClass().getSimpleName());
      return Optional.empty();
    }
  }

  private List<String> resolveApiKeys() {
    String raw = properties.apiKey();
    if (raw == null || raw.isBlank()) {
      return List.of();
    }
    return Arrays.stream(raw.split(","))
        .map(String::trim)
        .filter(k -> !k.isBlank())
        .distinct()
        .toList();
  }

  private HttpResponse<String> sendWithKeyFailover(String endpoint, String requestBody)
      throws InterruptedException {
    List<String> keys = resolveApiKeys();
    if (keys.isEmpty()) {
      return null;
    }

    int startIdx = Math.floorMod(activeKeyIndex.get(), keys.size());
    int totalKeyAttempts = keys.size();
    for (int offset = 0; offset < totalKeyAttempts; offset++) {
      int currentIdx = (startIdx + offset) % keys.size();
      String key = keys.get(currentIdx);

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(endpoint))
              .header("Content-Type", "application/json")
              .header("x-goog-api-key", key)
              .timeout(properties.timeout())
              .POST(HttpRequest.BodyPublishers.ofString(requestBody))
              .build();

      int perKeyAttempts = keys.size() > 1 ? 1 : Math.max(1, properties.maxRetries() + 1);
      for (int attempt = 1; attempt <= perKeyAttempts; attempt++) {
        try {
          HttpResponse<String> response =
              httpClient.send(request, HttpResponse.BodyHandlers.ofString());
          int status = response.statusCode();
          if (status == 200) {
            activeKeyIndex.set(currentIdx);
            return response;
          }

          boolean keyExhaustedOrRetryable =
              status == 401 || status == 403 || status == 429 || status >= 500;
          log.warn(
              "Gemini API request failed with status {} (keySlot {}/{}, attempt {}/{})",
              status,
              currentIdx + 1,
              keys.size(),
              attempt,
              perKeyAttempts);
          if (keys.size() > 1 && keyExhaustedOrRetryable) {
            activeKeyIndex.set((currentIdx + 1) % keys.size());
            break;
          }
          if (!keyExhaustedOrRetryable || attempt == perKeyAttempts) {
            return null;
          }
        } catch (java.io.IOException e) {
          log.warn(
              "Gemini API transport failure {} (keySlot {}/{}, attempt {}/{})",
              e.getClass().getSimpleName(),
              currentIdx + 1,
              keys.size(),
              attempt,
              perKeyAttempts);
          if (keys.size() > 1) {
            activeKeyIndex.set((currentIdx + 1) % keys.size());
            break;
          }
          if (attempt == perKeyAttempts) {
            return null;
          }
        }
      }
    }
    return null;
  }

  public boolean isAvailable() {
    return !resolveApiKeys().isEmpty();
  }

  // Records phục vụ serialize Gemini API request payload
  record GeminiRequestPayload(GeminiContent[] contents) {}

  record GeminiContent(GeminiPart[] parts) {}

  record GeminiPart(String text) {}
}
