"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  Circle,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  useDeleteSellerNotification,
  useMarkAllSellerNotificationsRead,
  useMarkSellerNotificationRead,
  useSellerNotifications,
} from "@/hooks/useNotifications";
import {
  SellerNotification,
  SellerNotificationStatusFilter,
} from "@/types/notification";

const NOTIFICATIONS_LIMIT = 10;

const statusFilters: {
  label: string;
  value: SellerNotificationStatusFilter;
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-4 w-44 animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-full max-w-lg animate-pulse rounded-full bg-slate-100" />
          <div className="h-3 w-28 animate-pulse rounded-full bg-slate-100" />
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
  notification: SellerNotification;
  isBusy: boolean;
  onOpen: (notification: SellerNotification) => void;
  onMarkRead: (notification: SellerNotification) => void;
  onDelete: (notification: SellerNotification) => void;
}) {
  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        notification.isRead
          ? "border-slate-200"
          : "border-emerald-200 bg-emerald-50/40"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <button
          type="button"
          onClick={() => onOpen(notification)}
          className="flex min-w-0 flex-1 gap-4 text-left"
        >
          <span
            className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              notification.isRead
                ? "bg-slate-100 text-slate-500"
                : "bg-emerald-100 text-emerald-700"
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
              <span className="break-words text-sm font-bold text-slate-950">
                {notification.title}
              </span>
              {notification.type ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  {getTypeLabel(notification.type)}
                </span>
              ) : null}
            </span>
            <span className="mt-1 block break-words text-sm leading-6 text-slate-600">
              {notification.message}
            </span>
            <span className="mt-2 block text-xs font-medium text-slate-400">
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
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

export default function SellerNotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SellerNotificationStatusFilter>("all");
  const notificationsQuery = useSellerNotifications({
    page,
    limit: NOTIFICATIONS_LIMIT,
    status,
  });
  const markRead = useMarkSellerNotificationRead();
  const markAllRead = useMarkAllSellerNotificationsRead();
  const deleteNotification = useDeleteSellerNotification();
  const notifications = notificationsQuery.data?.notifications || [];
  const pagination = notificationsQuery.data?.pagination;
  const totalNotifications =
    pagination?.totalItems ?? pagination?.totalCount ?? pagination?.total ?? 0;
  const totalPages = pagination?.totalPages || 1;
  const hasPreviousPage = pagination?.hasPreviousPage ?? page > 1;
  const hasNextPage = pagination?.hasNextPage ?? page < totalPages;
  const hasUnreadVisible = notifications.some(
    (notification) => !notification.isRead,
  );
  const isMutating =
    markRead.isPending || markAllRead.isPending || deleteNotification.isPending;

  const handleStatusChange = (nextStatus: SellerNotificationStatusFilter) => {
    setStatus(nextStatus);
    setPage(1);
  };

  const handleOpenNotification = async (
    notification: SellerNotification,
  ) => {
    if (!notification.isRead) {
      await markRead.mutateAsync(notification.id);
    }

    router.push(notification.redirectUrl || "/dashboard/orders");
  };

  return (
    <div className="min-h-screen min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 text-slate-900 sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Dashboard / Notifications
          </p>
          <h1 className="mt-1 break-words text-2xl font-semibold text-slate-950">
            Notifications
          </h1>
          <p className="mt-1 max-w-3xl break-words text-sm text-slate-500">
            Review order alerts and seller account updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notificationsQuery.isFetching && !notificationsQuery.isLoading ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={!hasUnreadVisible || markAllRead.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            {markAllRead.isPending ? "Marking..." : "Mark all as read"}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Seller notifications
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {notificationsQuery.isLoading
                ? "Loading notifications"
                : `${totalNotifications} notifications found`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => handleStatusChange(filter.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  status === filter.value
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {notificationsQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <NotificationSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {notificationsQuery.isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
          <h2 className="mt-3 font-semibold text-slate-950">
            Failed to load notifications
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            We could not fetch your seller notifications. Please try again.
          </p>
          <button
            type="button"
            onClick={() => notificationsQuery.refetch()}
            disabled={notificationsQuery.isFetching}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {notificationsQuery.isFetching ? "Trying again..." : "Retry"}
          </button>
        </div>
      ) : null}

      {!notificationsQuery.isLoading &&
      !notificationsQuery.isError &&
      notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <Bell className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">
            You have no seller notifications yet.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            New order alerts and seller updates will appear here.
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
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!hasPreviousPage || notificationsQuery.isFetching}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-center text-sm text-slate-500">
                Page {pagination.currentPage ?? pagination.page} of{" "}
                {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.totalPages, current + 1),
                  )
                }
                disabled={!hasNextPage || notificationsQuery.isFetching}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
