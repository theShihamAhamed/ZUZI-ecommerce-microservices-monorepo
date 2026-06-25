import axiosInstance from "@/lib/axios";
import {
  SellerNotificationActionResponse,
  SellerNotificationsResponse,
  SellerNotificationStatusFilter,
  SellerUnreadNotificationCountResponse,
} from "@/types/notification";

export const getSellerNotificationsApi = async ({
  page = 1,
  limit = 10,
  status = "all",
  type,
}: {
  page?: number;
  limit?: number;
  status?: SellerNotificationStatusFilter;
  type?: string;
} = {}): Promise<SellerNotificationsResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("status", status);

  if (type) {
    params.set("type", type);
  }

  const res = await axiosInstance.get<SellerNotificationsResponse>(
    `/notification/api/notifications?${params.toString()}`,
  );

  return res.data;
};

export const getSellerUnreadNotificationCountApi =
  async (): Promise<SellerUnreadNotificationCountResponse> => {
    const res = await axiosInstance.get<SellerUnreadNotificationCountResponse>(
      "/notification/api/notifications/unread-count",
    );

    return res.data;
  };

export const markSellerNotificationReadApi = async (
  notificationId: string,
): Promise<SellerNotificationActionResponse> => {
  const res = await axiosInstance.patch<SellerNotificationActionResponse>(
    `/notification/api/notifications/${notificationId}/read`,
  );

  return res.data;
};

export const markAllSellerNotificationsReadApi =
  async (): Promise<SellerNotificationActionResponse> => {
    const res = await axiosInstance.patch<SellerNotificationActionResponse>(
      "/notification/api/notifications/read-all",
    );

    return res.data;
  };

export const deleteSellerNotificationApi = async (
  notificationId: string,
): Promise<SellerNotificationActionResponse> => {
  const res = await axiosInstance.delete<SellerNotificationActionResponse>(
    `/notification/api/notifications/${notificationId}`,
  );

  return res.data;
};
