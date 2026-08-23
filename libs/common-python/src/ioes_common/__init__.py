"""
IOES Common Python Library - Main Entry Point.

Provides shared schemas, FastAPI dependencies, utilities, and infrastructure
code used by all Python AI/ML services (ml-worker, content-recommender,
proctor-detector, smart-grader).
"""

from ioes_common.schemas import (
    ApiResponse,
    ErrorResponse,
    PaginatedResponse,
    UserPrincipal,
)
from ioes_common.exceptions import (
    IOESException,
    ResourceNotFoundException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
    ValidationException,
)
from ioes_common.logging import configure_logging, get_logger
from ioes_common.security import (
    create_jwt_token,
    verify_jwt_token,
    hash_password,
    verify_password,
    get_current_user,
)
from ioes_common.telemetry import (
    configure_tracing,
    instrument_fastapi,
    trace_function,
    add_span_attribute,
)
from ioes_common.middleware import (
    add_request_id_middleware,
    register_exception_handlers,
)
from ioes_common.http_client import ServiceClient
from ioes_common.kafka_client import KafkaProducer, KafkaConsumer
from ioes_common.constants import (
    KafkaTopics,
    KafkaGroups,
    ErrorCodes,
)

__version__ = "1.0.0"

__all__ = [
    "register_exception_handlers",
    "add_request_id_middleware",
    "instrument_fastapi",
    # Schemas
    "ApiResponse",
    "ErrorResponse",
    "PaginatedResponse",
    "UserPrincipal",
    # Exceptions
    "IOESException",
    "ResourceNotFoundException",
    "UnauthorizedException",
    "ForbiddenException",
    "ConflictException",
    "ValidationException",
    # Logging
    "configure_logging",
    "get_logger",
    # Security
    "create_jwt_token",
    "verify_jwt_token",
    "hash_password",
    "verify_password",
    "get_current_user",
    # Telemetry
    "configure_tracing",
    "trace_function",
    "add_span_attribute",
    # HTTP / Kafka
    "ServiceClient",
    "KafkaProducer",
    "KafkaConsumer",
    # Constants
    "KafkaTopics",
    "KafkaGroups",
    "ErrorCodes",
]
