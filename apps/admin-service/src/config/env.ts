import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../../.env"),
];

for (const envPath of envPaths) {
  if (!fs.existsSync(envPath)) {
    continue;
  }

  dotenv.config({ path: envPath });

  if (process.env.ADMIN_SETUP_TOKEN) {
    break;
  }
}

export const isAdminSetupEnabled = () =>
  Boolean(process.env.ADMIN_SETUP_TOKEN);
