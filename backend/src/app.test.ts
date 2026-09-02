import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "./app.js";

test("lock creation requires client-confirmed execution data", async () => {
  const response = await request(app).post("/api/lock").send({
    marketId: "BTC-15m-123",
    pair: "BTC",
    length: "15m",
    side: "green",
    amount: 10,
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "startPrice must be a positive number");
});

test("claim creation requires a transaction hash", async () => {
  const response = await request(app).post("/api/claim").send({ lockId: "missing-lock" });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "txHash is required");
});

test("unknown routes use the API error shape", async () => {
  const response = await request(app).get("/api/does-not-exist");

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { ok: false, error: "Route not found" });
});

test("JSON request bodies are size limited", async () => {
  const response = await request(app)
    .post("/api/lock")
    .send({ oversized: "x".repeat(33_000) });

  assert.equal(response.status, 413);
});
