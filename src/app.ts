import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { doctorRouter } from "./routes/doctor.routes.js";
import { patientRouter } from "./routes/patient.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { docsRouter } from "./routes/docs.routes.js";
import { settingsRouter } from "./routes/settings.routes.js";
import { workspaceWrite } from "./middleware/workspace-write.middleware.js";
import {
  requireAuth,
  requireTrustedOrigin,
} from "./middleware/auth.middleware.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY_HOPS);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
      },
    },
  }),
);
app.use(cors({ origin: new URL(env.FRONTEND_URL).origin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api", async (_request, _response, next) => {
  await connectDatabase();
  next();
});
app.use(healthRouter);
app.use(docsRouter);
app.use(
  "/api",
  (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  },
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please try again shortly",
      errors: null,
    },
  }),
  requireTrustedOrigin,
);
app.use("/api/auth", authRouter);
app.use("/api/doctors", requireAuth, workspaceWrite, doctorRouter);
app.use("/api/patients", requireAuth, workspaceWrite, patientRouter);
app.use("/api/settings", requireAuth, workspaceWrite, settingsRouter);
app.use("/api/analytics", requireAuth, analyticsRouter);
app.use((_request, response) => {
  response
    .status(404)
    .json({ success: false, message: "Route not found", errors: null });
});
app.use(errorHandler);

export default app;
