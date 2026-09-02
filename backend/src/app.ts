import cors from "cors";
import express from "express";
import { cardRouter } from "./routes/card.js";
import { claimRouter } from "./routes/claim.js";
import { lockRouter } from "./routes/lock.js";
import { marketsRouter } from "./routes/markets.js";
import { tradeRouter } from "./routes/trade.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));

app.use("/api/markets", marketsRouter);
app.use("/api/card", cardRouter);
app.use("/api/lock", lockRouter);
app.use("/api/trade", tradeRouter);
app.use("/api/claim", claimRouter);
app.use(notFoundHandler);
app.use(errorHandler);
