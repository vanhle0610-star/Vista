# Script day code len nhanh dev voi commit chi tiet
$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ROOT

if (Test-Path ".git\index.lock") {
    Remove-Item ".git\index.lock" -Force
}

Write-Host "1. Dang stage toan bo thay doi..." -ForegroundColor Cyan
git add -A

$commitMsg = @"
feat(tv4): complete AI travel planner with local Ollama + pgvector RAG, multi-provider routing, and budget VietQR hardening

- AI Provider Routing & Runtime:
  - Implement AiProviderRouter supporting LOCAL_ONLY, GEMINI_ONLY, CLAUDE_ONLY, and explicit fallback modes
  - Add OpenAiCompatibleProvider with active health-probe (/models cache) for local Ollama (qwen3:4b)
  - Add GeminiProvider and ClaudeProvider for cloud LLM support
  - Implement AiResponseValidator with JSON repair, field alias normalization, and strict destination UUID verification

- Hybrid RAG & Knowledge Base (pgvector):
  - Add Flyway migration V202611121000__tv4_create_ai_rag_knowledge.sql with vector(1024) HNSW index
  - Implement KnowledgeIngestionService with SHA-256 idempotency and unpublished destination cleanup
  - Implement RagRetrievalService with Hybrid Search (Vector + Full-Text Search RRF) and OllamaEmbeddingClient (bge-m3)
  - Add RagAdminController (POST /api/v1/admin/ai/rag/reindex) with RBAC protection

- Itinerary Persistence & Web Planner UI:
  - Add ItineraryController and ItineraryService (GET/POST merge AI suggestions into trip itinerary)
  - Resolve Spring bean naming conflict between collaboration and AI itinerary modules
  - Upgrade Web Planner UI (page.tsx, aiPlannerService.ts, itineraryService.ts) with provider badges, RAG citations, and trip saving

- Budget, Settlement & Developer Experience:
  - Harden Expense, PayoutAccount, and SettlementPaymentRequest validation, RBAC, and tests
  - Configure Gradle bootRun to auto-load backend/.env and add one-command startup script (start-vista.ps1)
"@

Write-Host "2. Dang tao commit chi tiet..." -ForegroundColor Cyan
git commit -m $commitMsg

Write-Host "3. Dang cap nhat va day len nhanh dev..." -ForegroundColor Cyan
git push origin HEAD:dev

Write-Host "`n[OK] Da day code len nhanh dev thanh cong!" -ForegroundColor Green
git log -1
