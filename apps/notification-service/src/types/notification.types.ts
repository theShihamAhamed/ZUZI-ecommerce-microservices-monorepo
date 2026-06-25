export type NotificationRecipientType = "user" | "seller" | "admin";

export interface CreateNotificationInput {
  recipientType: NotificationRecipientType;
  recipientId?: string | null;
  type: string;
  title: string;
  message: string;
  redirectUrl?: string | null;
  data?: Record<string, unknown> | null;
  dedupeKey?: string | null;
  creatorId?: string | null;
}

export interface NotificationCreateEvent extends CreateNotificationInput {
  event: "notification.create";
  timestamp?: string;
}
