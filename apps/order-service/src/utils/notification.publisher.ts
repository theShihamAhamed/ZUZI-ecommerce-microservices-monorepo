import { getKafkaConfigStatus, kafka } from "@packages/utils/kafka";

type NotificationRecipientType = "user" | "seller";

export interface OrderNotificationEvent {
  recipientType: NotificationRecipientType;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  redirectUrl?: string;
  data?: Record<string, unknown>;
  dedupeKey?: string;
}

const TOPIC = process.env.NOTIFICATION_KAFKA_TOPIC || "notification.events";
let producer: ReturnType<typeof kafka.producer> | null = null;
let isProducerConnected = false;
let hasLoggedSkipReason = false;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const canPublishNotificationEvents = () => {
  const config = getKafkaConfigStatus();

  if (!config.enabled) {
    if (!hasLoggedSkipReason) {
      console.warn("Order notifications skipped: KAFKA_ENABLED=false");
      hasLoggedSkipReason = true;
    }
    return false;
  }

  if (!config.hasCredentials) {
    if (!hasLoggedSkipReason) {
      console.warn("Order notifications skipped: Kafka credentials are missing");
      hasLoggedSkipReason = true;
    }
    return false;
  }

  if (config.brokers.length === 0 || config.malformedBroker) {
    if (!hasLoggedSkipReason) {
      console.warn("Order notifications skipped: Kafka broker config is invalid");
      hasLoggedSkipReason = true;
    }
    return false;
  }

  return true;
};

const getProducer = async () => {
  if (!producer) {
    producer = kafka.producer();
  }

  if (!isProducerConnected) {
    await producer.connect();
    isProducerConnected = true;
  }

  return producer;
};

export const publishOrderNotification = async (
  event: OrderNotificationEvent,
): Promise<boolean> => {
  if (!canPublishNotificationEvents()) return false;

  try {
    const notificationProducer = await getProducer();

    await notificationProducer.send({
      topic: TOPIC,
      messages: [
        {
          key: event.dedupeKey || `${event.recipientType}:${event.recipientId}`,
          value: JSON.stringify({
            event: "notification.create",
            ...event,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    return true;
  } catch (error) {
    isProducerConnected = false;
    console.warn("Order notification publish failed", {
      recipientType: event.recipientType,
      recipientId: event.recipientId,
      type: event.type,
      error: getErrorMessage(error),
    });
    return false;
  }
};

export const publishOrderNotifications = async (
  events: OrderNotificationEvent[],
) => {
  const results: boolean[] = [];

  for (const event of events) {
    results.push(await publishOrderNotification(event));
  }

  return results;
};
