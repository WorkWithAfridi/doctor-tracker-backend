import type { RequestHandler } from "express";
import {
  objectId,
  doctorSchema,
  doctorPatchSchema,
  doctorQuerySchema,
  patientQuerySchema,
  nestedPatientSchema,
} from "../schemas/records.schema.js";
import * as doctors from "../services/doctor.service.js";
import * as patients from "../services/patient.service.js";
export const list: RequestHandler = async (request, response) => {
  response.json(
    await doctors.listDoctors(doctorQuerySchema.parse(request.query)),
  );
};
export const details: RequestHandler = async (request, response) => {
  response.json({
    data: await doctors.getDoctor(objectId.parse(request.params.id)),
  });
};
export const create: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json({
      data: await doctors.createDoctor(doctorSchema.parse(request.body)),
    });
};
export const update: RequestHandler = async (request, response) => {
  response.json({
    data: await doctors.updateDoctor(
      objectId.parse(request.params.id),
      doctorPatchSchema.parse(request.body),
    ),
  });
};
export const options: RequestHandler = async (_request, response) => {
  response.json({ data: await doctors.doctorOptions() });
};
export const assigned: RequestHandler = async (request, response) => {
  const id = objectId.parse(request.params.id);
  const query = patientQuerySchema.parse(request.query);
  await patients.ensureDoctor(id);
  response.json(await patients.listPatients({ ...query, doctorId: id }));
};
export const addPatient: RequestHandler = async (request, response) => {
  const id = objectId.parse(request.params.id);
  const data = nestedPatientSchema.parse(request.body);
  response
    .status(201)
    .json({ data: await patients.createPatient({ ...data, doctorId: id }) });
};
