import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "@error-handler/error-middleware";
import productRouter from "./routes/product.route";
import { startDeletedProductCleanupJob } from "./jobs/cleanupDeletedProducts.job";
// import path from "path";
// import swaggerUi from "swagger-ui-express";
// const swaggerDocument = require(path.join(__dirname, "swagger-output.json"));

const port = process.env.PORT ? Number(process.env.PORT) : 6002;

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

// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// app.get("/docs-json", (req, res) => {
//   res.json(swaggerDocument);
// });

app.use("/api", productRouter);

app.get("/", (req, res) => {
  res.send({ message: "Product API is working" });
});

app.use(errorMiddleware);

const server = app.listen(port, () => {
  console.log(`Product service is running at http://localhost:${port}/api`);
  console.log(`Swagger doc is available at http://localhost:${port}/docs-json`);

  startDeletedProductCleanupJob();
});

server.on("error", (err) => {
  console.log("Server Error: ", err);
});
