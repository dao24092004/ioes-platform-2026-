"""Unit tests for ioes_common.exceptions."""

import pytest

from ioes_common.exceptions import (
    ConflictException,
    IOESException,
    ResourceNotFoundException,
    TokenExpiredException,
    UnauthorizedException,
    ValidationException,
)


def test_base_ioes_exception_defaults():
    exc = IOESException("boom")
    assert exc.status_code == 500
    assert exc.error_code == "INTERNAL_ERROR"
    assert "boom" in str(exc)


def test_validation_exception_status():
    exc = ValidationException("bad input")
    assert exc.status_code == 400


def test_unauthorized_exception_status():
    exc = UnauthorizedException("no token")
    assert exc.status_code == 401


def test_token_expired_subclass():
    exc = TokenExpiredException("expired")
    assert exc.error_code == "TOKEN_EXPIRED"
    assert exc.status_code == 401


def test_not_found_status():
    exc = ResourceNotFoundException("user 123")
    assert exc.status_code == 404


def test_conflict_status():
    exc = ConflictException("duplicate")
    assert exc.status_code == 409
