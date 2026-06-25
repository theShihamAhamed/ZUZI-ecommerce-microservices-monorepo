import express from "express";
import cors from "cors";
import { errorMiddleware } from "@error-handler/error-middleware";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.route";
import swaggerUi from "swagger-ui-express";
import path from "path";
const swaggerDocument = require(path.join(__dirname, "swagger-output.json"));

const port = process.env.PORT ? Number(process.env.PORT) : 6001;

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/docs-json", (req, res) => {
  res.json(swaggerDocument);
});

app.use("/api", authRouter);

app.get("/", (req, res) => {
  res.send({ message: "Auth API is working" });
});

app.use(errorMiddleware);

const server = app.listen(port, () => {
  console.log(`Auth service is running at http://localhost:${port}/api`);
  console.log(`Swagger doc is available at http://localhost:${port}/docs-json`);
});

server.on("error", (err) => {
  console.log("Server Error: ", err);
});
