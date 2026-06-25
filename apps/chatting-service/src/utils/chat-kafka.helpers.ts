import {
  getKafkaConfigStatus,
  isKafkaEnabled,
  kafka,
} from "@packages/utils/kafka";
import { ChatMessagePayload } from "../types/chat-events";

export const CHAT_KAFKA_TOPIC =
  process.env.CHAT_KAFKA_TOPIC || "chat.new_message";
export const CHAT_KAFKA_GROUP_ID =
  process.env.CHAT_KAFKA_GROUP_ID || "chat-message-db-writer";

const producer = kafka.producer();
let producerConnected = false;
let producerConnectPromise: Promise<void> | null = null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const shouldSkipChatKafka = () => {
  const config = getKafkaConfigStatus();

  if (!isKafkaEnabled() || !config.enabled) {
    console.warn("Chat Kafka disabled by KAFKA_ENABLED=false");
    return true;
  }

  if (!config.hasCredentials) {
    console.warn(
      "Chat Kafka skipped: KAFKA_API_KEY or KAFKA_API_SECRET is missing",
    );
    return true;
  }

  if (config.brokers.length === 0 || config.malformedBroker) {
    console.warn(
      "Chat Kafka skipped: KAFKA_BROKER/KAFKA_BROKERS is missing or malformed",
    );
    return true;
  }

  return false;
};

export const connectChatProducer = async () => {
  if (producerConnected || shouldSkipChatKafka()) return;
  if (producerConnectPromise) return producerConnectPromise;

  producerConnectPromise = producer
    .connect()
    .then(() => {
      producerConnected = true;
      console.log("Chat Kafka producer connected", {
        topic: CHAT_KAFKA_TOPIC,
      });
    })
    .catch((error) => {
      producerConnected = false;
      producerConnectPromise = null;
      console.error("Chat Kafka producer unavailable", {
        error: getErrorMessage(error),
      });
    });

  return producerConnectPromise;
};

export const publishChatMessage = async (payload: ChatMessagePayload) => {
  if (shouldSkipChatKafka()) {
    throw new Error("Chat Kafka is disabled or not configured");
  }

  if (!producerConnected) {
    await connectChatProducer();
  }

  if (!producerConnected) {
    throw new Error("Chat Kafka producer is not connected");
  }

  await producer.send({
    topic: CHAT_KAFKA_TOPIC,
    messages: [
      {
        key: payload.conversationId,
        value: JSON.stringify(payload),
      },
    ],
  });
};

export const disconnectChatProducer = async () => {
  if (!producerConnected) return;

  await producer.disconnect();
  producerConnected = false;
  producerConnectPromise = null;
};
