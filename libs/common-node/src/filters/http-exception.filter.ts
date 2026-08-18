import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../dto/api-response.dto';

/**
 * HTTP Exception Filter - Handles known HTTP exceptions
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const res = exception.getResponse();

    const message =
      typeof res === 'string'
        ? res
        : (res as any).message || exception.message;

    const errorCode =
      typeof res === 'object' && (res as any).error ? (res as any).error : 'HTTP_ERROR';

    this.logger.warn(`HTTP exception [${status}]: ${message}`);

    response.status(status).json({
      ...ApiResponse.error(message),
      errorCode,
    });
  }
}
