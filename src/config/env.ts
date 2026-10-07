import "dotenv/config";
import { z } from "zod";

const environmentSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
    FRONTEND_URL: z.url(),
    DOCS_ORIGIN: z.url().optional(),
    SESSION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    SEED_ADMIN_EMAIL: z.email().default("admin@doctortracker.com"),
    SEED_ADMIN_PASSWORD: z.string().min(8).max(72).default("Admin123!"),
  })
  .refine(
    (value) =>
      value.COOKIE_SAME_SITE !== "none" || value.NODE_ENV === "production",
    "SameSite=None requires HTTPS in production",
  );

export const env = environmentSchema.parse(process.env);
