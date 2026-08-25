import { Test } from '@nestjs/testing';
import { BulkImportService } from './bulk-import.service';
import { QuestionWriteService } from '../question-write.service';
import { DataSource } from 'typeorm';
import {
  UserPrincipalDto,
  QuestionType,
  Difficulty,
  QuestionStatus,
  BusinessException,
} from '@ioes/common-node';

/**
 * Tests cho BulkImportService.
 * Mock QuestionWriteService để không cần DB thật.
 */
describe('BulkImportService', () => {
  let service: BulkImportService;
  let writeService: jest.Mocked<QuestionWriteService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockUser: UserPrincipalDto = Object.assign(
    new UserPrincipalDto(),
    {
      userId: 'user-1',
      email: 'instructor@test.com',
      role: 'INSTRUCTOR',
      tenantId: 'tenant-1',
    },
  );

  const validCsv = `question_text,question_type,difficulty,points,topic_id,language,hint,explanation,tags,options,test_cases,status
"What is 2+2?",multiple_choice,easy,5,00000000-0000-4000-8000-000000000000,,,,"math,basic","4|true,5|false",,
"Capital of France?",multiple_select,easy,10,00000000-0000-4000-8000-000000000000,,,,"geo","Paris|true,London|false,Tokyo|false|Rome|true",,
"2+2=4",true_false,very_easy,1,00000000-0000-4000-8000-000000000000,,,,,,,"true|true,false|false",,
"FizzBuzz",coding,medium,20,00000000-0000-4000-8000-000000000000,python,,,,,"1|1|true|10||15|fizz|false|10",,
"Hello world",short_answer,easy,5,00000000-0000-4000-8000-000000000000,,,,,,"hi,hello",,`;

  beforeEach(async () => {
    const writeServiceMock = {
      create: jest.fn(),
    };
    const dataSourceMock = {} as DataSource;

    const module = await Test.createTestingModule({
      providers: [
        BulkImportService,
        { provide: QuestionWriteService, useValue: writeServiceMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get(BulkImportService);
    writeService = module.get(QuestionWriteService) as jest.Mocked<QuestionWriteService>;
    dataSource = module.get(DataSource) as jest.Mocked<DataSource>;

    // Default: create succeeds
    writeService.create.mockImplementation(async (dto) => {
      return {
        id: `q-${Math.random().toString(36).slice(2, 10)}`,
        ...(dto as object),
        version: 1,
        status: QuestionStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null as unknown as Date,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        lastPublishedBy: null as unknown as string,
        publishedAt: null as unknown as Date,
      } as any;
    });
  });

  describe('happy path', () => {
    it('should import 5 valid rows successfully', async () => {
      const buffer = Buffer.from(validCsv, 'utf-8');
      const result = await service.importCsv(buffer, mockUser, 'corr-1');

      expect(result.totalRows).toBe(5);
      expect(result.successCount).toBe(5);
      expect(result.failedCount).toBe(0);
      expect(result.createdIds).toHaveLength(5);
      expect(result.errors).toHaveLength(0);
      expect(writeService.create).toHaveBeenCalledTimes(5);
    });

    it('should parse question_type correctly', async () => {
      const buffer = Buffer.from(validCsv, 'utf-8');
      await service.importCsv(buffer, mockUser, 'corr-1');

      const firstCall = writeService.create.mock.calls[0][0] as any;
      expect(firstCall.questionType).toBe(QuestionType.MULTIPLE_CHOICE);
      expect(firstCall.difficulty).toBe(Difficulty.EASY);
    });

    it('should map options correctly', async () => {
      const buffer = Buffer.from(validCsv, 'utf-8');
      await service.importCsv(buffer, mockUser, 'corr-1');

      const call = writeService.create.mock.calls[0][0] as any;
      expect(call.options).toHaveLength(2);
      expect(call.options[0]).toMatchObject({
        optionText: '4',
        isCorrect: true,
      });
    });
  });

  describe('validation errors', () => {
    it('should reject empty file', async () => {
      const buffer = Buffer.from('', 'utf-8');
      await expect(
        service.importCsv(buffer, mockUser, 'corr-1'),
      ).rejects.toThrow(/Empty file/);
    });

    it('should reject file with no data rows', async () => {
      const csv = 'question_text,question_type\n';
      const buffer = Buffer.from(csv, 'utf-8');
      await expect(
        service.importCsv(buffer, mockUser, 'corr-1'),
      ).rejects.toThrow(/No data rows/);
    });

    it('should reject file missing required headers', async () => {
      const csv = 'foo,bar\n1,2';
      const buffer = Buffer.from(csv, 'utf-8');
      await expect(
        service.importCsv(buffer, mockUser, 'corr-1'),
      ).rejects.toThrow(/Missing required columns/);
    });

    it('should collect per-row errors without aborting batch', async () => {
      // Row 3: invalid question_type
      const csv = `question_text,question_type,difficulty,points,topic_id
"Q1",multiple_choice,easy,5,00000000-0000-4000-8000-000000000000
"Q2",INVALID_TYPE,easy,5,00000000-0000-4000-8000-000000000000
"Q3",multiple_choice,easy,5,00000000-0000-4000-8000-000000000000`;
      const buffer = Buffer.from(csv, 'utf-8');

      const result = await service.importCsv(buffer, mockUser, 'corr-1');

      expect(result.totalRows).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rowNumber).toBe(3);
      expect(result.errors[0].fieldErrors[0]).toMatch(/question_type/);
    });

    it('should fail MCQ row without options', async () => {
      const csv = `question_text,question_type,difficulty,points,topic_id
"Bad Q",multiple_choice,easy,5,00000000-0000-4000-8000-000000000000`;
      const buffer = Buffer.from(csv, 'utf-8');

      const result = await service.importCsv(buffer, mockUser, 'corr-1');

      expect(result.failedCount).toBe(1);
      expect(result.errors[0].fieldErrors.some((e) => /options/i.test(e))).toBe(
        true,
      );
    });

    it('should fail coding question without test_cases', async () => {
      const csv = `question_text,question_type,difficulty,points,topic_id
"Bad Code",coding,easy,5,00000000-0000-4000-8000-000000000000`;
      const buffer = Buffer.from(csv, 'utf-8');

      const result = await service.importCsv(buffer, mockUser, 'corr-1');

      expect(result.failedCount).toBe(1);
      expect(
        result.errors[0].fieldErrors.some((e) => /test case/i.test(e)),
      ).toBe(true);
    });
  });

  describe('duplicate handling', () => {
    it('should fail rows that hit DB duplicate constraint', async () => {
      writeService.create.mockRejectedValueOnce(
        BusinessException.alreadyExists('Question', 'questionText', 'dup'),
      );

      const csv = `question_text,question_type,difficulty,points,topic_id
"Dup",multiple_choice,easy,5,00000000-0000-4000-8000-000000000000`;
      const buffer = Buffer.from(csv, 'utf-8');

      const result = await service.importCsv(buffer, mockUser, 'corr-1');

      expect(result.failedCount).toBe(1);
      expect(result.successCount).toBe(0);
    });
  });
});
