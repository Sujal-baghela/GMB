import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string) {
    return this.prisma.location.findMany({
      where: { workspaceId },
      include: {
        businessAccount: {
          select: { id: true, name: true, googleAccountId: true },
        },
        _count: {
          select: { reviews: true, posts: true, photos: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, workspaceId: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, workspaceId },
      include: {
        businessAccount: true,
        _count: {
          select: { reviews: true, posts: true, photos: true },
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    return location;
  }

  async getStats(workspaceId: string) {
    const locations = await this.prisma.location.findMany({
      where: { workspaceId },
      select: {
        googleRating: true,
        googleReviewCount: true,
        _count: { select: { reviews: true } },
      },
    });

    const total = locations.length;
    const avgRating =
      total > 0
        ? locations.reduce((sum, l) => sum + (l.googleRating || 0), 0) / total
        : 0;
    const totalReviews = locations.reduce(
      (sum, l) => sum + l.googleReviewCount,
      0,
    );

    return {
      totalLocations: total,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews,
    };
  }
}