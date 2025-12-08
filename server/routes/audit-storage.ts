import { RequestHandler } from "express";
import { AuditResponse } from "@shared/api";
import { auditService } from "../db/audit-service";
import { auditStorage } from "./audit";

// Store audit result in database
export const storeAudit: RequestHandler = async (req, res) => {
  try {
    const auditData = req.body as AuditResponse;

    if (!auditData.id) {
      return res.status(400).json({ error: "Audit ID is required" });
    }

    console.log(`storeAudit called with id=${auditData.id}`);

    // Store the audit data in database
    try {
      await auditService.saveAudit(auditData);
      console.log(`✓ Stored audit ${auditData.id} in database`);
    } catch (dbError) {
      console.error(`✗ Error storing to database:`, dbError);
      // Don't fail - still return success since the audit was created
    }

    res.status(200).json({
      success: true,
      id: auditData.id,
      shareUrl: `/share/audit/${auditData.id}`,
    });
  } catch (error) {
    console.error("Error in storeAudit:", error);
    res.status(500).json({
      error: "Failed to store audit data",
    });
  }
};

// Retrieve audit result from database or memory
export const getAudit: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Audit ID is required" });
    }

    console.log(`getAudit called with id=${id}`);

    // First try to get from in-memory storage (for current session)
    let auditData = auditStorage.get(id);

    if (auditData) {
      console.log(`✓ Retrieved audit ${id} from memory`);
      return res.status(200).json(auditData);
    }

    // Then try database if configured
    if (process.env.DATABASE_URL) {
      try {
        const storedAudit = await auditService.getAudit(id);
        if (storedAudit) {
          console.log(`✓ Retrieved audit ${id} from database`);
          return res.status(200).json(storedAudit.audit_data);
        }
      } catch (dbError) {
        console.error(`✗ Database retrieval failed for ${id}:`, dbError);
      }
    } else {
      console.warn(
        `⚠ DATABASE_URL not configured, cannot retrieve from database`,
      );
    }

    // Audit not found anywhere
    console.warn(`⚠ Audit ${id} not found in memory or database`);
    return res.status(404).json({ error: "Audit not found" });
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

    console.log(`listAudits called with limit=${limit}, offset=${offset}`);

    try {
      const audits = await auditService.listAudits(limit, offset);

      console.log(
        `[LIST AUDITS] Retrieved ${audits.length} audits from database`,
      );

      if (audits.length > 0) {
        console.log(`[LIST AUDITS] Sample audit:`, {
          id: audits[0].id,
          title: audits[0].title,
          date: audits[0].date,
          dateType: typeof audits[0].date,
        });
      }

      const summaries = audits.map((audit) => {
        // Ensure date is in ISO string format for frontend
        let dateValue: string;
        try {
          dateValue = audit.date
            ? new Date(audit.date).toISOString()
            : new Date().toISOString();
        } catch (dateError) {
          console.error(
            `[LIST AUDITS] Error parsing date for audit ${audit.id}:`,
            dateError,
          );
          dateValue = new Date().toISOString();
        }

        return {
          id: audit.id,
          title: audit.title,
          url: audit.url,
          date: dateValue,
          overallScore: audit.overall_score,
          isDemoMode: audit.is_demo_mode,
        };
      });

      console.log(`[LIST AUDITS] Returning ${summaries.length} audits`);
      res.status(200).json({ audits: summaries });
    } catch (dbError) {
      console.error("Database error when listing audits:", dbError);
      // Return empty list if database is unavailable rather than 500
      console.warn("Database unavailable, returning empty audit list");
      res.status(200).json({ audits: [] });
    }
  } catch (error) {
    console.error("Error in listAudits handler:", error);
    res.status(200).json({ audits: [] });
  }
};

// Retrieve audit by share token (for public sharing)
export const getAuditByShareToken: RequestHandler = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: "Share token is required" });
    }

    console.log(`getAuditByShareToken called with token=${token.substring(0, 8)}...`);

    // First try in-memory storage (for current session)
    for (const [id, auditData] of auditStorage.entries()) {
      if (auditData.shareToken === token) {
        console.log(`✓ Retrieved audit by share token from memory (${auditData.title})`);
        return res.status(200).json(auditData);
      }
    }

    // Then try database if configured
    if (process.env.DATABASE_URL) {
      try {
        const storedAudit = await auditService.getAuditByShareToken(token);
        if (storedAudit) {
          console.log(`✓ Retrieved audit by share token from database (${storedAudit.title})`);
          return res.status(200).json(storedAudit.audit_data);
        }
      } catch (dbError) {
        console.error(`✗ Database retrieval failed for share token:`, dbError);
      }
    } else {
      console.warn(`⚠ DATABASE_URL not configured, cannot retrieve from database`);
    }

    // Audit not found anywhere
    console.warn(`⚠ Audit with share token not found in memory or database`);
    return res.status(404).json({ error: "Shared audit not found or link expired" });
  } catch (error) {
    console.error("Error retrieving audit by share token:", error);
    res.status(500).json({
      error: "Failed to retrieve shared audit",
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
