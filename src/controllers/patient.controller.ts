import type { RequestHandler } from "express";
import {
  objectId,
  patientSchema,
  patientPatchSchema,
  patientQuerySchema,
} from "../schemas/records.schema.js";
import * as patients from "../services/patient.service.js";
export const list: RequestHandler = async (request, response) => {
  response.json(
    await patients.listPatients(patientQuerySchema.parse(request.query)),
  );
};
export const details: RequestHandler = async (request, response) => {
  response.json({
    data: await patients.getPatient(objectId.parse(request.params.id)),
  });
};
export const create: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json({
      data: await patients.createPatient(patientSchema.parse(request.body)),
    });
};
export const update: RequestHandler = async (request, response) => {
  response.json({
    data: await patients.updatePatient(
      objectId.parse(request.params.id),
      patientPatchSchema.parse(request.body),
    ),
  });
};
export const remove: RequestHandler = async (request, response) => {
  await patients.deletePatient(objectId.parse(request.params.id));
  response.status(204).end();
};
