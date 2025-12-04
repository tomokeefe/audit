import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleAudit, handleDemoAudit } from "./routes/audit";
import {
  handleAuditProgress,
  handleAuditStandard,
} from "./routes/audit-progress";
import {
  storeAudit,
  getAudit,
  listAudits,
  deleteAudit,
} from "./routes/audit-storage";
import { initializeDatabase } from "./db/init";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize database on server startup
  initializeDatabase().catch((error) => {
    console.error("Failed to initialize database on startup:", error);
  });

  // API routes with /api prefix (needed for local development)
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping pong";
    res.json({ message: ping });
  });

  // Diagnostic endpoint to check database configuration
  app.get("/api/health", async (_req, res) => {
    const dbConfigured = !!process.env.DATABASE_URL;
    const response: any = {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: {
        configured: dbConfigured,
        url: dbConfigured ? "***hidden***" : "NOT SET",
      },
    };

    if (dbConfigured) {
      try {
        const { getPool } = await import("./db/init");
        const pool = await getPool();
        if (pool) {
          const result = await pool.query("SELECT 1");
          response.database.connected = true;
          response.database.status = "Connected";
        } else {
          response.database.connected = false;
          response.database.status = "Pool creation failed";
        }
      } catch (error) {
        response.database.connected = false;
        response.database.status = `Connection failed: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      response.database.status = "NOT CONFIGURED - Audits will NOT persist to database";
    }

    res.json(response);
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/audit", handleAudit);
  app.get("/api/audit/progress", handleAuditProgress);
  app.post("/api/audit/standard", handleAuditStandard);
  app.post("/api/audit/demo", handleDemoAudit);

  // Audit storage endpoints
  app.post("/api/audits", storeAudit);
  app.get("/api/audits/:id", getAudit);
  app.get("/api/audits", listAudits);
  app.delete("/api/audits/:id", deleteAudit);

  return app;
}
