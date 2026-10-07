import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Always use a newly created local database; never test or clean the configured application database.
const testDatabase = `doctor_tracker_test_${randomUUID().replaceAll("-", "")}`;
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${testDatabase}`;
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.COOKIE_SAME_SITE = "lax";
process.env.TRUST_PROXY_HOPS = "0";
const { app } = await import("../src/app.js");
const { User } = await import("../src/models/User.js");
const { Session } = await import("../src/models/Session.js");
const { Doctor } = await import("../src/models/Doctor.js");
const { Patient } = await import("../src/models/Patient.js");
const { createIndexes } = await import("../src/scripts/indexes.js");
const origin = "http://localhost:3000";
const admin = request.agent(app);

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 5000,
  });
  await createIndexes();
  await User.create({
    name: "Test Admin",
    email: "test@example.com",
    passwordHash: await bcrypt.hash("TestPassword123!", 10),
    role: "admin",
  });
});
after(async () => {
  if (
    mongoose.connection.name !== testDatabase ||
    !testDatabase.startsWith("doctor_tracker_test_")
  )
    throw new Error("Unexpected test database; refusing cleanup");
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("cookie sessions protect APIs, reject untrusted writes, and revoke on logout", async () => {
  await request(app).get("/api/doctors").expect(401);
  await request(app)
    .post("/api/auth/login")
    .send({ email: "test@example.com", password: "TestPassword123!" })
    .expect(403);
  await admin
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email: "test@example.com", password: "wrong" })
    .expect(401);
  const login = await admin
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email: "test@example.com", password: "TestPassword123!" })
    .expect(200);
  const cookie = String(login.headers["set-cookie"][0]).split(";")[0];
  assert.match(String(login.headers["set-cookie"]), /HttpOnly/);
  assert.match(String(login.headers["set-cookie"]), /SameSite=Lax/);
  assert.equal(login.body.data.passwordHash, undefined);
  const sessions = await Session.find().lean();
  assert.equal(sessions.length, 1);
  assert.notEqual(sessions[0].tokenHash, cookie.split("=")[1]);
  await admin.get("/api/auth/me").expect(200);
  await admin
    .post("/api/doctors")
    .set("Origin", "https://untrusted.example")
    .send({})
    .expect(403);
  await admin.post("/api/auth/logout").set("Origin", origin).expect(204);
  await request(app).get("/api/auth/me").set("Cookie", cookie).expect(401);
  await admin
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email: "test@example.com", password: "TestPassword123!" })
    .expect(200);
});

test("doctor/patient CRUD, filters, stable pagination, validation, and analytics", async () => {
  const payload = {
    name: "Dr. Demo",
    specialization: "Cardiology",
    hospital: "Test Hospital",
    phone: "+880 1712345678",
    email: "doctor@example.com",
  };
  await admin
    .post("/api/doctors")
    .set("Origin", origin)
    .send({ ...payload, injected: true })
    .expect(400);
  const created = await admin
    .post("/api/doctors")
    .set("Origin", origin)
    .send(payload)
    .expect(201);
  const doctorId = created.body.data.id;
  const duplicate = await admin
    .post("/api/doctors")
    .set("Origin", origin)
    .send({ ...payload, email: "DOCTOR@EXAMPLE.COM" })
    .expect(409);
  assert.equal(duplicate.body.errors.email, "Email is already in use");
  await admin
    .patch(`/api/doctors/${doctorId}`)
    .set("Origin", origin)
    .send({})
    .expect(400);
  await admin
    .patch(`/api/doctors/${doctorId}`)
    .set("Origin", origin)
    .send({ hospital: "Updated Hospital" })
    .expect(200);
  await admin.get("/api/doctors/bad-id").expect(400);
  await admin.get("/api/doctors/000000000000000000000001").expect(404);
  await admin.get("/api/doctors?limit=51").expect(400);
  await admin.get("/api/doctors?from=2026-02-30").expect(400);
  await admin.get("/api/doctors?from=2026-10-10&to=2026-10-01").expect(400);
  const options = await admin.get("/api/doctors/options").expect(200);
  assert.deepEqual(options.body.data.specializations, ["Cardiology"]);
  const second = await admin
    .post("/api/doctors")
    .set("Origin", origin)
    .send({ ...payload, name: "Dr. Second", email: "second@example.com" })
    .expect(201);
  const patient = {
    firstName: "Demo",
    lastName: "Patient",
    age: 32,
    gender: "Female",
    email: "demo.patient@example.com",
    phone: "+880 1812345678",
    condition: "Stable",
  };
  const newPatient = await admin
    .post(`/api/doctors/${doctorId}/patients`)
    .set("Origin", origin)
    .send(patient)
    .expect(201);
  const patientId = newPatient.body.data.id;
  await admin
    .post("/api/patients")
    .set("Origin", origin)
    .send({ ...patient, doctorId: "000000000000000000000001" })
    .expect(404);
  await admin
    .post("/api/patients")
    .set("Origin", origin)
    .send({ ...patient, age: -1, doctorId })
    .expect(400);
  const list = await admin
    .get(
      "/api/doctors?specialization=Cardiology&limit=1&sortBy=name&sortOrder=asc",
    )
    .expect(200);
  assert.equal(list.body.pagination.total, 2);
  assert.equal(list.body.pagination.pages, 2);
  assert.equal(list.body.data[0].patientCount, 1);
  const page2 = await admin
    .get("/api/doctors?limit=1&page=2&sortBy=name&sortOrder=asc")
    .expect(200);
  assert.notEqual(page2.body.data[0].id, list.body.data[0].id);
  const literal = await admin.get("/api/doctors?search=.*").expect(200);
  assert.equal(literal.body.pagination.total, 0);
  const assigned = await admin
    .get(`/api/doctors/${doctorId}/patients?condition=Stable`)
    .expect(200);
  assert.equal(assigned.body.data[0].doctor.name, "Dr. Demo");
  const fullName = await admin
    .get("/api/patients?search=Demo%20Patient")
    .expect(200);
  assert.equal(fullName.body.pagination.total, 1);
  const doctorName = await admin
    .get("/api/patients?search=Dr.%20Demo")
    .expect(200);
  assert.equal(doctorName.body.pagination.total, 1);
  const patched = await admin
    .patch(`/api/patients/${patientId}`)
    .set("Origin", origin)
    .send({ doctorId: second.body.data.id, condition: "Recovering" })
    .expect(200);
  assert.equal(patched.body.data.gender, "Female");
  assert.equal(patched.body.data.email, "demo.patient@example.com");
  assert.equal(patched.body.data.age, 32);
  const oldAssignments = await admin
    .get(`/api/doctors/${doctorId}/patients`)
    .expect(200);
  assert.equal(oldAssignments.body.pagination.total, 0);
  const today = new Date().toISOString().slice(0, 10);
  const matching = await admin
    .get(`/api/patients?condition=Recovering&from=${today}&to=${today}`)
    .expect(200);
  assert.equal(matching.body.pagination.total, 1);
  const analytics = await admin
    .get("/api/analytics/dashboard?days=30")
    .expect(200);
  assert.equal(analytics.body.data.totals.doctors, 2);
  assert.equal(analytics.body.data.totals.patients, 1);
  assert.equal(analytics.body.data.patientGrowth.length, 30);
  assert.equal(
    analytics.body.data.patientGrowth.reduce(
      (sum: number, day: { count: number }) => sum + day.count,
      0,
    ),
    1,
  );
  assert.equal(
    analytics.body.data.patientsPerDoctor[0].doctorId,
    second.body.data.id,
  );
  await admin.get("/api/analytics/dashboard?days=31").expect(400);
  await admin
    .delete(`/api/patients/${patientId}`)
    .set("Origin", origin)
    .expect(204);
  await admin.get(`/api/patients/${patientId}`).expect(404);
  assert.equal(await Patient.countDocuments(), 0);
  const plan = await Patient.find({ doctorId: doctorId })
    .sort({ createdAt: -1, _id: -1 })
    .explain("executionStats");
  assert.ok(JSON.stringify(plan.queryPlanner.winningPlan).includes("IXSCAN"));
  assert.equal(await Doctor.countDocuments(), 2);
});

test("expired sessions are rejected before TTL cleanup", async () => {
  await Session.updateMany(
    {},
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  );
  await admin.get("/api/auth/me").expect(401);
});
