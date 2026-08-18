"""FastAPI exception handlers and middleware."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .exceptions import IOESException
from .schemas import ErrorResponse


def register_exception_handlers(app: FastAPI) -> None:
    """Wire standard exception handlers into the FastAPI app."""

    @app.exception_handler(IOESException)
    async def ioes_exception_handler(request: Request, exc: IOESException):
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
                details=exc.details,
            ).model_dump(mode="json"),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                error_code="VALIDATION_FAILED",
                message="Request validation failed",
                details={"errors": exc.errors()},
            ).model_dump(mode="json"),
        )


def add_request_id_middleware(app: FastAPI) -> None:
    """Generate / propagate X-Request-Id header."""

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        import uuid

        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response
