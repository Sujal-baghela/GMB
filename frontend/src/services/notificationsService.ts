import apiClient from '@/lib/apiClient';

// Matches backend Prisma enum NotificationType exactly
export type NotificationType =
  | 'REVIEW_RECEIVED'
  | 'REVIEW_REPLIED'
  | 'PHOTO_UPLOADED'
  | 'POST_PUBLISHED'
  | 'ANALYTICS_REPORT'
  | 'BILLING_ALERT'
  | 'TEAM_INVITATION'
  | 'SYSTEM_ALERT';

// Matches backend Prisma enum NotificationStatus
export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  data: Record<string, any> | null; // backend parses the JSON string for us
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
}

export const notificationsService = {
  async getAll(): Promise<Notification[]> {
    const response = await apiClient.get('/api/notifications');
    return response.data;
  },

  async markAsRead(id: string): Promise<Notification> {
    const response = await apiClient.patch(`/api/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead(notifications: Notification[]): Promise<void> {
    const unread = notifications.filter((n) => n.status === 'UNREAD');
    await Promise.allSettled(
      unread.map((n) => apiClient.patch(`/api/notifications/${n.id}/read`))
    );
  },

  getStats(notifications: Notification[]): NotificationStats {
    return {
      total: notifications.length,
      unread: notifications.filter((n) => n.status === 'UNREAD').length,
    };
  },
};
