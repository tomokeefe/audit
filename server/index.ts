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
