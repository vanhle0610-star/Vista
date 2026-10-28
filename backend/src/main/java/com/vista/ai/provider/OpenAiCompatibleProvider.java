package com.vista.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.ai.config.AiProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/** Local OpenAI-compatible provider for Ollama, llama.cpp and vLLM. */
@Component
public class OpenAiCompatibleProvider implements AiProvider {
  private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleProvider.class);
  private static final long PROBE_CACHE_DURATION_MS = 20_000L;

  private final AiProperties properties;
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient;

  private volatile long lastProbeTimeMs = 0L;
  private volatile boolean lastProbeStatus = false;

  @Autowired
  public OpenAiCompatibleProvider(AiProperties properties, ObjectMapper objectMapper) {
    this(
        properties,
        objectMapper,
        HttpClient.newBuilder().connectTimeout(properties.timeout()).build());
  }

  OpenAiCompatibleProvider(
      AiProperties properties, ObjectMapper objectMapper, HttpClient httpClient) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.httpClient = httpClient;
  }

  @Override
  public String name() {
    return "local";
  }

  @Override
  public boolean isAvailable() {
    if (properties.localBaseUrl() == null || properties.localBaseUrl().isBlank()) {
      return false;
    }
    return isServerReachable();
  }

  @Override
  public Optional<String> generate(String systemPrompt, String userPrompt) {
    if (!isAvailable()) return Optional.empty();
    try {
      String body =
          objectMapper.writeValueAsString(
              Map.of(
                  "model",
                  properties.localModel(),
                  "temperature",
                  properties.temperature(),
                  "max_tokens",
                  properties.maxOutputTokens(),
                  "messages",
                  List.of(
                      Map.of("role", "system", "content", systemPrompt),
                      Map.of("role", "user", "content", userPrompt))));
      HttpRequest.Builder requestBuilder =
          HttpRequest.newBuilder()
              .uri(chatCompletionsUri())
              .timeout(properties.timeout())
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(body));
      if (properties.localApiKey() != null && !properties.localApiKey().isBlank()) {
        requestBuilder.header("Authorization", "Bearer " + properties.localApiKey().trim());
      }
      HttpRequest request = requestBuilder.build();
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200) {
        log.warn("Local model request failed with status {}", response.statusCode());
        return Optional.empty();
      }
      JsonNode content =
          objectMapper
              .readTree(response.body())
              .path("choices")
              .path(0)
              .path("message")
              .path("content");
      if (content.isTextual()) {
        lastProbeStatus = true;
        lastProbeTimeMs = System.currentTimeMillis();
        return Optional.of(content.asText());
      }
      return Optional.empty();
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      return Optional.empty();
    } catch (Exception exception) {
      log.warn("Local model transport failure: {}", exception.getClass().getSimpleName());
      lastProbeStatus = false;
      lastProbeTimeMs = System.currentTimeMillis();
      return Optional.empty();
    }
  }

  private boolean isServerReachable() {
    long now = System.currentTimeMillis();
    if (now - lastProbeTimeMs < PROBE_CACHE_DURATION_MS) {
      return lastProbeStatus;
    }
    synchronized (this) {
      if (now - lastProbeTimeMs < PROBE_CACHE_DURATION_MS) {
        return lastProbeStatus;
      }
      try {
        String base = properties.localBaseUrl().replaceAll("/+$", "");
        HttpRequest.Builder probeBuilder =
            HttpRequest.newBuilder()
                .uri(URI.create(base + "/models"))
                .timeout(Duration.ofSeconds(2))
                .GET();
        if (properties.localApiKey() != null && !properties.localApiKey().isBlank()) {
          probeBuilder.header("Authorization", "Bearer " + properties.localApiKey().trim());
        }
        HttpResponse<Void> resp =
            httpClient.send(probeBuilder.build(), HttpResponse.BodyHandlers.discarding());
        lastProbeStatus = (resp.statusCode() > 0);
      } catch (Exception e) {
        lastProbeStatus = false;
      }
      lastProbeTimeMs = System.currentTimeMillis();
      return lastProbeStatus;
    }
  }

  private URI chatCompletionsUri() {
    String base = properties.localBaseUrl().replaceAll("/+$", "");
    return URI.create(base + "/chat/completions");
  }
}
