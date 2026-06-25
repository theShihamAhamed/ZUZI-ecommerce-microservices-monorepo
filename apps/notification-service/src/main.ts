import "./config/env";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "@error-handler/error-middleware";
import notificationRouter from "./routes/notification.route";
import {
  startNotificationConsumer,
  stopNotificationConsumer,
} from "./consumers/notification.consumer";
import { isNotificationInternalApiEnabled } from "./config/env";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 6009;
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

app.use(
  cors({
    origin: allowedOrigins,
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "x-notification-internal-token",
    ],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use("/api", notificationRouter);

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Notification API is working",
  });
});

app.use(errorMiddleware);

const server = app.listen(port, () => {
  console.log(`Notification service is running at http://localhost:${port}/api`);
  console.log("Notification internal API enabled:", isNotificationInternalApiEnabled());
});

void startNotificationConsumer();

const shutdown = async (signal: NodeJS.Signals) => {
  console.log(`Received ${signal}. Shutting down notification-service...`);
  await stopNotificationConsumer();
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", (signal) => {
  void shutdown(signal);
});

process.on("SIGTERM", (signal) => {
  void shutdown(signal);
});

server.on("error", console.error);
