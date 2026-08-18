"""Async HTTP client for inter-service calls."""

from typing import Any, Optional

import httpx
from tenacity import (
    AsyncRetrying,
    RetryError,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from .exceptions import ServiceUnavailableException
from .logging import get_logger

logger = get_logger(__name__)


class ServiceClient:
    """Lightweight async client with retries and tracing headers."""

    def __init__(
        self,
        base_url: str,
        service_name: str,
        timeout: float = 30.0,
        max_retries: int = 3,
        jwt_token: Optional[str] = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._service_name = service_name
        self._timeout = timeout
        self._max_retries = max_retries
        self._jwt_token = jwt_token
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=timeout,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "ServiceClient":
        return self

    async def __aexit__(self, *args) -> None:
        await self.close()

    def _headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "X-Source-Service": self._service_name,
        }
        if self._jwt_token:
            headers["Authorization"] = f"Bearer {self._jwt_token}"
        return headers

    async def _request_with_retry(
        self, method: str, path: str, **kwargs
    ) -> httpx.Response:
        try:
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(self._max_retries),
                wait=wait_exponential(multiplier=1, min=1, max=10),
                retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
                reraise=True,
            ):
                with attempt:
                    response = await self._client.request(
                        method, path, headers=self._headers(), **kwargs
                    )
                    response.raise_for_status()
                    return response
        except RetryError as exc:
            logger.error("service_call_failed", service=self._base_url, path=path)
            raise ServiceUnavailableException(
                f"Service {self._base_url} is unavailable"
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.error(
                "http_error",
                service=self._base_url,
                status=exc.response.status_code,
                path=path,
            )
            raise

    async def get(self, path: str, params: Optional[dict] = None) -> Any:
        response = await self._request_with_retry("GET", path, params=params)
        return response.json()

    async def post(self, path: str, json: Optional[dict] = None) -> Any:
        response = await self._request_with_retry("POST", path, json=json)
        return response.json()

    async def put(self, path: str, json: Optional[dict] = None) -> Any:
        response = await self._request_with_retry("PUT", path, json=json)
        return response.json()

    async def delete(self, path: str) -> Any:
        response = await self._request_with_retry("DELETE", path)
        return response.json() if response.content else None
