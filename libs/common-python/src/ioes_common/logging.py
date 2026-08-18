"""Structured logging with JSON output and trace correlation."""

import logging
import sys

import structlog
from opentelemetry import trace


def configure_logging(
    level: str = "INFO",
    json_output: bool = True,
    service_name: str = "ioes-service",
) -> None:
    """Configure structured logging for the entire service.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR).
        json_output: If True, emit JSON lines (production). Else colored console (dev).
        service_name: Identifier baked into every log line.
    """
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, level.upper(), logging.INFO),
    )

    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        _add_trace_correlation,
        structlog.processors.dict_tracebacks,
    ]

    if json_output:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO)
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Bind service_name as a default context
    structlog.contextvars.bind_contextvars(service=service_name)


def _add_trace_correlation(_, __, event_dict):
    """Inject current trace_id / span_id from OpenTelemetry context."""
    span = trace.get_current_span()
    if span and span.is_recording():
        ctx = span.get_span_context()
        if ctx.is_valid:
            event_dict["trace_id"] = format(ctx.trace_id, "032x")
            event_dict["span_id"] = format(ctx.span_id, "016x")
    return event_dict


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
