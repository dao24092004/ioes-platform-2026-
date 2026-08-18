"""Domain exceptions with HTTP status code mapping."""

from typing import Any, Optional


class IOESException(Exception):
    """Base exception. Subclasses map to specific HTTP statuses."""

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

    def __init__(
        self,
        message: str,
        details: Optional[dict] = None,
        error_code: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}
        if error_code:
            self.error_code = error_code

    def to_dict(self) -> dict[str, Any]:
        return {
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
        }


class ValidationException(IOESException):
    status_code = 400
    error_code = "VALIDATION_FAILED"


class UnauthorizedException(IOESException):
    status_code = 401
    error_code = "UNAUTHORIZED"


class TokenExpiredException(UnauthorizedException):
    error_code = "TOKEN_EXPIRED"


class ForbiddenException(IOESException):
    status_code = 403
    error_code = "FORBIDDEN"


class ResourceNotFoundException(IOESException):
    status_code = 404
    error_code = "RESOURCE_NOT_FOUND"


class ConflictException(IOESException):
    status_code = 409
    error_code = "CONFLICT"


class EmailAlreadyExistsException(ConflictException):
    error_code = "EMAIL_ALREADY_EXISTS"


class RateLimitExceededException(IOESException):
    status_code = 429
    error_code = "RATE_LIMIT_EXCEEDED"


class ServiceUnavailableException(IOESException):
    status_code = 503
    error_code = "SERVICE_UNAVAILABLE"
