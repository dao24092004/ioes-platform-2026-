-- V2__topics.sql
-- Topic management table (theo ADR-012)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 0,
    path LTREE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_topics_parent ON topics(parent_topic_id);
CREATE INDEX idx_topics_slug ON topics(slug);
CREATE INDEX idx_topics_level ON topics(level);
CREATE INDEX idx_topics_path ON topics USING GIST(path);
CREATE INDEX idx_topics_active ON topics(is_active) WHERE is_active = true;

-- Comment on table
COMMENT ON TABLE topics IS 'Knowledge topics for organizing questions (ADR-012)';

-- Root topic example
INSERT INTO topics (id, name, slug, description, level, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Root',
    'root',
    'Root topic for all knowledge domains',
    0,
    true
) ON CONFLICT (id) DO NOTHING;