import { Router } from "express";

export const tradeRouter = Router();

tradeRouter.get("/health", (_req, res) => {
  res.json({ ok: true, route: "trade" });
});

tradeRouter.post("/", async (_req, res) => {
  res.status(501).json({ error: "Trade endpoint not implemented yet" });
});

tradeRouter.get("/:marketId", async (_req, res) => {
  res.status(501).json({ error: "Trade details endpoint not implemented yet" });
});
