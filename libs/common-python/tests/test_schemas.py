"""Unit tests for ioes_common.schemas."""

import pytest
from pydantic import ValidationError

from ioes_common.schemas import (
    ApiResponse,
    PaginationMeta,
    PaginatedResponse,
    UserPrincipal,
    UserRole,
)


def test_api_response_success_helper():
    resp = ApiResponse.success_response({"id": 1}, "ok")
    assert resp.success is True
    assert resp.message == "ok"
    assert resp.data == {"id": 1}


def test_api_response_error_helper():
    resp = ApiResponse[str].error_response("bad")
    assert resp.success is False
    assert resp.message == "bad"


def test_paginated_response_creates_meta():
    pr = PaginatedResponse.create(items=[1, 2, 3], page=1, limit=2, total=5)
    assert pr.meta.page == 1
    assert pr.meta.total_pages == 3


def test_user_role_enum_values():
    assert UserRole.STUDENT.value == "STUDENT"
    assert UserRole.INSTRUCTOR.value == "INSTRUCTOR"
    assert UserRole.ADMIN.value == "ADMIN"


def test_user_principal_validates_role():
    with pytest.raises(ValidationError):
        UserPrincipal(user_id="u1", email="a@b.com", role="GHOST")
