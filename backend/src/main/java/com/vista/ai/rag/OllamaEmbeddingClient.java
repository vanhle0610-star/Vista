package com.vista.ai.rag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OllamaEmbeddingClient {
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient;
  private final String baseUrl;
  private final String model;
  private final boolean enabled;
  private final Duration timeout;

  public OllamaEmbeddingClient(
      ObjectMapper objectMapper,
      @Value("${vista.ai.rag.embedding-base-url:http://localhost:11434}") String baseUrl,
      @Value("${vista.ai.rag.embedding-model:bge-m3}") String model,
      @Value("${vista.ai.rag.enabled:false}") boolean enabled,
      @Value("${vista.ai.rag.embedding-timeout:30s}") Duration timeout) {
    this.objectMapper = objectMapper;
    this.baseUrl = baseUrl.replaceAll("/+$", "");
    this.model = model;
    this.enabled = enabled;
    this.timeout = timeout;
    this.httpClient = HttpClient.newBuilder().connectTimeout(timeout).build();
  }

  public boolean isEnabled() {
    return enabled;
  }

  public String model() {
    return model;
  }

  public Optional<float[]> embed(String input) {
    if (!enabled || input == null || input.isBlank()) return Optional.empty();
    try {
      String body = objectMapper.writeValueAsString(Map.of("model", model, "input", input));
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(baseUrl + "/api/embed"))
              .timeout(timeout)
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(body))
              .build();
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200) return Optional.empty();
      JsonNode values = objectMapper.readTree(response.body()).path("embeddings").path(0);
      if (!values.isArray() || values.size() != 1024) return Optional.empty();
      float[] result = new float[values.size()];
      for (int index = 0; index < values.size(); index++) result[index] = values.get(index).floatValue();
      return Optional.of(result);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      return Optional.empty();
    } catch (Exception exception) {
      return Optional.empty();
    }
  }

  static String toVectorLiteral(float[] vector) {
    StringBuilder value = new StringBuilder("[");
    for (int index = 0; index < vector.length; index++) {
      if (index > 0) value.append(',');
      value.append(vector[index]);
    }
    return value.append(']').toString();
  }
}

