# 🟢 Node.js / TypeScript Coding Style Guide
## Node.js 20 + NestJS 10 + TypeScript

> **Áp dụng cho:** `exam-suite/`, `blockchain-suite/`, `ai-suite/api-gateway/`
> **Owner:** Backend Lead

---

## 1. NAMING CONVENTIONS

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Class | PascalCase | `ExamService`, `AuthController` |
| Interface | PascalCase, no `I` prefix | `ExamRepository`, `UserProfile` |
| Method | camelCase, verb | `createExam`, `validateToken` |
| Variable | camelCase | `userName`, `maxRetryCount` |
| Constant | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `WS_PORT` |
| File | kebab-case | `exam-service.ts` |
| Folder | kebab-case | `exam-suite/`, `auth/` |
| Enum | PascalCase + values | `ExamStatus.DRAFT` |
| DTO suffix | PascalCase + DTO | `CreateExamDto` |
| Type | PascalCase | `ExamResult`, `PaginationParams` |

---

## 2. NESTJS STRUCTURE

### 2.1 Module Organization

```
modules/
  exam/
    exam.module.ts                # Module definition
    exam.controller.ts            # HTTP routes
    exam.service.ts               # Business logic
    exam.repository.ts            # Data access (TypeORM)
    entities/
      exam.entity.ts              # Database entity
      question.entity.ts
      submission.entity.ts
    dto/
      create-exam.dto.ts          # Request DTOs
      update-exam.dto.ts
      submit-exam.dto.ts
    guards/
      exam-owner.guard.ts         # Module-specific guards
    interceptors/
      exam-logging.interceptor.ts
    exam.controller.spec.ts       # Unit tests
    exam.service.spec.ts
```

### 2.2 Module Definition

```typescript
// ✅ exam.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Exam, Question, Submission]),
    KafkaModule,
    WebSocketModule,
  ],
  controllers: [ExamController],
  providers: [ExamService, ExamRepository, ExamGateway],
  exports: [ExamService],
})
export class ExamModule {}

// ✅ Lazy loading (optional, cho performance)
@Module({})
export class ExamModule {
  static register(): DynamicModule {
    return {
      module: ExamModule,
      imports: [
        // ...
      ],
    };
  }
}
```

---

## 3. CONTROLLER PATTERNS

### 3.1 REST Controller

```typescript
// ✅ ĐÚNG - Clean controller
@ApiTags('exams')
@Controller('api/v1/exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Create new exam' })
  @ApiResponse({ status: 201, type: ExamResponseDto })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateExamDto,
  ): Promise<ApiResponse<ExamResponseDto>> {
    const exam = await this.examService.create(user.id, dto);
    return ApiResponse.success(exam);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get exam by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<ExamResponseDto>> {
    const exam = await this.examService.findById(id);
    return ApiResponse.success(exam);
  }

  @Patch(':id')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExamDto,
  ): Promise<ApiResponse<ExamResponseDto>> {
    const exam = await this.examService.update(user.id, id, dto);
    return ApiResponse.success(exam);
  }

  @Delete(':id')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.examService.remove(user.id, id);
  }
}

// ❌ SAI - Business logic trong controller
@Controller('exams')
export class ExamController {
  @Post()
  async create(@Body() dto: CreateExamDto) {
    const exam = new Exam()
    exam.title = dto.title
    exam.instructorId = dto.instructorId
    return this.examRepo.save(exam)  // ❌ Logic trong controller
  }
}
```

### 3.2 DTOs với Validation

```typescript
// ✅ ĐÚNG - DTO với class-validator
import { IsString, IsEnum, IsArray, ValidateNested, Min, Max, IsInt } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class CreateQuestionDto {
  @ApiProperty({ example: 'What is 2+2?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(2)
  options: string[]

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  correctAnswerIndex: number

  @ApiProperty({ minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  points: number
}

export class CreateExamDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string

  @ApiProperty({ minimum: 1, maximum: 480 })
  @IsInt()
  @Min(1)
  @Max(480)  // 8 hours max
  durationMinutes: number

  @ApiProperty({ type: [CreateQuestionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[]
}
```

---

## 4. SERVICE LAYER

```typescript
// ✅ ĐÚNG - Service với clear use cases
@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name)

  constructor(
    private readonly examRepository: ExamRepository,
    private readonly kafkaProducer: KafkaProducer,
    private readonly eventBus: EventBus,
  ) {}

  async create(instructorId: string, dto: CreateExamDto): Promise<Exam> {
    this.logger.log(`Creating exam title=${dto.title} instructorId=${instructorId}`)

    const exam = Exam.create({
      instructorId,
      title: dto.title,
      durationMinutes: dto.durationMinutes,
      questions: dto.questions.map((q) => Question.create(q)),
    })

    const saved = await this.examRepository.save(exam)

    // Publish event
    await this.kafkaProducer.send('exam.events', {
      type: 'ExamCreated',
      payload: { examId: saved.id, instructorId },
    })

    return saved
  }

  async findById(id: string): Promise<Exam> {
    const exam = await this.examRepository.findById(id)
    if (!exam) {
      throw new NotFoundException(`Exam ${id} not found`)
    }
    return exam
  }

  async startAttempt(userId: string, examId: string): Promise<Attempt> {
    const exam = await this.findById(examId)
    if (!exam.isAvailable()) {
      throw new BadRequestException('Exam is not available')
    }

    // Check existing attempt
    const existing = await this.attemptRepository.findActive(userId, examId)
    if (existing) {
      return existing  // Resume existing
    }

    const attempt = Attempt.start(userId, exam)
    return this.attemptRepository.save(attempt)
  }
}
```

---

## 5. ENTITY & REPOSITORY

```typescript
// ✅ Entity
@Entity('exams')
@Index(['instructorId'])
@Index(['status'])
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 200 })
  title: string

  @Column({ name: 'instructor_id', type: 'uuid' })
  instructorId: string

  @Column({ name: 'duration_minutes' })
  durationMinutes: number

  @Column({ type: 'enum', enum: ExamStatus, default: ExamStatus.DRAFT })
  status: ExamStatus

  @OneToMany(() => Question, (q) => q.exam, { cascade: true, eager: true })
  questions: Question[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null

  // Domain methods
  static create(props: CreateExamProps): Exam {
    const exam = new Exam()
    exam.title = props.title
    exam.instructorId = props.instructorId
    exam.durationMinutes = props.durationMinutes
    exam.status = ExamStatus.DRAFT
    exam.questions = props.questions
    return exam
  }

  isAvailable(): boolean {
    return this.status === ExamStatus.PUBLISHED
  }

  publish(): void {
    if (this.status !== ExamStatus.DRAFT) {
      throw new Error('Only draft exams can be published')
    }
    this.status = ExamStatus.PUBLISHED
  }
}

// ✅ Repository
@Injectable()
export class ExamRepository {
  constructor(
    @InjectRepository(Exam)
    private readonly repo: Repository<Exam>,
  ) {}

  async findById(id: string): Promise<Exam | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['questions'],
    })
  }

  async save(exam: Exam): Promise<Exam> {
    return this.repo.save(exam)
  }

  async findByInstructor(instructorId: string, pagination: Pagination): Promise<PaginatedResult<Exam>> {
    const [items, total] = await this.repo.findAndCount({
      where: { instructorId },
      order: { createdAt: 'DESC' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    })
    return { items, total, page: pagination.page, limit: pagination.limit }
  }
}
```

---

## 6. WEBSOCKET (Real-time)

```typescript
// ✅ WebSocket Gateway
@WebSocketGateway({
  namespace: '/exam',
  cors: { origin: '*' },
})
export class ExamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(ExamGateway.name)

  constructor(private readonly sessionService: SessionService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth.token
    const user = await this.validateToken(token)

    if (!user) {
      client.disconnect()
      return
    }

    this.logger.log(`Client connected socketId=${client.id} userId=${user.id}`)
    client.data.userId = user.id
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.userId
    this.logger.log(`Client disconnected socketId=${client.id} userId=${userId}`)
    await this.sessionService.handleDisconnect(userId)
  }

  @SubscribeMessage('exam:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinExamDto,
  ): Promise<void> {
    const userId = client.data.userId
    await this.sessionService.joinExam(userId, data.examId, client.id)
    client.join(`exam:${data.examId}`)
    client.emit('exam:joined', { examId: data.examId, startedAt: new Date() })
  }

  @SubscribeMessage('exam:answer')
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AnswerDto,
  ): Promise<void> {
    const userId = client.data.userId
    await this.sessionService.saveAnswer(userId, data.questionId, data.answer)
  }

  // Broadcast to room
  broadcastToExam(examId: string, event: string, data: any): void {
    this.server.to(`exam:${examId}`).emit(event, data)
  }
}
```

---

## 7. ERROR HANDLING

```typescript
// ✅ Custom Exception Filter
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception.getStatus()

    const errorResponse = {
      success: false,
      error: {
        code: this.getErrorCode(exception),
        message: exception.message,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    }

    this.logger.warn(
      `${request.method} ${request.url} ${status} - ${exception.message}`
    )

    response.status(status).json(errorResponse)
  }

  private getErrorCode(exception: HttpException): string {
    if (exception instanceof BusinessException) {
      return exception.code
    }
    return HttpStatus[status] || 'UNKNOWN_ERROR'
  }
}

// ✅ Custom Business Exception
export class BusinessException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status)
  }
}

// Sử dụng
throw new BusinessException(
  'EXAM_ALREADY_SUBMITTED',
  'Exam has already been submitted',
  HttpStatus.CONFLICT,
)
```

---

## 8. KAFKA INTEGRATION

```typescript
// ✅ Kafka Producer
@Injectable()
export class KafkaProducer {
  private readonly logger = new Logger(KafkaProducer.name)

  constructor(@Inject('KAFKA_CLIENT') private readonly kafka: Kafka) {}

  async send<T>(topic: string, message: T): Promise<void> {
    const producer = this.kafka.producer()
    await producer.connect()

    try {
      await producer.send({
        topic,
        messages: [{
          key: (message as any).aggregateId,
          value: JSON.stringify(message),
          headers: {
            'content-type': 'application/json',
            'correlation-id': uuidv4(),
          },
        }],
      })
      this.logger.debug(`Message sent topic=${topic}`)
    } catch (error) {
      this.logger.error(`Failed to send message topic=${topic}`, error.stack)
      throw error
    } finally {
      await producer.disconnect()
    }
  }
}

// ✅ Kafka Consumer
@Injectable()
export class GradingConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GradingConsumer.name)
  private consumer: Consumer

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafka: Kafka,
    private readonly gradingService: GradingService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.consumer = this.kafka.consumer({ groupId: 'exam-grading' })
    await this.consumer.connect()
    await this.consumer.subscribe({ topic: 'exam.submitted', fromBeginning: false })

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString())
          await this.gradingService.grade(event.payload)
        } catch (error) {
          this.logger.error('Failed to process message', error.stack)
          // Send to DLQ or retry
        }
      },
    })
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect()
  }
}
```

---

## 9. CONFIGURATION

```typescript
// ✅ config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 9005,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'ioes',
    password: process.env.DB_PASSWORD || 'ioes_dev_password',
    database: process.env.DB_NAME || 'ioes_exam',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: 'exam-suite',
    groupId: 'exam-suite-consumer',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: '15m',
  },
})

// ✅ config.validation.ts
import * as Joi from 'joi'

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(9005),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  JWT_SECRET: Joi.string().min(32).required(),
})
```

---

## 10. TESTING

### 10.1 Unit Test

```typescript
describe('ExamService', () => {
  let service: ExamService
  let repository: jest.Mocked<ExamRepository>
  let kafkaProducer: jest.Mocked<KafkaProducer>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        {
          provide: ExamRepository,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: KafkaProducer,
          useValue: {
            send: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<ExamService>(ExamService)
    repository = module.get(ExamRepository)
    kafkaProducer = module.get(KafkaProducer)
  })

  describe('create', () => {
    it('should create exam and publish event', async () => {
      // Given
      const dto: CreateExamDto = {
        title: 'Math Test',
        durationMinutes: 60,
        questions: [],
      }
      repository.save.mockResolvedValue(mockExam)

      // When
      const result = await service.create('instructor-id', dto)

      // Then
      expect(result).toEqual(mockExam)
      expect(kafkaProducer.send).toHaveBeenCalledWith('exam.events', expect.objectContaining({
        type: 'ExamCreated',
      }))
    })

    it('should throw NotFoundException when exam not found', async () => {
      // Given
      repository.findById.mockResolvedValue(null)

      // When & Then
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException)
    })
  })
})
```

### 10.2 E2E Test

```typescript
describe('ExamController (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ExamModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('/exams (POST) should create exam', () => {
    return request(app.getHttpServer())
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${authToken}`)
      .send(createExamDto)
      .expect(201)
      .expect((res) => {
        expect(res.body.data).toHaveProperty('id')
        expect(res.body.data.title).toBe(createExamDto.title)
      })
  })
})
```

---

## 11. CẤM TUYỆT ĐỐI

```typescript
// ❌ any type
const data: any = fetchData()

// ❌ console.log trong production
console.log('debug')

// ❌ var (chỉ dùng const/let)
var x = 10

// ❌ Magic numbers
if (retries > 3) {}

// ❌ Empty catch
try { ... } catch (e) {}  // ❌

// ❌ Nested callbacks (dùng async/await)
fetchUser().then(user => {
  fetchCourses(user.id).then(courses => {
    // ❌ Callback hell
  })
})

// ❌ Hardcoded secrets
const JWT_SECRET = 'my-secret'  // ❌ Từ env

// ❌ Comment lặp lại code
// Increment counter
counter++
```

---

## 📚 REFERENCE

- [NestJS Docs](https://docs.nestjs.com/)
- [TypeORM Docs](https://typeorm.io/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Project Rules](../../01-business/PROJECT_RULES.md)

---

**Version:** 1.0
**Last updated:** 12/08/2026
