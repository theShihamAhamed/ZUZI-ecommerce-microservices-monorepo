import axiosInstance from "@/libs/axios";
import {
  NotificationActionResponse,
  NotificationsResponse,
  NotificationStatusFilter,
  UnreadNotificationCountResponse,
} from "@/types/notification";

const getNotificationApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_SERVER_URI;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_SERVER_URI is not configured");
  }

  return `${apiUrl}/notification/api`;
};

export const getNotificationsApi = async ({
  page = 1,
  limit = 10,
  status = "all",
  type,
}: {
  page?: number;
  limit?: number;
  status?: NotificationStatusFilter;
  type?: string;
} = {}): Promise<NotificationsResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("status", status);

  if (type) {
    params.set("type", type);
  }

  const res = await axiosInstance.get<NotificationsResponse>(
    `${getNotificationApiBaseUrl()}/notifications?${params.toString()}`,
  );

  return res.data;
};

export const getUnreadNotificationCountApi =
  async (): Promise<UnreadNotificationCountResponse> => {
    const res = await axiosInstance.get<UnreadNotificationCountResponse>(
      `${getNotificationApiBaseUrl()}/notifications/unread-count`,
    );

    return res.data;
  };

export const markNotificationReadApi = async (
  notificationId: string,
): Promise<NotificationActionResponse> => {
  const res = await axiosInstance.patch<NotificationActionResponse>(
    `${getNotificationApiBaseUrl()}/notifications/${notificationId}/read`,
  );

  return res.data;
};

export const markAllNotificationsReadApi =
  async (): Promise<NotificationActionResponse> => {
    const res = await axiosInstance.patch<NotificationActionResponse>(
      `${getNotificationApiBaseUrl()}/notifications/read-all`,
    );

    return res.data;
  };

export const deleteNotificationApi = async (
  notificationId: string,
): Promise<NotificationActionResponse> => {
  const res = await axiosInstance.delete<NotificationActionResponse>(
    `${getNotificationApiBaseUrl()}/notifications/${notificationId}`,
  );

  return res.data;
};
