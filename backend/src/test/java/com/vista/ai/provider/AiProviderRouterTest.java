package com.vista.ai.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.ai.config.AiProperties;
import com.vista.ai.config.AiProperties.FallbackMode;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.ObjectProvider;

class AiProviderRouterTest {

  @Test
  void localOnlyNeverSendsPromptToGemini() {
    OpenAiCompatibleProvider local = Mockito.mock(OpenAiCompatibleProvider.class);
    GeminiProvider gemini = Mockito.mock(GeminiProvider.class);
    when(local.isAvailable()).thenReturn(false);

    AiProviderRouter router =
        new AiProviderRouter(properties(FallbackMode.LOCAL_ONLY), local, gemini);

    assertThat(router.generate("system", "user")).isEmpty();
    verify(gemini, never()).generate("system", "user");
  }

  @Test
  void approvedFallbackRecordsProviderAndFallbackUsage() {
    OpenAiCompatibleProvider local = Mockito.mock(OpenAiCompatibleProvider.class);
    GeminiProvider gemini = Mockito.mock(GeminiProvider.class);
    when(local.isAvailable()).thenReturn(true);
    when(local.generate("system", "user")).thenReturn(Optional.empty());
    when(gemini.isAvailable()).thenReturn(true);
    when(gemini.name()).thenReturn("gemini");
    when(gemini.generate("system", "user")).thenReturn(Optional.of("{}"));

    AiProviderRouter router =
        new AiProviderRouter(
            properties(FallbackMode.LOCAL_WITH_APPROVED_GEMINI_FALLBACK), local, gemini);

    assertThat(router.generate("system", "user"))
        .hasValueSatisfying(
            result -> {
              assertThat(result.provider()).isEqualTo("gemini");
              assertThat(result.fallbackUsed()).isTrue();
            });
  }

  @Test
  void recordsProviderOutcomeLatencyAndFallbackWithoutUserTags() {
    OpenAiCompatibleProvider local = Mockito.mock(OpenAiCompatibleProvider.class);
    GeminiProvider gemini = Mockito.mock(GeminiProvider.class);
    MeterRegistry registry = new SimpleMeterRegistry();
    @SuppressWarnings("unchecked")
    ObjectProvider<MeterRegistry> provider = Mockito.mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(registry);
    when(local.isAvailable()).thenReturn(true);
    when(local.name()).thenReturn("local");
    when(local.generate("system", "user")).thenReturn(Optional.of("{}"));

    AiProviderRouter router =
        new AiProviderRouter(properties(FallbackMode.LOCAL_ONLY), local, gemini, provider);

    assertThat(router.generate("system", "user")).isPresent();
    assertThat(
            registry
                .get("vista.ai.provider.requests")
                .tags("provider", "local", "outcome", "success", "fallback", "false")
                .counter()
                .count())
        .isEqualTo(1.0);
    assertThat(
            registry
                .get("vista.ai.provider.latency")
                .tags("provider", "local", "outcome", "success")
                .timer()
                .count())
        .isEqualTo(1L);
  }

  private AiProperties properties(FallbackMode mode) {
    return new AiProperties(
        "key",
        "gemini-2.5-flash",
        Duration.ofSeconds(5),
        1,
        "http://localhost:11434/v1",
        "qwen3:4b",
        mode,
        0.2,
        1200);
  }
}
