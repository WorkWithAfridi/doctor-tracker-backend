import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  FRONTEND_URL: z.url(),
});

export const env = environmentSchema.parse(process.env);
