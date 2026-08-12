# 🐍 Python Coding Style Guide
## Python 3.11 + FastAPI + PyTorch

> **Áp dụng cho:** `ai-suite/ml-worker/`, `ai-suite/ocr-service/`, `ai-suite/speech-service/`, `libs/common-python/`
> **Owner:** AI/ML Lead

---

## 1. NAMING CONVENTIONS (PEP 8)

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Module | snake_case | `user_service.py`, `exam_grader.py` |
| Package | snake_case | `services/`, `models/` |
| Class | PascalCase | `UserService`, `ExamGrader` |
| Function | snake_case | `create_user`, `validate_token` |
| Variable | snake_case | `user_name`, `max_retry_count` |
| Constant | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT` |
| Method | snake_case | `get_user`, `save_answer` |
| Private | _prefix | `_validate_input`, `_cache` |
| Type Variable | PascalCase | `UserT`, `ResponseT` |
| Exception | PascalCase + Error suffix | `UserNotFoundError`, `ValidationError` |

---

## 2. PROJECT STRUCTURE

```
service-name/
├── pyproject.toml           # Poetry config
├── requirements.txt         # Pip alternative
├── README.md
├── Dockerfile
├── src/
│   └── service_name/        # Package (matching pyproject.toml)
│       ├── __init__.py
│       ├── main.py          # FastAPI app
│       ├── api/             # Routes
│       │   ├── __init__.py
│       │   ├── embeddings.py
│       │   ├── llm.py
│       │   └── vision.py
│       ├── models/          # ML models
│       │   ├── __init__.py
│       │   ├── cnn_lstm.py
│       │   └── agentic_rag/
│       ├── services/        # Business logic
│       │   ├── __init__.py
│       │   └── inference.py
│       ├── schemas/         # Pydantic models
│       │   ├── __init__.py
│       │   └── user.py
│       ├── core/            # Config, security, logging
│       │   ├── __init__.py
│       │   ├── config.py
│       │   ├── logging.py
│       │   └── security.py
│       └── db/              # Database connections
│           ├── __init__.py
│           └── session.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── unit/
│   └── integration/
└── notebooks/               # Jupyter notebooks (research)
```

---

## 3. TYPE HINTS (BẮT BUỘC)

```python
# ✅ ĐÚNG - Type hints everywhere
from typing import Optional, List, Dict, Tuple
from uuid import UUID
from datetime import datetime

async def get_user_by_id(user_id: UUID) -> Optional[User]:
    """Get user by ID. Returns None if not found."""
    return await user_repository.find_by_id(user_id)

def calculate_score(answers: List[Answer], exam: Exam) -> Score:
    """Calculate final score from answers."""
    ...

def process_batch(
    items: List[Dict[str, str]],
    config: Optional[Config] = None,
) -> List[Result]:
    """Process a batch of items."""
    ...

# ❌ SAI - No type hints
def get_user(user_id):
    return user_repo.find_by_id(user_id)

# ❌ SAI - Dùng Any
from typing import Any

def process(data: Any) -> Any:  # ❌ Tránh Any
    ...
```

---

## 4. PYDANTIC MODELS

```python
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID

# ✅ Request DTO
class CreateUserRequest(BaseModel):
    """Request schema for creating a user."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password must contain uppercase, lowercase, and digit",
    )
    full_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, regex=r"^\+?[0-9]{10,15}$")

    @validator("password")
    def validate_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain digit")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123",
                "full_name": "John Doe",
            }
        }


# ✅ Response DTO
class UserResponse(BaseModel):
    """Response schema for user."""

    id: UUID
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2


class PaginatedResponse(BaseModel):
    """Generic paginated response."""

    items: List[Any]
    total: int
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
```

---

## 5. FASTAPI ROUTES

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Annotated

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.post(
    "/",
    response_model=ApiResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create new user",
    responses={
        400: {"description": "Invalid input"},
        409: {"description": "Email already exists"},
    },
)
async def create_user(
    request: CreateUserRequest,
    service: Annotated[UserService, Depends(get_user_service)],
) -> ApiResponse[UserResponse]:
    """Create a new user account."""
    try:
        user = await service.create(request)
        return ApiResponse.success(UserResponse.from_orm(user))
    except EmailAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "EMAIL_EXISTS", "message": str(e)},
        )


@router.get(
    "/{user_id}",
    response_model=ApiResponse[UserResponse],
    summary="Get user by ID",
)
async def get_user(
    user_id: UUID,
    service: Annotated[UserService, Depends(get_user_service)],
    current_user: Annotated[AuthUser, Depends(get_current_user)],
) -> ApiResponse[UserResponse]:
    """Get user details by ID."""
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "USER_NOT_FOUND", "message": f"User {user_id} not found"},
        )
    return ApiResponse.success(UserResponse.from_orm(user))
```

---

## 6. SERVICE LAYER

```python
from typing import Protocol
from abc import ABC, abstractmethod


# ✅ Service interface (Port)
class UserService(ABC):
    """Abstract user service interface."""

    @abstractmethod
    async def create(self, request: CreateUserRequest) -> User:
        """Create a new user."""
        ...

    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        ...


# ✅ Service implementation
class UserServiceImpl(UserService):
    """User service implementation."""

    def __init__(
        self,
        user_repository: UserRepository,
        password_hasher: PasswordHasher,
        email_service: EmailService,
        event_publisher: EventPublisher,
        logger: Logger,
    ) -> None:
        self._user_repository = user_repository
        self._password_hasher = password_hasher
        self._email_service = email_service
        self._event_publisher = event_publisher
        self._logger = logger

    async def create(self, request: CreateUserRequest) -> User:
        """Create a new user account."""
        self._logger.info("Creating user", extra={"email": request.email})

        # Check existing
        existing = await self._user_repository.find_by_email(request.email)
        if existing:
            raise EmailAlreadyExistsError(request.email)

        # Hash password
        hashed = self._password_hasher.hash(request.password)

        # Create entity
        user = User(
            id=uuid4(),
            email=request.email,
            password_hash=hashed,
            full_name=request.full_name,
            status=UserStatus.ACTIVE,
            created_at=datetime.utcnow(),
        )

        # Save
        saved = await self._user_repository.save(user)

        # Side effects
        await self._email_service.send_welcome(saved.email, saved.full_name)
        await self._event_publisher.publish(UserCreatedEvent(user_id=saved.id))

        self._logger.info("User created", extra={"user_id": str(saved.id)})
        return saved
```

---

## 7. CONFIGURATION (Pydantic Settings)

```python
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""

    # App
    app_name: str = "ml-worker"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: str = "INFO"

    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "ioes"
    db_password: str
    db_name: str = "ioes_ml"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379

    # Kafka
    kafka_brokers: str = "localhost:9092"
    kafka_client_id: str = "ml-worker"
    kafka_group_id: str = "ml-worker-consumer"

    # AI/ML
    model_cache_dir: str = "/models"
    inference_batch_size: int = 32
    inference_timeout_seconds: int = 30

    # External APIs
    openai_api_key: Optional[str] = None
    huggingface_api_key: Optional[str] = None

    # Security
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 15

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Singleton instance
settings = Settings()
```

---

## 8. LOGGING (Structured)

```python
import structlog
import logging

# ✅ Setup structured logging
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()


# ✅ Sử dụng
async def create_user(request: CreateUserRequest) -> User:
    log = logger.bind(email=request.email)
    log.info("Creating user")

    try:
        user = await user_service.create(request)
        log.info("User created", user_id=str(user.id))
        return user
    except EmailAlreadyExistsError as e:
        log.warning("Email already exists")
        raise
    except Exception as e:
        log.error("Failed to create user", exc_info=True)
        raise
```

---

## 9. ML MODEL CODE

```python
from typing import Optional, Tuple
import torch
import torch.nn as nn
from pathlib import Path


class CNNLSTMAttention(nn.Module):
    """CNN + LSTM with attention for vision-based proctoring.

    Reference: Paper 2 - Vision Attention Model
    """

    def __init__(
        self,
        cnn_feature_dim: int = 512,
        lstm_hidden_dim: int = 256,
        lstm_num_layers: int = 2,
        num_classes: int = 5,
        dropout: float = 0.3,
    ) -> None:
        super().__init__()

        # CNN feature extractor
        self.cnn = self._build_cnn()

        # Bi-LSTM
        self.lstm = nn.LSTM(
            input_size=cnn_feature_dim,
            hidden_size=lstm_hidden_dim,
            num_layers=lstm_num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if lstm_num_layers > 1 else 0,
        )

        # Attention
        self.attention = nn.Sequential(
            nn.Linear(lstm_hidden_dim * 2, 1),
            nn.Softmax(dim=1),
        )

        # Classifier
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(lstm_hidden_dim * 2, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, num_classes),
        )

    def _build_cnn(self) -> nn.Module:
        """Build CNN backbone (e.g., ResNet50 without classification head)."""
        from torchvision.models import resnet50
        backbone = resnet50(weights=None)
        backbone.fc = nn.Identity()
        return backbone

    def forward(
        self,
        x: torch.Tensor,  # (B, T, C, H, W) - batch of frame sequences
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Forward pass.

        Args:
            x: Input tensor of shape (batch, time, channels, height, width)

        Returns:
            logits: Classification logits (B, num_classes)
            attention_weights: Attention weights (B, T)
        """
        batch_size, time_steps = x.shape[:2]

        # Extract CNN features
        x = x.view(-1, *x.shape[2:])  # (B*T, C, H, W)
        features = self.cnn(x)  # (B*T, 512)
        features = features.view(batch_size, time_steps, -1)  # (B, T, 512)

        # LSTM
        lstm_out, _ = self.lstm(features)  # (B, T, hidden*2)

        # Attention
        attn_weights = self.attention(lstm_out)  # (B, T, 1)
        attended = torch.sum(lstm_out * attn_weights, dim=1)  # (B, hidden*2)

        # Classify
        logits = self.classifier(attended)

        return logits, attn_weights.squeeze(-1)


class ProctoringModelService:
    """Service for running proctoring model inference."""

    def __init__(
        self,
        model_path: Path,
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        confidence_threshold: float = 0.7,
    ) -> None:
        self._device = torch.device(device)
        self._model = self._load_model(model_path)
        self._model.eval()
        self._model.to(self._device)
        self._threshold = confidence_threshold
        self._logger = structlog.get_logger()

    def _load_model(self, model_path: Path) -> CNNLSTMAttention:
        """Load trained model from checkpoint."""
        model = CNNLSTMAttention()
        checkpoint = torch.load(model_path, map_location=self._device)
        model.load_state_dict(checkpoint["model_state_dict"])
        return model

    @torch.no_grad()
    async def predict(
        self,
        frame_sequence: torch.Tensor,  # (T, C, H, W)
    ) -> ProctoringResult:
        """Run inference on a sequence of frames.

        Args:
            frame_sequence: Preprocessed frame tensor

        Returns:
            ProctoringResult with predicted class and confidence
        """
        # Add batch dimension
        x = frame_sequence.unsqueeze(0).to(self._device)  # (1, T, C, H, W)

        # Inference
        logits, attn_weights = self._model(x)
        probs = torch.softmax(logits, dim=1)
        confidence, predicted = torch.max(probs, dim=1)

        # Apply threshold
        if confidence.item() < self._threshold:
            return ProctoringResult(
                prediction=ProctoringAction.UNCERTAIN,
                confidence=confidence.item(),
                attention_weights=attn_weights.cpu().numpy(),
            )

        return ProctoringResult(
            prediction=ProctoringAction(predicted.item()),
            confidence=confidence.item(),
            attention_weights=attn_weights.cpu().numpy(),
        )
```

---

## 10. ERROR HANDLING

```python
from contextlib import asynccontextmanager


# ✅ Custom exceptions
class BusinessError(Exception):
    """Base business error."""

    def __init__(self, message: str, code: str = "BUSINESS_ERROR") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class UserNotFoundError(BusinessError):
    """User not found."""

    def __init__(self, user_id: str) -> None:
        super().__init__(f"User {user_id} not found", "USER_NOT_FOUND")
        self.user_id = user_id


class ModelInferenceError(BusinessError):
    """Model inference failed."""

    def __init__(self, model_name: str, reason: str) -> None:
        super().__init__(f"Inference failed for {model_name}: {reason}", "INFERENCE_ERROR")
        self.model_name = model_name


# ✅ Global exception handler
from fastapi import Request
from fastapi.responses import JSONResponse


@app.exception_handler(BusinessError)
async def business_exception_handler(request: Request, exc: BusinessError) -> JSONResponse:
    """Handle business errors."""
    logger.warning(
        "Business error",
        extra={"code": exc.code, "message": exc.message, "path": request.url.path},
    )
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
            },
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected errors."""
    logger.error(
        "Unexpected error",
        extra={"path": request.url.path, "error": str(exc)},
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Internal server error",
            },
        },
    )
```

---

## 11. TESTING (pytest)

```python
import pytest
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from src.services.user_service import UserServiceImpl
from src.schemas.user import CreateUserRequest


@pytest.fixture
def user_repository() -> Mock:
    """Mock user repository."""
    return AsyncMock()


@pytest.fixture
def password_hasher() -> Mock:
    """Mock password hasher."""
    hasher = Mock()
    hasher.hash.return_value = "hashed_password"
    return hasher


@pytest.fixture
def user_service(
    user_repository: Mock,
    password_hasher: Mock,
) -> UserServiceImpl:
    """User service with mocks."""
    return UserServiceImpl(
        user_repository=user_repository,
        password_hasher=password_hasher,
        email_service=AsyncMock(),
        event_publisher=AsyncMock(),
        logger=Mock(),
    )


@pytest.fixture
def sample_user_request() -> CreateUserRequest:
    """Sample create user request."""
    return CreateUserRequest(
        email="test@example.com",
        password="SecurePass123",
        full_name="John Doe",
    )


class TestUserService:
    """Test suite for UserService."""

    @pytest.mark.asyncio
    async def test_create_user_success(
        self,
        user_service: UserServiceImpl,
        user_repository: Mock,
        sample_user_request: CreateUserRequest,
    ) -> None:
        """Should create user successfully."""
        # Given
        user_repository.find_by_email.return_value = None
        user_repository.save.return_value = User(
            id=uuid4(),
            email=sample_user_request.email,
            password_hash="hashed",
            full_name=sample_user_request.full_name,
            status=UserStatus.ACTIVE,
            created_at=datetime.utcnow(),
        )

        # When
        result = await user_service.create(sample_user_request)

        # Then
        assert result.email == sample_user_request.email
        user_repository.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_user_raises_when_email_exists(
        self,
        user_service: UserServiceImpl,
        user_repository: Mock,
        sample_user_request: CreateUserRequest,
    ) -> None:
        """Should raise error when email already exists."""
        # Given
        user_repository.find_by_email.return_value = Mock()  # Existing user

        # When & Then
        with pytest.raises(EmailAlreadyExistsError):
            await user_service.create(sample_user_request)
```

---

## 12. CẤM TUYỆT ĐỐI

```python
# ❌ print() trong production
print("debug")

# ❌ No type hints
def get_user(id):
    return None

# ❌ Mutable default arguments
def add_item(item, items=[]):  # ❌
    items.append(item)
    return items

# ❌ Bare except
try:
    ...
except:  # ❌
    pass

# ❌ Wildcard imports
from module import *  # ❌

# ❌ Magic numbers
if retries > 3:  # ❌ Dùng MAX_RETRIES = 3

# ❌ Hardcoded secrets
API_KEY = "sk-xxx"  # ❌ Từ env

# ❌ Comment lặp lại code
# Increment counter
counter += 1

# ❌ Any type
from typing import Any
def process(data: Any) -> Any:  # ❌
```

---

## 📚 REFERENCE

- [PEP 8](https://peps.python.org/pep-0008/)
- [PEP 484 - Type Hints](https://peps.python.org/pep-0484/)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- [Project Rules](../../01-business/PROJECT_RULES.md)

---

**Version:** 1.0
**Last updated:** 12/08/2026
