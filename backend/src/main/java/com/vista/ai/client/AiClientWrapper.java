package com.vista.ai.client;

import com.vista.ai.config.AiProperties;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@EnableConfigurationProperties(AiProperties.class)
public class AiClientWrapper {
  private static final Logger log = LoggerFactory.getLogger(AiClientWrapper.class);
  private final AiProperties properties;

  public AiClientWrapper(AiProperties properties) {
    this.properties = properties;
  }

  public Optional<String> generateContent(String prompt) {
    if (properties.apiKey() == null || properties.apiKey().isBlank()) {
      log.warn("AI API key is not configured; AI requests are gracefully degraded in development.");
      return Optional.empty();
    }
    return Optional.of(
        "{\"status\":\"mock_ai_response\",\"model\":\"" + properties.model() + "\"}");
  }

  public boolean isAvailable() {
    return properties.apiKey() != null && !properties.apiKey().isBlank();
  }
}
