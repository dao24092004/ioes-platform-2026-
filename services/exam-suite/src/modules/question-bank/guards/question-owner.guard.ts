import { CanActivate, ExecutionContext, ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { StructuredLogger } from '@ioes/common-node';
import { JwtPayload } from '@ioes/common-node';
import { Question } from '../entities/question.entity';

/**
 * Guard đảm bảo user chỉ xoá/sửa question của mình (trừ ADMIN).
 *
 * Style guide compliance: kebab-case file name, NestJS Logger, single responsibility.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard, QuestionOwnerGuard)
 * @Delete(':id')
 * async delete(...) {}
 * ```
 */
@Injectable()
export class QuestionOwnerGuard implements CanActivate, OnModuleInit {
  private readonly logger = new StructuredLogger(QuestionOwnerGuard.name);

  constructor(
    @InjectRepository(Question)
    private readonly repo: Repository<Question>,
  ) {}

  onModuleInit(): void {
    this.logger.log('QuestionOwnerGuard initialized');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin bypass
    if (user.role === 'ADMIN') {
      return true;
    }

    const questionId = request.params?.id;
    if (!questionId) {
      this.logger.warn('QuestionOwnerGuard: no id param');
      return false;
    }

    const question = await this.repo.findOne({
      where: { id: questionId },
      select: ['id', 'createdBy'],
    });

    if (!question) {
      throw new ForbiddenException('Question not found');
    }

    if (question.createdBy !== user.sub) {
      this.logger.warn(
        `Ownership denied: user ${user.sub} tried to access question ${questionId} owned by ${question.createdBy}`,
      );
      throw new ForbiddenException('You do not own this question');
    }

    return true;
  }
}
