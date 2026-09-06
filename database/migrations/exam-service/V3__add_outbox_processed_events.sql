-- ============================================
-- IOES - Exam Service Database Schema
-- Version: 3.0.0
-- Adds: Outbox Events table + Processed Events table (Phase D)
-- ============================================

-- ============================================
-- OUTBOX EVENTS (Transactional Outbox Pattern)
-- ============================================
-- Lưu events cùng transaction với DB write.
-- Background worker (OutboxWorker) sẽ publish sang Kafka.

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Event identity
    event_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    event_version VARCHAR(16) NOT NULL DEFAULT '1.0',

    -- Routing
    topic VARCHAR(128) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    source VARCHAR(64) NOT NULL,
    correlation_id VARCHAR(64),

    -- Payload
    payload JSONB NOT NULL,
    headers JSONB,

    -- Status lifecycle
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    next_attempt_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    CONSTRAINT outbox_events_event_id_unique UNIQUE (event_id)
);

CREATE INDEX idx_outbox_status_created ON outbox_events(status, created_at)
    WHERE status = 'PENDING';
CREATE INDEX idx_outbox_aggregate ON outbox_events(aggregate_type, aggregate_id);
CREATE INDEX idx_outbox_next_attempt ON outbox_events(next_attempt_at)
    WHERE status = 'PENDING' AND next_attempt_at IS NOT NULL;

-- ============================================
-- PROCESSED EVENTS (Idempotency Tracking)
-- ============================================
-- Track events đã xử lý thành công.
-- UNIQUE constraint trên event_id ngăn duplicate processing.

CREATE TABLE processed_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT processed_events_event_id_unique UNIQUE (event_id)
);

CREATE INDEX idx_processed_aggregate ON processed_events(aggregate_type, aggregate_id);
CREATE INDEX idx_processed_created ON processed_events(processed_at);

-- ============================================
-- TRIGGER: Auto-update updated_at cho outbox_events
-- ============================================

CREATE OR REPLACE FUNCTION trg_outbox_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outbox_events_updated_at
BEFORE UPDATE ON outbox_events
FOR EACH ROW
EXECUTE FUNCTION trg_outbox_events_updated_at();