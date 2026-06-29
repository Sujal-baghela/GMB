import apiClient from '@/lib/apiClient';

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  status: string;
  views: number;
  uploadedAt: string | null;
  createdAt: string;
  location: { id: string; name: string };
  user: { id: string; firstName: string | null; lastName: string | null };
}

export interface PhotoStats {
  totalPhotos: number;
  totalViews: number;
}

export const photosService = {
  async getAll(workspaceId: string, locationId?: string): Promise<Photo[]> {
    const response = await apiClient.get('/api/photos', {
      params: { workspaceId, ...(locationId ? { locationId } : {}) },
    });
    return response.data;
  },

  async getStats(workspaceId: string): Promise<PhotoStats> {
    const response = await apiClient.get('/api/photos/stats', {
      params: { workspaceId },
    });
    return response.data;
  },

  async create(
    workspaceId: string,
    data: {
      locationId: string;
      url: string;
      thumbnailUrl?: string;
      caption?: string;
    }
  ): Promise<Photo> {
    const response = await apiClient.post('/api/photos', data, {
      params: { workspaceId },
    });
    return response.data;
  },

  async delete(id: string, workspaceId: string) {
    const response = await apiClient.delete(`/api/photos/${id}`, {
      params: { workspaceId },
    });
    return response.data;
  },
};
