import { getPool } from "./init";
import { AuditResponse } from "../../shared/api";

export interface StoredAudit {
  id: string;
  url: string;
  title: string;
  description?: string;
  overall_score: number;
  status: string;
  date: string;
  audit_data: AuditResponse;
  is_demo_mode: boolean;
}

export class AuditService {
  async saveAudit(audit: AuditResponse): Promise<void> {
    const pool = await getPool();
    if (!pool) {
      console.warn("⚠️  Database pool not available, skipping audit save");
      return;
    }

    console.log(`[DB SAVE] Attempting to save audit ${audit.id} to database...`);
    console.log(`[DB SAVE] URL: ${audit.url}`);
    console.log(`[DB SAVE] Title: ${audit.title}`);
    console.log(`[DB SAVE] Score: ${audit.overallScore}`);
    console.log(`[DB SAVE] Date: ${audit.date} (type: ${typeof audit.date})`);

    // Ensure date is in ISO format for PostgreSQL
    let dateValue: string;
    try {
      dateValue = audit.date ? new Date(audit.date).toISOString() : new Date().toISOString();
      console.log(`[DB SAVE] Normalized date: ${dateValue}`);
    } catch (dateError) {
      console.error(`[DB SAVE] Error parsing date "${audit.date}":`, dateError);
      dateValue = new Date().toISOString();
      console.log(`[DB SAVE] Using fallback date: ${dateValue}`);
    }

    const query = `
      INSERT INTO audits (id, url, title, description, overall_score, status, date, audit_data, is_demo_mode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        url = $2,
        title = $3,
        description = $4,
        overall_score = $5,
        status = $6,
        audit_data = $8,
        is_demo_mode = $9
    `;

    const isDemoMode = (audit as any).isDemoMode || false;

    const values = [
      audit.id,
      audit.url,
      audit.title,
      audit.description || null,
      audit.overallScore,
      audit.status || "completed",
      dateValue,
      JSON.stringify(audit),
      isDemoMode,
    ];

    console.log(`[DB SAVE] Query values:`, values.map((v, i) => `$${i + 1}=${typeof v === 'string' ? v.substring(0, 50) : v}`));

    try {
      const result = await pool.query(query, values);
      console.log(`✅ [DB SAVE] Successfully saved audit ${audit.id} to database (${result.rowCount} row(s) affected)`);
    } catch (error) {
      console.error(`❌ [DB SAVE] Error saving audit ${audit.id}:`, error);
      console.error(`[DB SAVE] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getAudit(id: string): Promise<StoredAudit | null> {
    const pool = await getPool();
    if (!pool) {
      console.warn("Database not available");
      return null;
    }

    const query = "SELECT * FROM audits WHERE id = $1";

    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        url: row.url,
        title: row.title,
        description: row.description,
        overall_score: row.overall_score,
        status: row.status,
        date: row.date,
        audit_data: row.audit_data,
        is_demo_mode: row.is_demo_mode,
      };
    } catch (error) {
      console.error("Error retrieving audit:", error);
      throw error;
    }
  }

  async listAudits(
    limit: number = 50,
    offset: number = 0,
  ): Promise<StoredAudit[]> {
    const pool = await getPool();
    if (!pool) {
      console.warn("⚠️  Database pool not available for listAudits");
      return [];
    }

    console.log(`[DB LIST] Fetching audits (limit: ${limit}, offset: ${offset})...`);

    const query =
      "SELECT * FROM audits ORDER BY created_at DESC LIMIT $1 OFFSET $2";

    try {
      const result = await pool.query(query, [limit, offset]);
      console.log(`[DB LIST] Found ${result.rows.length} audit(s) in database`);

      if (result.rows.length > 0) {
        console.log(`[DB LIST] Sample audit IDs:`, result.rows.slice(0, 3).map(r => r.id));
      }

      return result.rows.map((row) => ({
        id: row.id,
        url: row.url,
        title: row.title,
        description: row.description,
        overall_score: row.overall_score,
        status: row.status,
        date: row.date,
        audit_data: row.audit_data,
        is_demo_mode: row.is_demo_mode,
      }));
    } catch (error) {
      console.error("Error listing audits:", error);
      throw error;
    }
  }

  async deleteAudit(id: string): Promise<boolean> {
    const pool = await getPool();
    if (!pool) {
      console.warn("Database not available");
      return false;
    }

    const query = "DELETE FROM audits WHERE id = $1";

    try {
      const result = await pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting audit:", error);
      throw error;
    }
  }

  async getAuditsByUrl(url: string): Promise<StoredAudit[]> {
    const pool = await getPool();
    if (!pool) {
      console.warn("Database not available");
      return [];
    }

    const query =
      "SELECT * FROM audits WHERE url = $1 ORDER BY created_at DESC LIMIT 10";

    try {
      const result = await pool.query(query, [url]);
      return result.rows.map((row) => ({
        id: row.id,
        url: row.url,
        title: row.title,
        description: row.description,
        overall_score: row.overall_score,
        status: row.status,
        date: row.date,
        audit_data: row.audit_data,
        is_demo_mode: row.is_demo_mode,
      }));
    } catch (error) {
      console.error("Error retrieving audits by URL:", error);
      throw error;
    }
  }
}

export const auditService = new AuditService();
