import { getPool } from "./init";
import { AuditResponse } from "../shared/api";

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
  private poolPromise = getPool();

  async saveAudit(audit: AuditResponse): Promise<void> {
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
      audit.date,
      JSON.stringify(audit),
      isDemoMode,
    ];

    try {
      await this.pool.query(query, values);
      console.log(`Saved audit ${audit.id} to database`);
    } catch (error) {
      console.error("Error saving audit:", error);
      throw error;
    }
  }

  async getAudit(id: string): Promise<StoredAudit | null> {
    const query = "SELECT * FROM audits WHERE id = $1";

    try {
      const result = await this.pool.query(query, [id]);
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

  async listAudits(limit: number = 50, offset: number = 0): Promise<StoredAudit[]> {
    const query =
      "SELECT * FROM audits ORDER BY created_at DESC LIMIT $1 OFFSET $2";

    try {
      const result = await this.pool.query(query, [limit, offset]);
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
    const query = "DELETE FROM audits WHERE id = $1";

    try {
      const result = await this.pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting audit:", error);
      throw error;
    }
  }

  async getAuditsByUrl(url: string): Promise<StoredAudit[]> {
    const query =
      "SELECT * FROM audits WHERE url = $1 ORDER BY created_at DESC LIMIT 10";

    try {
      const result = await this.pool.query(query, [url]);
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
