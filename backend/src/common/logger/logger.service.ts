import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class LoggerService extends Logger {
  constructor() {
    super('AppLogger');
    this.initializeSentry();
  }

  private initializeSentry() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
        profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '1.0'),
      });
    }
  }

  log(message: string, context?: string) {
    super.log(message, context);
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(new Error(message));
    }
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV === 'development') {
      super.debug(message, context);
    }
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context);
  }
}
