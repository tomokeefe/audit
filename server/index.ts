import express from "express";
import cors from "cors";
import { initializeDatabase } from "./db/init.js";

export async function createServer() {
  const app = express();

  // Middleware - CORS with explicit configuration for production
  app.use(
    cors({
      origin: true, // Reflect request origin
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Accept",
        "Cache-Control",
      ],
    }),
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware for debugging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // Initialize database on server startup
  initializeDatabase().catch((error) => {
    console.error("Failed to initialize database on startup:", error);
  });

  // Health check endpoints - these are registered first to always work
  app.get("/api/ping", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    const ping = process.env.PING_MESSAGE ?? "pong";
    res.json({
      message: ping,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development",
    });
  });

  // Simple status endpoint that always works
  app.get("/api/status", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({
      status: "ok",
      server: "running",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  });

  app.get("/api/health", async (_req, res) => {
    const dbConfigured = !!process.env.DATABASE_URL;
    const grokConfigured = !!process.env.GROK_API_KEY;
    const response: any = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        grokApiKey: grokConfigured ? "SET" : "NOT SET",
        database: {
          configured: dbConfigured,
          url: dbConfigured ? "***hidden***" : "NOT SET",
        },
      },
    };

    if (dbConfigured) {
      try {
        const { getPool } = await import("./db/init.js");
        const pool = await getPool();
        if (pool) {
          const result = await pool.query("SELECT 1");
          response.environment.database.connected = true;
          response.environment.database.status = "Connected";
        } else {
          response.environment.database.connected = false;
          response.environment.database.status = "Pool creation failed";
        }
      } catch (error) {
        response.environment.database.connected = false;
        response.environment.database.status = `Connection failed: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      response.environment.database.status =
        "NOT CONFIGURED - Audits will NOT persist to database";
    }

    res.json(response);
  });

  // Debug endpoint to test audit saving
  app.post("/api/test-save", async (req, res) => {
    console.log("🧪 [TEST] Test save endpoint called");
    try {
      const { storeAuditResult } = await import("./routes/audit.js");
      const testAudit = {
        id: `test-${Date.now()}`,
        url: "https://test.example.com",
        title: "Test Audit",
        description: "Test audit for debugging",
        overallScore: 75,
        status: "completed",
        date: new Date().toISOString(),
        sections: [],
      };

      console.log("🧪 [TEST] Calling storeAuditResult with test audit...");
      await storeAuditResult(testAudit);
      console.log("🧪 [TEST] storeAuditResult completed");

      res.json({
        success: true,
        message: "Test audit saved",
        auditId: testAudit.id,
      });
    } catch (error) {
      console.error("🧪 [TEST] Test save failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Audit routes - importing one by one to identify the problematic import
  let handleDemo, storeAudit, listAudits, getAudit, deleteAudit;
  let handleAuditProgress, handleAuditStandard;

  try {
    console.log("Importing demo routes...");
    const demoModule = await import("./routes/demo.js");
    handleDemo = demoModule.handleDemo;
    console.log("✓ Demo routes imported");
    app.post("/api/demo", handleDemo);
  } catch (err) {
    console.error("✗ Failed to import demo routes:", err);
    console.error(
      "✗ Error details:",
      err instanceof Error ? err.message : String(err),
    );
    console.error("✗ Stack:", err instanceof Error ? err.stack : "No stack");
    throw err;
  }

  try {
    console.log("Importing audit-progress routes...");
    const progressModule = await import("./routes/audit-progress.js");
    handleAuditProgress = progressModule.handleAuditProgress;
    handleAuditStandard = progressModule.handleAuditStandard;
    console.log("✓ Audit-progress routes imported");
    app.get("/api/audit/progress", handleAuditProgress);
    app.post("/api/audit", handleAuditStandard);
  } catch (err) {
    console.error("✗ Failed to import audit-progress routes:", err);
    console.error(
      "✗ Error details:",
      err instanceof Error ? err.message : String(err),
    );
    console.error("✗ Stack:", err instanceof Error ? err.stack : "No stack");
    throw err;
  }

  try {
    console.log("Importing audit-storage routes...");
    const storageModule = await import("./routes/audit-storage.js");
    storeAudit = storageModule.storeAudit;
    listAudits = storageModule.listAudits;
    getAudit = storageModule.getAudit;
    deleteAudit = storageModule.deleteAudit;
    const getAuditByShareToken = storageModule.getAuditByShareToken;
    console.log("✓ Audit-storage routes imported");
    app.get("/api/audits", listAudits);
    app.post("/api/audits", storeAudit);
    app.post("/api/save-audit", storeAudit);
    app.get("/api/audits/share/:token", getAuditByShareToken); // Share token route (must be before :id route)
    app.get("/api/audits/:id", getAudit);
    app.delete("/api/audits/:id", deleteAudit);
  } catch (err) {
    console.error("✗ Failed to import audit-storage routes:", err);
    console.error(
      "✗ Error details:",
      err instanceof Error ? err.message : String(err),
    );
    console.error("✗ Stack:", err instanceof Error ? err.stack : "No stack");
    throw err;
  }

  // Global error handler - must be after all other middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled error in request:", {
      path: req.path,
      method: req.method,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      statusCode: err.status,
    });

    // Ensure we don't send headers twice
    if (res.headersSent) {
      console.warn("Headers already sent, skipping error response");
      return next(err);
    }

    res.status(err.status || 500).json({
      error: "Internal server error",
      message: err?.message || "Unknown error",
    });
  });

  return app;
}
