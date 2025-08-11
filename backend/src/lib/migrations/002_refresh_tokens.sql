-- Migration 002: Secure refresh token storage
-- Creates a table to store hashed refresh tokens with rotation and revocation support

-- Ensure UUID extension is available (safe if already created)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    token_jti VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address INET,
    is_revoked BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT refresh_token_unique_jti UNIQUE (token_jti)
);

-- Indexes for performance and admin queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);