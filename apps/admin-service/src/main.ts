import "./config/env";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "@error-handler/error-middleware";
import adminRouter from "./routes/admin.route";
import { isAdminSetupEnabled } from "./config/env";

const port = process.env.PORT ? Number(process.env.PORT) : 6005;
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

const app = express();

app.use(
  cors({
    origin: allowedOrigins,
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.use("/api", adminRouter);

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin API is working",
  });
});

app.use(errorMiddleware);

const server = app.listen(port, () => {
  console.log(`Admin service is running at http://localhost:${port}/api`);
  console.log(`Admin health is available at http://localhost:${port}/api/health`);
  console.log("Admin setup enabled:", isAdminSetupEnabled());
});

server.on("error", (err) => {
  console.log("Server Error: ", err);
});
