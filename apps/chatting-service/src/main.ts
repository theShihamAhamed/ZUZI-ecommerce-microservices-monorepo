import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as path from "path";
import { errorMiddleware } from "@error-handler/error-middleware";
import chatRouter from "./routes/chat.route";
import { startChatMessageConsumer, stopChatMessageConsumer } from "./consumers/chat-message.consumer";
import { initializeChatSocket } from "./socket/chat.socket";
import {
  connectChatProducer,
  disconnectChatProducer,
} from "./utils/chat-kafka.helpers";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/api", chatRouter);

app.get("/api", (req, res) => {
  res.send({ message: "Welcome to chatting-service!" });
});

app.use(errorMiddleware);

const port = process.env.PORT || 6006;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on("error", console.error);

const io = initializeChatSocket(server);

void connectChatProducer();
void startChatMessageConsumer(io).catch((error) => {
  console.error("Chat Kafka consumer failed to start", {
    error: error instanceof Error ? error.message : String(error),
  });
});

const shutdown = async (signal: NodeJS.Signals) => {
  console.log(`Received ${signal}. Shutting down chatting-service...`);
  await stopChatMessageConsumer(io);
  await disconnectChatProducer();
  io.close();
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
