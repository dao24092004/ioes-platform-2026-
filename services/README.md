# 🔧 Backend Microservices

10 microservices cho hệ thống IOES.

## Services

| # | Service | Tech Stack | Port | Mô tả |
|---|---------|-----------|------|-------|
| 1 | [api-gateway/](./api-gateway/) | Java 17 + Spring Cloud Gateway WebFlux | 8080 | API Gateway, routing, rate limit |
| 2 | [discovery-service/](./discovery-service/) | Java + Spring Boot + Eureka | 9999 | Service discovery |
| 3 | [config-server/](./config-server/) | Java + Spring Cloud Config | 8888 | Centralized config |
| 4 | [auth-service/](./auth-service/) | Java + Spring Boot + JWT + OAuth2 | 9000 | Authentication & Authorization |
| 5 | [content-service/](./content-service/) | Java + Spring Boot + JPA | 9001 | Khóa học, bài học, file upload |
| 6 | [analytics-service/](./analytics-service/) | Java + Spring Boot + ClickHouse | 9004 | Tracking, dashboards |
| 7 | [notification-service/](./notification-service/) | Java + Spring Boot | 9009 | Email, SMS, Push |
| 8 | [exam-suite/](./exam-suite/) | Node.js 20 + NestJS 10 + uWebSockets.js | 9005 | Real-time exam + Proctoring |
| 9 | [ai-suite/](./ai-suite/) | Polyglot (Node + Python) | 9100-9103 | AI/ML services |
| 10 | [blockchain-suite/](./blockchain-suite/) | Node.js + NestJS + Hardhat | 9200 | Smart contracts, IPFS |

## Cấu trúc chuẩn cho mỗi service

```
service-name/
├── src/
│   ├── main/
│   │   ├── java/        # (Java) - domain, application, infrastructure, interfaces
│   │   ├── resources/   # application.yml, migrations
│   │   └── (Node.js có src/main.ts, src/app.module.ts)
│   └── test/            # unit, integration, e2e tests
├── k8s/                 # K8s manifests riêng
├── Dockerfile
├── package.json (Node) hoặc pom.xml (Java)
└── README.md
```

## Patterns sử dụng

- **Java:** Hexagonal Architecture (Ports & Adapters)
- **Node.js:** Modular NestJS architecture
- **Python:** Clean Architecture với FastAPI
- **Event-driven:** Kafka cho async communication

## Status

⚠️ _Sẽ được triển khai theo Sprint Plan trong [PROJECT_MANAGEMENT_PLAN.md](../../docs/01-business/PROJECT_MANAGEMENT_PLAN.md)._
