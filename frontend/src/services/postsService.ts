import apiClient from '@/lib/apiClient';

export interface Post {
  id: string;
  title: string | null;
  content: string;
  postType: string;
  callToActionType: string | null;
  callToActionUrl: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  views: number;
  clicks: number;
  createdAt: string;
  location: { id: string; name: string };
  user: { id: string; firstName: string | null; lastName: string | null };
}

export interface PostStats {
  total: number;
  published: number;
  draft: number;
  scheduled: number;
  totalViews: number;
  totalClicks: number;
}

export interface CreatePostData {
  locationId: string;
  title?: string;
  content: string;
  postType?: string;
  callToActionType?: string;
  callToActionUrl?: string;
  scheduledAt?: string;
}

export const postsService = {
  async getAll(
    workspaceId: string,
    locationId?: string,
    status?: string
  ): Promise<Post[]> {
    const response = await apiClient.get('/api/posts', {
      params: {
        workspaceId,
        ...(locationId ? { locationId } : {}),
        ...(status ? { status } : {}),
      },
    });
    return response.data;
  },

  async getStats(workspaceId: string): Promise<PostStats> {
    const response = await apiClient.get('/api/posts/stats', {
      params: { workspaceId },
    });
    return response.data;
  },

  async create(workspaceId: string, data: CreatePostData): Promise<Post> {
    const response = await apiClient.post('/api/posts', data, {
      params: { workspaceId },
    });
    return response.data;
  },

  async publish(id: string, workspaceId: string): Promise<Post> {
    const response = await apiClient.patch(
      `/api/posts/${id}/publish`,
      {},
      { params: { workspaceId } }
    );
    return response.data;
  },

  async delete(id: string, workspaceId: string) {
    const response = await apiClient.delete(`/api/posts/${id}`, {
      params: { workspaceId },
    });
    return response.data;
  },
};
