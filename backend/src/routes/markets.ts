import { Router } from "express";
import { getLiveMarkets, getOrderBook } from "../lib/dreamdex.js";

export const marketsRouter = Router();

marketsRouter.get("/", async (_req, res) => {
  try {
    const markets = await getLiveMarkets();
    res.json({ markets });
  } catch {
    res.status(502).json({ error: "Failed to load live markets" });
  }
});

marketsRouter.get("/:id/orderbook", async (req, res) => {
  try {
    const orderBook = await getOrderBook(req.params.id);
    res.json({ orderBook });
  } catch {
    res.status(502).json({ error: "Failed to load order book" });
  }
});
