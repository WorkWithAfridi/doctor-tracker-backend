import { Router } from "express";
import { connectDatabase, pingDatabase } from "../config/database.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_request, response) => {
  try {
    await connectDatabase();
    await pingDatabase();
    response.json({
      status: "ok",
      service: "doctor-tracker-api",
      database: "connected",
    });
  } catch {
    response
      .status(503)
      .json({ status: "unavailable", database: "disconnected" });
  }
});
