package com.vista.ai.api;

import com.vista.ai.rag.KnowledgeIngestionService;
import com.vista.ai.rag.KnowledgeIngestionService.IngestionResult;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/ai/rag")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
public class RagAdminController {
  private final KnowledgeIngestionService ingestionService;

  public RagAdminController(KnowledgeIngestionService ingestionService) {
    this.ingestionService = ingestionService;
  }

  @PostMapping("/reindex")
  public IngestionResult reindex(
      @RequestParam(defaultValue = "500") @Min(1) @Max(1000) int limit) {
    return ingestionService.ingestPublishedDestinations(limit);
  }
}
