import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { ReviewStatus } from '@prisma/client';

export interface CreateReplyDto {
  content: string;
}

export interface ReviewFilterDto {
  workspaceId: string;
  locationId?: string;
  rating?: number;
  status?: ReviewStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: ReviewFilterDto) {
    const { workspaceId, locationId, rating, status, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
    if (locationId) where.locationId = locationId;
    if (rating) where.rating = rating;
    if (status) where.status = status;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          replies: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
          location: { select: { id: true, name: true } },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, workspaceId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id, workspaceId },
      include: {
        replies: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        location: true,
      },
    });

    if (!review) throw new NotFoundException(`Review ${id} not found`);
    return review;
  }

  async replyToReview(reviewId: string, workspaceId: string, userId: string, dto: CreateReplyDto) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, workspaceId },
    });

    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);

    const reply = await this.prisma.reviewReply.create({
      data: {
        reviewId,
        userId,
        content: dto.content,
        isOwnerReply: true,
        publishedAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.RESPONDED,
        responseCount: { increment: 1 },
      },
    });

    return reply;
  }

  async getStats(workspaceId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { workspaceId },
      select: { rating: true, status: true },
    });

    const total = reviews.length;
    const avgRating = total > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
      : 0;

    const byRating = [5, 4, 3, 2, 1].map((r) => ({
      rating: r,
      count: reviews.filter((rev) => rev.rating === r).length,
    }));

    const responded = reviews.filter((r) => r.status === ReviewStatus.RESPONDED).length;
    const pending = total - responded;

    return {
      total,
      averageRating: Math.round(avgRating * 10) / 10,
      byRating,
      responded,
      pending,
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
    };
  }
}