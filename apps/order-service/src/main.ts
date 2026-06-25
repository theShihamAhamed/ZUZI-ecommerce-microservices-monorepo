/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "@error-handler/error-middleware";
import orderRouter from "./routes/order.route";
import { createOrder } from "./controllers/order.controller";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  }),
);
app.use(cookieParser());
app.post("/api/create-order", express.raw({ type: "application/json" }), createOrder);
app.use(express.json());
app.use("/api", orderRouter);

app.get("/api", (req, res) => {
  res.send({ message: "Welcome to order-service!" });
});

app.use(errorMiddleware);

const port = process.env.PORT || 6004;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on("error", console.error);
