import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string) {
    return this.prisma.analytics.findMany({
      where: { workspaceId },
      include: { location: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async findByLocation(workspaceId: string, locationId: string) {
    return this.prisma.analytics.findMany({
      where: { workspaceId, locationId },
      orderBy: { date: 'asc' },
    });
  }

  async getSummary(workspaceId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const analytics = await this.prisma.analytics.findMany({
      where: { workspaceId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    const totals = analytics.reduce(
      (acc, a) => ({
        searches: acc.searches + a.searches,
        directions: acc.directions + a.directions,
        websiteClicks: acc.websiteClicks + a.websiteClicks,
        phoneClicks: acc.phoneClicks + a.phoneClicks,
        postImpressions: acc.postImpressions + a.postImpressions,
        photoViews: acc.photoViews + a.photoViews,
        conversions: acc.conversions + a.conversions,
      }),
      {
        searches: 0,
        directions: 0,
        websiteClicks: 0,
        phoneClicks: 0,
        postImpressions: 0,
        photoViews: 0,
        conversions: 0,
      },
    );

    // Group by date for chart
    const byDate: Record<string, any> = {};
    analytics.forEach((a) => {
      const dateKey = a.date.toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: dateKey,
          searches: 0,
          directions: 0,
          websiteClicks: 0,
          phoneClicks: 0,
          photoViews: 0,
        };
      }
      byDate[dateKey].searches += a.searches;
      byDate[dateKey].directions += a.directions;
      byDate[dateKey].websiteClicks += a.websiteClicks;
      byDate[dateKey].phoneClicks += a.phoneClicks;
      byDate[dateKey].photoViews += a.photoViews;
    });

    // Reviews stats
    const reviews = await this.prisma.review.findMany({
      where: { workspaceId, publishedAt: { gte: since } },
      select: { rating: true, publishedAt: true },
    });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;

    return {
      totals,
      chartData: Object.values(byDate),
      reviewCount: reviews.length,
      averageRating: Math.round(avgRating * 10) / 10,
      period: days,
    };
  }

  async getInsights(workspaceId: string) {
    // Get last 30 vs previous 30 days for comparison
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [current, previous] = await Promise.all([
      this.prisma.analytics.findMany({
        where: { workspaceId, date: { gte: thirtyDaysAgo } },
      }),
      this.prisma.analytics.findMany({
        where: { workspaceId, date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]);

    const sum = (arr: any[], field: string) =>
      arr.reduce((s, a) => s + (a[field] || 0), 0);

    const metrics = ['searches', 'directions', 'websiteClicks', 'phoneClicks'];
    const insights = metrics.map((metric) => {
      const curr = sum(current, metric);
      const prev = sum(previous, metric);
      const change = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
      return { metric, current: curr, previous: prev, change };
    });

    return insights;
  }
}