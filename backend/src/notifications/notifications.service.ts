import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Parse the JSON `data` string back into an object for the frontend
    return notifications.map((n) => ({
      ...n,
      data: n.data ? JSON.parse(n.data) : null,
    }));
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { status: 'READ', readAt: new Date() },
    });

    return { ...updated, data: updated.data ? JSON.parse(updated.data) : null };
  }

  // Called internally by other services (e.g. GoogleService after a new review syncs)
  async createNotification(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data ? JSON.stringify(dto.data) : null,
        actionUrl: dto.actionUrl,
      },
    });
  }
}