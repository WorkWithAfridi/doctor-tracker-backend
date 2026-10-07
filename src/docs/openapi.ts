import { z } from "zod";
import { resetSchema, populateSchema } from "../routes/settings.routes.js";
import {
  doctorSchema,
  doctorPatchSchema,
  patientSchema,
  patientPatchSchema,
  nestedPatientSchema,
  doctorQuerySchema,
  patientQuerySchema,
} from "../schemas/records.schema.js";
import { conditions } from "../models/Patient.js";

type Schema = Record<string, unknown>;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const inputSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { io: "input", target: "draft-2020-12" });
const string = { type: "string" };
const id = {
  type: "string",
  pattern: "^[a-fA-F0-9]{24}$",
  example: "507f1f77bcf86cd799439011",
};
const timestamp = { type: "string", format: "date-time" };
const count = { type: "integer", minimum: 0 };
function recordSchema(schema: z.ZodType, extra: Record<string, Schema>) {
  const generated = inputSchema(schema);
  return {
    ...generated,
    required: [...(generated.required ?? []), "id", "createdAt", "updatedAt"],
    properties: {
      ...generated.properties,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...extra,
    },
  };
}
const json = (schema: Schema, example?: unknown) => ({
  "application/json": { schema, ...(example ? { example } : {}) },
});
const response = (description: string, schema: Schema, example?: unknown) => ({
  description,
  content: json(schema, example),
});
const wrapped = (schema: Schema) => ({
  type: "object",
  required: ["data"],
  properties: { data: schema },
});
const list = (name: string) => ({
  type: "object",
  required: ["data", "pagination"],
  properties: {
    data: { type: "array", items: ref(name) },
    pagination: ref("Pagination"),
  },
});
const body = (name: string, example?: unknown) => ({
  required: true,
  content: json(ref(name), example),
});
const errors = {
  "400": response("Invalid body, record ID, or query parameters", ref("Error")),
  "401": response("Missing or expired session", ref("Error")),
  "403": response("Forbidden role or request origin", ref("Error")),
  "429": response("Request rate limit exceeded", ref("Error")),
  "500": response("Internal server error", ref("Error")),
};
const notFound = { "404": response("Record not found", ref("Error")) };
const duplicate = {
  "409": response("Doctor email already exists", ref("Error"), {
    success: false,
    message: "A record with this email already exists",
    errors: { email: "Email is already in use" },
  }),
};
const pathId = {
  name: "id",
  in: "path",
  required: true,
  description: "Copy an actual record ID from a list response.",
  schema: id,
};
const parameterDescriptions: Record<string, string> = {
  page: "Page number. Pages beyond the end return an empty list.",
  limit: "Records per page; maximum 50.",
  search:
    "Escaped case-insensitive substring search. Patients also match full name and assigned doctor name.",
  from: "Creation date from, inclusive (UTC YYYY-MM-DD).",
  to: "Creation date to, inclusive (UTC YYYY-MM-DD); must not precede from.",
  sortBy: "Sort field. Name sorts patients by first name, then last name.",
  sortOrder: "Sort direction; all sorts include an ID tie-breaker.",
  specialization: "Exact doctor specialization.",
  hospital: "Exact hospital name.",
  condition: "Exact patient condition.",
  doctorId: "Filter patients by assigned doctor ID.",
};
function parameters(schema: z.ZodType, omit: string[] = []) {
  const generated = z.toJSONSchema(schema, {
    io: "output",
    target: "draft-2020-12",
  }) as {
    properties: Record<string, Schema>;
  };
  return Object.entries(generated.properties)
    .filter(([name]) => !omit.includes(name))
    .map(([name, schema]) => ({
      name,
      in: "query",
      required: false,
      description: parameterDescriptions[name],
      schema,
    }));
}
const doctorExample = {
  name: "Dr. Ayesha Rahman",
  specialization: "Cardiology",
  hospital: "Evercare Hospital",
  phone: "+880 1712345678",
  email: "ayesha.rahman@example.com",
};
const patientExample = {
  firstName: "Amelia",
  lastName: "Rahman",
  age: 32,
  gender: "Female",
  email: "amelia@example.com",
  phone: "+880 1812345678",
  condition: "Stable",
};
const doctorRecordExample = {
  id: "507f1f77bcf86cd799439011",
  ...doctorExample,
  createdAt: "2026-10-07T03:00:00.000Z",
  updatedAt: "2026-10-07T03:00:00.000Z",
  patientCount: 8,
};
const patientRecordExample = {
  id: "507f191e810c19729de860ea",
  ...patientExample,
  doctorId: doctorRecordExample.id,
  createdAt: "2026-10-07T03:00:00.000Z",
  updatedAt: "2026-10-07T03:00:00.000Z",
};
const op = (
  operationId: string,
  tag: string,
  summary: string,
  extra: Schema,
) => ({ operationId, tags: [tag], summary, ...extra });

export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Doctor Tracker API",
    version: "0.1.0",
    description:
      "Live REST API reference. Expand an endpoint to inspect its parameters, request body, and response schemas. Use **Try it out → Execute** to call the running API.\n\n**Start here:** open Authentication → POST /api/auth/login and execute with the local demo credentials. The browser saves the HTTP-only session cookie automatically; then execute protected endpoints. Do not paste a token into Authorize: browsers manage this cookie. Logout revokes the session.\n\n**Local demo:** admin@doctortracker.com / Admin123! (production accounts may differ). All examples are fictional. Path IDs in examples are illustrative: copy actual IDs from list responses. Create/update/delete calls change real database records.\n\nDates and dashboard statistics use UTC. Export this document at /openapi.json to import into Postman or Bruno.",
  },
  servers: [{ url: "/", description: "This running API server" }],
  security: [{ sessionCookie: [] }],
  tags: [
    {
      name: "Settings",
      description: "Administrator workspace reset and sample-data generation",
    },
    { name: "Health", description: "Public connectivity checks" },
    {
      name: "Authentication",
      description: "Login, current user, and revocable sessions",
    },
    { name: "Doctors", description: "Care team management and filter options" },
    { name: "Doctor patients", description: "Patients assigned to a doctor" },
    {
      name: "Patients",
      description: "Global patient management and reassignment",
    },
    {
      name: "Analytics",
      description: "Database-derived metrics and chart data",
    },
  ],
  paths: {
    "/api/settings/data": {
      get: op(
        "workspaceCounts",
        "Settings",
        "Get workspace doctor and patient counts",
        {
          responses: {
            ...errors,
            "200": response(
              "Current workspace counts",
              wrapped(ref("WorkspaceCounts")),
            ),
          },
        },
      ),
    },
    "/api/settings/reset": {
      post: op(
        "resetWorkspace",
        "Settings",
        "Delete all doctor and patient records",
        {
          description:
            "Destructive. Requires confirmation RESET. Preserves users, sessions, and indexes. Record writes on this API process are serialized during this operation.",
          requestBody: body("WorkspaceReset", { confirmation: "RESET" }),
          responses: {
            ...errors,
            "409": response("Another workspace write is running", ref("Error")),
            "200": response(
              "Workspace emptied",
              wrapped(ref("WorkspaceCounts")),
              { data: { doctors: 0, patients: 0 } },
            ),
          },
        },
      ),
    },
    "/api/settings/populate": {
      post: op(
        "populateWorkspace",
        "Settings",
        "Append fictional doctors and patients",
        {
          description:
            "Appends 1–2,000 doctors (default 100) and 1,000–2,000 patients. Existing records are preserved; patients are assigned across existing and newly added doctors. Repeated calls append another batch. Creation dates span 90 days for charts.",
          requestBody: body("WorkspacePopulate", {
            doctorCount: 100,
            patientCount: 1500,
          }),
          responses: {
            ...errors,
            "409": response("Another workspace write is running", ref("Error")),
            "201": response(
              "Sample records added",
              wrapped(ref("WorkspacePopulation")),
            ),
          },
        },
      ),
    },
    "/health": {
      get: op("getHealth", "Health", "Check API and MongoDB health", {
        security: [],
        responses: {
          "200": response("MongoDB is reachable", ref("Health"), {
            status: "ok",
            service: "doctor-tracker-api",
            database: "connected",
          }),
          "503": response("MongoDB is unavailable", ref("Health"), {
            status: "unavailable",
            database: "disconnected",
          }),
        },
      }),
    },
    "/api/auth/login": {
      post: op("login", "Authentication", "Sign in as administrator", {
        security: [],
        requestBody: body("Login", {
          email: "admin@doctortracker.com",
          password: "Admin123!",
        }),
        responses: {
          ...errors,
          "200": {
            ...response(
              "Signed in; HTTP-only session cookie set",
              wrapped(ref("Admin")),
              {
                data: {
                  id: "507f1f77bcf86cd799439012",
                  name: "Alex Kim",
                  email: "admin@doctortracker.com",
                  role: "admin",
                },
              },
            ),
            headers: {
              "Set-Cookie": {
                description:
                  "Browser-managed session; HttpOnly, SameSite, and Secure in production.",
                schema: string,
              },
            },
          },
        },
      }),
    },
    "/api/auth/me": {
      get: op("currentUser", "Authentication", "Get current administrator", {
        responses: {
          ...errors,
          "200": response(
            "Current user; no password hash",
            wrapped(ref("Admin")),
          ),
        },
      }),
    },
    "/api/auth/logout": {
      post: op("logout", "Authentication", "Revoke session and clear cookie", {
        security: [],
        description:
          "Idempotent; succeeds even without an active session. Requires a trusted browser origin.",
        responses: {
          ...errors,
          "204": { description: "Logged out; empty response" },
        },
      }),
    },
    "/api/doctors": {
      get: op(
        "listDoctors",
        "Doctors",
        "List, search, filter, and paginate doctors",
        {
          parameters: parameters(doctorQuerySchema),
          responses: {
            ...errors,
            "200": response(
              "Doctors with patient counts and pagination",
              list("Doctor"),
              {
                data: [doctorRecordExample],
                pagination: { page: 1, limit: 10, total: 24, pages: 3 },
              },
            ),
          },
        },
      ),
      post: op("createDoctor", "Doctors", "Create doctor", {
        requestBody: body("DoctorInput", doctorExample),
        responses: {
          ...errors,
          ...duplicate,
          "201": response("Doctor created", wrapped(ref("Doctor"))),
        },
      }),
    },
    "/api/doctors/options": {
      get: op(
        "doctorOptions",
        "Doctors",
        "Get specialization and hospital filter options",
        {
          responses: {
            ...errors,
            "200": response(
              "Distinct sorted options",
              wrapped({
                type: "object",
                required: ["specializations", "hospitals"],
                properties: {
                  specializations: { type: "array", items: string },
                  hospitals: { type: "array", items: string },
                },
              }),
              {
                data: {
                  specializations: ["Cardiology", "Neurology"],
                  hospitals: ["Evercare Hospital", "Square Hospital"],
                },
              },
            ),
          },
        },
      ),
    },
    "/api/doctors/{id}": {
      get: op("getDoctor", "Doctors", "Get doctor profile and patient count", {
        parameters: [pathId],
        responses: {
          ...errors,
          ...notFound,
          "200": response("Doctor details", wrapped(ref("Doctor")), {
            data: doctorRecordExample,
          }),
        },
      }),
      patch: op("updateDoctor", "Doctors", "Update doctor fields", {
        parameters: [pathId],
        description:
          "Supply a nonempty subset of editable fields. Unknown fields are rejected.",
        requestBody: body("DoctorPatch", { hospital: "Square Hospital" }),
        responses: {
          ...errors,
          ...notFound,
          ...duplicate,
          "200": response("Updated doctor", wrapped(ref("Doctor"))),
        },
      }),
    },
    "/api/doctors/{id}/patients": {
      get: op(
        "listDoctorPatients",
        "Doctor patients",
        "List patients assigned to this doctor",
        {
          parameters: [pathId, ...parameters(patientQuerySchema)],
          description:
            "The route doctor ID takes precedence over the optional doctorId query value.",
          responses: {
            ...errors,
            ...notFound,
            "200": response(
              "Assigned patients and pagination",
              list("Patient"),
            ),
          },
        },
      ),
      post: op(
        "createDoctorPatient",
        "Doctor patients",
        "Add patient under this doctor",
        {
          parameters: [pathId],
          description:
            "doctorId comes from the route and must not be included in the request body.",
          requestBody: body("NestedPatientInput", patientExample),
          responses: {
            ...errors,
            ...notFound,
            "201": response("Patient created", wrapped(ref("Patient"))),
          },
        },
      ),
    },
    "/api/patients": {
      get: op(
        "listPatients",
        "Patients",
        "List, search, filter, and paginate patients",
        {
          parameters: parameters(patientQuerySchema),
          responses: {
            ...errors,
            "200": response(
              "Patients with assigned doctor summaries and pagination",
              list("Patient"),
              {
                data: [
                  {
                    ...patientRecordExample,
                    doctor: {
                      id: doctorRecordExample.id,
                      name: doctorExample.name,
                      specialization: doctorExample.specialization,
                    },
                  },
                ],
                pagination: { page: 1, limit: 10, total: 186, pages: 19 },
              },
            ),
          },
        },
      ),
      post: op(
        "createPatient",
        "Patients",
        "Create patient with an existing doctor",
        {
          requestBody: body("PatientInput", {
            ...patientExample,
            doctorId: doctorRecordExample.id,
          }),
          responses: {
            ...errors,
            ...notFound,
            "201": response("Patient created", wrapped(ref("Patient"))),
          },
        },
      ),
    },
    "/api/patients/{id}": {
      get: op("getPatient", "Patients", "Get patient information", {
        parameters: [pathId],
        responses: {
          ...errors,
          ...notFound,
          "200": response("Patient details", wrapped(ref("Patient")), {
            data: patientRecordExample,
          }),
        },
      }),
      patch: op(
        "updatePatient",
        "Patients",
        "Edit patient or reassign doctor",
        {
          parameters: [pathId],
          description:
            "Omitted fields remain unchanged. doctorId must reference an existing doctor.",
          requestBody: body("PatientPatch", { condition: "Recovering" }),
          responses: {
            ...errors,
            ...notFound,
            "200": response("Updated patient", wrapped(ref("Patient"))),
          },
        },
      ),
      delete: op("deletePatient", "Patients", "Permanently delete patient", {
        parameters: [pathId],
        description:
          "Removes the database record and affects assigned lists and dashboard metrics.",
        responses: {
          ...errors,
          ...notFound,
          "204": { description: "Deleted; empty response" },
        },
      }),
    },
    "/api/analytics/dashboard": {
      get: op(
        "getDashboard",
        "Analytics",
        "Get dashboard metrics and chart data",
        {
          parameters: [
            {
              name: "days",
              in: "query",
              required: false,
              description: "Growth period, ending today in UTC.",
              schema: { type: "integer", enum: [30, 90], default: 30 },
            },
          ],
          responses: {
            ...errors,
            "200": response(
              "Totals, top five doctors, zero-filled daily growth, conditions, and recent patients",
              wrapped(ref("Dashboard")),
            ),
          },
        },
      ),
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "doctor_tracker_session",
        description:
          "Created by POST /api/auth/login. Browsers attach it automatically; manual cookie entry in Swagger Authorize is not supported.",
      },
    },
    schemas: {
      WorkspaceReset: inputSchema(resetSchema),
      WorkspacePopulate: inputSchema(populateSchema),
      WorkspaceCounts: {
        type: "object",
        required: ["doctors", "patients"],
        properties: { doctors: count, patients: count },
      },
      WorkspacePopulation: {
        type: "object",
        required: ["doctors", "patients", "doctorsAdded", "patientsAdded"],
        properties: {
          doctors: count,
          patients: count,
          doctorsAdded: count,
          patientsAdded: { type: "integer", minimum: 1000, maximum: 2000 },
        },
      },
      Login: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", maxLength: 254 },
          password: { type: "string", minLength: 1, maxLength: 72 },
        },
      },
      DoctorInput: inputSchema(doctorSchema),
      DoctorPatch: { ...inputSchema(doctorPatchSchema), minProperties: 1 },
      PatientInput: inputSchema(patientSchema),
      PatientPatch: { ...inputSchema(patientPatchSchema), minProperties: 1 },
      NestedPatientInput: inputSchema(nestedPatientSchema),
      Doctor: recordSchema(doctorSchema, { patientCount: count }),
      Patient: recordSchema(patientSchema, {
        doctor: {
          oneOf: [
            {
              type: "object",
              required: ["id", "name", "specialization"],
              properties: { id, name: string, specialization: string },
            },
            { type: "null" },
          ],
        },
      }),
      Admin: {
        type: "object",
        required: ["id", "name", "email", "role"],
        properties: {
          id,
          name: string,
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["admin"] },
        },
      },
      Pagination: {
        type: "object",
        required: ["page", "limit", "total", "pages"],
        properties: {
          page: { type: "integer", minimum: 1 },
          limit: { type: "integer", minimum: 1, maximum: 50 },
          total: count,
          pages: { type: "integer", minimum: 1 },
        },
      },
      Error: {
        type: "object",
        required: ["success", "message", "errors"],
        properties: {
          success: { type: "boolean", const: false },
          message: string,
          errors: { type: ["object", "null"], additionalProperties: string },
        },
        example: {
          success: false,
          message: "Validation failed",
          errors: { email: "Invalid email address" },
        },
      },
      Health: {
        type: "object",
        required: ["status", "database"],
        properties: {
          status: { type: "string", enum: ["ok", "unavailable"] },
          service: string,
          database: { type: "string", enum: ["connected", "disconnected"] },
        },
      },
      Dashboard: {
        type: "object",
        required: [
          "totals",
          "patientsPerDoctor",
          "patientGrowth",
          "conditionDistribution",
          "recentPatients",
          "period",
        ],
        properties: {
          totals: {
            type: "object",
            required: [
              "doctors",
              "patients",
              "patientsAddedThisMonth",
              "averagePatientsPerDoctor",
            ],
            properties: {
              doctors: count,
              patients: count,
              patientsAddedThisMonth: count,
              averagePatientsPerDoctor: { type: "number", minimum: 0 },
            },
          },
          patientsPerDoctor: {
            type: "array",
            maxItems: 5,
            items: {
              type: "object",
              required: ["doctorId", "doctorName", "patientCount"],
              properties: {
                doctorId: id,
                doctorName: string,
                patientCount: count,
              },
            },
          },
          patientGrowth: {
            type: "array",
            description:
              "Daily creation counts, including zeros. Deleted patients are excluded; this is not net growth.",
            items: {
              type: "object",
              required: ["date", "count"],
              properties: { date: { type: "string", format: "date" }, count },
            },
          },
          conditionDistribution: {
            type: "array",
            items: {
              type: "object",
              required: ["condition", "count"],
              properties: {
                condition: { type: "string", enum: conditions },
                count,
              },
            },
          },
          recentPatients: {
            type: "array",
            maxItems: 5,
            items: {
              type: "object",
              required: [
                "id",
                "firstName",
                "lastName",
                "condition",
                "doctor",
                "createdAt",
              ],
              properties: {
                id,
                firstName: string,
                lastName: string,
                condition: { type: "string", enum: conditions },
                createdAt: timestamp,
                doctor: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        _id: id,
                        name: string,
                        specialization: string,
                      },
                    },
                    { type: "null" },
                  ],
                },
              },
            },
          },
          period: {
            type: "object",
            required: ["days", "timezone", "from", "to"],
            properties: {
              days: { type: "integer", enum: [30, 90] },
              timezone: { type: "string", const: "UTC" },
              from: timestamp,
              to: timestamp,
            },
          },
        },
      },
    },
  },
};
