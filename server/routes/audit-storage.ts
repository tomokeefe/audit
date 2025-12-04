import { RequestHandler } from "express";
import { AuditResponse } from "@shared/api";
import { auditService } from "../db/audit-service";

// Store audit result in database
export const storeAudit: RequestHandler = async (req, res) => {
  try {
    const auditData = req.body as AuditResponse;

    if (!auditData.id) {
      return res.status(400).json({ error: "Audit ID is required" });
    }

    // Store the audit data in database
    await auditService.saveAudit(auditData);

    console.log(`Stored audit ${auditData.id} in database`);

    res.status(200).json({
      success: true,
      id: auditData.id,
      shareUrl: `/audit/${auditData.id}`,
    });
  } catch (error) {
    console.error("Error storing audit:", error);
    res.status(500).json({
      error: "Failed to store audit data",
    });
  }
};

// Retrieve audit result from database
export const getAudit: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Audit ID is required" });
    }

    const auditData = await auditService.getAudit(id);

    if (!auditData) {
      return res.status(404).json({ error: "Audit not found" });
    }

    console.log(`Retrieved audit ${id} from database`);

    res.status(200).json(auditData.audit_data);
  } catch (error) {
    console.error("Error retrieving audit:", error);
    res.status(500).json({
      error: "Failed to retrieve audit data",
    });
  }
};

// List all stored audits
export const listAudits: RequestHandler = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const audits = await auditService.listAudits(limit, offset);

    const summaries = audits.map((audit) => ({
      id: audit.id,
      title: audit.title,
      url: audit.url,
      date: audit.date,
      overallScore: audit.overall_score,
      isDemoMode: audit.is_demo_mode,
    }));

    res.status(200).json({ audits: summaries });
  } catch (error) {
    console.error("Error listing audits:", error);
    res.status(500).json({
      error: "Failed to list audits",
    });
  }
};

// Delete audit
export const deleteAudit: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Audit ID is required" });
    }

    const deleted = await auditService.deleteAudit(id);

    if (!deleted) {
      return res.status(404).json({ error: "Audit not found" });
    }

    console.log(`Deleted audit ${id}`);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting audit:", error);
    res.status(500).json({
      error: "Failed to delete audit",
    });
  }
};
