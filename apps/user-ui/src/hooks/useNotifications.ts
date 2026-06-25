"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteNotificationApi,
  getNotificationsApi,
  getUnreadNotificationCountApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "@/services/notification.api";
import {
  NotificationsResponse,
  NotificationStatusFilter,
} from "@/types/notification";

export const notificationsQueryKey = ({
  page = 1,
  limit = 10,
  status = "all",
  type,
}: {
  page?: number;
  limit?: number;
  status?: NotificationStatusFilter;
  type?: string;
} = {}) => ["notifications", page, limit, status, type || "all"] as const;

export const unreadNotificationCountQueryKey = [
  "notifications",
  "unread-count",
] as const;

export const useNotifications = ({
  page = 1,
  limit = 10,
  status = "all",
  type,
  enabled = true,
}: {
  page?: number;
  limit?: number;
  status?: NotificationStatusFilter;
  type?: string;
  enabled?: boolean;
} = {}) => {
  return useQuery({
    queryKey: notificationsQueryKey({ page, limit, status, type }),
    queryFn: () => getNotificationsApi({ page, limit, status, type }),
    enabled,
    staleTime: 1000 * 30,
    retry: 1,
  });
};

export const useUnreadNotificationCount = (enabled = true) => {
  return useQuery({
    queryKey: unreadNotificationCountQueryKey,
    queryFn: getUnreadNotificationCountApi,
    enabled,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    refetchInterval: enabled ? 1000 * 45 : false,
    retry: 1,
  });
};

const updateNotificationLists = (
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (current: NotificationsResponse) => NotificationsResponse,
) => {
  queryClient.setQueriesData<NotificationsResponse>(
    {
      predicate: (query) =>
        query.queryKey[0] === "notifications" &&
        typeof query.queryKey[1] === "number",
    },
    (current) => (current ? updater(current) : current),
  );
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationReadApi,
    onSuccess: (response, notificationId) => {
      updateNotificationLists(queryClient, (current) => ({
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
        queryKey: unreadNotificationCountQueryKey,
      });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsReadApi,
    onSuccess: () => {
      updateNotificationLists(queryClient, (current) => ({
        ...current,
        notifications: current.notifications.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date().toISOString(),
        })),
      }));
      queryClient.setQueryData(unreadNotificationCountQueryKey, {
        success: true,
        unreadCount: 0,
      });
      queryClient.invalidateQueries({
        queryKey: unreadNotificationCountQueryKey,
      });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotificationApi,
    onSuccess: (_response, notificationId) => {
      updateNotificationLists(queryClient, (current) => ({
        ...current,
        notifications: current.notifications.filter(
          (notification) => notification.id !== notificationId,
        ),
        pagination: {
          ...current.pagination,
          total: Math.max(0, current.pagination.total - 1),
        },
      }));
      queryClient.invalidateQueries({
        queryKey: unreadNotificationCountQueryKey,
      });
    },
  });
};
