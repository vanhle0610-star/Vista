package com.vista.ai.rag;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KnowledgeIngestionService {
  private final DestinationQueryService destinations;
  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;
  private final OllamaEmbeddingClient embeddingClient;
  private final boolean enabled;
  private final String embeddingVersion;

  public KnowledgeIngestionService(
      DestinationQueryService destinations,
      JdbcTemplate jdbcTemplate,
      ObjectMapper objectMapper,
      OllamaEmbeddingClient embeddingClient,
      @Value("${vista.ai.rag.enabled:false}") boolean enabled,
      @Value("${vista.ai.rag.embedding-version:bge-m3-v1}") String embeddingVersion) {
    this.destinations = destinations;
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
    this.embeddingClient = embeddingClient;
    this.enabled = enabled;
    this.embeddingVersion = embeddingVersion;
  }

  @Transactional
  public IngestionResult ingestPublishedDestinations(int limit) {
    if (!enabled) return new IngestionResult(0, 0, true);
    List<DestinationSummary> published =
        destinations.searchPublished(null, null, null, null, Math.max(1, Math.min(limit, 1000)));
    int indexed = 0;
    int skipped = 0;
    for (DestinationSummary destination : published) {
      String content = toContent(destination);
      String contentHash = sha256(content);
      String existingHash =
          jdbcTemplate.query(
              "SELECT content_hash FROM ai_knowledge_documents WHERE source_type='DESTINATION' AND source_id=?",
              resultSet -> resultSet.next() ? resultSet.getString(1) : null,
              destination.id());
      if (contentHash.equals(existingHash)) {
        skipped++;
        continue;
      }
      var embedding = embeddingClient.embed(content);
      if (embedding.isEmpty()) {
        skipped++;
        continue;
      }
      String metadata = toMetadata(destination);
      jdbcTemplate.update(
          """
          INSERT INTO ai_knowledge_documents(source_type, source_id, title, content_hash, status, source_revision)
          VALUES ('DESTINATION', ?, ?, ?, 'PUBLISHED', 1)
          ON CONFLICT (source_type, source_id) DO UPDATE SET
            title=EXCLUDED.title, content_hash=EXCLUDED.content_hash, status='PUBLISHED',
            source_revision=ai_knowledge_documents.source_revision + 1, updated_at=CURRENT_TIMESTAMP
          """,
          destination.id(), destination.name(), contentHash);
      jdbcTemplate.update(
          """
          INSERT INTO ai_knowledge_chunks(document_id, chunk_index, content, metadata_json, embedding, embedding_model, embedding_version)
          SELECT id, 0, ?, CAST(? AS jsonb), CAST(? AS vector), ?, ?
          FROM ai_knowledge_documents WHERE source_type='DESTINATION' AND source_id=?
          ON CONFLICT (document_id, chunk_index) DO UPDATE SET
            content=EXCLUDED.content, metadata_json=EXCLUDED.metadata_json, embedding=EXCLUDED.embedding,
            embedding_model=EXCLUDED.embedding_model, embedding_version=EXCLUDED.embedding_version,
            created_at=CURRENT_TIMESTAMP
          """,
          content,
          metadata,
          OllamaEmbeddingClient.toVectorLiteral(embedding.get()),
          embeddingClient.model(),
          embeddingVersion,
          destination.id());
      indexed++;
    }
    // Đồng bộ trạng thái UNPUBLISHED cho các documents không còn trong danh sách PUBLISHED của hệ thống
    jdbcTemplate.update(
        """
        UPDATE ai_knowledge_documents
        SET status = 'UNPUBLISHED', updated_at = CURRENT_TIMESTAMP
        WHERE source_type = 'DESTINATION'
          AND status = 'PUBLISHED'
          AND source_id NOT IN (SELECT id FROM destinations WHERE status = 'PUBLISHED')
        """);
    return new IngestionResult(indexed, skipped, false);
  }

  private String toContent(DestinationSummary item) {
    return "Tên: " + item.name() + "\nTỉnh: " + item.provinceName() + "\nDanh mục: "
        + item.categoryName() + "\nGiá: " + item.priceMin() + " - " + item.priceMax()
        + " VND\nGiờ mở cửa: " + item.openingHours();
  }

  private String toMetadata(DestinationSummary item) {
    try {
      return objectMapper.writeValueAsString(
          Map.of(
              "province", item.provinceName() == null ? "" : item.provinceName(),
              "category", item.categoryName() == null ? "" : item.categoryName()));
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Could not serialize RAG metadata", exception);
    }
  }

  private String sha256(String value) {
    try {
      return HexFormat.of().formatHex(
          MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 unavailable", exception);
    }
  }

  public record IngestionResult(int indexed, int skipped, boolean disabled) {}
}
