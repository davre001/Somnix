import path from "node:path";
import dotenv from "dotenv";
import express from "express";
import { marketsRouter } from "./routes/markets.js";
import { cardRouter } from "./routes/card.js";

// Resolved from cwd, not __dirname: dev runs src/index.ts directly (tsx),
// prod runs the flattened dist/index.js (tsc, rootDir src) — those sit at
// different depths, but both are always launched from backend/ (npm run
// dev|start, see package.json), where .env.local lives.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();

app.use("/api/markets", marketsRouter);
app.use("/api/card", cardRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`SOMNIX backend listening on http://localhost:${port}`);
});
