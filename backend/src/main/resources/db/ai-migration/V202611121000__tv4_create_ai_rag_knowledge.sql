-- Optional AI migration. Enable only on PostgreSQL instances with pgvector available.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    source_revision BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_knowledge_source UNIQUE (source_type, source_id),
    CONSTRAINT ck_ai_knowledge_status CHECK (status IN ('PUBLISHED', 'UNPUBLISHED', 'DELETED'))
);

CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES ai_knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding VECTOR(1024),
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'BAAI/bge-m3',
    embedding_version VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_chunk_document_index UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_documents_status
    ON ai_knowledge_documents(status, source_type);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_document
    ON ai_knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_metadata
    ON ai_knowledge_chunks USING gin(metadata_json);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_fts
    ON ai_knowledge_chunks USING gin(to_tsvector('simple', content));
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_embedding_hnsw
    ON ai_knowledge_chunks USING hnsw (embedding vector_cosine_ops);

COMMENT ON COLUMN ai_knowledge_chunks.embedding IS
    '1024 dimensions for BAAI/bge-m3. Reindex into a new version before changing embedding model.';
