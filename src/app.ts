import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json({ limit: "100kb" }));
app.use(healthRouter);
// Authentication, doctor, patient, and analytics routers will mount under /api.
app.use((_request, response) => {
  response.status(404).json({ success: false, message: "Route not found", errors: null });
});
app.use(errorHandler);
