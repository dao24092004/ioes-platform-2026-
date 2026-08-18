import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';
import { ApiResponse } from '../dto/api-response.dto';

/**
 * Validation Exception Filter - Handles DTO validation errors
 */
@Catch()
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (!this.isValidationError(exception)) {
      throw exception;
    }

    const errors = this.formatErrors(exception.validationErrors);

    this.logger.warn(`Validation failed: ${JSON.stringify(errors)}`);

    response.status(HttpStatus.BAD_REQUEST).json(
      ApiResponse.error('Validation failed', errors),
    );
  }

  private isValidationError(exception: any): boolean {
    return (
      exception.constructor?.name === 'ValidationPipe' &&
      Array.isArray(exception.validationErrors)
    );
  }

  private formatErrors(errors: ValidationError[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const error of errors) {
      const constraints = error.constraints
        ? Object.values(error.constraints)
        : ['Invalid value'];
      result[error.property] = constraints;
    }
    return result;
  }
}
