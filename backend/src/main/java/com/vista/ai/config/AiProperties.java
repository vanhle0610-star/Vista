package com.vista.ai.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "vista.ai")
public record AiProperties(
    String provider, String apiKey, String model, Duration timeout, int maxRetries) {
  public AiProperties {
    if (provider == null) provider = "gemini";
    if (model == null) model = "gemini-2.5-flash";
    if (timeout == null) timeout = Duration.ofSeconds(15);
    if (maxRetries <= 0) maxRetries = 2;
  }
}
