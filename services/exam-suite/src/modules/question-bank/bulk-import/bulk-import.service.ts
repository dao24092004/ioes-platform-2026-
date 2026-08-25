import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  UserPrincipalDto,
  BusinessException,
  createLogger,
  QuestionType,
  Difficulty,
  QuestionStatus,
  OutboxEvent,
} from '@ioes/common-node';
import { Question } from '../entities/question.entity';
import {
  KAFKA_TOPICS,
  EVENT_TYPES,
  buildEventEnvelope,
  QuestionEventPayload,
} from '@ioes/common-node';
import { QuestionWriteService } from '../question-write.service';
import { storageConfig, bulkImportConfig } from '../../../config/app.config';
import {
  BulkImportRowDto,
  BulkImportResponse,
} from './bulk-import.dto';
import {
  parseCsv,
  parseOptionsField,
  parseTestCasesField,
  splitCsvField,
  CsvParseError,
} from './csv-parser';

/**
 * BulkImportService - import hàng loạt câu hỏi từ CSV/Excel.
 *
 * Flow:
 * 1. Parse file (CSV hoặc TSV) → rows
 * 2. Validate từng row với class-validator (BulkImportRowDto)
 * 3. Cross-field validation (questionType vs options vs testCases)
 * 4. Insert vào PostgreSQL trong batches (transaction)
 * 5. Mỗi batch → publish QuestionCreated event (outbox)
 * 6. Trả về summary: success/fail counts + errors per row
 *
 * **Excel format**: Excel có thể save-as CSV (UTF-8). Native .xlsx
 * support để Phase 3 (cần thêm thư viện `exceljs`).
 *
 * **Idempotency**: KHÔNG idempotent. Nếu import trùng questionText
 * trong cùng topic → fail row với error "duplicate".
 *
 * **Limits**:
 * - Max 5000 rows/file (configurable)
 * - Batch insert 100 rows/lần (transactional)
 * - Max file 50MB
 */
@Injectable()
export class BulkImportService {
  private readonly logger = createLogger(BulkImportService.name);

  constructor(
    private readonly writeService: QuestionWriteService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Import từ CSV/TSV buffer.
   * Returns summary + per-row errors.
   */
  async importCsv(
    buffer: Buffer,
    user: UserPrincipalDto,
    correlationId: string,
  ): Promise<BulkImportResponse> {
    const startTime = Date.now();
    const createdIds: string[] = [];
    const errors: BulkImportResponse['errors'] = [];

    // Validate file size
    if (buffer.length === 0) {
      throw new BadRequestException('Empty file');
    }
    if (buffer.length > storageConfig.maxBulkImportSize) {
      throw new BadRequestException(
        `File too large: ${buffer.length} > ${storageConfig.maxBulkImportSize} bytes`,
      );
    }

    // Parse CSV
    let parsed: ReturnType<typeof parseCsv>;
    try {
      const text = buffer.toString('utf-8');
      parsed = parseCsv(text);
    } catch (err) {
      if (err instanceof CsvParseError) {
        throw new BadRequestException(`CSV parse error: ${err.message}`);
      }
      throw new BadRequestException(
        `Failed to parse file: ${(err as Error).message}`,
      );
    }

    if (parsed.rows.length === 0) {
      throw new BadRequestException('No data rows found');
    }
    if (parsed.rows.length > bulkImportConfig.maxRows) {
      throw new BadRequestException(
        `Too many rows: ${parsed.rows.length} > ${bulkImportConfig.maxRows}`,
      );
    }

    // Validate headers
    const headerErrors = this.validateHeaders(parsed.headers);
    if (headerErrors.length > 0) {
      throw new BadRequestException(
        `Missing required columns: ${headerErrors.join(', ')}`,
      );
    }

    // Process rows
    let successCount = 0;
    let failedCount = 0;

    for (const row of parsed.rows) {
      const rowErrors: string[] = [];

      // 1. Parse row → BulkImportRowDto
      let dto: BulkImportRowDto;
      try {
        dto = this.mapRowToDto(row.fields);
      } catch (err) {
        rowErrors.push((err as Error).message);
        errors.push({ rowNumber: row.rowNumber, fieldErrors: rowErrors, raw: row.fields });
        failedCount++;
        continue;
      }

      // 2. Validate với class-validator
      const dtoInstance = plainToInstance(BulkImportRowDto, dto, {
        enableImplicitConversion: false,
      });
      const validationErrors = await validate(dtoInstance, {
        whitelist: false,
        forbidNonWhitelisted: false,
      });

      if (validationErrors.length > 0) {
        for (const ve of validationErrors) {
          const constraints = ve.constraints ?? {};
          rowErrors.push(
            `${ve.property}: ${Object.values(constraints).join(', ')}`,
          );
        }
        errors.push({ rowNumber: row.rowNumber, fieldErrors: rowErrors, raw: row.fields });
        failedCount++;
        continue;
      }

      // 3. Cross-field validation
      const crossErrors = this.validateCrossFields(dto);
      if (crossErrors.length > 0) {
        errors.push({ rowNumber: row.rowNumber, fieldErrors: crossErrors, raw: row.fields });
        failedCount++;
        continue;
      }

      // 4. Insert vào DB (transactional)
      try {
        const created = await this.writeService.create(
          this.toCreateQuestionDto(dto),
          user,
          correlationId,
        );
        createdIds.push(created.id);
        successCount++;
      } catch (err) {
        if (err instanceof BusinessException) {
          rowErrors.push(err.message);
        } else {
          rowErrors.push(`DB error: ${(err as Error).message}`);
        }
        errors.push({ rowNumber: row.rowNumber, fieldErrors: rowErrors, raw: row.fields });
        failedCount++;
      }
    }

    const durationMs = Date.now() - startTime;
    this.logger.info(
      `Bulk import by ${user.userId}: total=${parsed.rows.length} success=${successCount} failed=${failedCount} duration=${durationMs}ms`,
    );

    return {
      totalRows: parsed.rows.length,
      successCount,
      failedCount,
      createdIds,
      errors,
      durationMs,
    };
  }

  /**
   * Validate headers có đủ required columns không.
   */
  private validateHeaders(headers: string[]): string[] {
    const required = [
      'question_text',
      'question_type',
      'difficulty',
      'points',
      'topic_id',
    ];
    return required.filter((h) => !headers.includes(h));
  }

  /**
   * Map raw row fields → BulkImportRowDto với type coercion.
   */
  private mapRowToDto(fields: Record<string, string>): BulkImportRowDto {
    // Map question_type string → enum
    const questionTypeRaw = fields.question_type?.toLowerCase().replace(/-/g, '_');
    const questionType = this.parseEnum(
      questionTypeRaw,
      QuestionType,
      'question_type',
    );

    const difficultyRaw = fields.difficulty?.toLowerCase().replace(/-/g, '_');
    const difficulty = this.parseEnum(difficultyRaw, Difficulty, 'difficulty');

    const points = Number(fields.points);
    if (Number.isNaN(points)) {
      throw new Error(`points must be a number, got: ${fields.points}`);
    }

    const statusRaw = fields.status?.toLowerCase();
    const status = statusRaw
      ? this.parseEnum(statusRaw, QuestionStatus, 'status')
      : undefined;

    const estimatedTimeSeconds = fields.estimated_seconds
      ? Number(fields.estimated_seconds)
      : undefined;

    // Parse options field nếu có
    const options = fields.options ? parseOptionsField(fields.options) : undefined;
    const correctAnswers = fields.correct_answers
      ? splitCsvField(fields.correct_answers)
      : undefined;
    const testCases = fields.test_cases
      ? parseTestCasesField(fields.test_cases)
      : undefined;
    const tags = fields.tags ? splitCsvField(fields.tags) : undefined;

    return {
      questionText: fields.question_text ?? '',
      questionType,
      difficulty,
      points,
      topicId: fields.topic_id ?? '',
      language: fields.language || undefined,
      hint: fields.hint || undefined,
      explanation: fields.explanation || undefined,
      estimatedTimeSeconds:
        estimatedTimeSeconds && !Number.isNaN(estimatedTimeSeconds)
          ? estimatedTimeSeconds
          : undefined,
      tags,
      options,
      correctAnswers,
      testCases,
      status,
    };
  }

  /**
   * Parse enum value (case-insensitive).
   */
  private parseEnum<T extends Record<string, string>>(
    value: string | undefined,
    enumObj: T,
    fieldName: string,
  ): T[keyof T] {
    if (!value) {
      throw new Error(`${fieldName} is required`);
    }
    const enumValues = Object.values(enumObj);
    const match = enumValues.find((v) => String(v).toLowerCase() === value);
    if (!match) {
      throw new Error(
        `${fieldName} must be one of: ${enumValues.join(', ')}, got: ${value}`,
      );
    }
    return match as T[keyof T];
  }

  /**
   * Cross-field validation tương tự QuestionTypeOptionsMatch / HasCorrectAnswer.
   * Bulk import path không qua ValidationPipe nên cần validate thủ công.
   */
  private validateCrossFields(dto: BulkImportRowDto): string[] {
    const errors: string[] = [];

    switch (dto.questionType) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.MULTIPLE_SELECT:
        if (!dto.options || dto.options.length < 2) {
          errors.push('question_type requires at least 2 options');
        }
        if (!dto.options || dto.options.length > 10) {
          errors.push('question_type allows maximum 10 options');
        }
        if (!dto.options?.some((o) => o.isCorrect)) {
          errors.push('at least one option must be marked correct (isCorrect=true)');
        }
        break;

      case QuestionType.TRUE_FALSE:
        if (!dto.options || dto.options.length !== 2) {
          errors.push('TRUE_FALSE requires exactly 2 options');
        } else {
          const texts = dto.options.map((o) => o.optionText.toLowerCase());
          if (
            !texts.includes('true') ||
            !texts.includes('false')
          ) {
            errors.push('TRUE_FALSE options must contain "true" and "false"');
          }
          if (!dto.options.some((o) => o.isCorrect)) {
            errors.push('at least one option must be marked correct');
          }
        }
        break;

      case QuestionType.SHORT_ANSWER:
        if (!dto.correctAnswers || dto.correctAnswers.length === 0) {
          errors.push('SHORT_ANSWER requires correct_answers column');
        }
        break;

      case QuestionType.CODING:
        if (!dto.testCases || dto.testCases.length === 0) {
          errors.push('CODING requires at least one test case');
        }
        break;

      case QuestionType.ESSAY:
        // No specific validation
        break;
    }

    return errors;
  }

  /**
   * Convert BulkImportRowDto → CreateQuestionDto format.
   */
  private toCreateQuestionDto(dto: BulkImportRowDto): import('../dto/create-question.dto').CreateQuestionDto {
    const result: import('../dto/create-question.dto').CreateQuestionDto = {
      questionText: dto.questionText,
      questionType: dto.questionType,
      difficulty: dto.difficulty,
      points: dto.points,
      topicId: dto.topicId,
    };

    if (dto.language !== undefined) result.language = dto.language;
    if (dto.hint !== undefined) result.hint = dto.hint;
    if (dto.explanation !== undefined) result.explanation = dto.explanation;
    if (dto.estimatedTimeSeconds !== undefined) {
      result.estimatedTimeSeconds = dto.estimatedTimeSeconds;
    }
    if (dto.tags !== undefined) result.tags = dto.tags;
    if (dto.status !== undefined) result.status = dto.status;

    // Map options cho MCQ/Multi-select/True-False
    if (
      dto.options &&
      (dto.questionType === QuestionType.MULTIPLE_CHOICE ||
        dto.questionType === QuestionType.MULTIPLE_SELECT ||
        dto.questionType === QuestionType.TRUE_FALSE)
    ) {
      result.options = dto.options;
    }

    // Map test cases cho coding
    if (dto.testCases && dto.questionType === QuestionType.CODING) {
      result.testCases = dto.testCases;
    }

    // Map correct answers cho short answer - convert sang explanation field
    if (
      dto.correctAnswers &&
      dto.questionType === QuestionType.SHORT_ANSWER
    ) {
      // Lưu correct answers vào explanation field (encoded)
      // Production nên có table riêng cho short_answer_correct_values
      result.explanation = `Correct answers: ${dto.correctAnswers.join(' | ')}`;
    }

    return result;
  }
}
