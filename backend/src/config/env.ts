import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const backendDir = path.resolve(currentDir, "../..");
const rootDir = path.resolve(backendDir, "..");

for (const candidate of [
  path.join(backendDir, ".env"),
  path.join(rootDir, ".env")
]) {
  dotenv.config({ path: candidate, override: false });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  OPENAI_API_KEY: z.string().default("demo-openai-key"),
  TWILIO_ACCOUNT_SID: z.string().default("demo-twilio-account"),
  TWILIO_AUTH_TOKEN: z.string().default("demo-twilio-token"),
  TWILIO_PHONE_NUMBER: z.string().default("+10000000000"),
  WHATSAPP_ACCESS_TOKEN: z.string().default("demo-whatsapp-token"),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default("demo-whatsapp-phone-id"),
  SENDGRID_API_KEY: z.string().default("demo-sendgrid-key"),
  S3_BUCKET_NAME: z.string().default("sibms-assets"),
  S3_REGION: z.string().default("ap-south-1"),
  S3_ACCESS_KEY_ID: z.string().default("demo-access-key"),
  S3_SECRET_ACCESS_KEY: z.string().default("demo-secret-key")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  console.error(
    "Checked env files:",
    path.join(backendDir, ".env"),
    "and",
    path.join(rootDir, ".env")
  );
  throw new Error("Environment validation failed");
}

export const env = {
  ...parsed.data,
  JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET ?? `${parsed.data.JWT_SECRET}-refresh`
};
