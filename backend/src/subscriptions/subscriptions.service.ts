import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findByOrganization(organizationId: string) {
    return this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true, invoices: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
  }
}