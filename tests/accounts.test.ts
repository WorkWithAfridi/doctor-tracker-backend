import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import request from "supertest";

const database = `doctor_tracker_test_${randomUUID().replaceAll("-", "")}`;
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${database}`;
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.DOCS_ORIGIN = "http://localhost:5000";
process.env.COOKIE_SAME_SITE = "lax";
process.env.TRUST_PROXY_HOPS = "0";
const { app } = await import("../src/app.js");
const { User } = await import("../src/models/User.js");
const { Session } = await import("../src/models/Session.js");
const { tokenHash, sessionCookie } =
  await import("../src/services/auth.service.js");
const origin = "http://localhost:3000";

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 5000,
  });
  await User.createIndexes();
  await Session.createIndexes();
  await User.create({
    name: "Admin",
    email: "admin@test.example",
    role: "admin",
    passwordHash: await bcrypt.hash("AdminPassword123!", 10),
  });
});
after(async () => {
  if (
    mongoose.connection.name !== database ||
    !database.startsWith("doctor_tracker_test_")
  )
    throw new Error("Refusing cleanup of unexpected database");
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("admins create private staff logins; staff cannot administer accounts or workspace resets", async () => {
  const admin = request.agent(app);
  await request(app).get("/api/users").expect(401);
  await admin
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email: "admin@test.example", password: "AdminPassword123!" })
    .expect(200);
  const input = {
    name: "Staff Member",
    email: "STAFF@test.example",
    password: "StaffPassword123!",
  };
  await admin
    .post("/api/users")
    .set("Origin", origin)
    .send({ ...input, role: "admin" })
    .expect(400);
  const created = await admin
    .post("/api/users")
    .set("Origin", origin)
    .send(input)
    .expect(201);
  assert.deepEqual(Object.keys(created.body.data).sort(), [
    "email",
    "id",
    "name",
    "role",
  ]);
  assert.equal(created.body.data.role, "staff");
  assert.equal(created.body.data.email, "staff@test.example");
  await admin.post("/api/users").set("Origin", origin).send(input).expect(409);
  const list = await admin.get("/api/users?page=1&limit=1").expect(200);
  assert.equal(list.body.pagination.total, 2);
  assert.equal(list.body.data.length, 1);
  assert.ok(
    list.body.data.every(
      (user: Record<string, unknown>) =>
        !("passwordHash" in user) && !("authVersion" in user),
    ),
  );
  const stored = await User.findById(created.body.data.id).select(
    "+passwordHash",
  );
  assert.ok(
    stored && (await bcrypt.compare(input.password, stored.passwordHash)),
  );
  const staff = request.agent(app);
  await staff
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email: "staff@test.example", password: input.password })
    .expect(200);
  await staff.get("/api/doctors").expect(200);
  await staff
    .post("/api/doctors")
    .set("Origin", origin)
    .send({
      name: "Dr. Staff-created",
      specialization: "General Medicine",
      hospital: "Test Clinic",
      phone: "+8801700000000",
      email: "doctor@test.example",
    })
    .expect(201);
  await staff.get("/api/users").expect(403);
  await staff.post("/api/users").set("Origin", origin).send(input).expect(403);
  await staff.get("/api/settings/data").expect(403);
  await staff
    .post("/api/settings/reset")
    .set("Origin", origin)
    .send({ confirmation: "RESET" })
    .expect(403);
  await staff
    .post("/api/settings/populate")
    .set("Origin", origin)
    .send({ doctorCount: 1, patientCount: 1000 })
    .expect(403);
});

test("password changes verify the current password and invalidate every old or racing session", async () => {
  const first = request.agent(app),
    second = request.agent(app);
  const login = { email: "staff@test.example", password: "StaffPassword123!" };
  for (const client of [first, second])
    await client
      .post("/api/auth/login")
      .set("Origin", origin)
      .send(login)
      .expect(200);
  const input = {
    currentPassword: login.password,
    newPassword: "ChangedPassword123!",
  };
  await first
    .post("/api/auth/password")
    .set("Origin", "https://untrusted.example")
    .send(input)
    .expect(403);
  await first
    .post("/api/auth/password")
    .set("Origin", origin)
    .send({ ...input, currentPassword: "wrong" })
    .expect(400);
  await first
    .post("/api/auth/password")
    .set("Origin", origin)
    .send({ ...input, newPassword: "short" })
    .expect(400);
  await first
    .post("/api/auth/password")
    .set("Origin", origin)
    .send({ ...input, newPassword: "😀".repeat(20) })
    .expect(400);
  await first
    .post("/api/auth/password")
    .set("Origin", origin)
    .send({ ...input, newPassword: login.password })
    .expect(400);
  await first
    .post("/api/auth/password")
    .set("Origin", origin)
    .send({ ...input, userId: "507f1f77bcf86cd799439011" })
    .expect(400);
  await first
    .post("/api/auth/password")
    .set("Origin", origin)
    .send(input)
    .expect(204);
  for (const client of [first, second])
    await client.get("/api/auth/me").expect(401);
  await request(app)
    .post("/api/auth/login")
    .set("Origin", origin)
    .send(login)
    .expect(401);
  const user = await User.findOne({ email: login.email }).select(
    "+authVersion",
  );
  assert.equal(user?.authVersion, 1);
  assert.equal(await Session.countDocuments({ userId: user?._id }), 0);
  const staleToken = randomBytes(32).toString("hex");
  await Session.create({
    tokenHash: tokenHash(staleToken),
    userId: user!._id,
    authVersion: 0,
    expiresAt: new Date(Date.now() + 60000),
  });
  await request(app)
    .get("/api/auth/me")
    .set("Cookie", `${sessionCookie}=${staleToken}`)
    .expect(401);
  const signedIn = await first
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ ...login, password: input.newPassword })
    .expect(200);
  assert.equal(signedIn.body.data.role, "staff");
  await first.get("/api/patients").expect(200);
  await first.get("/api/users").expect(403);
});
