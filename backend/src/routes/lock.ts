import { Router } from "express";

export const lockRouter = Router();

lockRouter.get("/health", (_req, res) => {
  res.json({ ok: true, route: "lock" });
});

lockRouter.post("/", async (_req, res) => {
  res.status(501).json({ error: "Lock endpoint not implemented yet" });
});

lockRouter.get("/:id", async (_req, res) => {
  res.status(501).json({ error: "Get lock endpoint not implemented yet" });
});
