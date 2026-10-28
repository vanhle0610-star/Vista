package com.vista.ai.provider;

import java.util.Optional;

/** Provider boundary for language-model inference. Implementations must not log prompt content. */
public interface AiProvider {
  String name();

  boolean isAvailable();

  Optional<String> generate(String systemPrompt, String userPrompt);
}
