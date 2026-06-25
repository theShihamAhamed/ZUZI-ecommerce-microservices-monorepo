import dotenv from "dotenv";
import { Redis } from "ioredis";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const redisUri = process.env.REDIS_DATABASE_URI;

console.log("Redis URI configured:", Boolean(redisUri));

if (!redisUri) {
  throw new Error("REDIS_DATABASE_URI is not defined in .env");
}

const redis = new Redis(redisUri);

redis.on("connect", () => {
  console.log("✅ Redis connected!");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

export default redis;
