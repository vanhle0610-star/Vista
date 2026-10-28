package com.vista.ai.provider;

import com.vista.ai.config.AiProperties;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/** Explicit provider routing supporting Local (Ollama/vLLM), Google Gemini, and Anthropic Claude. */
@Component
public class AiProviderRouter {
  private static final Logger log = LoggerFactory.getLogger(AiProviderRouter.class);

  private final AiProperties properties;
  private final OpenAiCompatibleProvider local;
  private final GeminiProvider gemini;
  private final ClaudeProvider claude;
  private final MeterRegistry meterRegistry;

  public AiProviderRouter(
      AiProperties properties, OpenAiCompatibleProvider local, GeminiProvider gemini) {
    this(properties, local, gemini, null, null);
  }

  public AiProviderRouter(
      AiProperties properties,
      OpenAiCompatibleProvider local,
      GeminiProvider gemini,
      ClaudeProvider claude) {
    this(properties, local, gemini, claude, null);
  }

  @Autowired
  public AiProviderRouter(
      AiProperties properties,
      OpenAiCompatibleProvider local,
      GeminiProvider gemini,
      ClaudeProvider claude,
      ObjectProvider<MeterRegistry> meterRegistryProvider) {
    this.properties = properties;
    this.local = local;
    this.gemini = gemini;
    this.claude = claude;
    this.meterRegistry =
        meterRegistryProvider == null ? null : meterRegistryProvider.getIfAvailable();
  }

  public Optional<AiProviderResponse> generate(String systemPrompt, String userPrompt) {
    return switch (properties.fallbackMode()) {
      case GEMINI_ONLY -> call(gemini, systemPrompt, userPrompt, false);
      case CLAUDE_ONLY -> call(claude, systemPrompt, userPrompt, false);
      case LOCAL_ONLY -> call(local, systemPrompt, userPrompt, false);
      case LOCAL_WITH_APPROVED_GEMINI_FALLBACK -> {
        Optional<AiProviderResponse> response = call(local, systemPrompt, userPrompt, false);
        if (response.isPresent()) yield response;
        log.warn("Local provider unavailable; using explicitly approved Gemini fallback");
        yield call(gemini, systemPrompt, userPrompt, true);
      }
      case LOCAL_WITH_APPROVED_CLAUDE_FALLBACK -> {
        Optional<AiProviderResponse> response = call(local, systemPrompt, userPrompt, false);
        if (response.isPresent()) yield response;
        log.warn("Local provider unavailable; using explicitly approved Claude fallback");
        yield call(claude, systemPrompt, userPrompt, true);
      }
    };
  }

  public boolean isAvailable() {
    return switch (properties.fallbackMode()) {
      case GEMINI_ONLY -> gemini != null && gemini.isAvailable();
      case CLAUDE_ONLY -> claude != null && claude.isAvailable();
      case LOCAL_ONLY -> local != null && local.isAvailable();
      case LOCAL_WITH_APPROVED_GEMINI_FALLBACK ->
          (local != null && local.isAvailable()) || (gemini != null && gemini.isAvailable());
      case LOCAL_WITH_APPROVED_CLAUDE_FALLBACK ->
          (local != null && local.isAvailable()) || (claude != null && claude.isAvailable());
    };
  }

  private Optional<AiProviderResponse> call(
      AiProvider provider, String systemPrompt, String userPrompt, boolean fallbackUsed) {
    if (provider == null || !provider.isAvailable()) {
      recordProviderCall(
          provider == null ? "unknown" : provider.name(), "unavailable", fallbackUsed, 0L);
      return Optional.empty();
    }
    long startedAt = System.nanoTime();
    Optional<String> content = provider.generate(systemPrompt, userPrompt);
    recordProviderCall(
        provider.name(),
        content.isPresent() ? "success" : "failure",
        fallbackUsed,
        System.nanoTime() - startedAt);
    return content.map(value -> new AiProviderResponse(provider.name(), fallbackUsed, value));
  }

  private void recordProviderCall(
      String provider, String outcome, boolean fallbackUsed, long durationNanos) {
    if (meterRegistry == null) return;
    meterRegistry
        .counter(
            "vista.ai.provider.requests",
            "provider",
            provider,
            "outcome",
            outcome,
            "fallback",
            Boolean.toString(fallbackUsed))
        .increment();
    if (durationNanos > 0) {
      Timer.builder("vista.ai.provider.latency")
          .description("Latency of AI provider calls")
          .tag("provider", provider)
          .tag("outcome", outcome)
          .publishPercentileHistogram()
          .minimumExpectedValue(Duration.ofMillis(10))
          .maximumExpectedValue(Duration.ofMinutes(3))
          .register(meterRegistry)
          .record(Duration.ofNanos(durationNanos));
    }
  }

  public record AiProviderResponse(String provider, boolean fallbackUsed, String content) {}
}
