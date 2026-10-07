import assert from "node:assert/strict";
import { test } from "node:test";
import express, { type ErrorRequestHandler } from "express";
import request from "supertest";
import { workspaceWrite } from "../src/middleware/workspace-write.middleware.js";
test("bulk mutations block other writes until the handler responds while reads stay available", async () => {
  const app = express();
  let release!: () => void;
  let started!: () => void;
  const busy = new Promise<void>((resolve) => {
    started = resolve;
  });
  app.use(workspaceWrite);
  app.post("/slow", async (_request, response) => {
    started();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    response.status(204).end();
  });
  app.post("/write", (_request, response) => {
    response.status(204).end();
  });
  app.get("/read", (_request, response) => {
    response.json({ ok: true });
  });
  const errors: ErrorRequestHandler = (error, _request, response, _next) => {
    response.status(error.status ?? 500).json({ message: error.message });
  };
  app.use(errors);
  const pending = request(app)
    .post("/slow")
    .then((response) => response.status);
  await busy;
  try {
    await request(app).post("/write").expect(409);
    await request(app).get("/read").expect(200);
  } finally {
    release();
  }
  assert.equal(await pending, 204);
  await request(app).post("/write").expect(204);
});
