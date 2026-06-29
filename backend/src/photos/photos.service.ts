import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { PhotoStatus } from '@prisma/client';

@Injectable()
export class PhotosService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string, locationId?: string) {
    return this.prisma.photo.findMany({
      where: {
        workspaceId,
        ...(locationId ? { locationId } : {}),
        status: { not: PhotoStatus.FAILED },
      },
      include: {
        location: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, workspaceId: string) {
    const photo = await this.prisma.photo.findFirst({
      where: { id, workspaceId },
      include: {
        location: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!photo) throw new NotFoundException(`Photo ${id} not found`);
    return photo;
  }

  async create(data: {
    workspaceId: string;
    locationId: string;
    userId: string;
    url: string;
    thumbnailUrl?: string;
    caption?: string;
  }) {
    return this.prisma.photo.create({
      data: {
        workspaceId: data.workspaceId,
        locationId: data.locationId,
        userId: data.userId,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl || data.url,
        caption: data.caption,
        status: PhotoStatus.ACTIVE,
        uploadedAt: new Date(),
      },
      include: {
        location: { select: { id: true, name: true } },
      },
    });
  }

  async delete(id: string, workspaceId: string) {
    const photo = await this.prisma.photo.findFirst({
      where: { id, workspaceId },
    });
    if (!photo) throw new NotFoundException(`Photo ${id} not found`);
    await this.prisma.photo.update({
      where: { id },
      data: { status: PhotoStatus.ARCHIVED },
    });
    return { success: true, message: 'Photo archived' };
  }

  async getStats(workspaceId: string) {
    const photos = await this.prisma.photo.findMany({
      where: { workspaceId, status: PhotoStatus.ACTIVE },
      select: { locationId: true, views: true },
    });
    const totalPhotos = photos.length;
    const totalViews = photos.reduce((sum, p) => sum + p.views, 0);
    return { totalPhotos, totalViews };
  }
}