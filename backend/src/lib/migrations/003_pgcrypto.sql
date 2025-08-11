-- Migration 003: Enable pgcrypto extension (for optional column-level encryption)
-- This does not encrypt existing data automatically. It provides crypto functions
-- for future use (e.g., PGP_SYM_ENCRYPT/DECRYPT) when sensitive columns are added.

CREATE EXTENSION IF NOT EXISTS pgcrypto;