import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.syncJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findByAccount(businessAccountId: string) {
    return this.prisma.syncJob.findMany({
      where: { businessAccountId },
      orderBy: { createdAt: 'desc' },
    });
  }
}