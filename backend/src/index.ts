import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { marketsRouter } from "./routes/markets.js";
import { cardRouter } from "./routes/card.js";
import { lockRouter } from "./routes/lock.js";
import { tradeRouter } from "./routes/trade.js";
import { claimRouter } from "./routes/claim.js";
import { closeSqliteStore } from "./repositories/sqliteStore.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Resolved from cwd, not __dirname: dev runs src/index.ts directly (tsx),
// prod runs the flattened dist/index.js (tsc, rootDir src) — those sit at
// different depths, but both are always launched from backend/ (npm run
// dev|start, see package.json), where .env.local lives.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();

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

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, () => {
  console.log(`SOMNIX backend listening on http://localhost:${port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down SOMNIX backend`);
  server.close(async (serverError) => {
    if (serverError) {
      console.error("Failed to close HTTP server", serverError);
      process.exitCode = 1;
    }

    try {
      await closeSqliteStore();
    } catch (databaseError) {
      console.error("Failed to close SQLite database", databaseError);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
