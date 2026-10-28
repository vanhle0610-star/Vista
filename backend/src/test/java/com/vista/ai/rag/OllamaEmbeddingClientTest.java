package com.vista.ai.rag;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OllamaEmbeddingClientTest {
  @Test
  void vectorLiteralUsesPgvectorFormatWithoutSpaces() {
    assertThat(OllamaEmbeddingClient.toVectorLiteral(new float[] {0.25f, -1.5f, 2.0f}))
        .isEqualTo("[0.25,-1.5,2.0]");
  }
}

