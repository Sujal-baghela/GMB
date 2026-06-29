import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { LoggerService } from '@common/logger/logger.service';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = (exceptionResponse as any).message || exception.message;
      errors = (exceptionResponse as any).errors;
    } else if (exception instanceof Error) {
      message = exception.message;
      // Capture non-HTTP exceptions to Sentry
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(exception);
      }
    }

    this.logger.error(
      `Exception: ${message}`,
      exception instanceof Error ? exception.stack : '',
      'ExceptionFilter'
    );

    const responseData = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (errors) {
      (responseData as any).errors = errors;
    }

    response.status(status).json(responseData);
  }
}
