import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Domain errors cho exam flow.
 *
 * Tách riêng để:
 * - Dễ map sang HTTP status ở boundary (ExceptionFilter)
 * - Test dễ (chỉ check error class, không cần check message)
 * - Tương lai có thể i18n error messages
 */
export class ExamNotFoundError extends NotFoundException {
  constructor(examId: string) {
    super(`Exam not found: ${examId}`);
  }
}

export class ExamDeletedError extends BadRequestException {
  constructor(examId: string) {
    super(`Exam has been deleted: ${examId}`);
  }
}

export class AttemptNotFoundError extends NotFoundException {
  constructor(attemptId: string) {
    super(`Attempt not found: ${attemptId}`);
  }
}

export class AttemptNotActiveError extends BadRequestException {
  constructor(attemptId: string, status: string) {
    super(`Attempt ${attemptId} is not active (status=${status})`);
  }
}

export class AttemptAlreadyExistsError extends ConflictException {
  constructor(examId: string, userId: string) {
    super(`Active attempt already exists for user=${userId}, exam=${examId}`);
  }
}

export class MaxAttemptsReachedError extends BadRequestException {
  constructor(examId: string, userId: string, max: number) {
    super(`Max attempts reached: exam=${examId} user=${userId} max=${max}`);
  }
}

export class AttemptExpiredError extends BadRequestException {
  constructor(attemptId: string) {
    super(`Attempt ${attemptId} has expired`);
  }
}

export class NotExamOwnerError extends BadRequestException {
  constructor(message = 'User is not the owner of this attempt') {
    super(message);
  }
}

export class NotAttemptOwnerError extends BadRequestException {
  constructor(attemptId: string, userId: string) {
    super(`User ${userId} is not owner of attempt ${attemptId}`);
  }
}

export class AttemptNotInGradedStateError extends BadRequestException {
  constructor(attemptId: string, status: string) {
    super(`Attempt ${attemptId} cannot be graded (status=${status})`);
  }
}

export class NoQuestionsError extends BadRequestException {
  constructor(examId: string) {
    super(`Exam has no questions: ${examId}`);
  }
}
