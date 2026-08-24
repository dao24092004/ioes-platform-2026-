import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DgraphResyncService } from './dgraph-resync.service';
import { Question } from './entities/question.entity';
import { OutboxEvent } from './entities/outbox-event.entity';
import { UserPrincipalDto } from '@ioes/common-node';

describe('DgraphResyncService', () => {
  let service: DgraphResyncService;
  let questionRepo: { createQueryBuilder: jest.Mock; findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const mockAdminUser: UserPrincipalDto = {
    userId: 'admin-1',
    email: 'admin@test.com',
    roles: ['ADMIN'],
    tenantId: 't-1',
  };

  const mockInstructor: UserPrincipalDto = {
    userId: 'instructor-1',
    email: 'inst@test.com',
    roles: ['INSTRUCTOR'],
    tenantId: 't-1',
  };

  beforeEach(async () => {
    questionRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    const mockManager = {
      create: jest.fn((entity, data) => ({ ...data })),
      save: jest.fn(async () => ({})),
    };

    dataSource = {
      transaction: jest.fn(async (cb) => cb(mockManager)),
    };

    const module = await Test.createTestingModule({
      providers: [
        DgraphResyncService,
        { provide: getRepositoryToken(Question), useValue: questionRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(OutboxEvent), useValue: {} },
      ],
    }).compile();

    service = module.get(DgraphResyncService);
  });

  describe('resyncAll - authorization', () => {
    it('should reject non-admin users', async () => {
      await expect(
        service.resyncAll(mockInstructor, {}),
      ).rejects.toThrow(/Only ADMIN/);
    });
  });

  describe('resyncAll - pagination', () => {
    it('should paginate large result set', async () => {
      const mockQuestions = Array.from({ length: 250 }, (_, i) => ({
        id: `q-${i}`,
        questionText: `Q${i}`,
        questionType: 'multiple_choice',
        difficulty: 'easy',
        points: 5,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      let countCalls = 0;
      const qbMock: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        clone: jest.fn(),
        getCount: jest.fn(),
        getMany: jest.fn(),
      };

      qbMock.getCount.mockResolvedValue(250);
      qbMock.getMany.mockImplementation(async () => {
        countCalls++;
        const offset = (countCalls - 1) * 100;
        return mockQuestions.slice(offset, offset + 100);
      });
      qbMock.clone.mockReturnValue(qbMock);

      questionRepo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.resyncAll(mockAdminUser, {});

      expect(result.totalQuestions).toBe(250);
      expect(result.batchCount).toBeGreaterThanOrEqual(3);
      expect(result.triggeredBy).toBe('admin-1');
    });

    it('should respect limit option', async () => {
      const qbMock: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        clone: jest.fn(),
        getCount: jest.fn().mockResolvedValue(5),
        getMany: jest.fn().mockResolvedValue([]),
      };
      qbMock.clone.mockReturnValue(qbMock);

      questionRepo.createQueryBuilder.mockReturnValue(qbMock);

      await service.resyncAll(mockAdminUser, { limit: 5 });
      expect(qbMock.limit).toHaveBeenCalledWith(5);
    });

    it('should filter by since date', async () => {
      const qbMock: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        clone: jest.fn(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };
      qbMock.clone.mockReturnValue(qbMock);

      questionRepo.createQueryBuilder.mockReturnValue(qbMock);

      const since = new Date('2026-01-01');
      await service.resyncAll(mockAdminUser, { since });

      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'q.updatedAt >= :since',
        { since },
      );
    });
  });

  describe('resyncOne', () => {
    it('should throw when question not found', async () => {
      questionRepo.findOne.mockResolvedValue(null);
      await expect(
        service.resyncOne('non-existent', mockAdminUser),
      ).rejects.toThrow(/not found/);
    });

    it('should create outbox event for existing question', async () => {
      questionRepo.findOne.mockResolvedValue({
        id: 'q-1',
        questionText: 'Test',
        questionType: 'multiple_choice',
        difficulty: 'easy',
        points: 5,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.resyncOne('q-1', mockAdminUser);

      expect(result.eventId).toBeTruthy();
      expect(typeof result.eventId).toBe('string');
    });
  });
});
