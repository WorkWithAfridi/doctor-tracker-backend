import { Router } from "express";
import { z } from "zod";
import {
  workspaceCounts,
  resetWorkspace,
  populateWorkspace,
} from "../services/workspace.service.js";
export const resetSchema = z.strictObject({ confirmation: z.literal("RESET") });
export const populateSchema = z.strictObject({
  patientCount: z.number().int().min(1000).max(2000),
  doctorCount: z.number().int().min(1).max(2000).default(100),
});
export const settingsRouter = Router();
settingsRouter.get("/data", async (_request, response) => {
  response.json({ data: await workspaceCounts() });
});
settingsRouter.post("/reset", async (request, response) => {
  resetSchema.parse(request.body);
  response.json({ data: await resetWorkspace() });
});
settingsRouter.post("/populate", async (request, response) => {
  const { patientCount, doctorCount } = populateSchema.parse(request.body);
  response
    .status(201)
    .json({ data: await populateWorkspace(patientCount, doctorCount) });
});
