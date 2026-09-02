import path from "node:path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { marketsRouter } from "./routes/markets.js";
import { cardRouter } from "./routes/card.js";

// Resolved from cwd, not __dirname
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${Date.now() - start}ms)`
    );
  });
  next();
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    network: "Somnia Shannon Testnet",
    chainId: 50312,
  });
});

app.use("/api/markets", marketsRouter);
app.use("/api/card", cardRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`SOMNIX backend listening on http://localhost:${port}`);
});
