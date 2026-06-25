import {
  getKafkaConfigStatus,
  getKafkaGroupId,
  getKafkaTopic,
  kafka,
} from "@packages/utils/kafka";
import {
  updateProductAnalytics,
  updateShopAnalytics,
  updateUserAnalytics,
} from "./services/analytics.service";
import { isUserEventAction, UserEvent } from "./types/user-event";

const TOPIC = getKafkaTopic();
const GROUP_ID = getKafkaGroupId();
const QUEUE_INTERVAL_MS = 3000;
const RECONNECT_INITIAL_DELAY_MS = 5000;
const RECONNECT_MAX_DELAY_MS = 60000;
const eventQueue: UserEvent[] = [];

let consumer: ReturnType<typeof kafka.consumer> | null = null;
let queueInterval: NodeJS.Timeout | null = null;
let idleInterval: NodeJS.Timeout | null = null;
let isProcessingQueue = false;
let isShuttingDown = false;
let reconnectAttempt = 0;

const USER_ANALYTICS_ACTIONS = new Set<UserEvent["action"]>([
  "add_to_cart",
  "product_view",
  "remove_from_cart",
  "add_to_wishlist",
  "remove_from_wishlist",
]);

const PRODUCT_ANALYTICS_ACTIONS = new Set<UserEvent["action"]>([
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "add_to_wishlist",
  "remove_from_wishlist",
  "purchase",
]);

const PRODUCT_REQUIRED_ACTIONS = new Set<UserEvent["action"]>([
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "add_to_wishlist",
  "remove_from_wishlist",
  "purchase",
]);

const sleep = (durationMs: number) =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const getReconnectDelay = () =>
  Math.min(
    RECONNECT_INITIAL_DELAY_MS * 2 ** Math.max(0, reconnectAttempt - 1),
    RECONNECT_MAX_DELAY_MS,
  );

const startIdleProcess = () => {
  if (idleInterval) return;

  // Keep the Nx serve process calm when Kafka is intentionally disabled locally.
  idleInterval = setInterval(() => undefined, 60_000);
};

const parseKafkaMessage = (messageValue: string): UserEvent | null => {
  try {
    const parsedEvent = JSON.parse(messageValue) as Partial<UserEvent>;

    if (!parsedEvent || typeof parsedEvent !== "object") {
      console.warn("Ignored Kafka event: message is not an object");
      return null;
    }

    if (!isUserEventAction(parsedEvent.action)) {
      console.warn("Ignored Kafka event: invalid action", parsedEvent.action);
      return null;
    }

    if (PRODUCT_REQUIRED_ACTIONS.has(parsedEvent.action) && !parsedEvent.productId) {
      console.warn("Ignored Kafka event: productId is required", {
        action: parsedEvent.action,
      });
      return null;
    }

    return {
      userId: parsedEvent.userId || null,
      productId: parsedEvent.productId || null,
      shopId: parsedEvent.shopId || null,
      action: parsedEvent.action,
      device: parsedEvent.device || null,
      deviceInfo: parsedEvent.deviceInfo || null,
      country: parsedEvent.country || null,
      city: parsedEvent.city || null,
      timestamp: parsedEvent.timestamp,
    };
  } catch (error) {
    console.warn("Ignored Kafka event: invalid JSON", getErrorMessage(error));
    return null;
  }
};

const handleEvent = async (event: UserEvent) => {
  if (USER_ANALYTICS_ACTIONS.has(event.action)) {
    await updateUserAnalytics(event);
  }

  if (PRODUCT_ANALYTICS_ACTIONS.has(event.action)) {
    await updateProductAnalytics(event);
  }

  if (event.action === "shop_visited") {
    await updateShopAnalytics(event);
  }
};

const processQueue = async () => {
  if (isProcessingQueue || eventQueue.length === 0) return;

  isProcessingQueue = true;
  const batch = eventQueue.splice(0, eventQueue.length);
  console.log(`Processing ${batch.length} Kafka analytics event(s)`);

  try {
    for (const event of batch) {
      try {
        await handleEvent(event);
      } catch (error) {
        console.error("Failed to process Kafka analytics event", {
          action: event.action,
          productId: event.productId,
          userId: event.userId,
          error: getErrorMessage(error),
        });
      }
    }
  } finally {
    isProcessingQueue = false;
  }
};

const startQueueProcessor = () => {
  if (queueInterval) return;

  queueInterval = setInterval(() => {
    void processQueue();
  }, QUEUE_INTERVAL_MS);
};

const shouldSkipKafka = () => {
  const config = getKafkaConfigStatus();

  if (!config.enabled) {
    console.warn("Kafka analytics consumer disabled by KAFKA_ENABLED=false");
    return true;
  }

  if (!config.hasCredentials) {
    console.warn(
      "Kafka analytics consumer skipped: KAFKA_API_KEY or KAFKA_API_SECRET is missing",
    );
    return true;
  }

  if (config.brokers.length === 0 || config.malformedBroker) {
    console.warn(
      "Kafka analytics consumer skipped: KAFKA_BROKER/KAFKA_BROKERS is missing or malformed",
    );
    return true;
  }

  return false;
};

const connectConsumer = async () => {
  consumer = kafka.consumer({
    groupId: GROUP_ID,
    sessionTimeout: Number(process.env.KAFKA_SESSION_TIMEOUT_MS) || 30000,
    heartbeatInterval: Number(process.env.KAFKA_HEARTBEAT_INTERVAL_MS) || 3000,
    maxWaitTimeInMs: Number(process.env.KAFKA_MAX_WAIT_TIME_MS) || 5000,
  });

  consumer.on(consumer.events.CRASH, (event) => {
    console.error("Kafka analytics consumer crashed", {
      groupId: GROUP_ID,
      error: getErrorMessage(event.payload.error),
      restart: event.payload.restart,
    });
  });

  await consumer.connect();
  console.log("Kafka analytics consumer connected", {
    topic: TOPIC,
    groupId: GROUP_ID,
  });

  await consumer.subscribe({
    topic: TOPIC,
    fromBeginning: process.env.KAFKA_FROM_BEGINNING === "true",
  });
  console.log(`Kafka analytics consumer subscribed to ${TOPIC}`);

  await consumer.run({
    partitionsConsumedConcurrently: 1,
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const event = parseKafkaMessage(message.value.toString());
      if (event) eventQueue.push(event);
    },
  });
};

const startConsumerWithBackoff = async () => {
  if (shouldSkipKafka()) {
    startIdleProcess();
    return;
  }

  startQueueProcessor();

  while (!isShuttingDown) {
    try {
      await connectConsumer();
      reconnectAttempt = 0;
      return;
    } catch (error) {
      reconnectAttempt += 1;

      try {
        await consumer?.disconnect();
      } catch {
        // Ignore disconnect failures after a partially opened connection.
      } finally {
        consumer = null;
      }

      const delay = getReconnectDelay();
      console.error("Kafka analytics consumer unavailable", {
        attempt: reconnectAttempt,
        retryInMs: delay,
        error: getErrorMessage(error),
      });

      await sleep(delay);
    }
  }
};

const shutdown = async (signal: NodeJS.Signals) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`Received ${signal}. Shutting down Kafka analytics consumer...`);

  if (queueInterval) {
    clearInterval(queueInterval);
    queueInterval = null;
  }

  if (idleInterval) {
    clearInterval(idleInterval);
    idleInterval = null;
  }

  await processQueue();
  await consumer?.disconnect();
  console.log("Kafka analytics consumer disconnected");
  process.exit(0);
};

process.on("SIGINT", (signal) => {
  void shutdown(signal);
});

process.on("SIGTERM", (signal) => {
  void shutdown(signal);
});

void startConsumerWithBackoff();
