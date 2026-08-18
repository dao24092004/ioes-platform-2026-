"""Pydantic schemas shared across services."""

from datetime import datetime
from enum import Enum
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard success/error envelope returned by all IOES APIs."""

    success: bool
    message: str = "Success"
    data: Optional[T] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.utcnow())
    trace_id: Optional[str] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    @classmethod
    def success_response(cls, data: T, message: str = "Success") -> "ApiResponse[T]":
        return cls(success=True, message=message, data=data)

    @classmethod
    def error_response(cls, message: str, data: Optional[T] = None) -> "ApiResponse[T]":
        return cls(success=False, message=message, data=data)


class ErrorResponse(BaseModel):
    """Detailed error body returned with non-2xx responses."""

    error_code: str
    message: str
    details: Optional[dict] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.utcnow())


class PaginationMeta(BaseModel):
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    meta: PaginationMeta

    @classmethod
    def create(
        cls, items: List[T], page: int, limit: int, total: int
    ) -> "PaginatedResponse[T]":
        return cls(
            items=items,
            meta=PaginationMeta(
                page=page,
                limit=limit,
                total=total,
                total_pages=(total + limit - 1) // limit,
            ),
        )


class UserRole(str, Enum):
    STUDENT = "STUDENT"
    INSTRUCTOR = "INSTRUCTOR"
    ADMIN = "ADMIN"
    SYSTEM = "SYSTEM"


class UserPrincipal(BaseModel):
    """Authenticated user injected by `get_current_user` dependency."""

    user_id: str
    email: str
    role: UserRole
    full_name: Optional[str] = None
    exp: Optional[int] = None


class HealthStatus(BaseModel):
    status: str = "ok"
    service: str
    version: str
    uptime_seconds: float
    dependencies: dict = Field(default_factory=dict)
