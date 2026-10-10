-- Migration 0010: Schema drift reconciliation + publish workflow columns.
-- Note: Additive columns are already present on the live D1 database.
-- Ensuring storage_chunks table exists for chunked file fallback.

CREATE TABLE IF NOT EXISTS storage_chunks (
  key         TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  data        TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (key, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_storage_chunks_key ON storage_chunks(key);

