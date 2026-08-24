"""JWT and password helpers."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .exceptions import TokenExpiredException, UnauthorizedException
from .schemas import UserPrincipal, UserRole

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)


def create_jwt_token(
    payload: dict[str, Any],
    secret: str,
    algorithm: str = "HS256",
    expires_minutes: int = 60,
) -> str:
    """Sign a JWT with the given secret; default expiry 60 minutes."""
    now = datetime.now(timezone.utc)
    payload = {
        **payload,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def verify_jwt_token(token: str, secret: str, algorithm: str = "HS256") -> dict:
    """Verify and decode a JWT; raises UnauthorizedException on failure."""
    try:
        return jwt.decode(token, secret, algorithms=[algorithm])
    except JWTError as exc:
        if "expired" in str(exc).lower():
            raise TokenExpiredException("Token has expired") from exc
        raise UnauthorizedException(f"Invalid token: {exc}") from exc


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> UserPrincipal:
    """FastAPI dependency: extract the authenticated user from Authorization header."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ADR-008: NO DEFAULT FALLBACK. JWT_SECRET phải được set qua env
    # và load qua app.state.jwt_secret trong lifespan startup.
    secret = getattr(request.app.state, "jwt_secret", None)
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfigured: JWT_SECRET not loaded",
        )

    try:
        payload = verify_jwt_token(credentials.credentials, secret)
    except (TokenExpiredException, UnauthorizedException) as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        ) from exc

    return UserPrincipal(
        user_id=payload["sub"],
        email=payload["email"],
        role=UserRole(payload.get("role", "STUDENT")),
        full_name=payload.get("name"),
        exp=payload.get("exp"),
    )
