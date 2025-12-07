import "dotenv/config";
import express from "express";
import cors from "cors";
import { initializeDatabase } from "./db/init.js";

export async function createServer() {
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
        const { getPool } = await import("./db/init.js");
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

  // Lazy load route handlers to avoid circular dependencies
  try {
    console.log("Importing demo module...");
    const demoModule = await import("./routes/demo.js");
    console.log("✓ Demo module imported");

    console.log("Importing audit module...");
    const auditModule = await import("./routes/audit.js");
    console.log("✓ Audit module imported");

    console.log("Importing audit progress module...");
    const auditProgressModule = await import("./routes/audit-progress.js");
    console.log("✓ Audit progress module imported");

    console.log("Importing audit storage module...");
    const auditStorageModule = await import("./routes/audit-storage.js");
    console.log("✓ Audit storage module imported");

    console.log("Registering demo route...");
    app.get("/api/demo", demoModule.handleDemo);
    console.log("✓ Demo route registered");

    console.log("Registering audit routes...");
    app.post("/api/audit", auditModule.handleAudit);
    app.get("/api/audit/progress", auditProgressModule.handleAuditProgress);
    app.post("/api/audit/standard", auditProgressModule.handleAuditStandard);
    app.post("/api/audit/demo", auditModule.handleDemoAudit);
    console.log("✓ Audit routes registered");

    console.log("Registering audit storage routes...");
    // Audit storage endpoints (order matters - specific routes before generic)
    app.get("/api/audits", auditStorageModule.listAudits);
    app.get("/api/audits/:id", auditStorageModule.getAudit);
    app.post("/api/audits", auditStorageModule.storeAudit);
    app.delete("/api/audits/:id", auditStorageModule.deleteAudit);
    console.log("✓ Audit storage routes registered");
  } catch (error) {
    console.error("Failed to load route handlers:", error);
    throw error;
  }

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
