import { Router } from "express";

export const claimRouter = Router();

claimRouter.get("/health", (_req, res) => {
  res.json({ ok: true, route: "claim" });
});

claimRouter.post("/", async (_req, res) => {
  res.status(501).json({ error: "Claim endpoint not implemented yet" });
});

claimRouter.get("/:id", async (_req, res) => {
  res.status(501).json({ error: "Claim status endpoint not implemented yet" });
});
