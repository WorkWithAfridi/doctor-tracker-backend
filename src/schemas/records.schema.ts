import { z } from "zod";
import { conditions } from "../models/Patient.js";
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record ID");
const requiredText = z.string().trim().min(1).max(100);
const phone = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .regex(/^[+\d\s().-]+$/, "Invalid phone number");
export const doctorSchema = z.strictObject({
  name: requiredText,
  specialization: requiredText,
  hospital: requiredText,
  phone,
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
});
export const doctorPatchSchema = doctorSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one field",
  );
export const patientSchema = z.strictObject({
  firstName: requiredText,
  lastName: requiredText,
  age: z.number().int().min(0).max(120),
  gender: z.enum(["", "Female", "Male", "Other"]).optional(),
  email: z
    .union([z.email().max(254), z.literal("")])
    .transform((value) => value.toLowerCase())
    .optional(),
  phone,
  condition: z.enum(conditions),
  doctorId: objectId,
});
export const patientPatchSchema = patientSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one field",
  );
export const nestedPatientSchema = patientSchema.omit({ doctorId: true });
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "Invalid date",
  );
const listBase = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).default(""),
  from: date.optional(),
  to: date.optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
};
export const doctorQuerySchema = z
  .strictObject({
    ...listBase,
    specialization: requiredText.optional(),
    hospital: requiredText.optional(),
    sortBy: z.enum(["createdAt", "name"]).default("createdAt"),
  })
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    "Start date must precede end date",
  );
export const patientQuerySchema = z
  .strictObject({
    ...listBase,
    condition: z.enum(conditions).optional(),
    doctorId: objectId.optional(),
    sortBy: z.enum(["createdAt", "name"]).default("createdAt"),
  })
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    "Start date must precede end date",
  );
export const dashboardQuerySchema = z.strictObject({
  days: z.coerce
    .number()
    .refine((value) => value === 30 || value === 90, "Days must be 30 or 90")
    .default(30),
});
