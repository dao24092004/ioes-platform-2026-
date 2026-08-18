package com.ioes.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

/**
 * Lightweight DTO returned by idempotent commands (e.g. notifications,
 * certificate issuance). Not an event itself; used as a payload for
 * response-style events.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResult {
    private String eventId;
    private boolean success;
    private String message;
    private Instant occurredAt;
    private Map<String, Object> data;
}
