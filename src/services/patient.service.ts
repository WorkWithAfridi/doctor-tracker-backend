import { Types } from "mongoose";
import { z } from "zod";
import { Patient } from "../models/Patient.js";
import { Doctor } from "../models/Doctor.js";
import {
  patientSchema,
  patientPatchSchema,
  patientQuerySchema,
} from "../schemas/records.schema.js";
import { ApiError } from "../utils/ApiError.js";
import {
  dateFilter,
  escapeSearch,
  pagination,
  sortFields,
} from "../utils/query.js";
import { serialize } from "../utils/serialize.js";
export async function ensureDoctor(id: string) {
  if (!(await Doctor.exists({ _id: id })))
    throw new ApiError(404, "Doctor not found");
}
export async function listPatients(query: z.infer<typeof patientQuerySchema>) {
  const escaped = escapeSearch(query.search);
  const matchingDoctors = query.search
    ? await Doctor.find({ name: { $regex: escaped, $options: "i" } })
        .select("_id")
        .lean()
    : [];
  const filter = {
    ...dateFilter(query.from, query.to),
    ...(query.condition ? { condition: query.condition } : {}),
    ...(query.doctorId ? { doctorId: new Types.ObjectId(query.doctorId) } : {}),
    ...(query.search
      ? {
          $or: [
            ...["firstName", "lastName", "phone", "email"].map((field) => ({
              [field]: { $regex: escaped, $options: "i" },
            })),
            {
              $expr: {
                $regexMatch: {
                  input: { $concat: ["$firstName", " ", "$lastName"] },
                  regex: escaped,
                  options: "i",
                },
              },
            },
            { doctorId: { $in: matchingDoctors.map((doctor) => doctor._id) } },
          ],
        }
      : {}),
  };
  const [records, total] = await Promise.all([
    Patient.aggregate([
      { $match: filter },
      { $sort: sortFields(query.sortBy, query.sortOrder, true) },
      { $skip: (query.page - 1) * query.limit },
      { $limit: query.limit },
      {
        $lookup: {
          from: Doctor.collection.name,
          localField: "doctorId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, specialization: 1 } }],
          as: "assignedDoctor",
        },
      },
      { $addFields: { doctor: { $arrayElemAt: ["$assignedDoctor", 0] } } },
      { $project: { assignedDoctor: 0, __v: 0 } },
    ]),
    Patient.countDocuments(filter),
  ]);
  return {
    data: records.map((record) => ({
      ...serialize(record),
      doctorId: String(record.doctorId),
      doctor: record.doctor ? serialize(record.doctor) : null,
    })),
    pagination: pagination(query.page, query.limit, total),
  };
}
export async function getPatient(id: string) {
  const patient = await Patient.findById(id).lean();
  if (!patient) throw new ApiError(404, "Patient not found");
  return { ...serialize(patient), doctorId: String(patient.doctorId) };
}
export async function createPatient(input: z.infer<typeof patientSchema>) {
  await ensureDoctor(input.doctorId);
  const patient = await Patient.create(input);
  return {
    ...serialize(patient.toObject()),
    doctorId: String(patient.doctorId),
  };
}
export async function updatePatient(
  id: string,
  input: z.infer<typeof patientPatchSchema>,
) {
  if (input.doctorId) await ensureDoctor(input.doctorId);
  const patient = await Patient.findByIdAndUpdate(
    id,
    { $set: input },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!patient) throw new ApiError(404, "Patient not found");
  return { ...serialize(patient), doctorId: String(patient.doctorId) };
}
export async function deletePatient(id: string) {
  if (!(await Patient.findByIdAndDelete(id)))
    throw new ApiError(404, "Patient not found");
}
