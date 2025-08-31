import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleAudit, handleDemoAudit } from "./routes/audit";
import {
  storeAudit,
  getAudit,
  listAudits,
  deleteAudit,
} from "./routes/audit-storage";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes (no /api prefix needed for Netlify functions)
  app.get("/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/demo", handleDemo);
  app.post("/audit", handleAudit);
  app.post("/audit/demo", handleDemoAudit);

  // Audit storage endpoints
  app.post("/audits", storeAudit);
  app.get("/audits/:id", getAudit);
  app.get("/audits", listAudits);
  app.delete("/audits/:id", deleteAudit);

  return app;
}
