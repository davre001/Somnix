import path from "node:path";
import dotenv from "dotenv";
import { closeSqliteStore } from "./repositories/sqliteStore.js";
import { app } from "./app.js";

// Resolved from cwd, not __dirname
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

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
