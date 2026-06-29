import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditActionType, AuditResourceType } from '@prisma/client';

export interface CreateAuditLogDto {
  organizationId: string;
  userId?: string;
  action: AuditActionType;
  resourceType: AuditResourceType;
  resourceId: string;
  resourceName?: string;
  changes?: object;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        resourceName: data.resourceName,
        changes: data.changes ? JSON.stringify(data.changes) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        status: 'SUCCESS',
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}