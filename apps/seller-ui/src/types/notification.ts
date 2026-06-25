export type SellerNotificationStatusFilter = "all" | "unread" | "read";

export interface SellerNotification {
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

export interface SellerNotificationPagination {
  total: number;
  totalCount?: number;
  totalItems?: number;
  page: number;
  currentPage?: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SellerNotificationsResponse {
  success: boolean;
  notifications: SellerNotification[];
  pagination: SellerNotificationPagination;
}

export interface SellerUnreadNotificationCountResponse {
  success: boolean;
  unreadCount: number;
}

export interface SellerNotificationActionResponse {
  success: boolean;
  notification?: SellerNotification;
  updatedCount?: number;
  message?: string;
}
