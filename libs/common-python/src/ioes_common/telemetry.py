"""OpenTelemetry tracing configuration."""

from functools import wraps
from typing import Any, Callable

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

_tracer: trace.Tracer | None = None


def configure_tracing(
    service_name: str,
    otlp_endpoint: str | None = None,
) -> None:
    """Initialise OpenTelemetry tracer provider."""
    global _tracer
    resource = Resource.create({SERVICE_NAME: service_name})
    provider = TracerProvider(resource=resource)

    if otlp_endpoint:
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=otlp_endpoint)))

    trace.set_tracer_provider(provider)
    _tracer = trace.get_tracer(service_name)


def instrument_fastapi(app) -> None:
    """Attach FastAPI auto-instrumentation."""
    FastAPIInstrumentor.instrument_app(app)


def trace_function(name: str | None = None):
    """Decorator: wrap a function in a span with optional attributes."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any):
            tracer = _tracer or trace.get_tracer(__name__)
            with tracer.start_as_current_span(name or func.__name__):
                return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any):
            tracer = _tracer or trace.get_tracer(__name__)
            with tracer.start_as_current_span(name or func.__name__):
                return func(*args, **kwargs)

        import inspect

        return async_wrapper if inspect.iscoroutinefunction(func) else sync_wrapper

    return decorator


def add_span_attribute(key: str, value: Any) -> None:
    span = trace.get_current_span()
    if span and span.is_recording():
        span.set_attribute(key, value)
