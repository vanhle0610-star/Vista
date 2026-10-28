package com.vista.ai.rag;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class RagRetrievalServiceTest {
  @Test
  void disabledRagDoesNotCallEmbeddingOrDatabase() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    OllamaEmbeddingClient embeddingClient = mock(OllamaEmbeddingClient.class);
    RagRetrievalService service =
        new RagRetrievalService(jdbcTemplate, embeddingClient, false);

    assertThat(service.search("ẩm thực biển", "Đà Nẵng", 10)).isEmpty();
    verifyNoInteractions(embeddingClient, jdbcTemplate);
  }
}
