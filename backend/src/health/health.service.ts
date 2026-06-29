import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async getHealth() {
    const dbCheck = await this.checkDatabase();
    const uptime = process.uptime();

    return {
      status: dbCheck ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime,
      database: dbCheck ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV,
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
