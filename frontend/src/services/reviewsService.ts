import apiClient from '@/lib/apiClient';

export interface ReviewReply {
  id: string;
  content: string;
  isOwnerReply: boolean;
  publishedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface Review {
  id: string;
  googleReviewId: string;
  authorName: string;
  rating: number;
  content: string;
  status: string;
  publishedAt: string | null;
  responseCount: number;
  location: { id: string; name: string };
  replies: ReviewReply[];
}

export interface ReviewStats {
  total: number;
  averageRating: number;
  byRating: { rating: number; count: number }[];
  responded: number;
  pending: number;
  responseRate: number;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const reviewsService = {
  async getAll(params: {
    workspaceId: string;
    locationId?: string;
    rating?: number;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ReviewsResponse> {
    const response = await apiClient.get('/api/reviews', { params });
    return response.data;
  },

  async getOne(id: string, workspaceId: string): Promise<Review> {
    const response = await apiClient.get(`/api/reviews/${id}`, {
      params: { workspaceId },
    });
    return response.data;
  },

  async getStats(workspaceId: string): Promise<ReviewStats> {
    const response = await apiClient.get('/api/reviews/stats', {
      params: { workspaceId },
    });
    return response.data;
  },

  async reply(
    reviewId: string,
    workspaceId: string,
    content: string
  ): Promise<ReviewReply> {
    const response = await apiClient.post(
      `/api/reviews/${reviewId}/reply`,
      { content },
      { params: { workspaceId } }
    );
    return response.data;
  },
};
