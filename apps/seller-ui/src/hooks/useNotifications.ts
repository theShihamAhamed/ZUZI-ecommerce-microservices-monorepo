"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteSellerNotificationApi,
  getSellerNotificationsApi,
  getSellerUnreadNotificationCountApi,
  markAllSellerNotificationsReadApi,
  markSellerNotificationReadApi,
} from "@/services/notification.api";
import {
  SellerNotificationsResponse,
  SellerNotificationStatusFilter,
} from "@/types/notification";

export const sellerNotificationsQueryKey = ({
  page = 1,
  limit = 10,
  status = "all",
  type,
}: {
  page?: number;
  limit?: number;
  status?: SellerNotificationStatusFilter;
  type?: string;
} = {}) => ["seller-notifications", page, limit, status, type || "all"] as const;

export const sellerUnreadNotificationCountQueryKey = [
  "seller-notifications",
  "unread-count",
] as const;

export const useSellerNotifications = ({
  page = 1,
  limit = 10,
  status = "all",
  type,
  enabled = true,
}: {
  page?: number;
  limit?: number;
  status?: SellerNotificationStatusFilter;
  type?: string;
  enabled?: boolean;
} = {}) => {
  return useQuery({
    queryKey: sellerNotificationsQueryKey({ page, limit, status, type }),
    queryFn: () => getSellerNotificationsApi({ page, limit, status, type }),
    enabled,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30,
    retry: 1,
  });
};

export const useSellerUnreadNotificationCount = (enabled = true) => {
  return useQuery({
    queryKey: sellerUnreadNotificationCountQueryKey,
    queryFn: getSellerUnreadNotificationCountApi,
    enabled,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    refetchInterval: enabled ? 1000 * 45 : false,
    retry: 1,
  });
};

const updateSellerNotificationLists = (
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (
    current: SellerNotificationsResponse,
  ) => SellerNotificationsResponse,
) => {
  queryClient.setQueriesData<SellerNotificationsResponse>(
    {
      predicate: (query) =>
        query.queryKey[0] === "seller-notifications" &&
        typeof query.queryKey[1] === "number",
    },
    (current) => (current ? updater(current) : current),
  );
};

export const useMarkSellerNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markSellerNotificationReadApi,
    onSuccess: (response, notificationId) => {
      updateSellerNotificationLists(queryClient, (current) => ({
        ...current,
        notifications: current.notifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                isRead: true,
                readAt: response.notification?.readAt || notification.readAt,
              }
            : notification,
        ),
      }));
      queryClient.invalidateQueries({
        queryKey: sellerUnreadNotificationCountQueryKey,
      });
    },
  });
};

export const useMarkAllSellerNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllSellerNotificationsReadApi,
    onSuccess: () => {
      updateSellerNotificationLists(queryClient, (current) => ({
        ...current,
        notifications: current.notifications.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date().toISOString(),
        })),
      }));
      queryClient.setQueryData(sellerUnreadNotificationCountQueryKey, {
        success: true,
        unreadCount: 0,
      });
      queryClient.invalidateQueries({
        queryKey: sellerUnreadNotificationCountQueryKey,
      });
    },
  });
};

export const useDeleteSellerNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSellerNotificationApi,
    onSuccess: (_response, notificationId) => {
      updateSellerNotificationLists(queryClient, (current) => ({
        ...current,
        notifications: current.notifications.filter(
          (notification) => notification.id !== notificationId,
        ),
        pagination: {
          ...current.pagination,
          total: Math.max(0, current.pagination.total - 1),
          totalCount:
            current.pagination.totalCount === undefined
              ? undefined
              : Math.max(0, current.pagination.totalCount - 1),
          totalItems:
            current.pagination.totalItems === undefined
              ? undefined
              : Math.max(0, current.pagination.totalItems - 1),
        },
      }));
      queryClient.invalidateQueries({
        queryKey: sellerUnreadNotificationCountQueryKey,
      });
    },
  });
};
