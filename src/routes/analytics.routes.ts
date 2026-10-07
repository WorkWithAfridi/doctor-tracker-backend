import { Router } from "express";
import { dashboard } from "../services/analytics.service.js";
import { dashboardQuerySchema } from "../schemas/records.schema.js";
export const analyticsRouter = Router();
analyticsRouter.get("/dashboard", async (request, response) => {
  const query = dashboardQuerySchema.parse(request.query);
  response.json({ data: await dashboard(query.days) });
});
