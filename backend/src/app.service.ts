import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  getVersion() {
    return {
      version: '1.0.0',
      name: 'Google Business Profile Manager',
      environment: process.env.NODE_ENV,
    };
  }
}
