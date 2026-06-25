export type NotificationStatusFilter = "all" | "unread" | "read";

export interface UserNotification {
  id: string;
  recipientId?: string | null;
  recipientType?: "user" | "seller" | "admin" | string | null;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  redirectUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: UserNotification[];
  pagination: NotificationPagination;
}

export interface UnreadNotificationCountResponse {
  success: boolean;
  unreadCount: number;
}

export interface NotificationActionResponse {
  success: boolean;
  notification?: UserNotification;
  updatedCount?: number;
  message?: string;
}
