# @ioes/common-node

Shared library for Node.js microservices in the IOES platform (exam-suite, blockchain-suite).

## Purpose

Provides reusable, opinionated building blocks so every Node.js service stays consistent and avoids copy-pasting the same filters, guards, decorators, and DTOs.

## What's inside

| Module             | What it provides                                                                    |
| ------------------ | ----------------------------------------------------------------------------------- |
| `dto/`             | `ApiResponse<T>`, `PaginatedResponse<T>`, `UserPrincipalDto`                        |
| `filters/`         | `GlobalExceptionFilter`, `HttpExceptionFilter`, `ValidationExceptionFilter`        |
| `guards/`          | `JwtAuthGuard`, `RolesGuard`                                                        |
| `decorators/`      | `@CurrentUser`, `@UserId`, `@Roles`, `@Public`, `@Cacheable`, `@CacheEvict`         |
| `utils/`           | `createLogger`, `IsStrongPassword`, `IsUUID`                                        |
| `constants/`       | `KAFKA_TOPICS`, `KAFKA_GROUPS`, `ERROR_CODES`                                       |
| `types/`           | `JwtPayload`                                                                       |

## Build

```bash
pnpm install
pnpm build
```

## Usage in a service

```typescript
// services/exam-suite/src/main.ts
import { GlobalExceptionFilter, HttpExceptionFilter } from '@ioes/common-node';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new GlobalExceptionFilter(), new HttpExceptionFilter());
  await app.listen(9005);
}
```

```typescript
// services/exam-suite/src/modules/exam/exam.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  ApiResponse,
  UserPrincipalDto,
} from '@ioes/common-node';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamController {
  @Get()
  @Roles('STUDENT', 'INSTRUCTOR')
  async list(@CurrentUser() user: UserPrincipalDto): Promise<ApiResponse<any[]>> {
    const exams = await this.examService.findAll(user.userId);
    return ApiResponse.success(exams);
  }
}
```

## Tests

```bash
pnpm test            # unit tests
pnpm test:coverage   # with coverage report
```
