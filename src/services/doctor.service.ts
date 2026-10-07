import { z } from "zod";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import {
  doctorSchema,
  doctorPatchSchema,
  doctorQuerySchema,
} from "../schemas/records.schema.js";
import {
  dateFilter,
  escapeSearch,
  pagination,
  sortFields,
} from "../utils/query.js";
import { serialize } from "../utils/serialize.js";
import { ApiError } from "../utils/ApiError.js";
export async function listDoctors(query: z.infer<typeof doctorQuerySchema>) {
  const filter = {
    ...dateFilter(query.from, query.to),
    ...(query.specialization ? { specialization: query.specialization } : {}),
    ...(query.hospital ? { hospital: query.hospital } : {}),
    ...(query.search
      ? {
          $or: ["name", "email", "specialization", "hospital"].map((field) => ({
            [field]: { $regex: escapeSearch(query.search), $options: "i" },
          })),
        }
      : {}),
  };
  const [records, total] = await Promise.all([
    Doctor.aggregate([
      { $match: filter },
      { $sort: sortFields(query.sortBy, query.sortOrder) },
      { $skip: (query.page - 1) * query.limit },
      { $limit: query.limit },
      {
        $lookup: {
          from: Patient.collection.name,
          let: { doctorId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$doctorId", "$$doctorId"] } } },
            { $count: "count" },
          ],
          as: "counts",
        },
      },
      {
        $addFields: {
          patientCount: {
            $ifNull: [{ $arrayElemAt: ["$counts.count", 0] }, 0],
          },
        },
      },
      { $project: { counts: 0, __v: 0 } },
    ]),
    Doctor.countDocuments(filter),
  ]);
  return {
    data: records.map(serialize),
    pagination: pagination(query.page, query.limit, total),
  };
}
export async function getDoctor(id: string) {
  const doctor = await Doctor.findById(id).lean();
  if (!doctor) throw new ApiError(404, "Doctor not found");
  return {
    ...serialize(doctor),
    patientCount: await Patient.countDocuments({ doctorId: doctor._id }),
  };
}
export async function createDoctor(input: z.infer<typeof doctorSchema>) {
  return serialize((await Doctor.create(input)).toObject());
}
export async function updateDoctor(
  id: string,
  input: z.infer<typeof doctorPatchSchema>,
) {
  const doctor = await Doctor.findByIdAndUpdate(
    id,
    { $set: input },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!doctor) throw new ApiError(404, "Doctor not found");
  return serialize(doctor);
}
export async function doctorOptions() {
  const [specializations, hospitals] = await Promise.all([
    Doctor.distinct("specialization"),
    Doctor.distinct("hospital"),
  ]);
  return {
    specializations: specializations.sort(),
    hospitals: hospitals.sort(),
  };
}
