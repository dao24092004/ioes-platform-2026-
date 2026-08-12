# 📚 Content Service

> **Quản lý khóa học, bài học, danh mục**
> Tech: Java 17 + Spring Boot 3 + JPA + MongoDB

## 📋 TỔNG QUAN Nhanh

**Content Service** chịu trách nhiệm:
- CRUD khóa học (Course, Lesson, Chapter)
- Upload file (video, PDF, hình ảnh)
- Danh mục (Category)
- Đánh giá (Review)
- Đăng ký khóa học (Enrollment)
- Recommend course (basic)

**Port:** 9001
**Databases:** PostgreSQL (`ioes_content`) + MongoDB (`ioes_content_rich`)
**Owner:** `backend-java@ioes.com`

## 🏗️ KIẾN TRÚC (Hexagonal)

```
content-service/
├── src/main/java/com/ioes/content/
│   ├── domain/
│   │   ├── model/                  # Course, Lesson, Chapter, Review, Enrollment
│   │   ├── event/                  # CourseCreated, CoursePublished, CourseEnrolled
│   │   └── exception/              # CourseNotFound, AlreadyEnrolled
│   │
│   ├── application/
│   │   ├── usecase/                # CreateCourse, EnrollCourse, AddReview
│   │   ├── port/                   # CourseRepository, FileStorage
│   │   └── dto/
│   │
│   ├── infrastructure/
│   │   ├── persistence/            # JPA + MongoDB
│   │   ├── storage/                # MinIO/S3 client
│   │   └── kafka/                  # Event publisher
│   │
│   └── interfaces/
│       └── rest/                   # CourseController, LessonController
│
└── src/main/resources/
    ├── application.yml
    └── db/migration/               # Flyway
```

## 🚀 QUICK START

```bash
# 1. Start dependencies
docker-compose up -d postgres mongodb redis minio

# 2. Start service
cd services/content-service
mvn spring-boot:run

# 3. Verify
curl http://localhost:9001/actuator/health

# 4. API docs
open http://localhost:9001/swagger-ui.html
```

## 📡 API ENDPOINTS

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/v1/courses` | INSTRUCTOR | Tạo khóa học |
| `GET` | `/api/v1/courses` | ❌ | List khóa học (filter, paginate) |
| `GET` | `/api/v1/courses/:id` | ❌ | Chi tiết khóa học |
| `PATCH` | `/api/v1/courses/:id` | INSTRUCTOR | Cập nhật |
| `DELETE` | `/api/v1/courses/:id` | INSTRUCTOR | Xóa |
| `POST` | `/api/v1/courses/:id/publish` | INSTRUCTOR | Publish |
| `POST` | `/api/v1/courses/:id/enroll` | STUDENT | Đăng ký |
| `POST` | `/api/v1/courses/:id/reviews` | STUDENT | Đánh giá |
| `GET` | `/api/v1/courses/:id/reviews` | ❌ | List reviews |
| `POST` | `/api/v1/lessons` | INSTRUCTOR | Tạo bài học |
| `GET` | `/api/v1/lessons/:id` | STUDENT | Xem bài học |
| `POST` | `/api/v1/uploads` | INSTRUCTOR | Upload file |

**Swagger:** http://localhost:9001/swagger-ui.html

## 📚 TÀI LIỆU

- [Java Style Guide](../../docs/03-development/coding-standards/java-styleguide.md)
- [Service Boundaries](../../docs/02-architecture/service-boundaries.md)
- [PROJECT_RULES.md](../../docs/01-business/PROJECT_RULES.md)

## ⚙️ ENV VARS

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ioes_content
DB_USER=ioes
DB_PASSWORD=secret

MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=ioes_content_rich

# MinIO/S3
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_BUCKET=ioes-content

# Kafka
KAFKA_BROKERS=localhost:9092
```

## 🔗 EVENTS

| Topic | Event | Khi nào |
|-------|-------|---------|
| `course.events` | `CourseCreated` | Tạo course |
| `course.events` | `CoursePublished` | Publish |
| `course.events` | `CourseEnrolled` | Student đăng ký |
| `course.events` | `ReviewCreated` | Review mới |

## 📞 LIÊN HỆ

- **Owner:** Backend Java Lead
- **Slack:** `#ioes-dev`
- **Email:** `backend-java@ioes.com`

---

**Version:** 0.1.0
**Last updated:** 12/08/2026
