import type { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "ok" }),
    };
  }

  const path = event.path || "";
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

  // Ping endpoint (local)
  if (path.includes("/api/ping")) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "ping pong" }),
    };
  }

  // Save audit to Neon database
  if (path === "/api/save-audit" && event.httpMethod === "POST") {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: "Database not configured" }),
        };
      }

      const audit = JSON.parse(event.body || "{}");
      if (!audit.id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Audit ID required" }),
        };
      }

      const url = new URL(databaseUrl);
      const host = url.hostname;
      const database = url.pathname.slice(1);
      const user = url.username;
      const password = url.password;

      // Insert or update audit in Neon
      const response = await fetch(
        `https://${host}/sql?database=${database}&user=${user}&password=${password}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              INSERT INTO audits (id, url, title, description, overall_score, status, date, audit_data)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (id) DO UPDATE SET audit_data = $8, date = $7
            `,
            params: [
              audit.id,
              audit.url,
              audit.title || "Audit Report",
              audit.description || null,
              audit.overallScore || 0,
              audit.status || "completed",
              audit.date || new Date().toISOString(),
              JSON.stringify(audit.audit_data || audit),
            ],
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Neon API error:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Failed to save audit" }),
        };
      }

      console.log(`✓ Saved audit ${audit.id} to Neon via REST API`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, id: audit.id }),
      };
    } catch (error) {
      console.error("Save audit error:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Server error",
          message: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  // Proxy audit endpoints to backend
  if (path.includes("/api/audit")) {
    try {
      const method = event.httpMethod || "POST";
      const isGet = method === "GET";
      const url = isGet
        ? `${backendUrl}/api/audit?${new URLSearchParams(event.queryStringParameters || {})}`
        : `${backendUrl}/api/audit`;

      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (!isGet && event.body) {
        fetchOptions.body = event.body;
      }

      const response = await fetch(url, fetchOptions);
      const data = await response.json();

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data),
      };
    } catch (error) {
      console.error("Proxy error:", error);
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error:
            "Backend service unavailable. Ensure BACKEND_URL is configured.",
        }),
      };
    }
  }

  // Handle /api/audits/:id (retrieve single audit from Neon database)
  if (path.match(/^\/api\/audits\/[^/]+$/)) {
    try {
      const id = path.split("/").pop();
      console.log(`Retrieving audit ${id} from Neon database`);

      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: "Database not configured" }),
        };
      }

      const url = new URL(databaseUrl);
      const host = url.hostname;
      const database = url.pathname.slice(1);
      const user = url.username;
      const password = url.password;

      // Query Neon for the specific audit
      const response = await fetch(
        `https://${host}/sql?database=${database}&user=${user}&password=${password}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "SELECT audit_data FROM audits WHERE id = $1",
            params: [id],
          }),
        },
      );

      if (!response.ok) {
        console.error("Neon API error:", await response.text());
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Audit not found" }),
        };
      }

      const result = await response.json();
      if (result.rows && result.rows.length > 0) {
        const auditData =
          typeof result.rows[0].audit_data === "string"
            ? JSON.parse(result.rows[0].audit_data)
            : result.rows[0].audit_data;
        console.log(`✓ Retrieved audit ${id} from Neon`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(auditData),
        };
      }

      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Audit not found" }),
      };
    } catch (error) {
      console.error("Audit retrieval error:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to retrieve audit",
          message: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  // Get all audits from Neon database
  if (path === "/api/audits" && event.httpMethod === "GET") {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: "Database not configured" }),
        };
      }

      const url = new URL(databaseUrl);
      const host = url.hostname;
      const database = url.pathname.slice(1);
      const user = url.username;
      const password = url.password;

      // Query Neon for all audits, ordered by date descending
      const response = await fetch(
        `https://${host}/sql?database=${database}&user=${user}&password=${password}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query:
              "SELECT id, url, title, description, overall_score as overallScore, status, date FROM audits ORDER BY date DESC LIMIT 100",
            params: [],
          }),
        },
      );

      if (!response.ok) {
        console.error("Neon API error:", await response.text());
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Database query failed" }),
        };
      }

      const result = await response.json();
      const audits = result.rows || [];

      console.log(`✓ Retrieved ${audits.length} audits from Neon`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ audits }),
      };
    } catch (error) {
      console.error("Audits list error:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to retrieve audits",
          message: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  // Health check endpoint
  if (path.includes("/api/health")) {
    try {
      const response = await fetch(`${backendUrl}/api/health`);
      const data = await response.json();

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data),
      };
    } catch (error) {
      console.error("Health check error:", error);
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          status: "error",
          database: {
            configured: false,
            status: "Backend unreachable",
          },
        }),
      };
    }
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: "Not found" }),
  };
};

export { handler };
