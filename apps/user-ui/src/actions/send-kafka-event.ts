"use server";

import {
  getKafkaConfigStatus,
  isKafkaEnabled,
  kafka,
} from "@packages/utils/kafka";

const TOPIC = "users-events";
const USER_EVENT_ACTIONS = [
  "shop_visited",
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "add_to_wishlist",
  "remove_from_wishlist",
  "purchase",
] as const;

type UserEventAction = (typeof USER_EVENT_ACTIONS)[number];

type KafkaEventData = {
  userId?: string | null;
  productId?: string | null;
  shopId?: string | null;
  action: UserEventAction;
  device?: string | null;
  deviceInfo?: string | null;
  country?: string | null;
  city?: string | null;
  timestamp?: string;
};

const PRODUCT_REQUIRED_ACTIONS = new Set<UserEventAction>([
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "add_to_wishlist",
  "remove_from_wishlist",
  "purchase",
]);

const producer = kafka.producer();
let isProducerConnected = false;

const isKafkaAnalyticsEnabled = () =>
  isKafkaEnabled() && process.env.KAFKA_ANALYTICS_ENABLED !== "false";

const isUserEventAction = (action: unknown): action is UserEventAction =>
  typeof action === "string" &&
  USER_EVENT_ACTIONS.includes(action as UserEventAction);

const connectProducer = async () => {
  if (isProducerConnected) return;

  await producer.connect();
  isProducerConnected = true;
};

export async function sendKafkaEvent(eventData: KafkaEventData) {
  try {
    if (!isUserEventAction(eventData.action)) {
      return { success: false, error: "Invalid analytics action" };
    }

    if (
      PRODUCT_REQUIRED_ACTIONS.has(eventData.action) &&
      !eventData.productId
    ) {
      return { success: false, error: "Missing productId" };
    }

    if (!isKafkaAnalyticsEnabled()) {
      return { success: false, skipped: true };
    }

    const kafkaConfig = getKafkaConfigStatus();

    if (
      !kafkaConfig.hasCredentials ||
      kafkaConfig.brokers.length === 0 ||
      kafkaConfig.malformedBroker
    ) {
      return { success: false, skipped: true };
    }

    await connectProducer();

    await producer.send({
      topic: TOPIC,
      messages: [
        {
          value: JSON.stringify({
            ...eventData,
            timestamp: eventData.timestamp || new Date().toISOString(),
          }),
        },
      ],
    });

    return { success: true };
  } catch (error) {
    isProducerConnected = false;

    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to send Kafka analytics event", error);
    }

    return { success: false, error: "Failed to send analytics event" };
  }
}
