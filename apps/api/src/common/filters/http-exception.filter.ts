import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma, PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = null;

    // ─── NestJS HTTP Exception ───────────────────────────────────────────────
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || message;
        errors = resp.errors || null;
      }
    }

    // ─── Prisma Errors ────────────────────────────────────────────────────────
    else if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || [];
        message = `Duplicate value: ${target.join(', ')} already exists`;
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'Database operation failed';
      }
    } else if (exception instanceof PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
    }

    // ─── Log ─────────────────────────────────────────────────────────────────
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} — ${status}: ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.url} — ${status}: ${message}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
