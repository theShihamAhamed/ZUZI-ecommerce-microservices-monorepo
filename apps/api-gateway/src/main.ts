import express from "express";
import cors from "cors";
import proxy from "express-http-proxy";
import morgan from "morgan";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
// import swaggerUi from "swagger-ui-express";
// import axios from "axios";
import cookieParser from "cookie-parser";
import initializeSiteConfig from "./libs/initializeSiteConfig";

const app = express();
const orderServiceUrl =
  process.env.ORDER_SERVICE_URL || "http://localhost:6004";
const adminServiceUrl =
  process.env.ADMIN_SERVICE_URL || "http://localhost:6005";
const chatServiceUrl =
  process.env.CHAT_SERVICE_URL || "http://localhost:6006";
const notificationServiceUrl =
  process.env.NOTIFICATION_SERVICE_URL || "http://localhost:6009";
const recommendationServiceUrl =
  process.env.RECOMMENDATION_SERVICE_URL || "http://localhost:6007";

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  if (
    contentType.includes("multipart/form-data") ||
    req.originalUrl.startsWith("/order/api/create-order")
  ) {
    return next(); // ✅ Skip parsing for file uploads
  }

  express.json({ limit: "100mb" })(req, res, next);
});

app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  if (
    contentType.includes("multipart/form-data") ||
    req.originalUrl.startsWith("/order/api/create-order")
  ) {
    return next(); // ✅ Skip parsing
  }

  express.urlencoded({ extended: true })(req, res, next);
});
app.use(cookieParser());
app.set("trust proxy", 1);

// Apply rate limiting

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req: any) => (req.user ? 1000 : 100),
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: true,
  keyGenerator: (req: any) => ipKeyGenerator(req),
});

app.use(limiter);

app.get("/gateway-health", (req, res) => {
  res.send({ message: "Welcome to api-gateway!" });
});

app.use("/product", proxy("http://localhost:6002"));
app.use("/order", proxy(orderServiceUrl));
app.use("/admin", proxy(adminServiceUrl));
app.use("/chat", proxy(chatServiceUrl));
app.use("/notification", proxy(notificationServiceUrl));
app.use("/recommendation", proxy(recommendationServiceUrl));
app.use("/", proxy("http://localhost:6001"));

const port = process.env.PORT || 8090;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
  try {
    initializeSiteConfig();
    console.log("Site config initialized Successfully");
  } catch (error) {
    console.log("Error initializing the site config: ", error);
  }
});
server.on("error", console.error);
