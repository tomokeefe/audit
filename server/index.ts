import "dotenv/config";
import express from "express";
import cors from "cors";
import { initializeDatabase } from "./db/init.js";

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
      response.database.status =
        "NOT CONFIGURED - Audits will NOT persist to database";
    }

    res.json(response);
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/audit", handleAudit);
  app.get("/api/audit/progress", handleAuditProgress);
  app.post("/api/audit/standard", handleAuditStandard);
  app.post("/api/audit/demo", handleDemoAudit);

  // Audit storage endpoints (order matters - specific routes before generic)
  app.get("/api/audits", listAudits); // Must come before /:id route
  app.get("/api/audits/:id", getAudit);
  app.post("/api/audits", storeAudit);
  app.delete("/api/audits/:id", deleteAudit);

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: err?.message || "Unknown error",
    });
  });

  return app;
}
