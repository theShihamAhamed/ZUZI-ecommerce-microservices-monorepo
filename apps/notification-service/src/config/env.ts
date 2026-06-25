import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

export const isNotificationInternalApiEnabled = () =>
  Boolean(process.env.NOTIFICATION_INTERNAL_TOKEN);
