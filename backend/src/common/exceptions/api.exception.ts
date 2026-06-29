import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, any>
  ) {
    const response = {
      message,
      statusCode: status,
      ...(details && { details }),
    };
    super(response, status);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, HttpStatus.BAD_REQUEST, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(message, HttpStatus.CONFLICT);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
