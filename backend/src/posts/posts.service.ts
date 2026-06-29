import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { PostStatus } from '@prisma/client';

export interface CreatePostDto {
  locationId: string;
  title?: string;
  content: string;
  postType?: string;
  callToActionType?: string;
  callToActionUrl?: string;
  scheduledAt?: string;
}

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string, locationId?: string, status?: PostStatus) {
    return this.prisma.post.findMany({
      where: {
        workspaceId,
        ...(locationId ? { locationId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        location: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, workspaceId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, workspaceId },
      include: {
        location: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    return post;
  }

  async create(workspaceId: string, userId: string, dto: CreatePostDto) {
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const status = scheduledAt ? PostStatus.SCHEDULED : PostStatus.DRAFT;

    return this.prisma.post.create({
      data: {
        workspaceId,
        locationId: dto.locationId,
        userId,
        title: dto.title,
        content: dto.content,
        postType: dto.postType || 'UPDATE',
        callToActionType: dto.callToActionType,
        callToActionUrl: dto.callToActionUrl,
        status,
        scheduledAt,
      },
      include: {
        location: { select: { id: true, name: true } },
      },
    });
  }

  async publish(id: string, workspaceId: string) {
    const post = await this.prisma.post.findFirst({ where: { id, workspaceId } });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    return this.prisma.post.update({
      where: { id },
      data: { status: PostStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async delete(id: string, workspaceId: string) {
    const post = await this.prisma.post.findFirst({ where: { id, workspaceId } });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    await this.prisma.post.update({
      where: { id },
      data: { status: PostStatus.ARCHIVED },
    });
    return { success: true };
  }

  async getStats(workspaceId: string) {
    const posts = await this.prisma.post.findMany({
      where: { workspaceId },
      select: { status: true, views: true, clicks: true },
    });
    const total = posts.length;
    const published = posts.filter((p) => p.status === PostStatus.PUBLISHED).length;
    const draft = posts.filter((p) => p.status === PostStatus.DRAFT).length;
    const scheduled = posts.filter((p) => p.status === PostStatus.SCHEDULED).length;
    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const totalClicks = posts.reduce((s, p) => s + p.clicks, 0);
    return { total, published, draft, scheduled, totalViews, totalClicks };
  }
}