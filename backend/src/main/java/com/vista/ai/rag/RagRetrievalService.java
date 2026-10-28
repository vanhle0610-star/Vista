package com.vista.ai.rag;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class RagRetrievalService {
  private final JdbcTemplate jdbcTemplate;
  private final OllamaEmbeddingClient embeddingClient;
  private final boolean enabled;
  private final MeterRegistry meterRegistry;

  public RagRetrievalService(
      JdbcTemplate jdbcTemplate,
      OllamaEmbeddingClient embeddingClient,
      @Value("${vista.ai.rag.enabled:false}") boolean enabled) {
    this(jdbcTemplate, embeddingClient, enabled, null);
  }

  @Autowired
  public RagRetrievalService(
      JdbcTemplate jdbcTemplate,
      OllamaEmbeddingClient embeddingClient,
      @Value("${vista.ai.rag.enabled:false}") boolean enabled,
      ObjectProvider<MeterRegistry> meterRegistryProvider) {
    this.jdbcTemplate = jdbcTemplate;
    this.embeddingClient = embeddingClient;
    this.enabled = enabled;
    this.meterRegistry =
        meterRegistryProvider == null ? null : meterRegistryProvider.getIfAvailable();
  }

  public List<RagHit> search(String query, String province, int limit) {
    if (!enabled) return List.of();
    long startedAt = System.nanoTime();
    List<RagHit> hits =
        embeddingClient
        .embed(query)
        .map(vector -> searchHybrid(query, province, Math.max(1, Math.min(limit, 20)), vector))
        .orElseGet(List::of);
    recordRetrieval(hits.size(), System.nanoTime() - startedAt);
    return hits;
  }

  private void recordRetrieval(int hitCount, long durationNanos) {
    if (meterRegistry == null) return;
    meterRegistry.summary("vista.ai.rag.hits").record(hitCount);
    Timer.builder("vista.ai.rag.retrieval.latency")
        .description("Embedding and hybrid retrieval latency")
        .publishPercentileHistogram()
        .maximumExpectedValue(Duration.ofSeconds(30))
        .register(meterRegistry)
        .record(Duration.ofNanos(durationNanos));
    if (hitCount == 0) meterRegistry.counter("vista.ai.rag.empty").increment();
  }

  private List<RagHit> searchHybrid(String query, String province, int limit, float[] vector) {
    String sql =
        """
        WITH eligible AS (
          SELECT c.id, d.source_id, d.title, c.content,
                 row_number() OVER (ORDER BY ts_rank_cd(to_tsvector('simple', c.content), plainto_tsquery('simple', ?)) DESC) AS fts_rank,
                 row_number() OVER (ORDER BY c.embedding <=> CAST(? AS vector)) AS vector_rank
          FROM ai_knowledge_chunks c
          JOIN ai_knowledge_documents d ON d.id = c.document_id
          WHERE d.status = 'PUBLISHED'
            AND c.embedding IS NOT NULL
            AND (? = '' OR lower(coalesce(c.metadata_json->>'province', '')) = lower(?))
        )
        SELECT id, source_id, title, content,
               (1.0 / (60 + fts_rank)) + (1.0 / (60 + vector_rank)) AS score
        FROM eligible
        ORDER BY score DESC
        LIMIT ?
        """;
    try {
      String normalizedProvince = province == null ? "" : province.trim();
      return jdbcTemplate.query(
          sql,
          (resultSet, rowNumber) ->
              new RagHit(
                  resultSet.getObject("id", UUID.class),
                  resultSet.getObject("source_id", UUID.class),
                  resultSet.getString("title"),
                  resultSet.getString("content"),
                  resultSet.getDouble("score")),
          query,
          OllamaEmbeddingClient.toVectorLiteral(vector),
          normalizedProvince,
          normalizedProvince,
          limit);
    } catch (RuntimeException exception) {
      return List.of();
    }
  }

  public record RagHit(UUID chunkId, UUID sourceId, String title, String content, double score) {}
}

