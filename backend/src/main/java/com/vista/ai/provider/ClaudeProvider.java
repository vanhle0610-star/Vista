package com.vista.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.ai.config.AiProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/** Anthropic Claude Provider (Claude 3.5 Sonnet / Claude 3 Haiku). */
@Component
public class ClaudeProvider implements AiProvider {
  private static final Logger log = LoggerFactory.getLogger(ClaudeProvider.class);
  private static final String DEFAULT_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
  private static final String ANTHROPIC_VERSION = "2023-06-01";

  private final AiProperties properties;
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient;

  @Autowired
  public ClaudeProvider(AiProperties properties, ObjectMapper objectMapper) {
    this(
        properties,
        objectMapper,
        HttpClient.newBuilder().connectTimeout(properties.timeout()).build());
  }

  ClaudeProvider(AiProperties properties, ObjectMapper objectMapper, HttpClient httpClient) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.httpClient = httpClient;
  }

  @Override
  public String name() {
    return "claude";
  }

  @Override
  public boolean isAvailable() {
    return properties.claudeApiKey() != null && !properties.claudeApiKey().isBlank();
  }

  @Override
  public Optional<String> generate(String systemPrompt, String userPrompt) {
    if (!isAvailable()) return Optional.empty();
    try {
      String body =
          objectMapper.writeValueAsString(
              Map.of(
                  "model",
                  properties.claudeModel(),
                  "max_tokens",
                  properties.maxOutputTokens(),
                  "temperature",
                  properties.temperature(),
                  "system",
                  systemPrompt,
                  "messages",
                  List.of(Map.of("role", "user", "content", userPrompt))));

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(DEFAULT_ANTHROPIC_URL))
              .timeout(properties.timeout())
              .header("Content-Type", "application/json")
              .header("x-api-key", properties.claudeApiKey())
              .header("anthropic-version", ANTHROPIC_VERSION)
              .POST(HttpRequest.BodyPublishers.ofString(body))
              .build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() != 200) {
        log.warn("Claude API request failed with status: {}", response.statusCode());
        return Optional.empty();
      }

      JsonNode contentArray = objectMapper.readTree(response.body()).path("content");
      if (contentArray.isArray() && !contentArray.isEmpty()) {
        for (JsonNode block : contentArray) {
          if ("text".equals(block.path("type").asText()) && block.has("text")) {
            return Optional.of(block.path("text").asText());
          }
        }
      }
      return Optional.empty();
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      return Optional.empty();
    } catch (Exception exception) {
      log.warn("Claude API transport failure: {}", exception.getClass().getSimpleName());
      return Optional.empty();
    }
  }
}

