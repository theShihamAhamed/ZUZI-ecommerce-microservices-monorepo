"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  Circle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import {
  NotificationStatusFilter,
  UserNotification,
} from "@/types/notification";

const statusFilters: {
  label: string;
  value: NotificationStatusFilter;
}[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
];

const formatNotificationDate = (date: string) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
};

const getTypeLabel = (type: string) =>
  type
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

function NotificationSkeleton() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <div className="h-10 w-10 animate-pulse rounded-full bg-stone-200" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-4 w-40 animate-pulse rounded-full bg-stone-200" />
          <div className="h-3 w-full max-w-md animate-pulse rounded-full bg-stone-100" />
          <div className="h-3 w-28 animate-pulse rounded-full bg-stone-100" />
        </div>
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  isBusy,
  onOpen,
  onMarkRead,
  onDelete,
}: {
  notification: UserNotification;
  isBusy: boolean;
  onOpen: (notification: UserNotification) => void;
  onMarkRead: (notification: UserNotification) => void;
  onDelete: (notification: UserNotification) => void;
}) {
  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        notification.isRead
          ? "border-stone-200"
          : "border-amber-200 bg-amber-50/40"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <button
          type="button"
          onClick={() => onOpen(notification)}
          className="flex min-w-0 flex-1 gap-4 text-left"
        >
          <span
            className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              notification.isRead
                ? "bg-stone-100 text-stone-500"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {notification.isRead ? (
              <Bell className="h-5 w-5" />
            ) : (
              <Circle className="h-4 w-4 fill-current" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="break-words text-sm font-bold text-gray-900">
                {notification.title}
              </span>
              {notification.type ? (
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
                  {getTypeLabel(notification.type)}
                </span>
              ) : null}
            </span>
            <span className="mt-1 block break-words text-sm leading-6 text-gray-600">
              {notification.message}
            </span>
            <span className="mt-2 block text-xs font-medium text-gray-400">
              {formatNotificationDate(notification.createdAt)}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {!notification.isRead ? (
            <button
              type="button"
              onClick={() => onMarkRead(notification)}
              disabled={isBusy}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-gray-600 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Mark notification as read"
              title="Mark as read"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onDelete(notification)}
            disabled={isBusy}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-gray-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Delete notification"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function NotificationSection() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<NotificationStatusFilter>("all");
  const limit = 10;
  const notificationsQuery = useNotifications({ page, limit, status });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const notifications = notificationsQuery.data?.notifications || [];
  const pagination = notificationsQuery.data?.pagination;
  const hasUnreadVisible = notifications.some(
    (notification) => !notification.isRead,
  );
  const isMutating =
    markRead.isPending || markAllRead.isPending || deleteNotification.isPending;

  const handleStatusChange = (nextStatus: NotificationStatusFilter) => {
    setStatus(nextStatus);
    setPage(1);
  };

  const handleOpenNotification = async (notification: UserNotification) => {
    if (!notification.isRead) {
      await markRead.mutateAsync(notification.id);
    }

    if (notification.redirectUrl) {
      router.push(notification.redirectUrl);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
            <p className="mt-1 text-sm text-gray-500">
              Follow order updates and account activity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={!hasUnreadVisible || markAllRead.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            {markAllRead.isPending ? "Marking..." : "Mark all as read"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => handleStatusChange(filter.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                status === filter.value
                  ? "bg-black text-white"
                  : "bg-stone-100 text-gray-700 hover:bg-amber-50 hover:text-amber-800"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {notificationsQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <NotificationSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {notificationsQuery.isError ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-gray-700">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            Unable to load notifications
          </h3>
          <p className="mt-2 text-sm text-gray-600">Please try again.</p>
          <button
            type="button"
            onClick={() => notificationsQuery.refetch()}
            disabled={notificationsQuery.isFetching}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {notificationsQuery.isFetching ? "Trying again..." : "Retry"}
          </button>
        </div>
      ) : null}

      {!notificationsQuery.isLoading &&
      !notificationsQuery.isError &&
      notifications.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <Bell className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-gray-900">
            You have no notifications yet.
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            Order updates will appear here when there is something new.
          </p>
        </div>
      ) : null}

      {!notificationsQuery.isLoading &&
      !notificationsQuery.isError &&
      notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isBusy={isMutating}
              onOpen={handleOpenNotification}
              onMarkRead={(item) => markRead.mutate(item.id)}
              onDelete={(item) => deleteNotification.mutate(item.id)}
            />
          ))}

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!pagination.hasPreviousPage}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.totalPages, current + 1),
                  )
                }
                disabled={!pagination.hasNextPage}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
