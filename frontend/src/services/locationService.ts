import apiClient from '@/lib/apiClient';

export interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  googleRating: number | null;
  googleReviewCount: number;
  latitude: number | null;
  longitude: number | null;
  syncedAt: string | null;
  businessAccount: {
    id: string;
    name: string;
    googleAccountId: string;
  };
  _count: {
    reviews: number;
    posts: number;
    photos: number;
  };
}

export interface LocationStats {
  totalLocations: number;
  averageRating: number;
  totalReviews: number;
}

export const locationService = {
  async getAll(workspaceId: string): Promise<Location[]> {
    const response = await apiClient.get('/api/locations', {
      params: { workspaceId },
    });
    return response.data;
  },

  async getOne(id: string, workspaceId: string): Promise<Location> {
    const response = await apiClient.get(`/api/locations/${id}`, {
      params: { workspaceId },
    });
    return response.data;
  },

  async getStats(workspaceId: string): Promise<LocationStats> {
    const response = await apiClient.get('/api/locations/stats', {
      params: { workspaceId },
    });
    return response.data;
  },

  async getConnectUrl(workspaceId: string): Promise<{ authUrl: string }> {
    const response = await apiClient.get('/api/locations/connect', {
      params: { workspaceId },
    });
    return response.data;
  },

  async syncLocations(accountId: string) {
    const response = await apiClient.post(`/api/locations/sync/${accountId}`);
    return response.data;
  },

  async getAccounts(workspaceId: string) {
    const response = await apiClient.get('/api/google/accounts', {
      params: { workspaceId },
    });
    return response.data;
  },
};
