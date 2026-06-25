import {
  getKafkaConfigStatus,
  kafka,
} from "@packages/utils/kafka";
import { createNotification } from "../services/notification.service";
import {
  NotificationCreateEvent,
} from "../types/notification.types";

const TOPIC = process.env.NOTIFICATION_KAFKA_TOPIC || "notification.events";
const GROUP_ID =
  process.env.NOTIFICATION_KAFKA_GROUP_ID || "notification-service";

let consumer: ReturnType<typeof kafka.consumer> | null = null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const shouldSkipKafka = () => {
  const config = getKafkaConfigStatus();

  if (!config.enabled) {
    console.warn("Notification Kafka consumer disabled by KAFKA_ENABLED=false");
    return true;
  }

  if (!config.hasCredentials) {
    console.warn(
      "Notification Kafka consumer skipped: Kafka credentials are missing",
    );
    return true;
  }

  if (config.brokers.length === 0 || config.malformedBroker) {
    console.warn(
      "Notification Kafka consumer skipped: Kafka broker config is invalid",
    );
    return true;
  }

  return false;
};

const parseNotificationEvent = (
  messageValue: string,
): NotificationCreateEvent | null => {
  try {
    const payload = JSON.parse(messageValue) as Partial<NotificationCreateEvent>;

    if (!payload || typeof payload !== "object") {
      console.warn("Ignored notification event: payload is not an object");
      return null;
    }

    if (payload.event !== "notification.create") {
      console.warn("Ignored notification event: unsupported event", {
        event: payload.event,
      });
      return null;
    }

    return payload as NotificationCreateEvent;
  } catch (error) {
    console.warn("Ignored notification event: invalid JSON", {
      error: getErrorMessage(error),
    });
    return null;
  }
};

export const startNotificationConsumer = async () => {
  if (shouldSkipKafka()) return;

  consumer = kafka.consumer({
    groupId: GROUP_ID,
  });

  consumer.on(consumer.events.CRASH, (event) => {
    console.error("Notification Kafka consumer crashed", {
      groupId: GROUP_ID,
      error: getErrorMessage(event.payload.error),
      restart: event.payload.restart,
    });
  });

  try {
    await consumer.connect();
    await consumer.subscribe({
      topic: TOPIC,
      fromBeginning: false,
    });
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;

        const event = parseNotificationEvent(message.value.toString());
        if (!event) return;

        try {
          await createNotification(event);
        } catch (error) {
          console.error("Failed to process notification event", {
            recipientType: event.recipientType,
            recipientId: event.recipientId,
            type: event.type,
            error: getErrorMessage(error),
          });
        }
      },
    });

    console.log("Notification Kafka consumer connected", {
      topic: TOPIC,
      groupId: GROUP_ID,
    });
  } catch (error) {
    console.error("Notification Kafka consumer unavailable", {
      topic: TOPIC,
      groupId: GROUP_ID,
      error: getErrorMessage(error),
    });

    try {
      await consumer.disconnect();
    } catch {
      // Ignore disconnect failures after a partial connection.
    } finally {
      consumer = null;
    }
  }
};

export const stopNotificationConsumer = async () => {
  if (!consumer) return;

  await consumer.disconnect();
  consumer = null;
};
