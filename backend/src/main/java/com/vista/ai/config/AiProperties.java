package com.vista.ai.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

@ConfigurationProperties(prefix = "vista.ai")
public record AiProperties(
    String apiKey,
    String model,
    Duration timeout,
    int maxRetries,
    String localBaseUrl,
    String localModel,
    String localApiKey,
    FallbackMode fallbackMode,
    double temperature,
    int maxOutputTokens,
    String claudeApiKey,
    String claudeModel) {

  public enum FallbackMode {
    LOCAL_ONLY,
    LOCAL_WITH_APPROVED_GEMINI_FALLBACK,
    LOCAL_WITH_APPROVED_CLAUDE_FALLBACK,
    GEMINI_ONLY,
    CLAUDE_ONLY
  }

  /** Backward-compatible constructor for 9-parameter usage. */
  public AiProperties(
      String apiKey,
      String model,
      Duration timeout,
      int maxRetries,
      String localBaseUrl,
      String localModel,
      FallbackMode fallbackMode,
      double temperature,
      int maxOutputTokens) {
    this(
        apiKey,
        model,
        timeout,
        maxRetries,
        localBaseUrl,
        localModel,
        null,
        fallbackMode,
        temperature,
        maxOutputTokens,
        null,
        "claude-3-5-sonnet-20241022");
  }

  /** Backward-compatible constructor used by existing tests and integrations. */
  public AiProperties(
      String ignoredLegacyProvider, String apiKey, String model, Duration timeout, int maxRetries) {
    this(
        apiKey,
        model,
        timeout,
        maxRetries,
        "http://localhost:11434/v1",
        "qwen3:4b",
        null,
        "gemini".equalsIgnoreCase(ignoredLegacyProvider)
            ? FallbackMode.GEMINI_ONLY
            : "claude".equalsIgnoreCase(ignoredLegacyProvider)
                ? FallbackMode.CLAUDE_ONLY
                : FallbackMode.LOCAL_ONLY,
        0.2,
        1200,
        null,
        "claude-3-5-sonnet-20241022");
  }

  @ConstructorBinding
  public AiProperties {
    if (model == null) model = "gemini-2.5-flash";
    if (timeout == null) timeout = Duration.ofSeconds(60);
    if (maxRetries <= 0) maxRetries = 2;
    if (localBaseUrl == null || localBaseUrl.isBlank()) {
      localBaseUrl = "http://localhost:11434/v1";
    }
    if (localModel == null || localModel.isBlank()) localModel = "qwen3:4b";
    if (fallbackMode == null) fallbackMode = FallbackMode.LOCAL_ONLY;
    if (temperature < 0 || temperature > 1) temperature = 0.2;
    if (maxOutputTokens <= 0) maxOutputTokens = 1200;
    if (claudeModel == null || claudeModel.isBlank()) claudeModel = "claude-3-5-sonnet-20241022";
  }
}
