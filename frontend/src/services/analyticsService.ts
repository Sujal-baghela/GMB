import apiClient from '@/lib/apiClient';

export interface AnalyticsSummary {
  totals: {
    searches: number;
    directions: number;
    websiteClicks: number;
    phoneClicks: number;
    postImpressions: number;
    photoViews: number;
    conversions: number;
  };
  chartData: {
    date: string;
    searches: number;
    directions: number;
    websiteClicks: number;
    phoneClicks: number;
    photoViews: number;
  }[];
  reviewCount: number;
  averageRating: number;
  period: number;
}

export interface AnalyticsInsight {
  metric: string;
  current: number;
  previous: number;
  change: number;
}

export const analyticsService = {
  async getSummary(workspaceId: string, days = 30): Promise<AnalyticsSummary> {
    const response = await apiClient.get('/api/analytics/summary', {
      params: { workspaceId, days },
    });
    return response.data;
  },

  async getInsights(workspaceId: string): Promise<AnalyticsInsight[]> {
    const response = await apiClient.get('/api/analytics/insights', {
      params: { workspaceId },
    });
    return response.data;
  },

  async getByLocation(workspaceId: string, locationId: string) {
    const response = await apiClient.get('/api/analytics/location', {
      params: { workspaceId, locationId },
    });
    return response.data;
  },
};
