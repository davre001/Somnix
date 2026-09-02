import { Router } from "express";
import { getLiveMarkets, getOrderBook } from "../lib/dreamdex.js";

export const marketsRouter = Router();

marketsRouter.get("/", async (_req, res) => {
  try {
    const markets = await getLiveMarkets();
    res.json({ success: true, markets });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${new Date().toISOString()}] [ERROR] Failed to load live markets:`, message);
    res.status(502).json({
      success: false,
      error: "Failed to load live markets from DreamDEX indexer",
      detail: message,
    });
  }
});

marketsRouter.get("/:id/orderbook", async (req, res) => {
  const { id } = req.params;
  try {
    const orderBook = await getOrderBook(id);
    res.json({ success: true, marketId: id, orderBook });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[${new Date().toISOString()}] [ERROR] Failed to load order book for market ${id}:`,
      message
    );
    res.status(502).json({
      success: false,
      error: "Failed to load order book from DreamDEX indexer",
      marketId: id,
      detail: message,
    });
  }
});
