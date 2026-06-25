import { Kafka, logLevel } from "kafkajs";

const DEFAULT_BROKER = "pkc-619z3.us-east1.gcp.confluent.cloud:9092";

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const isKafkaEnabled = () => process.env.KAFKA_ENABLED !== "false";

export const getKafkaTopic = () => process.env.KAFKA_TOPIC || "users-events";

export const getKafkaGroupId = () =>
  process.env.KAFKA_GROUP_ID || "analytics-service";

export const getKafkaClientId = () =>
  process.env.KAFKA_CLIENT_ID || "kafka-service";

const getRawBrokerValue = () =>
  process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || DEFAULT_BROKER;

export const getKafkaBrokers = () => {
  const brokerValue = getRawBrokerValue();
  return brokerValue
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean)
    .map((broker) =>
      broker.replace(/^SASL_SSL:\/\//i, "").replace(/^SSL:\/\//i, ""),
    );
};

export const getKafkaConfigStatus = () => {
  const rawBrokerValue = getRawBrokerValue();
  const brokers = getKafkaBrokers();
  const hasCredentials = Boolean(
    process.env.KAFKA_API_KEY && process.env.KAFKA_API_SECRET,
  );
  const malformedBroker = rawBrokerValue
    .split(",")
    .some((broker) => {
      const trimmedBroker = broker.trim();
      return trimmedBroker.includes("://") && !/^SASL_SSL:\/\/|^SSL:\/\//i.test(trimmedBroker);
    });

  return {
    enabled: isKafkaEnabled(),
    brokers,
    hasCredentials,
    malformedBroker,
    topic: getKafkaTopic(),
    groupId: getKafkaGroupId(),
    clientId: getKafkaClientId(),
  };
};

const kafkaConfig = getKafkaConfigStatus();
const kafkaLogLevel =
  process.env.KAFKA_LOG_LEVEL === "info"
    ? logLevel.INFO
    : process.env.KAFKA_LOG_LEVEL === "debug"
      ? logLevel.DEBUG
      : process.env.KAFKA_LOG_LEVEL === "warn"
        ? logLevel.WARN
        : logLevel.ERROR;

export const kafka = new Kafka({
  clientId: kafkaConfig.clientId,
  brokers: kafkaConfig.brokers,
  logLevel: kafkaLogLevel,
  connectionTimeout: toNumber(process.env.KAFKA_CONNECTION_TIMEOUT_MS, 10000),
  requestTimeout: toNumber(process.env.KAFKA_REQUEST_TIMEOUT_MS, 30000),
  retry: {
    retries: toNumber(process.env.KAFKA_RETRIES, 5),
    initialRetryTime: toNumber(process.env.KAFKA_INITIAL_RETRY_TIME_MS, 300),
    maxRetryTime: toNumber(process.env.KAFKA_MAX_RETRY_TIME_MS, 5000),
  },
  ssl: process.env.KAFKA_SSL !== "false",
  sasl: {
    mechanism: "plain",
    username: process.env.KAFKA_API_KEY || "",
    password: process.env.KAFKA_API_SECRET || "",
  },
});
