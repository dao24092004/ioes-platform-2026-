# 💾 Database

Quản lý database cho IOES.

## Cấu trúc

| Thư mục | Mục đích |
|---------|----------|
| [migrations/](./migrations/) | Database migrations (Flyway/TypeORM/Alembic) |
| [seeds/](./seeds/) | Initial seed data |
| [schemas/](./schemas/) | SQL DDL definitions |
| [diagrams/](./diagrams/) | ER diagrams |
| [init-scripts/](./init-scripts/) | Docker init scripts (auto-create databases) |

## Databases

- **PostgreSQL 15** - Primary database (auth, content, exam, analytics, blockchain)
- **MongoDB 7** - Document store (content metadata, lessons)
- **Redis 7** - Cache, session, leaderboard
- **Milvus 2.4** - Vector database (embeddings, similarity search)

## Status

⚠️ _Sẽ được triển khai trong Sprint 0-1._
