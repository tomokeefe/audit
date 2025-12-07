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

  // Health check endpoints
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping pong";
    res.json({ message: ping });
  });

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

  // Placeholder: Route imports disabled for debugging path-to-regexp error
  // TODO: Re-enable once import issue is resolved

  console.log("Routes temporarily disabled for debugging");

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
