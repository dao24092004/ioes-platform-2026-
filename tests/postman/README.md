# IOES Exam Suite - Postman Test Collection

Collection và Environment để test Exam Suite API với Postman.

## Setup

### 1. Import Files
- Import `IOES_Exam_Suite_API.postman_collection.json`
- Import `IOES_Exam_Suite-Local.postman_environment.json`
- Chọn Environment "IOES Exam Suite - Local"

### 2. Configure Environment
Điều chỉnh các biến trong Environment:

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Exam Suite base URL | `http://localhost:9005` |
| `TOKEN` | JWT Bearer token | (để trống) |
| `STUDENT_USER_ID` | Dev student UUID | `00000000-0000-4000-8000-000000000001` |
| `INSTRUCTOR_USER_ID` | Dev instructor UUID | `00000000-0000-4000-8000-000000000002` |
| `ADMIN_USER_ID` | Dev admin UUID | `00000000-0000-4000-8000-000000000003` |

### 3. Authentication

#### Development (DEV_AUTH_BYPASS=true)
- Header `X-Dev-User-Id: <UUID>` sẽ override user từ JWT
- Không cần set `Authorization` header

#### Production
- Lấy JWT token từ auth-service
- Set header `Authorization: Bearer <token>`

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe (DB, Redis, Kafka, Dgraph) |

### Question Bank

#### Topics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/question-bank/topics` | List all topics (tree) |
| GET | `/question-bank/topics/:id/practice` | Get practice path |

#### Questions (Read - Dgraph)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/question-bank/questions/search` | Full-text search |
| GET | `/question-bank/questions/:id` | Get by ID |
| GET | `/question-bank/questions/:id/similar` | Find similar questions |

#### Questions (Write - PostgreSQL)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/question-bank/questions` | Create question |
| PATCH | `/question-bank/questions/:id` | Update (optimistic lock) |
| DELETE | `/question-bank/questions/:id` | Soft delete |
| POST | `/question-bank/questions/:id/publish` | Publish question |

#### Bulk Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/question-bank/bulk-import` | Import from CSV (5/hour limit) |

#### Image Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/question-bank/questions/:id/images/upload-url` | Get presigned URL |
| POST | `/question-bank/questions/:id/images/confirm` | Confirm upload |
| DELETE | `/question-bank/images/:bucket/*` | Delete image |

#### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/question-bank/admin/resync` | Resync all to Dgraph (3/hour) |
| POST | `/question-bank/admin/resync/:id` | Resync single question (30/hour) |
| GET | `/question-bank/admin/storage/health` | Storage health check |

### Exam Session

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/exam-attempts` | Start new attempt |
| GET | `/api/v1/exam-attempts/:id` | Get attempt details |
| POST | `/api/v1/exam-attempts/:id/submit` | Manual submit |
| POST | `/api/v1/exam-attempts/:id/answers` | Save answer (REST) |
| GET | `/api/v1/exam-attempts/instructor/exams/:id/active-attempts` | List active (monitoring) |
| GET | `/api/v1/exam-attempts/:id/proctoring-report` | Proctoring report |

### Exam (CRUD)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exams` | List exams |
| GET | `/exams/:id` | Get exam |
| POST | `/exams/:id/start` | Start exam session |

### Submission & Grading
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/submissions/:examId` | Submit exam |
| POST | `/submissions/:examId/:attemptId/grade` | Grade submission |

## Sample Test Flow

### 1. Create Question
```bash
POST /question-bank/questions
{
  "questionText": "What is 2+2?",
  "questionType": "multiple_choice",
  "difficulty": "easy",
  "points": 10,
  "topicId": "00000000-0000-4000-8000-000000000001",
  "options": [
    { "optionText": "3", "isCorrect": false },
    { "optionText": "4", "isCorrect": true }
  ]
}
```

### 2. Search Questions
```bash
GET /question-bank/questions/search?difficulty=easy&limit=10
```

### 3. Start Exam Attempt
```bash
POST /api/v1/exam-attempts
{
  "examId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 4. Save Answer
```bash
POST /api/v1/exam-attempts/:id/answers
{
  "questionId": "660e8400-e29b-41d4-a716-446655440001",
  "answer": "B",
  "clientTs": 1724409599000
}
```

### 5. Submit Exam
```bash
POST /api/v1/exam-attempts/:id/submit
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Bulk import | 5 requests/hour |
| Resync all | 3 requests/hour |
| Resync single | 30 requests/hour |
| Question search | 30 requests/min |
| Save answer | 60 requests/min |

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Validation failed |
| 401 | Unauthorized |
| 403 | Forbidden (role) |
| 404 | Not found |
| 409 | Conflict (optimistic lock) |
| 429 | Rate limited |
| 500 | Server error |

## Kafka Events

Sau khi create/update/delete question, các Kafka events được publish:

- `QuestionCreated` → Topic: `question-bank.question.created`
- `QuestionUpdated` → Topic: `question-bank.question.updated`
- `QuestionDeleted` → Topic: `question-bank.question.deleted`
- `QuestionPublished` → Topic: `question-bank.question.published`

Xem Kafka logs để verify events được publish đúng.
