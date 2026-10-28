package com.vista.ai.provider;

import com.vista.ai.client.AiClientWrapper;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class GeminiProvider implements AiProvider {
  private final AiClientWrapper client;

  public GeminiProvider(AiClientWrapper client) {
    this.client = client;
  }

  @Override
  public String name() {
    return "gemini";
  }

  @Override
  public boolean isAvailable() {
    return client.isAvailable();
  }

  @Override
  public Optional<String> generate(String systemPrompt, String userPrompt) {
    return client.generateContent(systemPrompt + "\n\n" + userPrompt);
  }
}
