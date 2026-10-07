import { Router } from "express";
import * as controller from "../controllers/patient.controller.js";
export const patientRouter = Router();
patientRouter.get("/", controller.list);
patientRouter.post("/", controller.create);
patientRouter.get("/:id", controller.details);
patientRouter.patch("/:id", controller.update);
patientRouter.delete("/:id", controller.remove);
