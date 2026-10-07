import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import mongoose from "mongoose";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/doctor_tracker_test_${randomUUID().replaceAll("-", "")}`;
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.COOKIE_SAME_SITE = "lax";
const { default: app } = await import("../src/app.js");
const { disconnectDatabase } = await import("../src/config/database.js");

test("a cold function serves docs without MongoDB and connects concurrent API requests", async () => {
  try {
    assert.equal(mongoose.connection.readyState, 0);
    await request(app).get("/docs/").expect(200);
    await request(app).get("/openapi.json").expect(200);
    assert.equal(mongoose.connection.readyState, 0);
    const responses = await Promise.all([
      request(app).get("/health"),
      request(app).get("/health"),
      request(app).get("/api/patients"),
    ]);
    assert.deepEqual(
      responses.map((response) => response.status),
      [200, 200, 401],
    );
    assert.equal(responses[0].body.database, "connected");
    assert.equal(mongoose.connection.readyState, 1);
  } finally {
    await disconnectDatabase();
  }
});
